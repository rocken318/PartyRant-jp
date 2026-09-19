export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import { broadcastGameEvent } from '@/lib/events/broadcast';

const answerSchema = z.object({
  playerId: z.string().min(1),
  questionId: z.string().min(1),
  choiceIndex: z.number().int().min(0),
});

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await context.params;
    const answers = await store.listAnswers(gameId);
    return NextResponse.json(answers);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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

    if (game.gameMode !== 'self_paced' && game.status !== 'question') {
      return NextResponse.json({ error: 'Game is not accepting answers' }, { status: 409 });
    }

    const body = await req.json();
    const parsed = answerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const currentQuestion = game.questions[game.currentQuestionIndex];
    const targetQuestion = game.gameMode === 'self_paced'
      ? game.questions.find((question) => question.id === parsed.data.questionId)
      : currentQuestion;

    if (!targetQuestion) {
      return NextResponse.json({ error: 'Question not found in this game' }, { status: 404 });
    }

    if (game.gameMode !== 'self_paced' && parsed.data.questionId !== targetQuestion.id) {
      return NextResponse.json({ error: 'Question is not active' }, { status: 409 });
    }

    if (parsed.data.choiceIndex >= targetQuestion.options.length) {
      return NextResponse.json({ error: 'Choice index is out of range' }, { status: 400 });
    }

    const players = await store.listPlayers(gameId);
    if (!players.some((player) => player.id === parsed.data.playerId)) {
      return NextResponse.json({ error: 'Player not found in this game' }, { status: 404 });
    }

    const answer = await store.submitAnswer({
      gameId,
      playerId: parsed.data.playerId,
      questionId: parsed.data.questionId,
      choiceIndex: parsed.data.choiceIndex,
    });

    await broadcastGameEvent(gameId, { type: 'answer_submitted', answer });

    return NextResponse.json(answer, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
