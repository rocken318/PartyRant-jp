'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export function GameQRCode({ joinCode }: { joinCode: string }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const origin = window.location.origin;
    const localhost = origin.includes('localhost') || origin.includes('127.0.0.1');

    if (!localhost) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl(`${origin}/join/${joinCode}`);
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
      <div className="w-64 h-64 bg-[#111114] border border-[rgba(236,231,223,.14)] animate-pulse" />
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* QRは読み取りのため白の余白が必要。金のヘアラインで上品に額装 */}
      <div className="p-4 bg-[#ece7df]" style={{ border: '1px solid rgba(184,147,90,.6)' }}>
        <QRCodeSVG value={url} size={224} bgColor="#ece7df" fgColor="#0a0a0b" />
      </div>
      <p className="text-xs text-[#7d7871] text-center break-all max-w-xs">{url}</p>
      {isLocalhost && (
        <p
          className="text-xs text-[#b8935a] text-center max-w-xs bg-[#111114] px-3 py-1.5 border border-[rgba(184,147,90,.35)]"
          style={{ letterSpacing: '0.04em' }}
        >
          ローカル開発中: PCとスマホを同じWi-Fiに接続してください
        </p>
      )}
    </div>
  );
}
