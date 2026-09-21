'use client';

import type { Score } from '@/types/domain';

interface LeaderboardProps {
  scores: Score[];
  limit?: number;
}

export function Leaderboard({ scores, limit }: LeaderboardProps) {
  const sorted = [...scores].sort((a, b) => b.totalPoints - a.totalPoints);
  const displayed = limit ? sorted.slice(0, limit) : sorted;

  if (displayed.length === 0) {
    return <p className="text-sm text-[var(--kg-mist)]">No scores yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {displayed.map((score, i) => {
        const isFirst = i === 0;
        return (
          <div
            key={score.playerId}
            className="flex items-center gap-4 px-4 py-3 bg-[var(--kg-sumi)]"
            style={{
              border: isFirst ? '1px solid rgba(var(--kg-gold-rgb),.6)' : '1px solid rgba(var(--kg-paper-rgb),.1)',
            }}
          >
            <span
              className="w-7 text-center shrink-0 text-[1.1rem]"
              style={{
                fontFamily: 'var(--font-bebas)',
                color: isFirst ? 'var(--kg-gold)' : 'var(--kg-mist)',
                letterSpacing: '0.04em',
              }}
            >
              {i + 1}
            </span>
            <span
              className="flex-1 truncate text-[var(--kg-paper)]"
              style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.02em' }}
            >
              {score.displayName}
            </span>
            <div className="flex flex-col items-end shrink-0">
              <span
                style={{
                  fontFamily: 'var(--font-bebas)',
                  fontSize: '1.15rem',
                  color: isFirst ? 'var(--kg-gold)' : 'var(--kg-paper)',
                  letterSpacing: '0.04em',
                }}
              >
                {score.totalPoints} pts
              </span>
              {score.correctCount > 0 && (
                <span className="text-xs text-[var(--kg-mist)]">{score.correctCount} correct</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
