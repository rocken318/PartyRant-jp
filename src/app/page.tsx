import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { BRAND } from '@/app/brand';

export default async function LandingPage() {
  const t = await getTranslations('landing');

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0b] text-[#ece7df]">
      {/* 上部のほのかな朱の灯り */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh]"
        style={{
          background:
            'radial-gradient(120% 70% at 50% -10%, rgba(207,58,46,.28) 0%, rgba(207,58,46,.06) 38%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-[460px] flex-col px-8">
        {/* ヒーロー */}
        <header className="flex flex-col items-center pt-24 text-center">
          <span
            className="text-[0.62rem] uppercase text-[#b8935a]"
            style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.5em', textIndent: '0.5em' }}
          >
            NEWCLUB Kingyo
          </span>

          <h1
            className="mt-7 text-[3.1rem] font-medium leading-[1.14] text-[#ece7df]"
            style={{
              fontFamily: 'var(--font-dm)',
              letterSpacing: '0.08em',
              textShadow: '0 0 48px rgba(207,58,46,.45)',
            }}
          >
            宴会<br />ゲームズ
          </h1>

          {/* 朱のヘアライン */}
          <span aria-hidden className="mt-8 block h-px w-12 bg-[#cf3a2e]" />

          <p
            className="mt-6 text-[0.72rem] text-[#b9b4ac]"
            style={{ letterSpacing: '0.34em', textIndent: '0.34em' }}
          >
            {t('tagline')}
          </p>
        </header>

        {/* リード */}
        <section className="mt-16 flex flex-col items-center text-center">
          <p
            className="whitespace-pre-line text-[1.35rem] leading-[1.9] text-[#ece7df]"
            style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.04em' }}
          >
            {t('headline')}
          </p>
          <p className="mt-5 max-w-[19rem] text-[0.82rem] leading-[1.9] text-[#7d7871]">
            {t('subtitle')}
          </p>
        </section>

        {/* CTA */}
        <nav className="mt-auto flex flex-col gap-3.5 pb-7 pt-16">
          {/* すぐ遊ぶ（主） */}
          <Link
            href="/presets"
            className="group relative flex h-[58px] items-center justify-center overflow-hidden bg-[#cf3a2e] text-[#ece7df] transition-colors duration-300 active:bg-[#a12417]"
            style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.14em', boxShadow: '0 14px 40px rgba(207,58,46,.28)' }}
          >
            <span className="text-[0.98rem]">{t('playNow')}</span>
            <span aria-hidden className="ml-3 text-[0.9rem] transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>

          {/* AIでその場作成（副・金の縁） */}
          <Link
            href="/presets"
            className="flex h-[52px] items-center justify-center border border-[#b8935a]/45 text-[#b8935a] transition-colors duration-300 hover:border-[#b8935a] hover:bg-[#b8935a]/5"
            style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.12em' }}
          >
            <span aria-hidden className="mr-2 text-[0.7rem]">✦</span>
            <span className="text-[0.9rem]">{t('aiCreate')}</span>
          </Link>

          {/* 自分で作る / 参加する（線のみ） */}
          <div className="grid grid-cols-2 gap-3.5">
            <Link
              href="/auth/login"
              className="flex h-[52px] items-center justify-center border border-[rgba(236,231,223,.16)] text-[#ece7df]/85 transition-colors duration-300 hover:border-[rgba(236,231,223,.4)]"
              style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.1em' }}
            >
              <span className="text-[0.86rem]">{t('hostGame')}</span>
            </Link>
            <Link
              href="/join"
              className="flex h-[52px] items-center justify-center border border-[rgba(236,231,223,.16)] text-[#ece7df]/85 transition-colors duration-300 hover:border-[rgba(236,231,223,.4)]"
              style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.1em' }}
            >
              <span className="text-[0.86rem]">{t('joinGame')}</span>
            </Link>
          </div>

          {/* テキストリンク */}
          <div className="mt-3 flex items-center justify-center gap-6 text-[0.72rem] text-[#7d7871]">
            <Link href="/lp" className="underline decoration-[#7d7871]/40 underline-offset-4 transition-colors hover:text-[#b9b4ac]" style={{ letterSpacing: '0.08em' }}>
              {t('learnMore')}
            </Link>
            <span aria-hidden className="text-[#7d7871]/40">·</span>
            <Link href="/guide" className="underline decoration-[#7d7871]/40 underline-offset-4 transition-colors hover:text-[#b9b4ac]" style={{ letterSpacing: '0.08em' }}>
              {t('guide')}
            </Link>
          </div>
        </nav>
      </div>
    </main>
  );
}
