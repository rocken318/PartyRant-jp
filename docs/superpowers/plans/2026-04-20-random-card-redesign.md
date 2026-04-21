# Random Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single "ランダムアンケート" card on /presets with two cards (意見バトル + 雑学クイズ), each with an inline settings expansion (問題数・シーン選択) before starting.

**Architecture:** New `/api/trivia/random` endpoint mirrors the existing `/api/opinion/random` pattern. The presets page gains two separate random-card components with a settings panel that slides into view when a mode button is tapped — no page navigation, no modal, just inline state expansion. When the user taps confirm the game starts exactly as before.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS (neobrutalism: border-[3px], shadow-[4px_4px_0_#111]), next-intl (ICU single braces `{count}`), zod, Supabase via `store`.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/app/api/trivia/random/route.ts` | **CREATE** | POST endpoint — picks N random trivia questions, optionally filtered by scene |
| `src/app/presets/page.tsx` | **MODIFY** | Replace old random card with two new cards + settings state |
| `messages/ja.json` | **MODIFY** | Add i18n keys for new UI text |

---

## Task 1: `/api/trivia/random` endpoint

**Files:**
- Create: `src/app/api/trivia/random/route.ts`

- [ ] **Step 1: Create the file**

```ts
// src/app/api/trivia/random/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import type { Question } from '@/types/domain';

const schema = z.object({
  count: z.number().int().min(3).max(20).default(10),
  scene: z.string().nullable().optional(),
});

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { count, scene } = parsed.data;

    const presets = await store.listPresets();
    const pool: Omit<Question, 'id' | 'order'>[] = [];

    for (const preset of presets) {
      if (preset.mode !== 'trivia') continue;
      if (scene && preset.scene !== scene) continue;
      for (const q of preset.questions) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, order: _order, ...rest } = q;
        pool.push(rest);
      }
    }

    if (pool.length === 0) {
      return NextResponse.json({ error: 'No questions available' }, { status: 404 });
    }

    const selected = shuffle(pool).slice(0, Math.min(count, pool.length));

    const game = await store.createGame({
      mode: 'trivia',
      gameMode: 'live',
      title: '🧠 ランダム雑学クイズ',
      questions: selected,
    });

    const lobbyGame = await store.updateGameStatus(game.id, 'lobby');
    return NextResponse.json(lobbyGame);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to start random trivia' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Smoke-test the endpoint manually**

Start dev server (`npm run dev`) and run in another terminal:

```bash
curl -s -X POST http://localhost:3000/api/trivia/random \
  -H "Content-Type: application/json" \
  -d '{"count":5}' | node -e "const d=require('fs').readFileSync('/dev/stdin','utf-8'); const j=JSON.parse(d); console.log('mode:',j.mode,'questions:',j.questions?.length,'status:',j.status)"
```

Expected output: `mode: trivia questions: 5 status: lobby`

- [ ] **Step 3: Test with scene filter**

```bash
curl -s -X POST http://localhost:3000/api/trivia/random \
  -H "Content-Type: application/json" \
  -d '{"count":5,"scene":"雑学クイズ"}' | node -e "const d=require('fs').readFileSync('/dev/stdin','utf-8'); const j=JSON.parse(d); console.log('questions:',j.questions?.length)"
```

Expected output: `questions: 5`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/trivia/random/route.ts
git commit -m "feat: /api/trivia/random endpoint — random trivia game from preset pool"
```

---

## Task 2: i18n keys

**Files:**
- Modify: `messages/ja.json` — add keys under `"presets"` section

- [ ] **Step 1: Add new keys to messages/ja.json**

Open `messages/ja.json`. Find the `"presets"` object. Add these keys (insert after `"randomStarting"`):

```json
"randomOpinionTitle": "⚔️ 意見バトル",
"randomOpinionSubtitle": "少数派 or 多数派、どっちが負け？",
"randomTriviaTitle": "🧠 ランダムクイズ",
"randomTriviaSubtitle": "全ジャンルの雑学からランダム出題！",
"randomTriviaStart": "▶ クイズをはじめる",
"settingsCountLabel": "問題数",
"settingsSceneLabel": "シーン（任意）",
"settingsSceneAll": "全ジャンル",
"settingsConfirm": "🚀 はじめる",
"settingsCancel": "← 戻る"
```

- [ ] **Step 2: Verify no syntax errors**

```bash
node -e "require('./messages/ja.json'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add messages/ja.json
git commit -m "feat: i18n keys for random card redesign"
```

---

## Task 3: Redesign random cards in presets page

**Files:**
- Modify: `src/app/presets/page.tsx`

This is the main UI task. The current page has one `<div>` block (lines ~115–146) for the random card with two buttons. Replace it with two cards and a settings expansion system.

### State additions

- [ ] **Step 1: Add new state and handler to the component**

After the existing state declarations (around line 41), add:

```tsx
// Settings panel: which card is expanded and with what settings
type SettingsMode = 
  | { type: 'opinion'; loseRule: 'minority' | 'majority'; count: number }
  | { type: 'trivia'; count: number; scene: string | null };

const [settings, setSettings] = useState<SettingsMode | null>(null);

// Trivia scenes from loaded presets
const triviaScenes = Array.from(
  new Set(presets.filter(p => p.mode === 'trivia').map(p => p.scene).filter(Boolean))
) as string[];

async function handleRandomTrivia() {
  if (!settings || settings.type !== 'trivia') return;
  setRandomStarting('majority'); // reuse existing loading state as a flag
  try {
    const res = await fetch('/api/trivia/random', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: settings.count, scene: settings.scene }),
    });
    if (!res.ok) throw new Error();
    const game = await res.json() as Game;
    router.push(`/play/${game.id}`);
  } catch {
    setRandomStarting(null);
  }
}
```

Also update `handleRandom` to use `settings.count` instead of hardcoded `10`:

```tsx
async function handleRandom(loseRule: 'minority' | 'majority') {
  const count = (settings?.type === 'opinion' ? settings.count : null) ?? 10;
  setRandomStarting(loseRule);
  try {
    const res = await fetch('/api/opinion/random', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loseRule, count }),
    });
    if (!res.ok) throw new Error();
    const game = await res.json() as Game;
    router.push(`/play/${game.id}`);
  } catch {
    setRandomStarting(null);
  }
}
```

### Settings panel sub-component (inline)

- [ ] **Step 2: Add COUNT_OPTIONS constant near top of file (after imports)**

```tsx
const COUNT_OPTIONS = [5, 10, 15] as const;
```

### Replace the random card JSX

- [ ] **Step 3: Replace the random card block**

Find and replace the entire `{/* ── ランダムアンケート ── */}` block (currently lines ~115–146 in the JSX) with the following two-card layout:

```tsx
{/* ── 意見バトルカード ── */}
<div className="bg-pr-dark rounded-[10px] border-[3px] border-pr-dark shadow-[4px_4px_0_#111] overflow-hidden">
  <div className="px-4 py-3 flex items-center gap-3">
    <span className="text-2xl">⚔️</span>
    <div className="flex-1 min-w-0">
      <p className="text-white font-bold text-base leading-tight" style={{ fontFamily: 'var(--font-dm)' }}>
        {t('randomOpinionTitle')}
      </p>
      <p className="text-gray-400 text-xs mt-0.5">{t('randomOpinionSubtitle')}</p>
    </div>
  </div>

  {/* モード選択ボタン */}
  <div className="grid grid-cols-2 gap-0 border-t-[2px] border-white/10">
    {(['minority', 'majority'] as const).map(rule => (
      <button
        key={rule}
        type="button"
        onClick={() => {
          if (settings?.type === 'opinion' && settings.loseRule === rule) {
            setSettings(null);
          } else {
            setSettings({ type: 'opinion', loseRule: rule, count: 10 });
          }
        }}
        disabled={randomStarting !== null || starting !== null}
        className={[
          'h-12 font-bold text-sm touch-manipulation transition-colors disabled:opacity-50',
          rule === 'minority'
            ? 'bg-pr-pink text-white border-r-[1px] border-white/10 hover:bg-pr-pink/90'
            : 'bg-white/10 text-white hover:bg-white/20',
          settings?.type === 'opinion' && settings.loseRule === rule
            ? 'ring-2 ring-inset ring-white/40'
            : '',
        ].join(' ')}
        style={{ fontFamily: 'var(--font-dm)' }}
      >
        {rule === 'minority' ? t('randomMinority') : t('randomMajority')}
      </button>
    ))}
  </div>

  {/* 設定パネル（展開） */}
  {settings?.type === 'opinion' && (
    <div className="border-t-[2px] border-white/10 px-4 py-3 flex flex-col gap-3">
      {/* 問題数 */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('settingsCountLabel')}</p>
        <div className="flex gap-2">
          {COUNT_OPTIONS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setSettings({ ...settings, count: n })}
              className={[
                'flex-1 h-10 rounded-[6px] text-sm font-bold border-[2px] touch-manipulation transition-colors',
                settings.count === n
                  ? 'bg-pr-pink text-white border-pr-pink'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20',
              ].join(' ')}
              style={{ fontFamily: 'var(--font-dm)' }}
            >
              {n}問
            </button>
          ))}
        </div>
      </div>

      {/* 確定ボタン */}
      <button
        type="button"
        onClick={() => handleRandom(settings.loseRule)}
        disabled={randomStarting !== null || starting !== null}
        className="w-full h-11 bg-pr-pink text-white font-bold text-sm rounded-[6px] border-[2px] border-white/20 disabled:opacity-50 touch-manipulation hover:bg-pr-pink/90 transition-colors"
        style={{ fontFamily: 'var(--font-dm)' }}
      >
        {randomStarting !== null ? t('randomStarting') : t('settingsConfirm')}
      </button>
    </div>
  )}
</div>

{/* ── 雑学クイズカード ── */}
<div className="bg-white rounded-[10px] border-[3px] border-pr-dark shadow-[4px_4px_0_#111] overflow-hidden">
  <div className="px-4 py-3 flex items-center gap-3 border-b-[2px] border-pr-dark">
    <span className="text-2xl">🧠</span>
    <div className="flex-1 min-w-0">
      <p className="text-pr-dark font-bold text-base leading-tight" style={{ fontFamily: 'var(--font-dm)' }}>
        {t('randomTriviaTitle')}
      </p>
      <p className="text-gray-400 text-xs mt-0.5">{t('randomTriviaSubtitle')}</p>
    </div>
    <button
      type="button"
      onClick={() => setSettings(s => s?.type === 'trivia' ? null : { type: 'trivia', count: 10, scene: null })}
      disabled={randomStarting !== null || starting !== null}
      className="flex-shrink-0 h-10 px-4 bg-pr-dark text-white font-bold text-sm rounded-[6px] border-[2px] border-pr-dark disabled:opacity-50 touch-manipulation hover:bg-pr-dark/90 transition-colors"
      style={{ fontFamily: 'var(--font-dm)' }}
    >
      {t('randomTriviaStart')}
    </button>
  </div>

  {/* 設定パネル（展開） */}
  {settings?.type === 'trivia' && (
    <div className="px-4 py-3 flex flex-col gap-3">
      {/* 問題数 */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('settingsCountLabel')}</p>
        <div className="flex gap-2">
          {COUNT_OPTIONS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setSettings({ ...settings, count: n })}
              className={[
                'flex-1 h-10 rounded-[6px] text-sm font-bold border-[2px] touch-manipulation transition-colors',
                settings.count === n
                  ? 'bg-pr-dark text-white border-pr-dark'
                  : 'bg-white text-pr-dark border-pr-dark hover:bg-gray-50',
              ].join(' ')}
              style={{ fontFamily: 'var(--font-dm)' }}
            >
              {n}問
            </button>
          ))}
        </div>
      </div>

      {/* シーン選択（任意） */}
      {triviaScenes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('settingsSceneLabel')}</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, scene: null })}
              className={`flex-shrink-0 h-8 px-3 rounded-full text-xs font-bold border-[2px] touch-manipulation transition-colors ${settings.scene === null ? 'bg-pr-dark text-white border-pr-dark' : 'bg-white text-pr-dark border-pr-dark hover:bg-gray-50'}`}
              style={{ fontFamily: 'var(--font-dm)' }}
            >
              {t('settingsSceneAll')}
            </button>
            {triviaScenes.map(scene => {
              const active = settings.scene === scene;
              const meta = SCENE_META[scene] ?? { icon: '🎉', color: '#FF0080' };
              return (
                <button
                  key={scene}
                  type="button"
                  onClick={() => setSettings({ ...settings, scene: active ? null : scene })}
                  className={`flex-shrink-0 h-8 px-3 rounded-full text-xs font-bold border-[2px] touch-manipulation transition-colors ${active ? 'text-white' : 'bg-white text-pr-dark border-pr-dark hover:bg-gray-50'}`}
                  style={active ? { backgroundColor: meta.color, borderColor: meta.color } : {}}
                >
                  {meta.icon} {scene}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 確定ボタン */}
      <button
        type="button"
        onClick={handleRandomTrivia}
        disabled={randomStarting !== null || starting !== null}
        className="w-full h-11 bg-pr-pink text-white font-bold text-sm rounded-[6px] border-[2px] border-pr-dark shadow-[2px_2px_0_#111] disabled:opacity-50 touch-manipulation hover:bg-pr-pink/90 transition-colors"
        style={{ fontFamily: 'var(--font-dm)' }}
      >
        {randomStarting !== null ? t('randomStarting') : t('settingsConfirm')}
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 5: Commit**

```bash
git add src/app/presets/page.tsx
git commit -m "feat: random card redesign — opinion + trivia cards with inline settings"
```

---

## Task 4: Manual UI verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:3000/presets` in a browser.

- [ ] **Step 2: Verify opinion card**

1. Check that ⚔️ 意見バトル card appears at top
2. Tap 🦄 少数派が負け → settings panel slides in below
3. Change 問題数 to 5 → button highlights
4. Tap 🚀 はじめる → redirects to /play/[id] lobby
5. Tap 🐑 多数派が負け → different rule selected, previous panel closes and new one opens
6. Tap the same button again → panel collapses

- [ ] **Step 3: Verify trivia card**

1. Check that 🧠 ランダムクイズ card appears below opinion card
2. Tap ▶ クイズをはじめる → settings expand
3. Change 問題数 to 15
4. Select a scene (e.g. 雑学クイズ) → it highlights
5. Tap 🚀 はじめる → redirects to /play/[id] with trivia game

- [ ] **Step 4: Commit any fixes then push**

```bash
git push origin master
```

---

## Self-Review Checklist

- [x] `/api/trivia/random` mirrors `/api/opinion/random` pattern exactly
- [x] TypeScript: `SettingsMode` union covers both card types
- [x] `handleRandom` uses `settings.count` when opinion panel is open
- [x] `handleRandomTrivia` correctly reads `settings.count` and `settings.scene`
- [x] `COUNT_OPTIONS` constant defined once, used in both cards
- [x] `SCENE_META` lookup already defined in the file (used by existing filter UI)
- [x] `triviaScenes` computed after `presets` is loaded (state dependency correct)
- [x] Settings panel toggle: tapping same button collapses panel
- [x] Both `randomStarting` and `starting` gates used on all buttons to prevent double-start
- [x] i18n keys match between `messages/ja.json` additions and `t('...')` calls in JSX
