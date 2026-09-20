export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getUserFromRequest } from '@/lib/supabase/auth-server';

// PATCH /api/games/[gameId]/cast
// body: { names: string[] }
// answerTarget==='casts' の設問を持つゲームに、キャスト名を games.casts へ保存する。
// （options は上書きせず、実行時に resolveOptions がキャスト名で解決する）
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await context.params;
    const game = await store.getGame(gameId);
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    if (!game.questions.some(q => q.answerTarget === 'casts')) {
      return NextResponse.json({ error: 'Not a cast game' }, { status: 400 });
    }

    if (game.hostId) {
      const user = await getUserFromRequest(req);
      if (!user || user.id !== game.hostId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { names } = (await req.json()) as { names: string[] };
    if (!Array.isArray(names)) {
      return NextResponse.json({ error: 'names must be an array' }, { status: 400 });
    }
    const cleaned = names
      .filter((n): n is string => typeof n === 'string')
      .map(n => n.trim())
      .filter(Boolean)
      .map(n => n.slice(0, 20));
    if (cleaned.length < 2) {
      return NextResponse.json({ error: 'At least 2 cast names required' }, { status: 400 });
    }

    const updated = await store.updateGameCasts(gameId, cleaned);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
