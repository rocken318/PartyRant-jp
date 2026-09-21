import Link from 'next/link';

interface Props {
  title: string;
  cta1: string;
  cta2: string;
  brandClub: string;
}

export function FinalCtaSection({ title, cta1, cta2, brandClub }: Props) {
  return (
    <section className="bg-[var(--kg-ink)] px-6 py-16 flex flex-col items-center gap-8 text-center">
      <span aria-hidden className="block h-px w-12 bg-[var(--kg-accent)]" />
      <p
        className="text-[var(--kg-paper)] leading-tight text-[2rem]"
        style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em', textShadow: '0 0 48px rgba(var(--kg-accent-rgb),.35)' }}
      >
        {title}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-[320px]">
        <Link
          href="/auth/login"
          className="w-full h-14 bg-[var(--kg-accent)] text-[var(--kg-paper)] flex items-center justify-center gap-2 text-base transition-colors duration-300 hover:bg-[var(--kg-accent-hover)] active:bg-[var(--kg-accent-deep)] touch-manipulation"
          style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.12em', boxShadow: '0 14px 40px rgba(var(--kg-accent-rgb),.24)' }}
        >
          {cta1}
        </Link>
        <Link
          href="/presets"
          className="w-full h-12 bg-transparent text-[var(--kg-gold)] flex items-center justify-center gap-2 text-sm border border-[rgba(var(--kg-gold-rgb),.45)] transition-colors duration-300 hover:border-[var(--kg-gold)] hover:bg-[var(--kg-gold)]/5 touch-manipulation"
          style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.1em' }}
        >
          {cta2} <span aria-hidden>→</span>
        </Link>
      </div>

      <p className="text-[var(--kg-mist)] text-xs">© 2026 {brandClub}</p>
    </section>
  );
}
