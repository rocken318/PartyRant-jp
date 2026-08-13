import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * リクエスト処理中に D1 バインディング（wrangler.jsonc の binding: "DB"）を取得する。
 * OpenNext の getCloudflareContext 経由。ルートハンドラ内から同期取得できる。
 */
export function getDb(): D1Database {
  return getCloudflareContext().env.DB;
}
