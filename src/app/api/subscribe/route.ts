import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { subscription, user_id } = await req.json();

    if (!subscription || !user_id) {
      return NextResponse.json(
        { error: 'Missing subscription or user_id parameter' },
        { status: 400 }
      );
    }

    const adminClient = getSupabaseAdmin();

    // Fetch existing subscriptions for this user to check for duplicate endpoints
    const { data: existingSubs, error: fetchError } = await adminClient
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', user_id);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const duplicate = existingSubs?.find(
      (sub: any) => sub.subscription?.endpoint === subscription.endpoint
    );

    if (duplicate) {
      return NextResponse.json({ success: true, message: 'Subscription already registered' }, { status: 200 });
    }

    // Insert new subscription using admin client to bypass RLS policies on server context
    const { error: insertError } = await adminClient
      .from('push_subscriptions')
      .insert({
        user_id,
        subscription,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Subscription saved successfully' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint, user_id } = await req.json();

    if (!endpoint || !user_id) {
      return NextResponse.json(
        { error: 'Missing endpoint or user_id parameter' },
        { status: 400 }
      );
    }

    const adminClient = getSupabaseAdmin();

    // Fetch subscriptions
    const { data: existingSubs, error: fetchError } = await adminClient
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', user_id);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Find the record matching the endpoint
    const recordToDelete = existingSubs?.find(
      (sub: any) => sub.subscription?.endpoint === endpoint
    );

    if (!recordToDelete) {
      return NextResponse.json({ success: true, message: 'Subscription not found, nothing to delete' }, { status: 200 });
    }

    // Delete from Supabase using admin client to bypass RLS
    const { error: deleteError } = await adminClient
      .from('push_subscriptions')
      .delete()
      .eq('id', recordToDelete.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Subscription removed successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
