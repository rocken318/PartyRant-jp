import Link from 'next/link';

interface Props {
  tagline: string;
  headline: string;
  sub: string;
  cta1: string;
  cta2: string;
  brandName: string;
}

export function HeroSection({ tagline, headline, sub, cta1, cta2, brandName }: Props) {
  return (
    <section className="relative bg-[var(--kg-ink)] overflow-hidden">
      {/* 上部のほのかな朱の灯り */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[60vh] pointer-events-none"
        style={{
          background:
            'radial-gradient(120% 70% at 50% -10%, rgba(var(--kg-accent-rgb),.28) 0%, rgba(var(--kg-accent-rgb),.06) 38%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-6 pt-16 pb-20 gap-6 text-center">
        {/* タグライン（金・Cormorant） */}
        <span
          className="text-[0.62rem] uppercase text-[var(--kg-gold)]"
          style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.42em', textIndent: '0.42em' }}
        >
          {tagline}
        </span>

        {/* メインロゴ（明朝） */}
        <h1
          className="text-[var(--kg-paper)]"
          style={{
            fontFamily: 'var(--font-dm)',
            fontSize: '3.4rem',
            lineHeight: 1.1,
            letterSpacing: '0.06em',
            textShadow: '0 0 48px rgba(var(--kg-accent-rgb),.45)',
          }}
        >
          {brandName}
        </h1>

        {/* 朱のヘアライン */}
        <span aria-hidden className="block h-px w-12 bg-[var(--kg-accent)]" />

        {/* キャッチコピー（明朝） */}
        <p
          className="text-[var(--kg-paper)] text-2xl leading-tight"
          style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.04em' }}
        >
          {headline}
        </p>
        <p className="text-[var(--kg-paper-dim)] text-sm leading-relaxed max-w-[300px]">{sub}</p>

        {/* モックアップ — 墨基調スマホ枠 */}
        <div className="w-[200px] h-[340px] bg-[var(--kg-sumi)] border border-[rgba(var(--kg-gold-rgb),.35)] rounded-[18px] flex flex-col overflow-hidden mt-2">
          {/* 偽ステータスバー */}
          <div className="bg-[var(--kg-ink)] h-6 flex items-center justify-center shrink-0 border-b border-[rgba(var(--kg-paper-rgb),.08)]">
            <span className="text-[var(--kg-accent)] text-[10px] tracking-[0.25em]" style={{ fontFamily: 'var(--font-bebas)' }}>● LIVE</span>
          </div>
          {/* 投票画面モック */}
          <div className="flex flex-col flex-1 bg-[var(--kg-sumi)] px-3 py-3 gap-2 overflow-hidden">
            <div className="border border-[rgba(var(--kg-paper-rgb),.12)] px-2 py-1 shrink-0">
              <p className="text-[var(--kg-gold)] text-[9px] text-center" style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.15em' }}>Q1 / 5</p>
            </div>
            <p className="text-[var(--kg-paper)] text-[10px] text-center leading-tight px-1 shrink-0" style={{ fontFamily: 'var(--font-dm)' }}>
              次の飲み物で一番好きなのは？
            </p>
            <div className="grid grid-cols-2 gap-1 flex-1">
              {['ビール', '日本酒', 'ワイン', 'ウイスキー'].map((opt, i) => {
                const colors = ['var(--kg-accent)', 'var(--kg-gold)', '#6f8f6a', 'var(--kg-mist)'];
                return (
                  <div
                    key={i}
                    className="border flex items-center justify-center text-[9px] text-[var(--kg-paper)]"
                    style={{ borderColor: colors[i] + '66', fontFamily: 'var(--font-dm)' }}
                  >
                    {opt}
                  </div>
                );
              })}
            </div>
            {/* 投票バー */}
            <div className="flex flex-col gap-1 mt-1 shrink-0">
              {[62, 18, 12, 8].map((pct, i) => {
                const colors = ['var(--kg-accent)', 'var(--kg-gold)', '#6f8f6a', 'var(--kg-mist)'];
                return (
                  <div key={i} className="flex items-center gap-1">
                    <div className="flex-1 h-2 bg-[rgba(var(--kg-paper-rgb),.08)] overflow-hidden">
                      <div
                        className="h-full"
                        style={{ width: `${pct}%`, backgroundColor: colors[i] }}
                      />
                    </div>
                    <span className="text-[8px] text-[var(--kg-mist)] w-6 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CTAボタン */}
        <div className="flex flex-col gap-3 w-full max-w-[320px] mt-4">
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
      </div>

      {/* 区切り（朱の薄線） */}
      <span aria-hidden className="absolute bottom-0 left-1/2 -translate-x-1/2 block h-px w-16 bg-[rgba(var(--kg-accent-rgb),.5)]" />
    </section>
  );
}
