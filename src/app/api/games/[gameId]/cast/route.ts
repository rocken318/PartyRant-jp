export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { createServerClient } from '@/lib/supabase/server';
import { getUserFromRequest } from '@/lib/supabase/auth-server';

function isPlayerPlaceholder(opt: string): boolean {
  return /^[A-Z]さん$/.test(opt) || /^プレイヤー[A-Z]$/.test(opt);
}

/**
 * PATCH /api/games/[gameId]/cast
 * ロビーでホストがキャスト名を設定する。
 * プレースホルダー（プレイヤーA/Bさん等）のある質問のオプションを castNames で上書きする。
 * これにより advance/route.ts の player-substitution はスキップされ、
 * 客（回答者）の名前が選択肢に混入しなくなる。
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await context.params;
    const game = await store.getGame(gameId);
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

    if (game.hostId) {
      const user = await getUserFromRequest(req).catch(() => null);
      if (!user || user.id !== game.hostId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await req.json() as { castNames?: unknown };
    if (!Array.isArray(body.castNames) || body.castNames.length === 0) {
      return NextResponse.json({ error: 'castNames must be a non-empty array' }, { status: 400 });
    }
    const castNames: string[] = body.castNames
      .map((n: unknown) => String(n).trim())
      .filter(Boolean);
    if (castNames.length === 0) {
      return NextResponse.json({ error: 'castNames must contain at least one non-empty name' }, { status: 400 });
    }

    const resolved = game.questions.map((q: { options: string[] }) => {
      if (!q.options.some((opt: string) => isPlayerPlaceholder(opt))) return q;
      return { ...q, options: castNames };
    });

    const supabase = createServerClient();
    const { error } = await supabase
      .from('games')
      .update({ questions: resolved })
      .eq('id', gameId);
    if (error) throw error;

    return NextResponse.json({ ok: true, questions: resolved });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
