'use client';

import type { Player } from '@/types/domain';

export function PlayerList({ players }: { players: Player[] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[0.7rem] text-[var(--kg-paper-dim)]" style={{ letterSpacing: '0.16em' }}>
        {players.length} player{players.length !== 1 ? 's' : ''} joined
      </p>
      {players.length === 0 ? (
        <p className="text-sm text-[var(--kg-mist)] italic">Waiting for players to join...</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {players.map((player) => (
            <li
              key={player.id}
              className="px-4 py-1.5 text-sm text-[var(--kg-paper)] bg-[var(--kg-sumi)] border border-[rgba(var(--kg-gold-rgb),.35)]"
              style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.02em' }}
            >
              {player.displayName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
