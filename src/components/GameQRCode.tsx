'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export function GameQRCode({ joinCode }: { joinCode: string }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const origin = window.location.origin;
    const localhost = origin.includes('localhost') || origin.includes('127.0.0.1');

    if (!localhost) {
      // Non-localhost: resolve immediately via promise for consistency
      Promise.resolve(`${origin}/join/${joinCode}`).then(setUrl);
      return;
    }

    // On localhost: fetch the PC's local network IP so mobile can reach it
    fetch('/api/local-url')
      .then(r => r.ok ? r.json() as Promise<{ networkUrl: string | null }> : Promise.resolve({ networkUrl: null }))
      .then(({ networkUrl }) => {
        const base = networkUrl ?? origin;
        return `${base}/join/${joinCode}`;
      })
      .then(setUrl)
      .catch(() => setUrl(`${origin}/join/${joinCode}`));
  }, [joinCode]);

  // Derive isLocalhost from the resolved URL — only relevant after url is set
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');

  if (!url) {
    return (
      <div className="w-64 h-64 bg-gray-100 rounded-[8px] border-[3px] border-pr-dark animate-pulse" />
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="p-4 bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[5px_5px_0_#111]">
        <QRCodeSVG value={url} size={224} />
      </div>
      <p className="text-xs text-gray-400 text-center break-all max-w-xs">{url}</p>
      {isLocalhost && (
        <p className="text-xs text-amber-600 font-bold text-center max-w-xs bg-amber-50 rounded-[6px] px-3 py-1.5 border border-amber-200">
          ⚠️ ローカル開発中: PCとスマホを同じWi-Fiに接続してください
        </p>
      )}
    </div>
  );
}
