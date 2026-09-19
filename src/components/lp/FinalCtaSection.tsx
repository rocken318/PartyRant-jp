import Link from 'next/link';
import { BRAND } from '@/app/brand';

interface Props {
  title: string;
  cta1: string;
  cta2: string;
}

export function FinalCtaSection({ title, cta1, cta2 }: Props) {
  return (
    <section className="bg-pr-dark px-6 py-16 flex flex-col items-center gap-8 text-center">
      <p
        className="text-white leading-tight"
        style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.2rem' }}
      >
        {title}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-[320px]">
        <Link
          href="/auth/login"
          className="w-full h-14 bg-pr-pink text-white flex items-center justify-center text-base font-bold rounded-[6px] border-[3px] border-white shadow-[5px_5px_0_rgba(255,255,255,0.3)] active:shadow-[2px_2px_0_rgba(255,255,255,0.3)] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation"
          style={{ fontFamily: 'var(--font-dm)' }}
        >
          {cta1}
        </Link>
        <Link
          href="/presets"
          className="w-full h-12 bg-white text-pr-dark flex items-center justify-center text-sm font-bold rounded-[6px] border-[3px] border-white shadow-[4px_4px_0_rgba(255,255,255,0.2)] active:shadow-[2px_2px_0_rgba(255,255,255,0.2)] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation"
          style={{ fontFamily: 'var(--font-dm)' }}
        >
          {cta2} →
        </Link>
      </div>

      <p className="text-white/30 text-xs">© 2026 {BRAND.club}</p>
    </section>
  );
}
