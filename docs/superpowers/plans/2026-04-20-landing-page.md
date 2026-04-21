# PartyRant-jp マーケティング LP 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/lp` ルートにマーケティング LP を新設する（現行 `/` は変更なし）

**Architecture:** Next.js 15 App Router Server Components。6つのセクションコンポーネントに分割。i18n は next-intl の `lp` 名前空間。

**Tech Stack:** Next.js 15、next-intl、Tailwind CSS、既存デザイントークン

**Spec:** `docs/superpowers/specs/2026-04-20-landing-page-design.md`

---

## ファイルマップ

| 操作 | ファイル |
|------|--------|
| Create | `src/app/lp/page.tsx` |
| Create | `src/components/lp/HeroSection.tsx` |
| Create | `src/components/lp/UseCaseSection.tsx` |
| Create | `src/components/lp/FeatureSection.tsx` |
| Create | `src/components/lp/StepsSection.tsx` |
| Create | `src/components/lp/FaqSection.tsx` |
| Create | `src/components/lp/FinalCtaSection.tsx` |
| Modify | `messages/ja.json` |

---

### Task 1: i18n キーを追加する

**Files:**
- Modify: `messages/ja.json`

- [ ] **Step 1: `messages/ja.json` を読み込む**

`messages/ja.json` の末尾（`}`の前）に `lp` 名前空間を追加する。

- [ ] **Step 2: `lp` キーを追加**

既存の最後のキーの閉じ `}` の後にカンマと以下を追加する（ファイル末尾の `}` の直前に挿入）:

```json
  "lp": {
    "heroTagline": "ライブクイズ & リアルタイム投票",
    "heroHeadline": "宴会でも、リリースイベントでも。",
    "heroSub": "リアルタイムで盛り上がれるクイズ&投票アプリ",
    "heroCta1": "無料ではじめる",
    "heroCta2": "プリセットを試す",
    "usecaseTitle": "どんなシーンでも使える",
    "usecase1Title": "飲み会クイズで盛り上がれ",
    "usecase1Desc": "幹事の準備ゼロ。参加者はスマホだけで即スタート。",
    "usecase1Icon": "🍺",
    "usecase2Title": "リリース発表をインタラクティブに",
    "usecase2Desc": "来場者全員がリアルタイムで参加。反応が見えるイベントへ。",
    "usecase2Icon": "🏢",
    "usecase3Title": "研修を双方向にアップデート",
    "usecase3Desc": "アンケート結果がその場で可視化。一方通行な研修にサヨナラ。",
    "usecase3Icon": "📚",
    "featuresTitle": "3つのゲームモード",
    "feature1Title": "クイズ（トリビア）",
    "feature1Desc": "正解を競うポイント制。速さと正確さが勝負。",
    "feature2Title": "アンケート（投票）",
    "feature2Desc": "その場で意見を集計。棒グラフでリアルタイム可視化。",
    "feature3Title": "少数派バトル",
    "feature3Desc": "多数派 vs 少数派で笑いが生まれる。答えに正解はない。",
    "aiTitle": "AIクイズ自動生成",
    "aiDesc": "トピックを入れるだけでAIが問題を自動生成。準備時間ゼロ。",
    "aiNewBadge": "NEW",
    "extraFeaturesTitle": "さらに",
    "extra1": "コード参加（アプリ不要）",
    "extra2": "参加人数無制限",
    "extra3": "結果をリアルタイム集計・表示",
    "stepsTitle": "3ステップではじめる",
    "step1Num": "①",
    "step1Title": "ゲームを作成",
    "step1Desc": "テンプレートを選ぶか、AIで自動生成。",
    "step2Num": "②",
    "step2Title": "コードをシェア",
    "step2Desc": "6桁コードかQRコードで参加者を招待。",
    "step3Num": "③",
    "step3Title": "みんなで盛り上がる",
    "step3Desc": "ホストが進行、全員のスマホに結果がリアルタイム表示。",
    "faqTitle": "よくある質問",
    "faq1Q": "参加者はアプリのインストールが必要ですか？",
    "faq1A": "不要です。ブラウザだけで参加できます。iPhoneでもAndroidでも。",
    "faq2Q": "何人まで参加できますか？",
    "faq2A": "人数制限はありません。大人数のイベントでもご利用いただけます。",
    "faq3Q": "問題は自分で作れますか？",
    "faq3A": "はい。アカウント登録後、自由に問題を作成できます。AIによる自動生成も利用可能です。",
    "faq4Q": "無料で使えますか？",
    "faq4A": "プリセットゲームは完全無料です。アカウント登録（無料）でゲーム作成機能もご利用いただけます。",
    "ctaTitle": "次のパーティー、PartyRantで盛り上げよう。",
    "ctaCta1": "無料ではじめる",
    "ctaCta2": "プリセットを試す"
  }
```

- [ ] **Step 3: JSON として有効か確認**

```bash
cd Y:/webwork/PartyRant-jp && node -e "JSON.parse(require('fs').readFileSync('messages/ja.json','utf8')); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 4: コミット**

```bash
cd Y:/webwork/PartyRant-jp && git add messages/ja.json && git commit -m "feat(lp): add i18n keys for marketing landing page"
```

---

### Task 2: HeroSection コンポーネント

**Files:**
- Create: `src/components/lp/HeroSection.tsx`

- [ ] **Step 1: ファイルを作成**

```tsx
import Link from 'next/link';

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

      <div className="relative z-10 flex flex-col items-center px-6 pt-16 pb-24 gap-6 text-center">
        {/* タグライン */}
        <span className="text-white/80 text-xs font-bold uppercase tracking-[0.25em]">
          {tagline}
        </span>

        {/* メインロゴ */}
        <h1
          className="text-white"
          style={{ fontFamily: 'var(--font-bebas)', fontSize: '4.5rem', lineHeight: 1 }}
        >
          PartyRant
        </h1>

        {/* キャッチコピー */}
        <p
          className="text-white text-2xl font-extrabold leading-tight"
          style={{ fontFamily: 'var(--font-dm)' }}
        >
          {headline}
        </p>
        <p className="text-white/80 text-base max-w-[320px]">{sub}</p>

        {/* モックアップ — ネオブルータリズム風スマホ枠 */}
        <div className="w-[200px] h-[340px] bg-white border-[4px] border-pr-dark shadow-[8px_8px_0_#111] rounded-[18px] flex flex-col overflow-hidden mt-2">
          {/* 偽ステータスバー */}
          <div className="bg-pr-dark h-6 flex items-center justify-center">
            <span className="text-pr-pink text-[10px] font-bold tracking-widest">● LIVE</span>
          </div>
          {/* 投票画面モック */}
          <div className="flex flex-col flex-1 bg-white px-3 py-3 gap-2">
            <div className="bg-pr-dark rounded-[4px] px-2 py-1">
              <p className="text-white text-[9px] font-bold text-center">Q1 / 5</p>
            </div>
            <p className="text-pr-dark text-[10px] font-bold text-center leading-tight px-1">
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
            <div className="flex flex-col gap-1 mt-1">
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
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-white" style={{ clipPath: 'ellipse(55% 100% at 50% 100%)' }} />
    </section>
  );
}
```

- [ ] **Step 2: TypeScript エラーがないか確認**

```bash
cd Y:/webwork/PartyRant-jp && npx tsc --noEmit 2>&1 | head -30
```

Expected: エラーなし（または既存エラーのみ）

- [ ] **Step 3: コミット**

```bash
cd Y:/webwork/PartyRant-jp && git add src/components/lp/HeroSection.tsx && git commit -m "feat(lp): add HeroSection component"
```

---

### Task 3: UseCaseSection コンポーネント

**Files:**
- Create: `src/components/lp/UseCaseSection.tsx`

- [ ] **Step 1: ファイルを作成**

```tsx
interface UseCase {
  icon: string;
  title: string;
  desc: string;
}

interface Props {
  title: string;
  cases: UseCase[];
}

export function UseCaseSection({ title, cases }: Props) {
  return (
    <section className="px-6 py-14 bg-white">
      <h2
        className="text-pr-dark text-4xl text-center mb-8"
        style={{ fontFamily: 'var(--font-bebas)' }}
      >
        {title}
      </h2>

      <div className="flex flex-col gap-4">
        {cases.map((c, i) => (
          <div
            key={i}
            className="flex items-start gap-4 bg-white border-[3px] border-pr-dark shadow-[4px_4px_0_#111] rounded-[8px] px-5 py-4"
          >
            <span className="text-4xl mt-0.5">{c.icon}</span>
            <div>
              <p
                className="text-pr-dark text-xl font-bold leading-tight"
                style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.4rem' }}
              >
                {c.title}
              </p>
              <p className="text-gray-500 text-sm mt-1">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: コミット**

```bash
cd Y:/webwork/PartyRant-jp && git add src/components/lp/UseCaseSection.tsx && git commit -m "feat(lp): add UseCaseSection component"
```

---

### Task 4: FeatureSection コンポーネント

**Files:**
- Create: `src/components/lp/FeatureSection.tsx`

- [ ] **Step 1: ファイルを作成**

```tsx
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
  const featureColors = ['#FF0080', '#FFD600', '#00C472'];
  const featureIcons = ['🎯', '📊', '⚔️'];

  return (
    <section className="px-6 py-14 bg-gray-50">
      <h2
        className="text-pr-dark text-4xl text-center mb-8"
        style={{ fontFamily: 'var(--font-bebas)' }}
      >
        {title}
      </h2>

      {/* 3モードカード */}
      <div className="flex flex-col gap-4 mb-6">
        {features.map((f, i) => (
          <div
            key={i}
            className="flex items-start gap-4 border-[3px] border-pr-dark shadow-[4px_4px_0_#111] rounded-[8px] px-5 py-4"
            style={{ backgroundColor: featureColors[i] }}
          >
            <span className="text-3xl">{featureIcons[i]}</span>
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
      <div className="flex items-start gap-4 bg-pr-dark border-[3px] border-pr-dark shadow-[4px_4px_0_#111] rounded-[8px] px-5 py-4 mb-8">
        <span className="text-3xl">✨</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p
              className="text-white font-bold"
              style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.4rem', lineHeight: 1.1 }}
            >
              {aiTitle}
            </p>
            <span className="bg-pr-pink text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-[2px] border-white">
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
            <div key={i} className="flex items-center gap-3 bg-white border-[2px] border-pr-dark rounded-[6px] px-4 py-3 shadow-[2px_2px_0_#111]">
              <span className="text-pr-pink font-bold text-lg">✓</span>
              <span className="text-pr-dark text-sm font-bold" style={{ fontFamily: 'var(--font-dm)' }}>{e}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: コミット**

```bash
cd Y:/webwork/PartyRant-jp && git add src/components/lp/FeatureSection.tsx && git commit -m "feat(lp): add FeatureSection component"
```

---

### Task 5: StepsSection コンポーネント

**Files:**
- Create: `src/components/lp/StepsSection.tsx`

- [ ] **Step 1: ファイルを作成**

```tsx
interface Step {
  num: string;
  title: string;
  desc: string;
}

interface Props {
  title: string;
  steps: Step[];
}

export function StepsSection({ title, steps }: Props) {
  const stepColors = ['#FF0080', '#FFD600', '#00C472'];

  return (
    <section className="px-6 py-14 bg-white">
      <h2
        className="text-pr-dark text-4xl text-center mb-10"
        style={{ fontFamily: 'var(--font-bebas)' }}
      >
        {title}
      </h2>

      <div className="flex flex-col gap-6">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-5">
            {/* 番号バッジ */}
            <div
              className="w-12 h-12 shrink-0 flex items-center justify-center border-[3px] border-pr-dark shadow-[3px_3px_0_#111] rounded-[8px] text-white font-bold"
              style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem', backgroundColor: stepColors[i] }}
            >
              {i + 1}
            </div>
            <div className="pt-1">
              <p
                className="text-pr-dark font-bold"
                style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.4rem', lineHeight: 1.1 }}
              >
                {s.title}
              </p>
              <p className="text-gray-500 text-sm mt-1">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: コミット**

```bash
cd Y:/webwork/PartyRant-jp && git add src/components/lp/StepsSection.tsx && git commit -m "feat(lp): add StepsSection component"
```

---

### Task 6: FaqSection コンポーネント

**Files:**
- Create: `src/components/lp/FaqSection.tsx`

- [ ] **Step 1: ファイルを作成**

```tsx
interface FaqItem {
  q: string;
  a: string;
}

interface Props {
  title: string;
  items: FaqItem[];
}

export function FaqSection({ title, items }: Props) {
  return (
    <section className="px-6 py-14 bg-gray-50">
      <h2
        className="text-pr-dark text-4xl text-center mb-8"
        style={{ fontFamily: 'var(--font-bebas)' }}
      >
        {title}
      </h2>

      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <details
            key={i}
            className="group bg-white border-[3px] border-pr-dark shadow-[3px_3px_0_#111] rounded-[8px] overflow-hidden"
          >
            <summary
              className="flex items-center justify-between px-5 py-4 cursor-pointer list-none font-bold text-pr-dark text-sm"
              style={{ fontFamily: 'var(--font-dm)' }}
            >
              <span className="pr-4">{item.q}</span>
              <span className="text-pr-pink text-xl font-bold shrink-0 group-open:rotate-45 transition-transform duration-200">
                +
              </span>
            </summary>
            <div className="px-5 pb-4 text-gray-500 text-sm leading-relaxed border-t-[2px] border-pr-dark pt-3">
              {item.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: コミット**

```bash
cd Y:/webwork/PartyRant-jp && git add src/components/lp/FaqSection.tsx && git commit -m "feat(lp): add FaqSection component"
```

---

### Task 7: FinalCtaSection コンポーネント

**Files:**
- Create: `src/components/lp/FinalCtaSection.tsx`

- [ ] **Step 1: ファイルを作成**

```tsx
import Link from 'next/link';

interface Props {
  title: string;
  cta1: string;
  cta2: string;
}

export function FinalCtaSection({ title, cta1, cta2 }: Props) {
  return (
    <section className="bg-pr-dark px-6 py-16 flex flex-col items-center gap-8 text-center">
      <p
        className="text-white text-3xl leading-tight"
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

      <p className="text-white/40 text-xs">
        © 2026 PartyRant
      </p>
    </section>
  );
}
```

- [ ] **Step 2: コミット**

```bash
cd Y:/webwork/PartyRant-jp && git add src/components/lp/FinalCtaSection.tsx && git commit -m "feat(lp): add FinalCtaSection component"
```

---

### Task 8: `/lp/page.tsx` — LP ページを組み立てる

**Files:**
- Create: `src/app/lp/page.tsx`

- [ ] **Step 1: ファイルを作成**

```tsx
import { getTranslations } from 'next-intl/server';
import { HeroSection } from '@/components/lp/HeroSection';
import { UseCaseSection } from '@/components/lp/UseCaseSection';
import { FeatureSection } from '@/components/lp/FeatureSection';
import { StepsSection } from '@/components/lp/StepsSection';
import { FaqSection } from '@/components/lp/FaqSection';
import { FinalCtaSection } from '@/components/lp/FinalCtaSection';

export default async function LandingPageFull() {
  const t = await getTranslations('lp');

  const useCases = [
    { icon: t('usecase1Icon'), title: t('usecase1Title'), desc: t('usecase1Desc') },
    { icon: t('usecase2Icon'), title: t('usecase2Title'), desc: t('usecase2Desc') },
    { icon: t('usecase3Icon'), title: t('usecase3Title'), desc: t('usecase3Desc') },
  ];

  const features = [
    { title: t('feature1Title'), desc: t('feature1Desc'), color: '#FF0080' },
    { title: t('feature2Title'), desc: t('feature2Desc'), color: '#FFD600' },
    { title: t('feature3Title'), desc: t('feature3Desc'), color: '#00C472' },
  ];

  const steps = [
    { num: t('step1Num'), title: t('step1Title'), desc: t('step1Desc') },
    { num: t('step2Num'), title: t('step2Title'), desc: t('step2Desc') },
    { num: t('step3Num'), title: t('step3Title'), desc: t('step3Desc') },
  ];

  const faqItems = [
    { q: t('faq1Q'), a: t('faq1A') },
    { q: t('faq2Q'), a: t('faq2A') },
    { q: t('faq3Q'), a: t('faq3A') },
    { q: t('faq4Q'), a: t('faq4A') },
  ];

  const extras = [t('extra1'), t('extra2'), t('extra3')];

  return (
    <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
      <HeroSection
        tagline={t('heroTagline')}
        headline={t('heroHeadline')}
        sub={t('heroSub')}
        cta1={t('heroCta1')}
        cta2={t('heroCta2')}
      />
      <UseCaseSection
        title={t('usecaseTitle')}
        cases={useCases}
      />
      <FeatureSection
        title={t('featuresTitle')}
        features={features}
        aiTitle={t('aiTitle')}
        aiDesc={t('aiDesc')}
        aiNewBadge={t('aiNewBadge')}
        extraTitle={t('extraFeaturesTitle')}
        extras={extras}
      />
      <StepsSection
        title={t('stepsTitle')}
        steps={steps}
      />
      <FaqSection
        title={t('faqTitle')}
        items={faqItems}
      />
      <FinalCtaSection
        title={t('ctaTitle')}
        cta1={t('ctaCta1')}
        cta2={t('ctaCta2')}
      />
    </main>
  );
}
```

- [ ] **Step 2: TypeScript エラー確認**

```bash
cd Y:/webwork/PartyRant-jp && npx tsc --noEmit 2>&1 | head -30
```

Expected: エラーなし

- [ ] **Step 3: ビルド確認**

```bash
cd Y:/webwork/PartyRant-jp && npx next build 2>&1 | tail -20
```

Expected: ビルド成功

- [ ] **Step 4: コミット**

```bash
cd Y:/webwork/PartyRant-jp && git add src/app/lp/ && git commit -m "feat(lp): wire up /lp page with all sections"
```

---

### Task 9: `/` トップページに LP へのリンクを追加（任意）

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `messages/ja.json`

- [ ] **Step 1: `messages/ja.json` の `landing` 名前空間に `learnMore` を追加**

```json
"learnMore": "📣 PartyRantとは？"
```

- [ ] **Step 2: `src/app/page.tsx` の使い方ガイドリンクの上に追加**

現在の `/guide` リンク（`<Link href="/guide" ...>`）の直前に追加する:

```tsx
{/* LP へのリンク */}
<Link href="/lp" className="text-pr-pink text-sm font-bold underline text-center">
  {t('learnMore')}
</Link>
```

- [ ] **Step 3: コミット**

```bash
cd Y:/webwork/PartyRant-jp && git add src/app/page.tsx messages/ja.json && git commit -m "feat(lp): add link to LP from top page"
```
