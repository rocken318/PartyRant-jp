export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import type { Question } from '@/types/domain';

const schema = z.object({
  loseRule: z.enum(['minority', 'majority']),
  count: z.number().int().min(3).max(20).default(10),
});

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { loseRule, count } = parsed.data;

    // プリセットから opinion + polling の問題を全部プールする
    const presets = await store.listPresets();
    const pool: Omit<Question, 'id' | 'order'>[] = [];

    for (const preset of presets) {
      if (preset.mode !== 'opinion' && preset.mode !== 'polling') continue;
      for (const q of preset.questions) {
        // players は含めてよいが casts は除外（キャスト未設定ゲームへの混入防止）
        if (q.answerTarget === 'casts') continue;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, order: _order, correctIndex: _ci, ...rest } = q;
        pool.push({ ...rest, correctIndex: undefined });
      }
    }

    if (pool.length === 0) {
      return NextResponse.json({ error: 'No questions available' }, { status: 404 });
    }

    const selected = shuffle(pool).slice(0, Math.min(count, pool.length));

    const game = await store.createGame({
      mode: 'opinion',
      gameMode: 'live',
      loseRule,
      title: loseRule === 'minority' ? '🦄 少数派が負けゲーム' : '🐑 多数派が負けゲーム',
      questions: selected,
    });

    const lobbyGame = await store.updateGameStatus(game.id, 'lobby');
    return NextResponse.json(lobbyGame);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to start random game' }, { status: 500 });
  }
}
