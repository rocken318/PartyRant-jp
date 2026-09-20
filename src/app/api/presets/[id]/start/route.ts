import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getUserFromRequest } from '@/lib/supabase/auth-server';
import type { Question } from '@/types/domain';

export const runtime = 'nodejs';

function toCreateQuestion(question: Question): Omit<Question, 'id' | 'order'> {
  return {
    text: question.text,
    imageUrl: question.imageUrl,
    options: question.options,
    correctIndex: question.correctIndex,
    timeLimitSec: question.timeLimitSec,
    answerTarget: question.answerTarget,
  };
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const preset = await store.getGame(id);
    if (!preset || !preset.isPreset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    const user = await getUserFromRequest(req).catch(() => null);

    const game = await store.createGame({
      mode: preset.mode,
      gameMode: preset.gameMode,
      loseRule: preset.loseRule,
      title: preset.title,
      description: preset.description,
      scene: preset.scene,
      questions: preset.questions.map(toCreateQuestion),
      casts: preset.casts,
      hostId: user?.id,
    });

    const lobbyGame = await store.updateGameStatus(game.id, 'lobby');
    return NextResponse.json(lobbyGame);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to start preset' }, { status: 500 });
  }
}
