'use client';

interface AnswerButtonProps {
  label: string;
  index: number;
  disabled?: boolean;
  selected?: boolean;
  onClick: () => void;
}

const LABELS = ['A', 'B', 'C', 'D'];

export function AnswerButton({
  label,
  index,
  disabled = false,
  selected = false,
  onClick,
}: AnswerButtonProps) {
  const letter = LABELS[index % LABELS.length];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'group w-full min-h-[64px] px-5 py-4',
        'flex items-center gap-4 text-left',
        'transition-colors duration-300',
        'touch-manipulation cursor-pointer',
        selected
          ? 'bg-[var(--kg-accent)] text-[var(--kg-paper)] border border-[var(--kg-accent)]'
          : 'bg-[var(--kg-sumi)] text-[var(--kg-paper)] border border-[rgba(var(--kg-paper-rgb),.14)] hover:border-[rgba(var(--kg-accent-rgb),.6)]',
        disabled && !selected ? 'opacity-40' : '',
        disabled ? 'cursor-not-allowed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className={[
          'shrink-0 text-[0.9rem] transition-colors duration-300',
          selected ? 'text-[var(--kg-paper)]' : 'text-[var(--kg-gold)]',
        ].join(' ')}
        style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.1em' }}
      >
        {letter}
      </span>
      <span aria-hidden className={selected ? 'h-5 w-px bg-[var(--kg-paper)]/40' : 'h-5 w-px bg-[rgba(var(--kg-paper-rgb),.14)]'} />
      <span className="text-[1.02rem] leading-snug" style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.03em' }}>
        {label}
      </span>
      {selected && (
        <span aria-hidden className="ml-auto text-[0.85rem] text-[var(--kg-paper)]/80" style={{ fontFamily: 'var(--font-bebas)' }}>
          ✓
        </span>
      )}
    </button>
  );
}
