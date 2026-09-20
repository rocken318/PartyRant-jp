'use client';

import type { GameStatus } from '@/types/domain';

const STATUS_CONFIG: Record<GameStatus, { label: string; bg: string; fg: string; border: string }> = {
  draft:    { label: 'Draft',   bg: 'transparent', fg: '#b9b4ac', border: 'rgba(236,231,223,.2)' },
  lobby:    { label: 'Lobby',   bg: 'transparent', fg: '#ece7df', border: 'rgba(236,231,223,.2)' },
  question: { label: 'Live',    bg: '#cf3a2e',     fg: '#ece7df', border: '#cf3a2e' },
  reveal:   { label: 'Results', bg: 'transparent', fg: '#b8935a', border: 'rgba(184,147,90,.5)' },
  ended:    { label: 'Ended',   bg: 'transparent', fg: '#7d7871', border: 'rgba(236,231,223,.2)' },
};

export function GameStatusBadge({ status }: { status: GameStatus }) {
  const { label, bg, fg, border } = STATUS_CONFIG[status];
  return (
    <span
      className="px-3 py-1 text-xs uppercase"
      style={{ backgroundColor: bg, color: fg, border: `1px solid ${border}`, fontFamily: 'var(--font-bebas)', fontSize: '0.8rem', letterSpacing: '0.2em' }}
    >
      {label}
    </span>
  );
}
