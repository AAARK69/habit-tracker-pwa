import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import webpush from 'web-push';

// Configure VAPID keys for web-push
const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || '';

if (vapidPublic && vapidPrivate) {
  try {
    webpush.setVapidDetails(
      'mailto:reminder-service@habit-tracker-pwa.local',
      vapidPublic,
      vapidPrivate
    );
  } catch (err: any) {
    console.error('Error setting VAPID details (keys might be invalid or placeholders):', err.message);
  }
} else {
  console.warn('Warning: VAPID keys are missing. Push notifications will fail.');
}

export async function GET(req: NextRequest) {
  try {
    // 1. Verify Vercel Cron authorization header
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // In production, we strictly require the CRON_SECRET authorization header
    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const adminClient = getSupabaseAdmin();

    // 2. Determine "today" string in America/New_York (EST)
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const todayDateStr = `${year}-${month}-${day}`;

    // 3. Fetch all daily logs for today
    const { data: todayLogs, error: logsError } = await adminClient
      .from('daily_logs')
      .select('user_id')
      .eq('date', todayDateStr);

    if (logsError) {
      return NextResponse.json({ error: `Failed to fetch daily logs: ${logsError.message}` }, { status: 500 });
    }

    const completedUserIds = new Set(todayLogs?.map(log => log.user_id) || []);

    // 4. Fetch all push subscriptions
    const { data: allSubscriptions, error: subsError } = await adminClient
      .from('push_subscriptions')
      .select('id, user_id, subscription');

    if (subsError) {
      return NextResponse.json({ error: `Failed to fetch subscriptions: ${subsError.message}` }, { status: 500 });
    }

    // Filter to find subscriptions of users who haven't completed their tracker today
    const pendingSubscriptions = allSubscriptions?.filter(
      sub => !completedUserIds.has(sub.user_id)
    ) || [];

    if (pendingSubscriptions.length === 0) {
      return NextResponse.json({ message: 'No reminders to send today. All users have completed their tracker or no subscriptions exist.' });
    }

    // 5. Send push notifications
    const payload = JSON.stringify({
      title: 'Daily Log Reminder 📝',
      body: 'Take a minute to complete your habit tracker!',
      url: '/',
    });

    const results = {
      sent: 0,
      failed: 0,
      cleanedUp: 0,
    };

    const notificationPromises = pendingSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          sub.subscription as webpush.PushSubscription,
          payload
        );
        results.sent++;
      } catch (err: any) {
        results.failed++;
        // If the push service returns 410 (Gone) or 404 (Not Found), the subscription has expired or is invalid
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Delete from db using the unique id
          const { error: deleteError } = await adminClient
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);

          if (!deleteError) {
            results.cleanedUp++;
          }
        } else {
          console.error(`Failed to send push notification to user ${sub.user_id}:`, err);
        }
      }
    });

    await Promise.all(notificationPromises);

    return NextResponse.json({
      message: 'Reminder cron process completed.',
      date: todayDateStr,
      results,
    });
  } catch (error: any) {
    console.error('Error in reminder cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
