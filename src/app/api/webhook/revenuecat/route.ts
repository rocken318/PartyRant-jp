export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { setPlan } from '@/lib/supabase/profiles';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json() as {
      event: {
        type: string;
        app_user_id: string;
      };
    };

    const { type, app_user_id: userId } = body.event;

    if (type === 'INITIAL_PURCHASE' || type === 'RENEWAL' || type === 'UNCANCELLATION') {
      await setPlan(userId, 'pro');
    } else if (type === 'CANCELLATION' || type === 'EXPIRATION' || type === 'BILLING_ISSUE') {
      await setPlan(userId, 'free');
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
