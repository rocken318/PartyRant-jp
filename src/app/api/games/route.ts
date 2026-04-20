export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import { getUserFromRequest } from '@/lib/supabase/auth-server';
import { getOrCreateProfile, countUserGames } from '@/lib/supabase/profiles';

const questionSchema = z.object({
  text: z.string().min(1),
  imageUrl: z.string().optional(),
  options: z.array(z.string()).min(2).max(4),
  correctIndex: z.number().int().min(0).optional(),
  timeLimitSec: z.number().int().min(1),
});

const createGameSchema = z.object({
  eventId: z.string().min(1),
  mode: z.enum(['trivia', 'polling', 'opinion']),
  gameMode: z.enum(['live', 'self_paced']).default('live'),
  loseRule: z.enum(['minority', 'majority']).optional(),
  title: z.string().min(1),
  questions: z.array(questionSchema).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await getOrCreateProfile(user.id);
    if (profile.plan === 'free') {
      const gameCount = await countUserGames(user.id);
      if (gameCount >= 2) {
        return NextResponse.json(
          { error: 'game_limit_reached', message: '無料プランはゲームを2本まで作成できます。Proにアップグレードしてください。' },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const parsed = createGameSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

    const game = await store.createGame({ ...parsed.data, hostId: user.id });
    return NextResponse.json(game, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
