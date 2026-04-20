export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/auth-server';
import { getOrCreateProfile } from '@/lib/supabase/profiles';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await getOrCreateProfile(user.id);
    return NextResponse.json({
      plan: profile.plan,
      aiGenCount: profile.aiGenCount,
      aiGenResetAt: profile.aiGenResetAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
