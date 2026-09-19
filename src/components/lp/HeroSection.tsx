import Link from 'next/link';
import { BRAND } from '@/app/brand';

interface Props {
  tagline: string;
  headline: string;
  sub: string;
  cta1: string;
  cta2: string;
}

export function HeroSection({ tagline, headline, sub, cta1, cta2 }: Props) {
  return (
    <section className="relative bg-pr-pink overflow-hidden">
      {/* グラデーション背景 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(160deg, #FF0080 0%, #FF4DAA 100%)' }}
      />

      <div className="relative z-10 flex flex-col items-center px-6 pt-16 pb-28 gap-6 text-center">
        {/* タグライン */}
        <span className="text-white/80 text-xs font-bold uppercase tracking-[0.25em]">
          {tagline}
        </span>

        {/* メインロゴ */}
        <h1
          className="text-white"
          style={{ fontFamily: 'var(--font-bebas)', fontSize: '4.5rem', lineHeight: 1 }}
        >
          {BRAND.name}
        </h1>

        {/* キャッチコピー */}
        <p
          className="text-white text-2xl font-extrabold leading-tight"
          style={{ fontFamily: 'var(--font-dm)' }}
        >
          {headline}
        </p>
        <p className="text-white/80 text-base max-w-[300px]">{sub}</p>

        {/* モックアップ — ネオブルータリズム風スマホ枠 */}
        <div className="w-[200px] h-[340px] bg-white border-[4px] border-pr-dark shadow-[8px_8px_0_#111] rounded-[18px] flex flex-col overflow-hidden mt-2">
          {/* 偽ステータスバー */}
          <div className="bg-pr-dark h-6 flex items-center justify-center shrink-0">
            <span className="text-pr-pink text-[10px] font-bold tracking-widest">● LIVE</span>
          </div>
          {/* 投票画面モック */}
          <div className="flex flex-col flex-1 bg-white px-3 py-3 gap-2 overflow-hidden">
            <div className="bg-pr-dark rounded-[4px] px-2 py-1 shrink-0">
              <p className="text-white text-[9px] font-bold text-center">Q1 / 5</p>
            </div>
            <p className="text-pr-dark text-[10px] font-bold text-center leading-tight px-1 shrink-0">
              次の飲み物で一番好きなのは？
            </p>
            <div className="grid grid-cols-2 gap-1 flex-1">
              {['🍺 ビール', '🍶 日本酒', '🍷 ワイン', '🥃 ウイスキー'].map((opt, i) => {
                const colors = ['#FF0080', '#FFD600', '#00C472', '#3B82F6'];
                return (
                  <div
                    key={i}
                    className="rounded-[4px] border-[2px] border-pr-dark flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: colors[i] }}
                  >
                    {opt}
                  </div>
                );
              })}
            </div>
            {/* 投票バー */}
            <div className="flex flex-col gap-1 mt-1 shrink-0">
              {[62, 18, 12, 8].map((pct, i) => {
                const colors = ['#FF0080', '#FFD600', '#00C472', '#3B82F6'];
                return (
                  <div key={i} className="flex items-center gap-1">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden border border-pr-dark">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: colors[i] }}
                      />
                    </div>
                    <span className="text-[8px] font-bold text-gray-500 w-6 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CTAボタン */}
        <div className="flex flex-col gap-3 w-full max-w-[320px] mt-2">
          <Link
            href="/auth/login"
            className="w-full h-14 bg-white text-pr-dark flex items-center justify-center text-base font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[5px_5px_0_#111] active:shadow-[2px_2px_0_#111] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation"
            style={{ fontFamily: 'var(--font-dm)' }}
          >
            {cta1}
          </Link>
          <Link
            href="/presets"
            className="w-full h-12 bg-transparent text-white flex items-center justify-center text-sm font-bold rounded-[6px] border-[3px] border-white/60 active:bg-white/10 transition-colors duration-75 touch-manipulation"
            style={{ fontFamily: 'var(--font-dm)' }}
          >
            {cta2} →
          </Link>
        </div>
      </div>

      {/* 波形区切り */}
      <div
        className="absolute bottom-0 left-0 right-0 h-12 bg-white"
        style={{ clipPath: 'ellipse(55% 100% at 50% 100%)' }}
      />
    </section>
  );
}
