export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { store } from '@/lib/store';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await context.params;
  const game = await store.getGame(gameId);
  if (!game) {
    return new Response(JSON.stringify({ error: 'Game not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // SSE 接続は GameRoom Durable Object が保持する（1 ゲーム = 1 DO）。
  // ルートは接続確立を DO の SSE ハンドラへ委譲するだけ。
  const { env } = getCloudflareContext();
  const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(gameId));
  return stub.fetch(`https://game-room/sse?gameId=${encodeURIComponent(gameId)}`, {
    headers: { Accept: 'text/event-stream' },
    signal: req.signal,
  });
}
