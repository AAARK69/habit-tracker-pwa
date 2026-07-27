import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import webpush from 'web-push';
import { DEFAULT_VAPID_PUBLIC_KEY, DEFAULT_VAPID_PRIVATE_KEY } from '@/lib/vapid';

const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY;

if (vapidPublic && vapidPrivate) {
  try {
    webpush.setVapidDetails(
      'mailto:notifications@habit-tracker-pwa.local',
      vapidPublic,
      vapidPrivate
    );
  } catch (err: any) {
    console.error('Error setting VAPID details:', err.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const adminClient = getSupabaseAdmin();

    const { data: subscriptions, error } = await adminClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ error: 'No active push subscriptions found for this account. Enable notifications first!' }, { status: 404 });
    }

    const payload = JSON.stringify({
      title: 'Reflect Notification Test 🔔',
      body: 'Push notifications are active and working on your device!',
      url: '/',
    });

    let sentCount = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          sub.subscription as webpush.PushSubscription,
          payload
        );
        sentCount++;
      } catch (pushErr: any) {
        console.error('Push error:', pushErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Test notification sent successfully to ${sentCount} device(s)!`,
    });
  } catch (err: any) {
    console.error('Test notification API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
