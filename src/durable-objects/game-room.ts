import { DurableObject } from 'cloudflare:workers';

/**
 * GameRoom — 1 ゲーム = 1 インスタンス（env.GAME_ROOM.idFromName(gameId)）。
 *
 * 責務:
 *  (a) ブラウザの EventSource からの SSE 接続を保持する
 *  (b) サーバー発火イベント（内部 POST /broadcast）を受領し、接続中の全クライアントへ push
 *  (c) keepalive ping で接続を維持する
 *
 * SSE の長時間接続を Worker 本体ではなく DO が保持することで、OpenNext のリクエスト
 * 時間制約を回避する（spec の最重要リスク対策）。イベント型・イベント名は不変。
 */
export class GameRoom extends DurableObject<CloudflareEnv> {
  private encoder = new TextEncoder();
  private streams = new Set<WritableStreamDefaultWriter<Uint8Array>>();
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;

  private static readonly SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  };

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // 内部ブロードキャスト（broadcastGameEvent から）
    if (request.method === 'POST') {
      const event = await request.json().catch(() => null);
      if (event !== null) await this.broadcast(event);
      return new Response(null, { status: 204 });
    }

    // SSE 接続（stream ルートから委譲）
    const gameId = url.searchParams.get('gameId') ?? '';
    return this.openStream(gameId);
  }

  private openStream(gameId: string): Response {
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();
    this.streams.add(writer);

    // 初回 connected イベント
    void writer
      .write(this.encoder.encode(`data: ${JSON.stringify({ type: 'connected', gameId })}\n\n`))
      .catch(() => this.drop(writer));

    this.ensureKeepalive();

    return new Response(readable, { headers: GameRoom.SSE_HEADERS });
  }

  private async broadcast(event: unknown): Promise<void> {
    const chunk = this.encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
    await this.writeToAll(chunk);
  }

  private async writeToAll(chunk: Uint8Array): Promise<void> {
    const dead: WritableStreamDefaultWriter<Uint8Array>[] = [];
    await Promise.all(
      [...this.streams].map(async (w) => {
        try {
          await w.write(chunk);
        } catch {
          dead.push(w);
        }
      })
    );
    for (const w of dead) this.drop(w);
  }

  private drop(writer: WritableStreamDefaultWriter<Uint8Array>): void {
    this.streams.delete(writer);
    try {
      void writer.close();
    } catch {
      /* already closed */
    }
    if (this.streams.size === 0) this.stopKeepalive();
  }

  private ensureKeepalive(): void {
    if (this.keepaliveTimer !== null) return;
    this.keepaliveTimer = setInterval(() => {
      if (this.streams.size === 0) {
        this.stopKeepalive();
        return;
      }
      void this.writeToAll(this.encoder.encode(': ping\n\n'));
    }, 15000);
  }

  private stopKeepalive(): void {
    if (this.keepaliveTimer !== null) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }
}
