'use client';

interface AnswerButtonProps {
  label: string;
  index: number;
  disabled?: boolean;
  selected?: boolean;
  onClick: () => void;
}

// A=Pink, B=Yellow(dark text), C=Green, D=Blue
const BG_COLORS = ['#cf3a2e', '#b8935a', '#6f8f6a', '#7d7871'];
const TEXT_COLORS = ['#ece7df', '#0a0a0b', '#ece7df', '#ece7df'];
const LABELS = ['A', 'B', 'C', 'D'];

export function AnswerButton({
  label,
  index,
  disabled = false,
  selected = false,
  onClick,
}: AnswerButtonProps) {
  const bg = BG_COLORS[index % BG_COLORS.length];
  const fg = TEXT_COLORS[index % TEXT_COLORS.length];
  const letter = LABELS[index % LABELS.length];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ backgroundColor: bg, color: fg }}
      className={[
        'w-full min-h-[80px] px-4 py-3 rounded-[8px]',
        'border-[3px] border-pr-dark',
        selected
          ? 'shadow-[0_2px_8px_rgba(0,0,0,.4)] translate-x-[2px] translate-y-[2px]'
          : 'shadow-[0_4px_16px_rgba(0,0,0,.4)] active:shadow-[0_1px_4px_rgba(0,0,0,.3)] active:translate-x-[2px] active:translate-y-[2px]',
        'transition-[transform,box-shadow] duration-75',
        'touch-manipulation cursor-pointer',
        disabled && !selected ? 'opacity-40' : '',
        disabled ? 'cursor-not-allowed' : '',
        'flex items-center gap-3 text-left',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className="shrink-0 w-8 h-8 rounded-full border-[2px] border-current flex items-center justify-center text-sm font-bold"
        style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem' }}
      >
        {letter}
      </span>
      <span className="font-bold text-lg leading-tight" style={{ fontFamily: 'var(--font-dm)' }}>
        {label}
      </span>
      {selected && <span className="ml-auto text-xl">✓</span>}
    </button>
  );
}
