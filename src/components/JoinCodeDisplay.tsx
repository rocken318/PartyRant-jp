'use client';

import { useState } from 'react';

export function JoinCodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-[0.62rem] text-[#b8935a]" style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.42em', textIndent: '0.42em', textTransform: 'uppercase' }}>
        Join Code
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Join code ${code}. Tap to copy.`}
        className="flex flex-col items-center gap-2 px-10 py-5 bg-[#111114] border border-[rgba(184,147,90,.4)] transition-colors duration-300 hover:border-[rgba(184,147,90,.7)] touch-manipulation cursor-pointer"
      >
        <span
          className="text-[#cf3a2e] select-all"
          style={{ fontFamily: 'var(--font-bebas)', fontSize: '4.6rem', lineHeight: 1, letterSpacing: '0.14em', textIndent: '0.14em', textShadow: '0 0 40px rgba(207,58,46,.4)' }}
        >
          {code}
        </span>
        <span className="text-[0.62rem] text-[#7d7871]" style={{ letterSpacing: '0.2em' }}>
          {copied ? 'COPIED' : 'TAP TO COPY'}
        </span>
      </button>
    </div>
  );
}
