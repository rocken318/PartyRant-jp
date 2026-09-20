export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { broadcastGameEvent } from '@/lib/events/broadcast';
import { getUserFromRequest } from '@/lib/supabase/auth-server';
import { resolveOptions } from '@/lib/game-logic';
import type { Question } from '@/types/domain';

function isPlayerPlaceholder(opt: string): boolean {
  return /^[A-Z]さん$/.test(opt) || /^プレイヤー[A-Z]$/.test(opt);
}

/**
 * Phase1 後方互換: answerTarget 未定義の旧設問を、現行 regex 判定で players 相当とみなす。
 * options 全てがプレースホルダなら players として扱う。
 * （Phase3 で削除予定）
 */
function legacyIsPlayersQuestion(q: Question): boolean {
  return q.options.length > 0 && q.options.every((opt) => isPlayerPlaceholder(opt));
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

    // lobby → question 時に選択肢を answerTarget ベースで解決。
    // - players: 参加者名で解決（何人参加しても自動対応）
    // - casts:   Phase1 では casts 源が未整備のため現状の options を維持（キャスト入力挙動を壊さない）
    // - fixed / 未定義: 原則そのまま。ただし answerTarget 未定義の旧設問は regex fallback で players 解決。
    if (prevStatus === 'lobby') {
      const players = await store.listPlayers(gameId);
      if (players.length > 0) {
        const playerNames = players.map((p) => p.displayName);
        // casts 源は Phase2 で整備。Phase1 は空配列 → resolveOptions が現状の options を維持。
        const ctx = { playerNames, casts: [] as string[] };
        let changed = false;
        const resolved = game.questions.map((q) => {
          const isPlayersByType = q.answerTarget === 'players';
          // 後方互換: answerTarget 未定義かつ options が全てプレースホルダなら players 相当。
          const isPlayersByLegacy = q.answerTarget === undefined && legacyIsPlayersQuestion(q);
          if (!isPlayersByType && !isPlayersByLegacy) return q;

          const options = resolveOptions(
            // legacy fallback のときは players として解決させる
            isPlayersByType ? q : { ...q, answerTarget: 'players' as const },
            ctx
          );
          changed = true;
          // players/casts に解決した設問は採点しない（二重防御で correctIndex を落とす）
          return { ...q, options, answerTarget: 'players' as const, correctIndex: undefined };
        });
        if (changed) {
          await store.updateGameQuestions(gameId, resolved);
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
