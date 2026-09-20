import Link from 'next/link';
import { BRAND } from '@/app/brand';

interface Props {
  title: string;
  cta1: string;
  cta2: string;
}

export function FinalCtaSection({ title, cta1, cta2 }: Props) {
  return (
    <section className="bg-[#0a0a0b] px-6 py-16 flex flex-col items-center gap-8 text-center">
      <span aria-hidden className="block h-px w-12 bg-[#cf3a2e]" />
      <p
        className="text-[#ece7df] leading-tight text-[2rem]"
        style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em', textShadow: '0 0 48px rgba(207,58,46,.35)' }}
      >
        {title}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-[320px]">
        <Link
          href="/auth/login"
          className="w-full h-14 bg-[#cf3a2e] text-[#ece7df] flex items-center justify-center gap-2 text-base transition-colors duration-300 hover:bg-[#d8483c] active:bg-[#a12417] touch-manipulation"
          style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.12em', boxShadow: '0 14px 40px rgba(207,58,46,.24)' }}
        >
          {cta1}
        </Link>
        <Link
          href="/presets"
          className="w-full h-12 bg-transparent text-[#b8935a] flex items-center justify-center gap-2 text-sm border border-[rgba(184,147,90,.45)] transition-colors duration-300 hover:border-[#b8935a] hover:bg-[#b8935a]/5 touch-manipulation"
          style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.1em' }}
        >
          {cta2} <span aria-hidden>→</span>
        </Link>
      </div>

      <p className="text-[#7d7871] text-xs">© 2026 {BRAND.club}</p>
    </section>
  );
}
