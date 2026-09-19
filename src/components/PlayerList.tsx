'use client';

import type { Player } from '@/types/domain';

export function PlayerList({ players }: { players: Player[] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
        {players.length} player{players.length !== 1 ? 's' : ''} joined
      </p>
      {players.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Waiting for players to join...</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {players.map((player) => (
            <li
              key={player.id}
              className="px-3 py-1.5 rounded-full bg-pr-pink text-white text-sm font-bold border-[2px] border-pr-dark shadow-[0_2px_8px_rgba(0,0,0,.3)]"
              style={{ fontFamily: 'var(--font-dm)' }}
            >
              {player.displayName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
