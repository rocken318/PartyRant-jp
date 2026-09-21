'use client';

import { useEffect } from 'react';

/**
 * ?brand=xxx が付いていたら cookie に固定して一度だけリロード（プレビュー用）。
 * 本番はドメインで自動判定されるので、これは主に開発/プレビュー用途。
 */
export function BrandPreviewSync() {
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('brand');
    if (!p) return;
    const current = document.cookie.match(/(?:^|; )brand=([^;]*)/)?.[1];
    if (current !== p) {
      document.cookie = `brand=${encodeURIComponent(p)};path=/;max-age=31536000;samesite=lax`;
      window.location.reload();
    }
  }, []);
  return null;
}
