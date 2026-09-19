'use client';

import type { Score } from '@/types/domain';

interface LeaderboardProps {
  scores: Score[];
  limit?: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function Leaderboard({ scores, limit }: LeaderboardProps) {
  const sorted = [...scores].sort((a, b) => b.totalPoints - a.totalPoints);
  const displayed = limit ? sorted.slice(0, limit) : sorted;

  if (displayed.length === 0) {
    return <p className="text-sm text-gray-500">No scores yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {displayed.map((score, i) => (
        <div
          key={score.playerId}
          className="flex items-center gap-3 px-4 py-3 rounded-[6px] border-[3px] border-pr-dark bg-white shadow-[0_4px_12px_rgba(0,0,0,.35)]"
        >
          <span className="text-xl w-8 text-center shrink-0">
            {i < 3 ? MEDALS[i] : <span className="text-sm font-bold text-gray-400">#{i + 1}</span>}
          </span>
          <span className="flex-1 font-bold text-pr-dark truncate" style={{ fontFamily: 'var(--font-dm)' }}>
            {score.displayName}
          </span>
          <div className="flex flex-col items-end shrink-0">
            <span className="font-bold text-pr-dark" style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem' }}>
              {score.totalPoints} pts
            </span>
            {score.correctCount > 0 && (
              <span className="text-xs text-gray-500">{score.correctCount} correct</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
