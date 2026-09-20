'use client';

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
        const letter = LABELS[i % LABELS.length];
        // 正解は金の縁、バーも金。それ以外は朱。
        const fillColor = isCorrect ? '#b8935a' : '#cf3a2e';

        return (
          <div
            key={i}
            className="flex flex-col gap-2 p-3.5 bg-[#111114]"
            style={{
              border: isCorrect
                ? '1px solid rgba(184,147,90,.7)'
                : '1px solid rgba(236,231,223,.1)',
            }}
          >
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="shrink-0 text-[0.85rem]"
                  style={{
                    fontFamily: 'var(--font-bebas)',
                    letterSpacing: '0.1em',
                    color: isCorrect ? '#b8935a' : '#b8935a',
                  }}
                >
                  {letter}
                </span>
                <span
                  className="text-sm break-words min-w-0 text-[#ece7df]"
                  style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.02em' }}
                >
                  {option}
                </span>
              </div>
              <span className="text-sm shrink-0 text-[#b9b4ac]" style={{ fontFamily: 'var(--font-dm)' }}>
                {count} <span className="text-[#7d7871]">({pct}%)</span>
              </span>
            </div>
            <div className="w-full h-1.5 overflow-hidden" style={{ backgroundColor: 'rgba(236,231,223,.08)' }}>
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: fillColor }}
              />
            </div>
            {isCorrect && (
              <span
                className="text-[0.68rem] text-[#b8935a] mt-0.5"
                style={{ letterSpacing: '0.16em' }}
              >
                正解
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
