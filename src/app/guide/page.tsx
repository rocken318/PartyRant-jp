import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function GuidePage() {
  const t = await getTranslations('guide');

  return (
    <main className="kg-page kg-grain">
      <div aria-hidden className="kg-glow" />

      <div className="kg-wrap relative z-[2] flex min-h-screen flex-col pb-14">

        {/* ── Section 1: Hero ── */}
        <header className="pt-8">
          <div className="flex items-center">
            <Link
              href="/"
              aria-label="←"
              className="flex h-10 w-10 items-center justify-center border border-[rgba(var(--kg-paper-rgb),.16)] text-[var(--kg-paper)]/80 transition-colors duration-300 hover:border-[rgba(var(--kg-paper-rgb),.4)] touch-manipulation"
            >
              <span aria-hidden className="text-lg">←</span>
            </Link>
          </div>
          <div className="mt-10 flex flex-col items-center text-center">
            <span className="kg-eyebrow">Guide</span>
            <h1
              className="mt-6 text-[2.6rem] font-medium leading-[1.15] text-[var(--kg-paper)]"
              style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.08em', textShadow: '0 0 48px rgba(var(--kg-accent-rgb),.45)' }}
            >
              {t('heroTitle')}
            </h1>
            <span aria-hidden className="mt-7 block h-px w-12 bg-[var(--kg-accent)]" />
            <p className="mt-6 text-[0.74rem] text-[var(--kg-paper-dim)]" style={{ letterSpacing: '0.24em', textIndent: '0.24em' }}>
              {t('heroTagline')}
            </p>
          </div>
        </header>

        <div className="mt-16 flex flex-col gap-14">

          {/* ── Section 2: サービス紹介 ── */}
          <section className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <span className="kg-eyebrow">About</span>
              <h2 className="kg-h text-[1.7rem] leading-tight">{t('aboutTitle')}</h2>
              <span aria-hidden className="kg-rule" />
            </div>
            <p className="text-[0.84rem] leading-[1.9] text-[var(--kg-paper-dim)]">
              {t('aboutBody')}
            </p>

            {/* Game mode cards */}
            <div className="mt-2 flex flex-col gap-3">
              {[
                { name: t('modeTriviaName'), desc: t('modeTriviaDesc') },
                { name: t('modePollingName'), desc: t('modePollingDesc') },
                { name: t('modeOpinionName'), desc: t('modeOpinionDesc') },
              ].map((m, i) => (
                <div key={i} className="kg-card flex items-start gap-4 px-5 py-4">
                  <span aria-hidden className="mt-1 text-[0.8rem] text-[var(--kg-gold)]" style={{ fontFamily: 'var(--font-bebas)' }}>◆</span>
                  <div className="min-w-0">
                    <p className="kg-h text-[1.02rem] leading-tight">{m.name}</p>
                    <p className="mt-1 text-[0.76rem] leading-relaxed text-[var(--kg-mist)]">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <span aria-hidden className="kg-rule--full" />

          {/* ── Section 3: 使い方（4ステップ）── */}
          <section className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <span className="kg-eyebrow">How to</span>
              <h2 className="kg-h text-[1.7rem] leading-tight">{t('howTitle')}</h2>
              <span aria-hidden className="kg-rule" />
            </div>

            <div className="flex flex-col gap-3">
              {[
                { num: '01', title: t('step1Title'), desc: t('step1Desc') },
                { num: '02', title: t('step2Title'), desc: t('step2Desc') },
                { num: '03', title: t('step3Title'), desc: t('step3Desc') },
                { num: '04', title: t('step4Title'), desc: t('step4Desc') },
              ].map(({ num, title, desc }, index, arr) => (
                <div key={num} className="flex items-stretch gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center border border-[rgba(var(--kg-gold-rgb),.5)] text-[0.9rem] text-[var(--kg-gold)]"
                      style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.04em' }}
                    >
                      {num}
                    </span>
                    {index < arr.length - 1 && <span aria-hidden className="mt-1 w-px flex-1 bg-[rgba(var(--kg-paper-rgb),.14)]" />}
                  </div>
                  <div className="kg-card flex-1 px-4 py-3.5">
                    <p className="kg-h text-[0.98rem] leading-snug">{title}</p>
                    <p className="mt-1.5 text-[0.74rem] leading-relaxed text-[var(--kg-mist)]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <span aria-hidden className="kg-rule--full" />

          {/* ── Section 4: シーン別おすすめ ── */}
          <section className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <span className="kg-eyebrow">Scenes</span>
              <h2 className="kg-h text-[1.7rem] leading-tight">{t('scenesTitle')}</h2>
              <span aria-hidden className="kg-rule" />
            </div>

            <div className="flex flex-col gap-2">
              {[
                { name: t('sceneWeddingName'), tip: t('sceneWeddingTip') },
                { name: t('sceneGoukonName'), tip: t('sceneGoukonTip') },
                { name: t('sceneCompanyName'), tip: t('sceneCompanyTip') },
                { name: t('sceneHomepartyName'), tip: t('sceneHomepartyTip') },
                { name: t('sceneSchoolName'), tip: t('sceneSchoolTip') },
              ].map((s, i) => (
                <div key={i} className="kg-card flex items-start gap-3 px-5 py-3.5">
                  <span aria-hidden className="mt-1 h-4 w-px shrink-0 bg-[var(--kg-accent)]" />
                  <div className="min-w-0">
                    <p className="kg-h text-[0.94rem] leading-tight">{s.name}</p>
                    <p className="mt-1 text-[0.74rem] leading-relaxed text-[var(--kg-mist)]">{s.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <span aria-hidden className="kg-rule--full" />

          {/* ── Section 5: 盛り上がる方法 TOP5 ── */}
          <section className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <span className="kg-eyebrow">Tips</span>
              <h2 className="kg-h text-[1.7rem] leading-tight">{t('tipsTitle')}</h2>
              <span aria-hidden className="kg-rule" />
            </div>

            <div className="kg-card overflow-hidden">
              {[
                { num: '01', text: t('tip1Text') },
                { num: '02', text: t('tip2Text') },
                { num: '03', text: t('tip3Text') },
                { num: '04', text: t('tip4Text') },
                { num: '05', text: t('tip5Text') },
              ].map(({ num, text }, index, arr) => (
                <div
                  key={num}
                  className={`flex items-start gap-4 px-5 py-4 ${index < arr.length - 1 ? 'border-b border-[rgba(var(--kg-paper-rgb),.1)]' : ''}`}
                >
                  <span
                    aria-hidden
                    className="mt-0.5 shrink-0 text-[0.88rem] text-[var(--kg-gold)]"
                    style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.04em' }}
                  >
                    {num}
                  </span>
                  <p className="text-[0.86rem] leading-snug text-[var(--kg-paper)]" style={{ fontFamily: 'var(--font-dm)' }}>
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <span aria-hidden className="kg-rule--full" />

          {/* ── Section 6: 自作質問集の作り方 ── */}
          <section className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <span className="kg-eyebrow">Custom</span>
              <h2 className="kg-h text-[1.7rem] leading-tight">{t('customTitle')}</h2>
              <span aria-hidden className="kg-rule" />
            </div>
            <p className="text-[0.84rem] leading-[1.9] text-[var(--kg-paper-dim)]">
              {t('customBody')}
            </p>

            <div className="flex flex-col gap-2">
              {[
                { num: '01', text: t('custom1Text') },
                { num: '02', text: t('custom2Text') },
                { num: '03', text: t('custom3Text') },
                { num: '04', text: t('custom4Text') },
              ].map(({ num, text }) => (
                <div key={num} className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="flex h-8 w-8 shrink-0 items-center justify-center border border-[rgba(var(--kg-gold-rgb),.5)] text-[0.78rem] text-[var(--kg-gold)]"
                    style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.04em' }}
                  >
                    {num}
                  </span>
                  <p className="text-[0.86rem] text-[var(--kg-paper)]" style={{ fontFamily: 'var(--font-dm)' }}>{text}</p>
                </div>
              ))}
            </div>

            <Link
              href="/auth/login"
              className="mt-2 flex h-[52px] items-center justify-center gap-2 border border-[rgba(var(--kg-gold-rgb),.45)] text-[var(--kg-gold)] transition-colors duration-300 hover:border-[var(--kg-gold)] hover:bg-[var(--kg-gold)]/5 touch-manipulation"
              style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.1em' }}
            >
              <span>{t('customCta')}</span>
              <span aria-hidden>→</span>
            </Link>
          </section>

          <span aria-hidden className="kg-rule--full" />

          {/* ── Section 7: Bottom CTA ── */}
          <section className="flex flex-col items-center gap-6 text-center">
            <h2
              className="text-[1.9rem] font-medium leading-tight text-[var(--kg-paper)]"
              style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em', textShadow: '0 0 48px rgba(var(--kg-accent-rgb),.4)' }}
            >
              {t('bottomCtaTitle')}
            </h2>
            <Link
              href="/presets"
              className="flex h-[58px] w-full items-center justify-center gap-2 bg-[var(--kg-accent)] text-[var(--kg-paper)] transition-colors duration-300 hover:bg-[var(--kg-accent-hover)] active:bg-[var(--kg-accent-deep)] touch-manipulation"
              style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.14em', boxShadow: '0 14px 40px rgba(var(--kg-accent-rgb),.28)' }}
            >
              <span>{t('bottomCtaButton')}</span>
              <span aria-hidden>→</span>
            </Link>
          </section>

        </div>
      </div>
    </main>
  );
}
