# AI Question Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-powered question generator card to /presets — user enters a theme, picks mode and count, OpenAI generates the questions, game starts immediately.

**Architecture:** New `/api/ai/generate` endpoint receives `{ theme, mode, count, loseRule? }`, calls OpenAI `gpt-4o-mini` with a mode-specific Japanese prompt, parses the JSON response into questions, creates a game via `store.createGame`, and returns the lobby-status game. The presets page gets a new card at the top with a text input + mode/count pickers. Questions are ephemeral — no saving.

**Tech Stack:** Next.js 15 App Router, `openai` npm package, `gpt-4o-mini` with `response_format: { type: "json_object" }`, zod validation, next-intl (ICU `{count}`), Tailwind CSS neobrutalism.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `.env.local` | **MODIFY** | Add `OPENAI_API_KEY` |
| `src/app/api/ai/generate/route.ts` | **CREATE** | OpenAI call → create game → return lobby game |
| `messages/ja.json` | **MODIFY** | Add i18n keys for AI card |
| `src/app/presets/page.tsx` | **MODIFY** | Add AI card at top of content area |

---

## Task 1: Install openai package + set API key

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Install the openai package**

```bash
npm install openai
```

Expected: `added N packages` (no errors)

- [ ] **Step 2: Add API key to .env.local**

Create/edit `.env.local` and add:

```
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
```

(Replace `YOUR_KEY_HERE` with the actual key provided by the user. Never commit this file.)

- [ ] **Step 3: Verify .env.local is in .gitignore**

```bash
grep ".env.local" .gitignore
```

Expected output: `.env.local` (already listed — Next.js projects include this by default)

- [ ] **Step 4: Commit the package changes only (NOT .env.local)**

```bash
git add package.json package-lock.json
git commit -m "feat: install openai package for AI question generation"
```

---

## Task 2: `/api/ai/generate` endpoint

**Files:**
- Create: `src/app/api/ai/generate/route.ts`

- [ ] **Step 1: Create directory and file**

```bash
mkdir -p src/app/api/ai/generate
```

Then create `src/app/api/ai/generate/route.ts` with this exact content:

```ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { store } from '@/lib/store';

const schema = z.object({
  theme: z.string().min(1).max(50),
  mode: z.enum(['trivia', 'polling', 'opinion']),
  count: z.number().int().min(3).max(15),
  loseRule: z.enum(['minority', 'majority']).optional(),
});

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildPrompt(theme: string, mode: string, count: number): string {
  if (mode === 'trivia') {
    return `あなたはパーティーゲームの問題作成AIです。
テーマ「${theme}」について、日本語の4択クイズを${count}問作ってください。

以下のJSON形式で返してください：
{"questions": [{"text": "問題文", "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"], "correctIndex": 0, "timeLimitSec": 15}]}

条件：
- 盛り上がる・驚き・笑えるパーティー向けの内容
- 正解は options[correctIndex] に対応（0〜3）
- correctIndex は 0〜3 をバランスよく分散させる（全問同じ番号にしない）
- timeLimitSec は難易度に応じて 10〜20 の整数
- 日本語で出力`;
  }

  if (mode === 'polling') {
    return `あなたはパーティーゲームの問題作成AIです。
テーマ「${theme}」について、参加者の本音を引き出すアンケート問題を${count}問作ってください。

以下のJSON形式で返してください：
{"questions": [{"text": "質問文", "options": ["選択肢A", "選択肢B"], "correctIndex": null, "timeLimitSec": 12}]}

条件：
- 正解がなく、みんなの意見・好み・習慣を投票する問題
- 選択肢は2〜4個
- correctIndex は必ず null
- 参加者同士の会話が弾む内容
- 日本語で出力`;
  }

  // opinion
  return `あなたはパーティーゲームの問題作成AIです。
テーマ「${theme}」について、グループで多数派・少数派に分かれる問題を${count}問作ってください。

以下のJSON形式で返してください：
{"questions": [{"text": "質問文", "options": ["選択肢A", "選択肢B"], "correctIndex": null, "timeLimitSec": 12}]}

条件：
- どちらが多数派かわからないくらい意見が割れる問題
- 盛り上がる・笑える・本音が出る内容
- 選択肢は2〜3個
- correctIndex は必ず null
- 日本語で出力`;
}

interface RawQuestion {
  text: unknown;
  options: unknown;
  correctIndex: unknown;
  timeLimitSec: unknown;
}

function validateQuestions(raw: unknown): Array<{
  text: string;
  options: string[];
  correctIndex: number | null;
  timeLimitSec: number;
}> {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { questions?: unknown }).questions)) {
    throw new Error('Invalid response structure');
  }

  const questions = (raw as { questions: RawQuestion[] }).questions;

  return questions.map((q, i) => {
    if (typeof q.text !== 'string' || !q.text.trim()) throw new Error(`Question ${i}: missing text`);
    if (!Array.isArray(q.options) || q.options.length < 2) throw new Error(`Question ${i}: invalid options`);
    const options = q.options.map((o: unknown) => String(o));
    const correctIndex = q.correctIndex === null || q.correctIndex === undefined
      ? null
      : typeof q.correctIndex === 'number' ? q.correctIndex : null;
    const timeLimitSec = typeof q.timeLimitSec === 'number' ? q.timeLimitSec : 15;
    return { text: q.text.trim(), options, correctIndex, timeLimitSec };
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { theme, mode, count, loseRule } = parsed.data;

    const prompt = buildPrompt(theme, mode, count);

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.9,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    const raw = JSON.parse(content);
    const questions = validateQuestions(raw).slice(0, count);

    if (questions.length === 0) throw new Error('No questions generated');

    const modeLabel: Record<string, string> = {
      trivia: '🧠',
      polling: '📊',
      opinion: loseRule === 'minority' ? '🦄' : '🐑',
    };

    const game = await store.createGame({
      mode,
      gameMode: 'live',
      ...(mode === 'opinion' && loseRule ? { loseRule } : {}),
      title: `${modeLabel[mode]} ${theme}`,
      questions,
    });

    const lobbyGame = await store.updateGameStatus(game.id, 'lobby');
    return NextResponse.json(lobbyGame);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 });
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Smoke test (dev server must be running)**

Start dev server in another terminal: `npm run dev`

Then run:
```bash
curl -s -X POST http://localhost:3000/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{"theme":"犬","mode":"trivia","count":3}' | node -e "
const d=require('fs').readFileSync('/dev/stdin','utf-8');
const j=JSON.parse(d);
console.log('mode:',j.mode,'questions:',j.questions?.length,'status:',j.status);
if(j.questions?.[0]) console.log('Q1:',j.questions[0].text.slice(0,40));
"
```

Expected: `mode: trivia questions: 3 status: lobby` and a question preview.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/ai/generate/route.ts
git commit -m "feat: /api/ai/generate endpoint — OpenAI-powered question generation"
```

---

## Task 3: i18n keys

**Files:**
- Modify: `messages/ja.json`

- [ ] **Step 1: Add keys to messages/ja.json**

Open `messages/ja.json`. Find the `"presets"` object. Add these keys after `"settingsConfirm"`:

```json
"aiTitle": "✨ AIが問題を作る",
"aiSubtitle": "テーマを入れるだけで自動生成！",
"aiThemeLabel": "テーマ",
"aiThemePlaceholder": "例：野球、初デート、うちの会社...",
"aiTypeLabel": "タイプ",
"aiTypeTrivia": "🧠 クイズ",
"aiTypePolling": "📊 アンケート",
"aiTypeOpinion": "⚔️ 意見バトル",
"aiLoseRuleLabel": "負けルール",
"aiCountLabel": "問題数",
"aiGenerateButton": "✨ 作ってもらう",
"aiGenerating": "生成中...",
"aiErrorMessage": "生成に失敗しました。もう一度お試しください。"
```

- [ ] **Step 2: Verify JSON**

```bash
node -e "require('./messages/ja.json'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add messages/ja.json
git commit -m "feat: i18n keys for AI question generator card"
```

---

## Task 4: AI card UI on presets page

**Files:**
- Modify: `src/app/presets/page.tsx`

### State additions

- [ ] **Step 1: Add AI state variables**

After the existing `const [previewPreset, setPreviewPreset] = useState<Game | null>(null);` line, add:

```tsx
// AI generator state
const [aiTheme, setAiTheme] = useState('');
const [aiMode, setAiMode] = useState<'trivia' | 'polling' | 'opinion'>('trivia');
const [aiLoseRule, setAiLoseRule] = useState<'minority' | 'majority'>('minority');
const [aiCount, setAiCount] = useState<5 | 10 | 15>(10);
const [aiGenerating, setAiGenerating] = useState(false);
const [aiError, setAiError] = useState(false);
```

### Handler

- [ ] **Step 2: Add handleAiGenerate function**

After the `handleRandomTrivia` function, add:

```tsx
async function handleAiGenerate() {
  if (!aiTheme.trim() || aiGenerating) return;
  setAiGenerating(true);
  setAiError(false);
  try {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: aiTheme.trim(),
        mode: aiMode,
        count: aiCount,
        ...(aiMode === 'opinion' ? { loseRule: aiLoseRule } : {}),
      }),
    });
    if (!res.ok) throw new Error();
    const game = await res.json() as Game;
    router.push(`/play/${game.id}`);
  } catch {
    setAiError(true);
    setAiGenerating(false);
  }
}
```

### AI card JSX

- [ ] **Step 3: Add the AI card**

In the JSX, inside the `<>` fragment that contains the random cards and filter sections, add the following **as the very first element** (before `{/* ── 意見バトルカード ── */}`):

```tsx
{/* ── AIが問題を作る ── */}
<div className="bg-gradient-to-br from-pr-pink to-purple-600 rounded-[10px] border-[3px] border-pr-dark shadow-[4px_4px_0_#111] overflow-hidden">
  {/* ヘッダー */}
  <div className="px-4 py-3 flex items-center gap-3">
    <span className="text-2xl">✨</span>
    <div className="flex-1 min-w-0">
      <p className="text-white font-bold text-base leading-tight" style={{ fontFamily: 'var(--font-dm)' }}>
        {t('aiTitle')}
      </p>
      <p className="text-white/70 text-xs mt-0.5">{t('aiSubtitle')}</p>
    </div>
    <span className="flex-shrink-0 text-[10px] font-bold bg-white text-pr-pink px-2 py-0.5 rounded-full uppercase tracking-wider">
      NEW
    </span>
  </div>

  {/* フォーム */}
  <div className="bg-white/10 px-4 py-4 flex flex-col gap-4">
    {/* テーマ入力 */}
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-bold text-white/80 uppercase tracking-widest">{t('aiThemeLabel')}</p>
      <input
        type="text"
        value={aiTheme}
        onChange={e => { setAiTheme(e.target.value); setAiError(false); }}
        onKeyDown={e => { if (e.key === 'Enter') handleAiGenerate(); }}
        placeholder={t('aiThemePlaceholder')}
        maxLength={50}
        className="w-full h-12 px-4 rounded-[6px] border-[2px] border-white/30 bg-white/20 text-white placeholder:text-white/40 text-sm font-bold focus:outline-none focus:border-white transition-colors"
        style={{ fontFamily: 'var(--font-dm)' }}
      />
    </div>

    {/* タイプ選択 */}
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-bold text-white/80 uppercase tracking-widest">{t('aiTypeLabel')}</p>
      <div className="grid grid-cols-3 gap-2">
        {([
          ['trivia',  t('aiTypeTrivia')],
          ['polling', t('aiTypePolling')],
          ['opinion', t('aiTypeOpinion')],
        ] as const).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setAiMode(mode)}
            className={[
              'h-10 rounded-[6px] text-xs font-bold border-[2px] touch-manipulation transition-colors',
              aiMode === mode
                ? 'bg-white text-pr-pink border-white'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20',
            ].join(' ')}
            style={{ fontFamily: 'var(--font-dm)' }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>

    {/* 意見バトル：負けルール */}
    {aiMode === 'opinion' && (
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-bold text-white/80 uppercase tracking-widest">{t('aiLoseRuleLabel')}</p>
        <div className="grid grid-cols-2 gap-2">
          {([
            ['minority', t('randomMinority')],
            ['majority', t('randomMajority')],
          ] as const).map(([rule, label]) => (
            <button
              key={rule}
              type="button"
              onClick={() => setAiLoseRule(rule)}
              className={[
                'h-10 rounded-[6px] text-xs font-bold border-[2px] touch-manipulation transition-colors',
                aiLoseRule === rule
                  ? 'bg-white text-pr-pink border-white'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20',
              ].join(' ')}
              style={{ fontFamily: 'var(--font-dm)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    )}

    {/* 問題数 */}
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-bold text-white/80 uppercase tracking-widest">{t('aiCountLabel')}</p>
      <div className="flex gap-2">
        {COUNT_OPTIONS.map(n => (
          <button
            key={n}
            type="button"
            onClick={() => setAiCount(n)}
            className={[
              'flex-1 h-10 rounded-[6px] text-sm font-bold border-[2px] touch-manipulation transition-colors',
              aiCount === n
                ? 'bg-white text-pr-pink border-white'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20',
            ].join(' ')}
            style={{ fontFamily: 'var(--font-dm)' }}
          >
            {n}問
          </button>
        ))}
      </div>
    </div>

    {/* エラー表示 */}
    {aiError && (
      <p className="text-white/90 text-xs font-bold bg-red-500/40 rounded-[6px] px-3 py-2">
        {t('aiErrorMessage')}
      </p>
    )}

    {/* 生成ボタン */}
    <button
      type="button"
      onClick={handleAiGenerate}
      disabled={!aiTheme.trim() || aiGenerating || starting !== null || randomStarting !== null}
      className="w-full h-13 bg-white text-pr-pink font-bold text-base rounded-[6px] border-[2px] border-white shadow-[3px_3px_0_rgba(0,0,0,0.3)] active:shadow-[1px_1px_0_rgba(0,0,0,0.3)] active:translate-x-[1px] active:translate-y-[1px] transition-[transform,box-shadow] duration-75 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
      style={{ fontFamily: 'var(--font-dm)', height: '52px' }}
    >
      {aiGenerating ? t('aiGenerating') : t('aiGenerateButton')}
    </button>
  </div>
</div>
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/app/presets/page.tsx
git commit -m "feat: AI question generator card on /presets page"
```

---

## Task 5: Manual UI verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:3000/presets`

- [ ] **Step 2: Verify AI card appearance**

- AI card is the first card in the content area (above 意見バトル and ランダムクイズ cards)
- Pink-to-purple gradient background with white text
- "NEW" badge visible in header
- Theme input, 3 type buttons, count picker, generate button all visible

- [ ] **Step 3: Test trivia generation**

1. Type `野球` in the theme field
2. Select 🧠 クイズ (should already be selected by default)
3. Select 5問
4. Tap ✨ 作ってもらう
5. Wait 3-8 seconds (generation time)
6. Should redirect to `/play/[id]` lobby

- [ ] **Step 4: Test opinion mode**

1. Type `朝ごはん` in the theme field
2. Select ⚔️ 意見バトル → 負けルール row appears
3. Select 🦄 少数派が負け
4. Tap 作ってもらう → should redirect to lobby

- [ ] **Step 5: Test error state**

1. Temporarily break the API (e.g., wrong count like 0 won't pass zod) — or just verify the error message appears with a toast/inline error if the server returns 500

- [ ] **Step 6: Commit any fixes and push**

```bash
git push origin master
```

---

## Self-Review

**Spec coverage:**
- ✅ テーマ入力 → `aiTheme` text input
- ✅ クイズか質問か → `aiMode` selector (trivia / polling / opinion)
- ✅ 問題数 → `aiCount` picker (5/10/15)
- ✅ AI自動生成 → `/api/ai/generate` calls OpenAI gpt-4o-mini
- ✅ 使い捨て → game created directly, no preset saving
- ✅ 意見バトル時の負けルール → conditionally shown loseRule picker

**Placeholder scan:** None found — all steps have complete code.

**Type consistency:**
- `aiMode` typed as `'trivia' | 'polling' | 'opinion'` — matches `GameType` in domain.ts
- `aiLoseRule` typed as `'minority' | 'majority'` — matches `LoseRule` in domain.ts
- `aiCount` typed as `5 | 10 | 15` — consistent with `COUNT_OPTIONS` already in the file
- `store.createGame` call uses `mode`, `gameMode`, `loseRule`, `title`, `questions` — all valid fields per `Game` type
