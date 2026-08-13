export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getUserFromRequest } from '@/lib/supabase/auth-server';

// PATCH /api/games/[gameId]/cast
// body: { names: string[] }
// キャスト指名sceneでキャスト名をquestion optionsに書き込む
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await context.params;
    const game = await store.getGame(gameId);
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    if (game.scene !== 'キャスト指名') return NextResponse.json({ error: 'Not a cast game' }, { status: 400 });

    if (game.hostId) {
      const user = await getUserFromRequest(req);
      if (!user || user.id !== game.hostId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { names } = (await req.json()) as { names: string[] };
    if (!Array.isArray(names) || names.length < 2) {
      return NextResponse.json({ error: 'At least 2 cast names required' }, { status: 400 });
    }

    const resolved = game.questions.map(q => ({ ...q, options: names }));
    const updated = await store.updateGameQuestions(gameId, resolved);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
