export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const hostId = searchParams.get('hostId');
  const exceptGameId = searchParams.get('exceptGameId');

  if (!hostId) return NextResponse.json({ game: null });

  try {
    const db = createServerClient();
    let query = db
      .from('games')
      .select('id, join_code')
      .eq('host_id', hostId)
      .eq('status', 'lobby')
      .order('created_at', { ascending: false })
      .limit(1);

    if (exceptGameId) {
      query = query.neq('id', exceptGameId);
    }

    const { data } = await query.maybeSingle();
    if (!data) return NextResponse.json({ game: null });

    return NextResponse.json({ game: { id: data.id, joinCode: data.join_code } });
  } catch {
    return NextResponse.json({ game: null });
  }
}
