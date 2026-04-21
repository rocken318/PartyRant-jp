export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getUserFromRequest } from '@/lib/supabase/auth-server';
import { store } from '@/lib/store';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await context.params;
    const db = createServerClient();
    const game = await db.from('games').select('host_id').eq('id', gameId).maybeSingle();
    if (!game.data) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    if (game.data.host_id) {
      const user = await getUserFromRequest(req);
      if (!user || user.id !== game.data.host_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Delete answers and players, then reset game to lobby
    await db.from('answers').delete().eq('game_id', gameId);
    await db.from('players').delete().eq('game_id', gameId);
    const { error } = await db
      .from('games')
      .update({
        status: 'lobby',
        current_question_index: -1,
        current_question_started_at: null,
        ended_at: null,
      })
      .eq('id', gameId)
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error?.message ?? 'Reset failed' }, { status: 500 });
    }

    const updated = await store.getGame(gameId);
    if (!updated) {
      return NextResponse.json({ error: 'Game not found after reset' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
