export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const hostId = searchParams.get('hostId');
  const exceptGameId = searchParams.get('exceptGameId');

  if (!hostId) return NextResponse.json({ game: null });

  try {
    const game = await store.findLatestLobbyGame(hostId, exceptGameId ?? undefined);
    if (!game) return NextResponse.json({ game: null });
    return NextResponse.json({ game });
  } catch {
    return NextResponse.json({ game: null });
  }
}
