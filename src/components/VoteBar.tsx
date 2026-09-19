'use client';

const BAR_COLORS = ['#cf3a2e', '#b8935a', '#6f8f6a', '#7d7871'];
const BAR_TEXT = ['#ece7df', '#0a0a0b', '#ece7df', '#ece7df'];
const LABELS = ['A', 'B', 'C', 'D'];

interface VoteBarProps {
  options: string[];
  votes: number[];
  correctIndex?: number;
  showCorrect?: boolean;
}

export function VoteBar({ options, votes, correctIndex, showCorrect = false }: VoteBarProps) {
  const total = votes.reduce((sum, v) => sum + v, 0);

  return (
    <div className="flex flex-col gap-3 w-full">
      {options.map((option, i) => {
        const count = votes[i] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const isCorrect = showCorrect && correctIndex === i;
        const bg = isCorrect ? '#6f8f6a' : BAR_COLORS[i % BAR_COLORS.length];
        const fg = isCorrect ? '#FFFFFF' : BAR_TEXT[i % BAR_TEXT.length];
        const letter = LABELS[i % LABELS.length];

        return (
          <div
            key={i}
            className="flex flex-col gap-1 p-3 rounded-[6px] border-[3px] border-pr-dark shadow-[0_4px_16px_rgba(0,0,0,.4)]"
            style={{ backgroundColor: bg }}
          >
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="shrink-0 w-7 h-7 rounded-full border-[2px] flex items-center justify-center text-sm font-bold"
                  style={{
                    fontFamily: 'var(--font-bebas)',
                    fontSize: '1rem',
                    color: fg,
                    borderColor: fg,
                  }}
                >
                  {letter}
                </span>
                <span className="font-bold text-sm break-words min-w-0" style={{ color: fg, fontFamily: 'var(--font-dm)' }}>
                  {option}
                </span>
              </div>
              <span className="font-bold text-sm shrink-0" style={{ color: fg }}>
                {count} ({pct}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: 'rgba(255,255,255,0.5)' }}
              />
            </div>
            {isCorrect && (
              <span className="text-xs font-bold text-white mt-0.5">✓ Correct answer</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
