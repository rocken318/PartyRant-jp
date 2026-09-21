import { headers, cookies } from 'next/headers';
import { resolveBrandId, getBrandById, type Brand } from '@/lib/brands';

/**
 * サーバーコンポーネント/generateMetadata で現在のブランドを取得。
 * 解決順: cookie(brand) の override → ホスト名(ドメイン) → 既定(kingyo)。
 * middleware に依存しない（headers()/cookies() は dev/本番どちらでも効く）。
 */
export async function getBrandServer(): Promise<Brand> {
  const [h, c] = await Promise.all([headers(), cookies()]);
  const host = h.get('host');
  const override = c.get('brand')?.value ?? null;
  return getBrandById(resolveBrandId(host, override));
}
