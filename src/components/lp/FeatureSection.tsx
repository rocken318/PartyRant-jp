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

const FEATURE_COLORS = ['#cf3a2e', '#b8935a', '#6f8f6a'];
const FEATURE_ICONS = ['🎯', '📊', '⚔️'];

export function FeatureSection({ title, features, aiTitle, aiDesc, aiNewBadge, extraTitle, extras }: Props) {
  return (
    <section className="px-6 py-14 bg-gray-50">
      <h2
        className="text-pr-dark text-4xl text-center mb-8 kg-serif"
        style={{ fontFamily: 'var(--font-bebas)' }}
      >
        {title}
      </h2>

      {/* 3モードカード */}
      <div className="flex flex-col gap-4 mb-6">
        {features.map((f, i) => (
          <div
            key={i}
            className="flex items-start gap-4 border-[3px] border-pr-dark shadow-[0_4px_16px_rgba(0,0,0,.4)] rounded-[8px] px-5 py-4"
            style={{ backgroundColor: FEATURE_COLORS[i] }}
          >
            <span className="text-3xl shrink-0">{FEATURE_ICONS[i]}</span>
            <div>
              <p
                className="text-white font-bold"
                style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.4rem', lineHeight: 1.1 }}
              >
                {f.title}
              </p>
              <p className="text-white/80 text-sm mt-1">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* AI カード */}
      <div className="flex items-start gap-4 bg-pr-dark border-[3px] border-pr-dark shadow-[0_4px_16px_rgba(0,0,0,.4)] rounded-[8px] px-5 py-4 mb-8">
        <span className="text-3xl shrink-0">✨</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p
              className="text-white font-bold"
              style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.4rem', lineHeight: 1.1 }}
            >
              {aiTitle}
            </p>
            <span className="bg-pr-pink text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-[2px] border-white shrink-0">
              {aiNewBadge}
            </span>
          </div>
          <p className="text-white/70 text-sm">{aiDesc}</p>
        </div>
      </div>

      {/* 追加機能リスト */}
      <div>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest text-center mb-4">
          {extraTitle}
        </p>
        <div className="flex flex-col gap-2">
          {extras.map((e, i) => (
            <div key={i} className="flex items-center gap-3 bg-white border-[2px] border-pr-dark rounded-[6px] px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,.3)]">
              <span className="text-pr-pink font-bold text-lg shrink-0">✓</span>
              <span className="text-pr-dark text-sm font-bold" style={{ fontFamily: 'var(--font-dm)' }}>{e}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
