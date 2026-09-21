'use client';

import type { GameStatus } from '@/types/domain';

const STATUS_CONFIG: Record<GameStatus, { label: string; bg: string; fg: string; border: string }> = {
  draft:    { label: 'Draft',   bg: 'transparent', fg: 'var(--kg-paper-dim)', border: 'rgba(var(--kg-paper-rgb),.2)' },
  lobby:    { label: 'Lobby',   bg: 'transparent', fg: 'var(--kg-paper)', border: 'rgba(var(--kg-paper-rgb),.2)' },
  question: { label: 'Live',    bg: 'var(--kg-accent)',     fg: 'var(--kg-paper)', border: 'var(--kg-accent)' },
  reveal:   { label: 'Results', bg: 'transparent', fg: 'var(--kg-gold)', border: 'rgba(var(--kg-gold-rgb),.5)' },
  ended:    { label: 'Ended',   bg: 'transparent', fg: 'var(--kg-mist)', border: 'rgba(var(--kg-paper-rgb),.2)' },
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
