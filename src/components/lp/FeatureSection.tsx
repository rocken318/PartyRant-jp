interface Feature {
  title: string;
  desc: string;
  color: string;
}

interface Props {
  title: string;
  features: Feature[];
  aiTitle: string;
  aiDesc: string;
  aiNewBadge: string;
  extraTitle: string;
  extras: string[];
}

export function FeatureSection({ title, features, aiTitle, aiDesc, aiNewBadge, extraTitle, extras }: Props) {
  return (
    <section className="px-6 py-14 bg-[#111114]">
      <div className="flex flex-col items-center gap-3 mb-8">
        <span
          className="text-[0.62rem] uppercase text-[#b8935a]"
          style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.42em', textIndent: '0.42em' }}
        >
          Features
        </span>
        <h2
          className="text-[#ece7df] text-center text-[1.8rem]"
          style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em' }}
        >
          {title}
        </h2>
        <span aria-hidden className="block h-px w-12 bg-[#cf3a2e]" />
      </div>

      {/* 3モードカード */}
      <div className="flex flex-col gap-4 mb-6">
        {features.map((f, i) => (
          <div
            key={i}
            className="flex items-stretch gap-4 bg-[#0a0a0b] border border-[rgba(236,231,223,.1)] px-5 py-4"
          >
            <span aria-hidden className="w-px shrink-0 self-stretch" style={{ backgroundColor: f.color }} />
            <div>
              <p
                className="text-[#ece7df] text-[1.15rem]"
                style={{ fontFamily: 'var(--font-dm)', lineHeight: 1.2, letterSpacing: '0.04em' }}
              >
                {f.title}
              </p>
              <p className="text-[#7d7871] text-sm mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* AI カード */}
      <div className="relative bg-[#0a0a0b] border border-[rgba(236,231,223,.1)] px-5 py-4 mb-8">
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-[#cf3a2e]" />
        <div className="flex items-start gap-4">
          <span
            className="text-[#b8935a] text-[1.1rem] shrink-0"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            ◆
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <p
                className="text-[#ece7df] text-[1.15rem]"
                style={{ fontFamily: 'var(--font-dm)', lineHeight: 1.2, letterSpacing: '0.04em' }}
              >
                {aiTitle}
              </p>
              <span
                className="text-[#cf3a2e] text-[10px] px-2 py-0.5 border border-[rgba(207,58,46,.5)] shrink-0"
                style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.15em' }}
              >
                {aiNewBadge}
              </span>
            </div>
            <p className="text-[#7d7871] text-sm leading-relaxed">{aiDesc}</p>
          </div>
        </div>
      </div>

      {/* 追加機能リスト */}
      <div>
        <p
          className="text-[#b8935a] text-[0.62rem] uppercase text-center mb-4"
          style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.42em', textIndent: '0.42em' }}
        >
          {extraTitle}
        </p>
        <div className="flex flex-col gap-2">
          {extras.map((e, i) => (
            <div key={i} className="flex items-center gap-3 bg-[#0a0a0b] border border-[rgba(236,231,223,.1)] px-4 py-3">
              <span aria-hidden className="text-[#cf3a2e] text-lg shrink-0">✓</span>
              <span className="text-[#ece7df] text-sm" style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.02em' }}>{e}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
