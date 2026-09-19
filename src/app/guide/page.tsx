import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function GuidePage() {
  const t = await getTranslations('guide');

  return (
    <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">

      {/* ── Section 1: Hero ── */}
      <div className="bg-pr-pink px-6 pt-14 pb-16 flex flex-col items-center gap-2 rounded-b-[40px] relative">
        <Link
          href="/"
          className="absolute top-5 left-5 text-white text-xl font-bold w-10 h-10 flex items-center justify-center rounded-full border-[2px] border-white/40 hover:border-white transition-colors touch-manipulation"
          style={{ fontFamily: 'var(--font-dm)' }}
        >
          ←
        </Link>
        <h1
          className="text-white tracking-wider text-center leading-none kg-serif"
          style={{ fontFamily: 'var(--font-bebas)', fontSize: '4rem' }}
        >
          {t('heroTitle')}
        </h1>
        <p className="text-white/80 text-sm font-bold uppercase tracking-[0.15em] text-center">
          {t('heroTagline')}
        </p>
      </div>

      <div className="flex flex-col gap-8 px-5 py-8">

        {/* ── Section 2: サービス紹介 ── */}
        <section className="flex flex-col gap-4">
          <h2
            className="text-pr-dark text-3xl tracking-wide kg-serif"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {t('aboutTitle')}
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-dm)' }}>
            {t('aboutBody')}
          </p>

          {/* Game mode cards */}
          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[0_4px_16px_rgba(0,0,0,.4)] px-4 py-3 flex items-center gap-4">
              <span className="text-3xl flex-shrink-0">🧠</span>
              <div>
                <p className="font-extrabold text-pr-dark text-base leading-tight" style={{ fontFamily: 'var(--font-dm)' }}>
                  {t('modeTriviaName')}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">{t('modeTriviaDesc')}</p>
              </div>
            </div>
            <div className="bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[0_4px_16px_rgba(0,0,0,.4)] px-4 py-3 flex items-center gap-4">
              <span className="text-3xl flex-shrink-0">📊</span>
              <div>
                <p className="font-extrabold text-pr-dark text-base leading-tight" style={{ fontFamily: 'var(--font-dm)' }}>
                  {t('modePollingName')}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">{t('modePollingDesc')}</p>
              </div>
            </div>
            <div className="bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[0_4px_16px_rgba(0,0,0,.4)] px-4 py-3 flex items-center gap-4">
              <span className="text-3xl flex-shrink-0">⚔️</span>
              <div>
                <p className="font-extrabold text-pr-dark text-base leading-tight" style={{ fontFamily: 'var(--font-dm)' }}>
                  {t('modeOpinionName')}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">{t('modeOpinionDesc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 3: 使い方（4ステップ）── */}
        <section className="flex flex-col gap-4">
          <h2
            className="text-pr-dark text-3xl tracking-wide kg-serif"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {t('howTitle')}
          </h2>

          <div className="flex flex-col gap-3">
            {/* Step 1 */}
            <div className="flex gap-3 items-start">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-pr-pink border-[3px] border-pr-dark flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-extrabold text-sm" style={{ fontFamily: 'var(--font-bebas)' }}>1</span>
                </div>
                <div className="w-0.5 h-4 bg-gray-200 mt-1" />
              </div>
              <div className="bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[0_4px_12px_rgba(0,0,0,.35)] px-4 py-3 flex-1">
                <p className="font-bold text-pr-dark text-sm leading-snug" style={{ fontFamily: 'var(--font-dm)' }}>
                  🖥️ {t('step1Title')}
                </p>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">{t('step1Desc')}</p>
              </div>
            </div>
            {/* Step 2 */}
            <div className="flex gap-3 items-start">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-pr-pink border-[3px] border-pr-dark flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-extrabold text-sm" style={{ fontFamily: 'var(--font-bebas)' }}>2</span>
                </div>
                <div className="w-0.5 h-4 bg-gray-200 mt-1" />
              </div>
              <div className="bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[0_4px_12px_rgba(0,0,0,.35)] px-4 py-3 flex-1">
                <p className="font-bold text-pr-dark text-sm leading-snug" style={{ fontFamily: 'var(--font-dm)' }}>
                  🔑 {t('step2Title')}
                </p>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">{t('step2Desc')}</p>
              </div>
            </div>
            {/* Step 3 */}
            <div className="flex gap-3 items-start">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-pr-pink border-[3px] border-pr-dark flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-extrabold text-sm" style={{ fontFamily: 'var(--font-bebas)' }}>3</span>
                </div>
                <div className="w-0.5 h-4 bg-gray-200 mt-1" />
              </div>
              <div className="bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[0_4px_12px_rgba(0,0,0,.35)] px-4 py-3 flex-1">
                <p className="font-bold text-pr-dark text-sm leading-snug" style={{ fontFamily: 'var(--font-dm)' }}>
                  📱 {t('step3Title')}
                </p>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">{t('step3Desc')}</p>
              </div>
            </div>
            {/* Step 4 */}
            <div className="flex gap-3 items-start">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-pr-pink border-[3px] border-pr-dark flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-extrabold text-sm" style={{ fontFamily: 'var(--font-bebas)' }}>4</span>
                </div>
              </div>
              <div className="bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[0_4px_12px_rgba(0,0,0,.35)] px-4 py-3 flex-1">
                <p className="font-bold text-pr-dark text-sm leading-snug" style={{ fontFamily: 'var(--font-dm)' }}>
                  🎮 {t('step4Title')}
                </p>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">{t('step4Desc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 4: シーン別おすすめ ── */}
        <section className="flex flex-col gap-4">
          <h2
            className="text-pr-dark text-3xl tracking-wide kg-serif"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {t('scenesTitle')}
          </h2>

          <div className="flex flex-col gap-2">
            <div className="bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[0_4px_12px_rgba(0,0,0,.35)] px-4 py-3 flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">💍</span>
              <div>
                <p className="font-bold text-pr-dark text-sm" style={{ fontFamily: 'var(--font-dm)' }}>{t('sceneWeddingName')}</p>
                <p className="text-gray-500 text-xs mt-0.5">{t('sceneWeddingTip')}</p>
              </div>
            </div>
            <div className="bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[0_4px_12px_rgba(0,0,0,.35)] px-4 py-3 flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">💕</span>
              <div>
                <p className="font-bold text-pr-dark text-sm" style={{ fontFamily: 'var(--font-dm)' }}>{t('sceneGoukonName')}</p>
                <p className="text-gray-500 text-xs mt-0.5">{t('sceneGoukonTip')}</p>
              </div>
            </div>
            <div className="bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[0_4px_12px_rgba(0,0,0,.35)] px-4 py-3 flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">🏢</span>
              <div>
                <p className="font-bold text-pr-dark text-sm" style={{ fontFamily: 'var(--font-dm)' }}>{t('sceneCompanyName')}</p>
                <p className="text-gray-500 text-xs mt-0.5">{t('sceneCompanyTip')}</p>
              </div>
            </div>
            <div className="bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[0_4px_12px_rgba(0,0,0,.35)] px-4 py-3 flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">🏠</span>
              <div>
                <p className="font-bold text-pr-dark text-sm" style={{ fontFamily: 'var(--font-dm)' }}>{t('sceneHomepartyName')}</p>
                <p className="text-gray-500 text-xs mt-0.5">{t('sceneHomepartyTip')}</p>
              </div>
            </div>
            <div className="bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[0_4px_12px_rgba(0,0,0,.35)] px-4 py-3 flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">🎓</span>
              <div>
                <p className="font-bold text-pr-dark text-sm" style={{ fontFamily: 'var(--font-dm)' }}>{t('sceneSchoolName')}</p>
                <p className="text-gray-500 text-xs mt-0.5">{t('sceneSchoolTip')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 5: 盛り上がる方法 TOP5 ── */}
        <section className="flex flex-col gap-4">
          <h2
            className="text-pr-dark text-3xl tracking-wide kg-serif"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {t('tipsTitle')}
          </h2>

          <div className="bg-pr-dark rounded-[10px] border-[3px] border-pr-dark shadow-[0_4px_16px_rgba(0,0,0,.4)] overflow-hidden">
            {[
              { num: 1, icon: '🎤', text: t('tip1Text') },
              { num: 2, icon: '🏆', text: t('tip2Text') },
              { num: 3, icon: '🎭', text: t('tip3Text') },
              { num: 4, icon: '🍺', text: t('tip4Text') },
              { num: 5, icon: '📸', text: t('tip5Text') },
            ].map(({ num, icon, text }, index, arr) => (
              <div
                key={num}
                className={`px-4 py-4 flex items-start gap-3 ${index < arr.length - 1 ? 'border-b border-white/10' : ''}`}
              >
                <div className="w-7 h-7 rounded-full bg-pr-pink flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white font-extrabold text-xs" style={{ fontFamily: 'var(--font-bebas)' }}>{num}</span>
                </div>
                <p className="text-white font-bold text-sm leading-snug" style={{ fontFamily: 'var(--font-dm)' }}>
                  <span className="mr-1.5">{icon}</span>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 6: 自作質問集の作り方 ── */}
        <section className="flex flex-col gap-4">
          <h2
            className="text-pr-dark text-3xl tracking-wide kg-serif"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {t('customTitle')}
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-dm)' }}>
            {t('customBody')}
          </p>

          <div className="flex flex-col gap-2">
            {[
              { num: '1', text: t('custom1Text') },
              { num: '2', text: t('custom2Text') },
              { num: '3', text: t('custom3Text') },
              { num: '4', text: t('custom4Text') },
            ].map(({ num, text }) => (
              <div key={num} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white border-[3px] border-pr-dark flex items-center justify-center flex-shrink-0">
                  <span className="font-extrabold text-pr-dark text-sm" style={{ fontFamily: 'var(--font-bebas)' }}>{num}</span>
                </div>
                <p className="text-pr-dark text-sm font-bold" style={{ fontFamily: 'var(--font-dm)' }}>{text}</p>
              </div>
            ))}
          </div>

          <Link
            href="/auth/login"
            className="w-full h-14 bg-white text-pr-dark flex items-center justify-center text-base font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[0_4px_16px_rgba(0,0,0,.4)] active:shadow-[0_1px_4px_rgba(0,0,0,.3)] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation"
            style={{ fontFamily: 'var(--font-dm)' }}
          >
            {t('customCta')}
          </Link>
        </section>

        {/* ── Section 7: Bottom CTA ── */}
        <section className="flex flex-col items-center gap-4 pb-4">
          <h2
            className="text-pr-dark text-4xl tracking-wide text-center kg-serif"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {t('bottomCtaTitle')}
          </h2>
          <Link
            href="/presets"
            className="w-full h-16 bg-pr-pink text-white flex items-center justify-center text-lg font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[0_10px_40px_rgba(0,0,0,.5)] active:shadow-[0_1px_4px_rgba(0,0,0,.3)] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation"
            style={{ fontFamily: 'var(--font-dm)' }}
          >
            {t('bottomCtaButton')}
          </Link>
        </section>

      </div>
    </main>
  );
}
