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
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
        Join Code
      </p>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Join code ${code}. Tap to copy.`}
        className="flex flex-col items-center gap-1 px-8 py-4 rounded-[8px] border-[3px] border-pr-dark bg-white shadow-[0_10px_40px_rgba(0,0,0,.5)] active:shadow-[0_1px_4px_rgba(0,0,0,.3)] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation cursor-pointer"
      >
        <span
          className="text-pr-pink tracking-widest select-all"
          style={{ fontFamily: 'var(--font-bebas)', fontSize: '5rem', lineHeight: 1 }}
        >
          {code}
        </span>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {copied ? '✓ Copied!' : 'Tap to copy'}
        </span>
      </button>
    </div>
  );
}
