import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getUserFromRequest } from '@/lib/supabase/auth-server';

export const runtime = 'nodejs';

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
      questions: preset.questions.map(({ id: _id, order: _order, ...q }) => q),
      hostId: user?.id,
    });

    const lobbyGame = await store.updateGameStatus(game.id, 'lobby');
    return NextResponse.json(lobbyGame);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to start preset' }, { status: 500 });
  }
}
