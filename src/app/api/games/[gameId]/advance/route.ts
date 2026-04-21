export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { broadcastGameEvent } from '@/lib/events/broadcast';
import { createServerClient } from '@/lib/supabase/server';
import { getUserFromRequest } from '@/lib/supabase/auth-server';

function isPlayerPlaceholder(opt: string): boolean {
  return /^[A-Z]さん$/.test(opt);
}

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
      const user = await getUserFromRequest(req);
      if (!user || user.id !== game.hostId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const prevStatus = game.status;
    const prevIndex = game.currentQuestionIndex;

    // lobby → question 時にプレイヤー名でプレースホルダーを置換
    if (prevStatus === 'lobby') {
      const players = await store.listPlayers(gameId);
      if (players.length > 0) {
        const hasPlaceholders = game.questions.some(q =>
          q.options.some((opt: string) => /^[A-Z]さん$/.test(opt))
        );
        if (hasPlaceholders) {
          const playerNames = players.map(p => p.displayName);
          // プレースホルダーがある問題はoptions全体をプレイヤー全員で置き換え
          // → 何人参加しても自動対応
          const resolved = game.questions.map(q => {
            if (!q.options.some((opt: string) => isPlayerPlaceholder(opt))) return q;
            return { ...q, options: playerNames };
          });
          const supabase = createServerClient();
          await supabase.from('games').update({ questions: resolved }).eq('id', gameId);
        }
      }
    }

    const updated = await store.advanceQuestion(gameId);

    if (prevStatus === 'lobby') {
      const finalGame = await store.getGame(gameId) ?? updated;
      await broadcastGameEvent(gameId, {
        type: 'question_started',
        questionIndex: updated.currentQuestionIndex,
        startedAt: updated.currentQuestionStartedAt!,
        game: finalGame,
      });
    } else if (prevStatus === 'question') {
      await broadcastGameEvent(gameId, {
        type: 'question_ended',
        questionIndex: prevIndex,
      });
    } else if (prevStatus === 'reveal') {
      if (updated.status === 'question') {
        await broadcastGameEvent(gameId, {
          type: 'question_started',
          questionIndex: updated.currentQuestionIndex,
          startedAt: updated.currentQuestionStartedAt!,
        });
      } else if (updated.status === 'ended') {
        await broadcastGameEvent(gameId, { type: 'game_ended', game: updated });
      }
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
