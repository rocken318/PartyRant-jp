import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function LandingPage() {
  const t = await getTranslations('landing');

  return (
    <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
      {/* Pink header band */}
      <div className="bg-pr-pink px-6 pt-16 pb-20 flex flex-col items-center gap-2 rounded-b-[40px]">
        <h1
          className="text-white tracking-wider"
          style={{ fontFamily: 'var(--font-bebas)', fontSize: '5rem', lineHeight: 1 }}
        >
          PartyRant
        </h1>
        <p className="text-white/80 text-xs font-bold uppercase tracking-[0.2em]">
          {t('tagline')}
        </p>
      </div>

      {/* Body */}
      <div className="flex flex-col items-center gap-5 px-6 py-10 text-center">
        <span className="text-6xl animate-bounce">🎉</span>
        <p className="text-pr-dark text-2xl font-extrabold whitespace-pre-line" style={{ fontFamily: 'var(--font-dm)' }}>
          {t('headline')}
        </p>
        <p className="text-gray-500 text-base">
          {t('subtitle')}
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-4 px-6 pb-12 mt-auto">
        {/* すぐ遊ぶ（プリセット） */}
        <Link
          href="/presets"
          className="w-full h-16 bg-pr-pink text-white flex items-center justify-center text-lg font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[5px_5px_0_#111] active:shadow-[2px_2px_0_#111] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation"
          style={{ fontFamily: 'var(--font-dm)' }}
        >
          {t('playNow')}
        </Link>

        {/* 自分で作る */}
        <Link
          href="/auth/login"
          className="w-full h-16 bg-white text-pr-dark flex items-center justify-center text-lg font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[5px_5px_0_#111] active:shadow-[2px_2px_0_#111] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation"
          style={{ fontFamily: 'var(--font-dm)' }}
        >
          {t('hostGame')}
        </Link>

        {/* 参加する */}
        <Link
          href="/join"
          className="w-full h-14 bg-pr-dark text-white flex items-center justify-center text-base font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[4px_4px_0_#111] active:shadow-[2px_2px_0_#111] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation"
          style={{ fontFamily: 'var(--font-dm)' }}
        >
          {t('joinGame')}
        </Link>
      </div>
    </main>
  );
}
