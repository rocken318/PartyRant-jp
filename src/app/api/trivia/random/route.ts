export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import { getUserFromRequest } from '@/lib/supabase/auth-server';
import type { Question } from '@/types/domain';

const schema = z.object({
  count: z.number().int().min(3).max(20).default(10),
  scene: z.string().nullable().optional(),
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
    const { count, scene } = parsed.data;

    const presets = await store.listPresets();
    const pool: Omit<Question, 'id' | 'order'>[] = [];

    for (const preset of presets) {
      if (preset.mode !== 'trivia') continue;
      if (scene && preset.scene !== scene) continue;
      for (const q of preset.questions) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, order: _order, ...rest } = q;
        pool.push(rest);
      }
    }

    if (pool.length === 0) {
      return NextResponse.json({ error: 'No questions available' }, { status: 404 });
    }

    const selected = shuffle(pool).slice(0, Math.min(count, pool.length));

    const user = await getUserFromRequest(req).catch(() => null);

    const game = await store.createGame({
      mode: 'trivia',
      gameMode: 'live',
      title: '🧠 ランダム雑学クイズ',
      questions: selected,
      hostId: user?.id,
    });

    const lobbyGame = await store.updateGameStatus(game.id, 'lobby');
    return NextResponse.json(lobbyGame);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to start random trivia' }, { status: 500 });
  }
}
