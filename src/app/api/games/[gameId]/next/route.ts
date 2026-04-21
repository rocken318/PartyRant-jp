import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { broadcastGameEvent } from '@/lib/events/broadcast';
import { getUserFromRequest } from '@/lib/supabase/auth-server';
import type { Question } from '@/types/domain';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await context.params;
    const game = await store.getGame(gameId);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.hostId) {
      const user = await getUserFromRequest(req).catch(() => null);
      if (!user || user.id !== game.hostId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const newGame = await store.createGame({
      mode: game.mode,
      gameMode: game.gameMode,
      loseRule: game.loseRule,
      title: game.title,
      description: game.description,
      scene: game.scene,
      questions: game.questions.map(({ id: _id, order: _order, ...rest }: Question) => rest),
      hostId: game.hostId,
    });

    const lobbyGame = await store.updateGameStatus(newGame.id, 'lobby');

    await broadcastGameEvent(gameId, {
      type: 'next_game',
      joinCode: lobbyGame.joinCode,
    });

    return NextResponse.json(lobbyGame);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
