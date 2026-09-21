import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getBrandServer } from '@/lib/brand-server';

export default async function LandingPage() {
  const t = await getTranslations('landing');
  const brand = await getBrandServer();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--kg-ink)] text-[var(--kg-paper)]">
      {/* 上部のほのかな朱の灯り */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh]"
        style={{
          background:
            'radial-gradient(120% 70% at 50% -10%, rgba(var(--kg-accent-rgb),.28) 0%, rgba(var(--kg-accent-rgb),.06) 38%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-[460px] flex-col px-8">
        {/* ヒーロー */}
        <header className="flex flex-col items-center pt-24 text-center">
          <span
            className="text-[0.62rem] uppercase text-[var(--kg-gold)]"
            style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.5em', textIndent: '0.5em' }}
          >
            {brand.club}
          </span>

          <h1
            className="mt-7 text-[3.1rem] font-medium leading-[1.14] text-[var(--kg-paper)]"
            style={{
              fontFamily: 'var(--font-dm)',
              letterSpacing: '0.08em',
              textShadow: '0 0 48px rgba(var(--kg-accent-rgb),.45)',
            }}
          >
            {brand.name}
          </h1>

          {/* 朱のヘアライン */}
          <span aria-hidden className="mt-8 block h-px w-12 bg-[var(--kg-accent)]" />

          <p
            className="mt-6 text-[0.72rem] text-[var(--kg-paper-dim)]"
            style={{ letterSpacing: '0.34em', textIndent: '0.34em' }}
          >
            {t('tagline')}
          </p>
        </header>

        {/* リード */}
        <section className="mt-16 flex flex-col items-center text-center">
          <p
            className="whitespace-pre-line text-[1.35rem] leading-[1.9] text-[var(--kg-paper)]"
            style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.04em' }}
          >
            {t('headline')}
          </p>
          <p className="mt-5 max-w-[19rem] text-[0.82rem] leading-[1.9] text-[var(--kg-mist)]">
            {t('subtitle')}
          </p>
        </section>

        {/* CTA */}
        <nav className="mt-auto flex flex-col gap-3.5 pb-7 pt-16">
          {/* すぐ遊ぶ（主） */}
          <Link
            href="/presets"
            className="group relative flex h-[58px] items-center justify-center overflow-hidden bg-[var(--kg-accent)] text-[var(--kg-paper)] transition-colors duration-300 active:bg-[var(--kg-accent-deep)]"
            style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.14em', boxShadow: '0 14px 40px rgba(var(--kg-accent-rgb),.28)' }}
          >
            <span className="text-[0.98rem]">{t('playNow')}</span>
            <span aria-hidden className="ml-3 text-[0.9rem] transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>

          {/* AIでその場作成（副・金の縁） */}
          <Link
            href="/presets"
            className="flex h-[52px] items-center justify-center border border-[var(--kg-gold)]/45 text-[var(--kg-gold)] transition-colors duration-300 hover:border-[var(--kg-gold)] hover:bg-[var(--kg-gold)]/5"
            style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.12em' }}
          >
            <span aria-hidden className="mr-2 text-[0.7rem]">✦</span>
            <span className="text-[0.9rem]">{t('aiCreate')}</span>
          </Link>

          {/* 自分で作る / 参加する（線のみ） */}
          <div className="grid grid-cols-2 gap-3.5">
            <Link
              href="/auth/login"
              className="flex h-[52px] items-center justify-center border border-[rgba(var(--kg-paper-rgb),.16)] text-[var(--kg-paper)]/85 transition-colors duration-300 hover:border-[rgba(var(--kg-paper-rgb),.4)]"
              style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.1em' }}
            >
              <span className="text-[0.86rem]">{t('hostGame')}</span>
            </Link>
            <Link
              href="/join"
              className="flex h-[52px] items-center justify-center border border-[rgba(var(--kg-paper-rgb),.16)] text-[var(--kg-paper)]/85 transition-colors duration-300 hover:border-[rgba(var(--kg-paper-rgb),.4)]"
              style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.1em' }}
            >
              <span className="text-[0.86rem]">{t('joinGame')}</span>
            </Link>
          </div>

          {/* テキストリンク */}
          <div className="mt-3 flex items-center justify-center gap-6 text-[0.72rem] text-[var(--kg-mist)]">
            <Link href="/lp" className="underline decoration-[var(--kg-mist)]/40 underline-offset-4 transition-colors hover:text-[var(--kg-paper-dim)]" style={{ letterSpacing: '0.08em' }}>
              {t('learnMore')}
            </Link>
            <span aria-hidden className="text-[var(--kg-mist)]/40">·</span>
            <Link href="/guide" className="underline decoration-[var(--kg-mist)]/40 underline-offset-4 transition-colors hover:text-[var(--kg-paper-dim)]" style={{ letterSpacing: '0.08em' }}>
              {t('guide')}
            </Link>
          </div>
        </nav>
      </div>
    </main>
  );
}
