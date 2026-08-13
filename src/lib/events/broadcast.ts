import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { GameEvent } from './types';

export function getGameBroadcastTopic(gameId: string): string {
  return `game-${gameId}`;
}

/**
 * サーバー発火イベントを GameRoom Durable Object へ中継する。
 * DO が接続中の全 SSE クライアントへ push する（1 ゲーム = 1 DO）。
 */
export async function broadcastGameEvent(gameId: string, event: GameEvent): Promise<void> {
  try {
    const { env } = getCloudflareContext();
    const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(gameId));
    const res = await stub.fetch('https://game-room/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      console.error('GameRoom broadcast failed', { gameId, status: res.status });
    }
  } catch (error) {
    console.error('GameRoom broadcast error', { gameId, error });
  }
}
