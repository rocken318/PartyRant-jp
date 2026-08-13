// カスタム Worker エントリー。
// OpenNext が生成した .open-next/worker.js（Next ハンドラ + OpenNext 自身の DO）を
// そのまま再エクスポートしつつ、アプリ独自の GameRoom Durable Object を追加でエクスポートする。
// wrangler.jsonc の main はこのファイルを指す。tsconfig からは除外（wrangler/esbuild が束ねる）。

// @ts-expect-error .open-next/worker.js はビルド後に生成される
export { default } from './.open-next/worker.js';
// @ts-expect-error OpenNext 自身の DO も引き続きエクスポートする必要がある
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';

export { GameRoom } from './src/durable-objects/game-room';
