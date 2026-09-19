'use client';

import type { GameStatus } from '@/types/domain';

const STATUS_CONFIG: Record<GameStatus, { label: string; bg: string; fg: string }> = {
  draft:    { label: 'Draft',   bg: '#17171b', fg: '#b9b4ac' },
  lobby:    { label: 'Lobby',   bg: '#17171b', fg: '#ece7df' },
  question: { label: '🔴 LIVE', bg: '#cf3a2e', fg: '#ece7df' },
  reveal:   { label: 'Results', bg: '#b8935a', fg: '#0a0a0b' },
  ended:    { label: 'Ended',   bg: '#111111', fg: '#FFFFFF' },
};

export function GameStatusBadge({ status }: { status: GameStatus }) {
  const { label, bg, fg } = STATUS_CONFIG[status];
  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-bold border-[2px] border-pr-dark shadow-[0_2px_8px_rgba(0,0,0,.4)] uppercase tracking-wide"
      style={{ backgroundColor: bg, color: fg, fontFamily: 'var(--font-bebas)', fontSize: '0.85rem' }}
    >
      {label}
    </span>
  );
}
