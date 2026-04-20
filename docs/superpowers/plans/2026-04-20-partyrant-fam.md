# PartyRant-fam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fork PartyRant-jp into PartyRant-fam — a family/educational quiz app with grade×subject filtering, solo play mode, and PartyRant-Family branding.

**Architecture:** Clone PartyRant-jp to `Y:\webwork\PartyRant-fam`, set remote to `rocken318/PartyRant-fam`. Keep Next.js + Supabase stack. Questions remain JSONB in preset games but gain `grade` and `subject` fields. Solo play runs client-side (no Supabase game session). Opinion mode removed; trivia + polling only. New Supabase project (separate DB from jp).

**Tech Stack:** Next.js 14 (App Router), Supabase, TypeScript, Tailwind CSS v4, Zod

---

### Task 1: Clone repo and set up new repository

**Files:**
- Create: `Y:/webwork/PartyRant-fam/` (git clone)

- [ ] **Step 1: Clone PartyRant-jp into new directory**

```bash
git clone Y:/webwork/PartyRant-jp Y:/webwork/PartyRant-fam
```

- [ ] **Step 2: Change remote to new GitHub repo**

```bash
cd Y:/webwork/PartyRant-fam
git remote set-url origin https://github.com/rocken318/PartyRant-fam.git
```

- [ ] **Step 3: Verify remote**

```bash
git remote -v
# Expected:
# origin  https://github.com/rocken318/PartyRant-fam.git (fetch)
# origin  https://github.com/rocken318/PartyRant-fam.git (push)
```

- [ ] **Step 4: Install dependencies**

```bash
pnpm install
```

- [ ] **Step 5: Commit**

```bash
git commit --allow-empty -m "chore: fork from PartyRant-jp"
```

---

### Task 2: Update color tokens (PartyRant-Family palette)

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Find the color token lines in globals.css**

Search for:
```css
  --color-pr-pink: #FF0080;
  --color-pr-dark: #111111;
```

- [ ] **Step 2: Replace with family palette**

Replace those two lines with:
```css
  --color-pf-green:  #00C472;
  --color-pf-yellow: #FFD600;
  --color-pf-blue:   #3B82F6;
  --color-pf-dark:   #1A1A2E;
  /* legacy aliases: existing components pick up new colors without edits */
  --color-pr-pink: #00C472;
  --color-pr-dark: #1A1A2E;
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: family color palette (green/yellow/blue)"
```

---

### Task 3: Update domain types

**Files:**
- Modify: `src/types/domain.ts`

- [ ] **Step 1: Replace domain.ts entirely**

```ts
// src/types/domain.ts
export type GameType = 'trivia' | 'polling';   // opinion removed
export type PlayMode = 'live' | 'self_paced';

/** @deprecated use GameType */
export type GameMode = GameType;

export type GameStatus =
  | 'draft'
  | 'lobby'
  | 'question'
  | 'reveal'
  | 'ended';

export type Subject =
  | 'japanese'   // 国語
  | 'math'       // 算数/数学
  | 'science'    // 理科
  | 'social'     // 社会
  | 'english'    // 英語
  | 'ethics';    // 道徳

export const SUBJECT_LABELS: Record<Subject, string> = {
  japanese: '国語',
  math:     '算数・数学',
  science:  '理科',
  social:   '社会',
  english:  '英語',
  ethics:   '道徳',
};

export const SUBJECT_ICONS: Record<Subject, string> = {
  japanese: '📖',
  math:     '🔢',
  science:  '🔬',
  social:   '🌏',
  english:  '🇬🇧',
  ethics:   '💭',
};

// grade: 1=小1 … 6=小6, 7=中1 … 9=中3, 10=高1 … 12=高3
export const GRADE_LABELS: Record<number, string> = {
  1: '小1', 2: '小2', 3: '小3', 4: '小4', 5: '小5', 6: '小6',
  7: '中1', 8: '中2', 9: '中3',
  10: '高1', 11: '高2', 12: '高3',
};

export const GRADE_GROUPS = [
  { label: '小学生', shortLabel: '小1〜小6', min: 1, max: 6 },
  { label: '中学生', shortLabel: '中1〜中3', min: 7, max: 9 },
  { label: '高校生', shortLabel: '高1〜高3', min: 10, max: 12 },
] as const;

export interface Question {
  id: string;
  order: number;
  text: string;
  imageUrl?: string;
  options: string[];
  correctIndex?: number;
  timeLimitSec: number;
  grade?: number;      // 1–12 (optional for backward compat)
  subject?: Subject;   // optional for backward compat
}

export interface Event {
  id: string;
  hostId: string;
  name: string;
  createdAt: number;
}

export interface Game {
  id: string;
  eventId?: string;
  hostId?: string;
  joinCode: string;
  mode: GameType;
  gameMode: PlayMode;
  title: string;
  description?: string;
  scene?: string;
  isPreset?: boolean;
  questions: Question[];
  status: GameStatus;
  currentQuestionIndex: number;
  currentQuestionStartedAt?: number;
  createdAt: number;
  endedAt?: number;
}

export interface Player {
  id: string;
  gameId: string;
  displayName: string;
  joinedAt: number;
}

export interface Answer {
  id: string;
  gameId: string;
  playerId: string;
  questionId: string;
  choiceIndex: number;
  answeredAt: number;
  responseTimeMs: number;
}

export interface Score {
  playerId: string;
  displayName: string;
  totalPoints: number;
  correctCount: number;
}
```

- [ ] **Step 2: Check TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Expected: Errors about `opinion` and `loseRule` references in other files — those are fixed in the next tasks.

- [ ] **Step 3: Commit**

```bash
git add src/types/domain.ts
git commit -m "feat: add grade/subject types, remove opinion mode from domain"
```

---

### Task 4: Remove opinion mode from API routes

**Files:**
- Delete: `src/app/api/opinion/` (entire directory)
- Modify: `src/app/api/ai/generate/route.ts`

- [ ] **Step 1: Delete opinion API directory**

```bash
cd Y:/webwork/PartyRant-fam
rm -rf src/app/api/opinion
```

- [ ] **Step 2: Read the AI generate route**

```bash
cat src/app/api/ai/generate/route.ts
```

- [ ] **Step 3: Update AI generate route**

In `src/app/api/ai/generate/route.ts`:
- Find the Zod schema's `mode` field and change it from `z.enum(['trivia', 'polling', 'opinion'])` to `z.enum(['trivia', 'polling'])`
- Remove any `loseRule` field from the Zod schema
- Remove any `if (mode === 'opinion')` branches
- The game created should use `mode: 'trivia'` or `mode: 'polling'` based on input

- [ ] **Step 4: Find and fix any remaining opinion references**

```bash
grep -r "opinion\|loseRule\|lose_rule" src/ --include="*.ts" --include="*.tsx" -l
```

For each file listed, remove opinion/loseRule references.

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: No errors about opinion or loseRule.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: remove opinion mode from all API routes and components"
```

---

### Task 5: Create `/api/quiz/random` endpoint

**Files:**
- Create: `src/app/api/quiz/random/route.ts`

This endpoint returns raw Question objects filtered by grade range and subject (no game creation).

- [ ] **Step 1: Create the route file**

```ts
// src/app/api/quiz/random/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import type { Question } from '@/types/domain';

const schema = z.object({
  gradeMin: z.number().int().min(1).max(12),
  gradeMax: z.number().int().min(1).max(12),
  subject:  z.enum(['japanese', 'math', 'science', 'social', 'english', 'ethics'] as const),
  count:    z.number().int().min(3).max(20).default(10),
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
    const { gradeMin, gradeMax, subject, count } = parsed.data;

    const presets = await store.listPresets();
    const pool: Question[] = [];

    for (const preset of presets) {
      for (const q of preset.questions) {
        if (q.grade === undefined || q.subject === undefined) continue;
        if (q.grade < gradeMin || q.grade > gradeMax) continue;
        if (q.subject !== subject) continue;
        pool.push(q);
      }
    }

    if (pool.length === 0) {
      return NextResponse.json(
        { error: `${subject} の問題がまだありません。問題が追加されるまでお待ちください。` },
        { status: 404 }
      );
    }

    const selected = shuffle(pool).slice(0, Math.min(count, pool.length));
    return NextResponse.json(selected);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '問題の取得に失敗しました' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "quiz/random" || echo "No errors in new route"
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/quiz/random/route.ts
git commit -m "feat: add /api/quiz/random endpoint with grade/subject filter"
```

---

### Task 6: Create GradeRangeSelector and SubjectSelector components

**Files:**
- Create: `src/components/GradeRangeSelector.tsx`
- Create: `src/components/SubjectSelector.tsx`

- [ ] **Step 1: Create GradeRangeSelector**

```tsx
// src/components/GradeRangeSelector.tsx
'use client';

import { GRADE_GROUPS } from '@/types/domain';

interface Props {
  gradeMin: number;
  gradeMax: number;
  onChange: (min: number, max: number) => void;
}

export function GradeRangeSelector({ gradeMin, gradeMax, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">学年</p>
      <div className="flex flex-col gap-2">
        {GRADE_GROUPS.map(group => {
          const isActive = gradeMin === group.min && gradeMax === group.max;
          return (
            <button
              key={group.label}
              type="button"
              onClick={() => onChange(group.min, group.max)}
              className={[
                'h-14 rounded-[10px] font-bold text-base border-[3px] shadow-[3px_3px_0_#1A1A2E] active:shadow-[1px_1px_0_#1A1A2E] active:translate-x-[1px] active:translate-y-[1px] transition-[transform,box-shadow] duration-75 touch-manipulation flex items-center justify-between px-5',
                isActive
                  ? 'bg-pf-green text-white border-pf-dark'
                  : 'bg-white text-pf-dark border-pf-dark',
              ].join(' ')}
              style={{ fontFamily: 'var(--font-dm)' }}
            >
              <span>{group.label}</span>
              <span className="text-sm opacity-70">{group.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create SubjectSelector**

```tsx
// src/components/SubjectSelector.tsx
'use client';

import { SUBJECT_LABELS, SUBJECT_ICONS } from '@/types/domain';
import type { Subject } from '@/types/domain';

interface Props {
  value: Subject | null;
  onChange: (subject: Subject) => void;
}

export function SubjectSelector({ value, onChange }: Props) {
  const subjects = Object.keys(SUBJECT_LABELS) as Subject[];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">教科</p>
      <div className="grid grid-cols-3 gap-2">
        {subjects.map(subject => {
          const isActive = value === subject;
          return (
            <button
              key={subject}
              type="button"
              onClick={() => onChange(subject)}
              className={[
                'h-16 rounded-[10px] font-bold text-sm border-[3px] border-pf-dark shadow-[3px_3px_0_#1A1A2E] active:shadow-[1px_1px_0_#1A1A2E] active:translate-x-[1px] active:translate-y-[1px] transition-[transform,box-shadow] duration-75 touch-manipulation flex flex-col items-center justify-center gap-1',
                isActive
                  ? 'bg-pf-yellow text-pf-dark'
                  : 'bg-white text-pf-dark',
              ].join(' ')}
              style={{ fontFamily: 'var(--font-dm)' }}
            >
              <span className="text-xl">{SUBJECT_ICONS[subject]}</span>
              <span className="text-xs leading-tight text-center">{SUBJECT_LABELS[subject]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "GradeRange|SubjectSelect" || echo "No errors in new components"
```

- [ ] **Step 4: Commit**

```bash
git add src/components/GradeRangeSelector.tsx src/components/SubjectSelector.tsx
git commit -m "feat: GradeRangeSelector and SubjectSelector components"
```

---

### Task 7: Create solo play page (`/solo`)

**Files:**
- Create: `src/app/solo/page.tsx`

Full solo quiz flow: setup → quiz → result. No Supabase game session. Login-free.

- [ ] **Step 1: Create the solo page**

```tsx
// src/app/solo/page.tsx
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { GradeRangeSelector } from '@/components/GradeRangeSelector';
import { SubjectSelector } from '@/components/SubjectSelector';
import { CountdownTimer } from '@/components/CountdownTimer';
import type { Question, Subject } from '@/types/domain';

type SoloPhase = 'setup' | 'quiz' | 'result';
const COUNT_OPTIONS = [5, 10, 20] as const;

export default function SoloPage() {
  // Setup state
  const [phase, setPhase] = useState<SoloPhase>('setup');
  const [gradeMin, setGradeMin] = useState(1);
  const [gradeMax, setGradeMax] = useState(6);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [count, setCount] = useState<5 | 10 | 20>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quiz state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ correct: boolean }[]>([]);
  const [startedAt, setStartedAt] = useState(0);

  const handleStart = async () => {
    if (!subject) { setError('教科を選んでください'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/quiz/random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeMin, gradeMax, subject, count }),
      });
      if (!res.ok) {
        const data = await res.json() as { error: string };
        throw new Error(data.error ?? 'エラーが発生しました');
      }
      const qs = await res.json() as Question[];
      setQuestions(qs);
      setCurrentIndex(0);
      setAnswers([]);
      setSelected(null);
      setStartedAt(Date.now());
      setPhase('quiz');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = useCallback((choiceIndex: number) => {
    if (selected !== null) return;
    const q = questions[currentIndex];
    setSelected(choiceIndex);
    const correct = q.correctIndex === choiceIndex;
    setAnswers(prev => [...prev, { correct }]);

    setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        setPhase('result');
      } else {
        setCurrentIndex(i => i + 1);
        setSelected(null);
        setStartedAt(Date.now());
      }
    }, 1200);
  }, [selected, questions, currentIndex]);

  // ── Setup ──────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
        <div className="bg-pf-dark px-4 py-4 flex items-center gap-3 rounded-b-[20px]">
          <Link href="/" className="text-white text-xl font-bold w-10 h-10 flex items-center justify-center rounded-full border-[2px] border-white/30 touch-manipulation">
            ←
          </Link>
          <div>
            <span className="text-pf-green text-3xl tracking-wide" style={{ fontFamily: 'var(--font-bebas)' }}>
              ひとりで練習
            </span>
            <p className="text-gray-400 text-xs font-bold">学年と教科を選んでスタート</p>
          </div>
        </div>

        <div className="flex-1 px-4 py-6 flex flex-col gap-6">
          <GradeRangeSelector
            gradeMin={gradeMin}
            gradeMax={gradeMax}
            onChange={(min, max) => { setGradeMin(min); setGradeMax(max); }}
          />

          <SubjectSelector value={subject} onChange={setSubject} />

          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">問題数</p>
            <div className="flex gap-2">
              {COUNT_OPTIONS.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className={[
                    'flex-1 h-12 rounded-[10px] font-bold text-base border-[3px] border-pf-dark shadow-[3px_3px_0_#1A1A2E] active:shadow-[1px_1px_0_#1A1A2E] active:translate-x-[1px] active:translate-y-[1px] transition-[transform,box-shadow] duration-75 touch-manipulation',
                    count === n ? 'bg-pf-blue text-white' : 'bg-white text-pf-dark',
                  ].join(' ')}
                  style={{ fontFamily: 'var(--font-dm)' }}
                >
                  {n}問
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm font-bold text-center bg-red-50 rounded-[8px] px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleStart}
            disabled={!subject || loading}
            className="w-full h-16 bg-pf-green text-white text-xl font-bold rounded-[12px] border-[3px] border-pf-dark shadow-[5px_5px_0_#1A1A2E] active:shadow-[2px_2px_0_#1A1A2E] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 disabled:opacity-50 touch-manipulation mt-auto"
            style={{ fontFamily: 'var(--font-dm)' }}
          >
            {loading ? '読み込み中...' : '🚀 スタート！'}
          </button>
        </div>
      </main>
    );
  }

  // ── Quiz ───────────────────────────────────────────────────────────────
  if (phase === 'quiz' && questions.length > 0) {
    const q = questions[currentIndex];
    return (
      <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
        <div className="bg-pf-dark px-4 py-3 flex items-center justify-between">
          <span className="text-white font-bold text-sm" style={{ fontFamily: 'var(--font-dm)' }}>
            {currentIndex + 1} / {questions.length}
          </span>
          <CountdownTimer
            timeLimitSec={q.timeLimitSec}
            startedAt={startedAt}
            onExpire={() => { if (selected === null) handleAnswer(-1); }}
          />
        </div>

        <div className="flex-1 px-4 py-6 flex flex-col gap-6">
          <p className="text-pf-dark text-xl font-extrabold leading-snug" style={{ fontFamily: 'var(--font-dm)' }}>
            {q.text}
          </p>

          <div className="flex flex-col gap-3">
            {q.options.map((opt, i) => {
              let cls = 'bg-white text-pf-dark border-pf-dark';
              if (selected !== null) {
                if (i === q.correctIndex) cls = 'bg-pf-green text-white border-pf-green';
                else if (i === selected)  cls = 'bg-red-500 text-white border-red-500';
                else                      cls = 'bg-gray-100 text-gray-400 border-gray-200';
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleAnswer(i)}
                  disabled={selected !== null}
                  className={`w-full min-h-[56px] px-4 text-left rounded-[10px] font-bold text-base border-[3px] shadow-[4px_4px_0_#1A1A2E] active:shadow-[2px_2px_0_#1A1A2E] active:translate-x-[1px] active:translate-y-[1px] transition-[transform,box-shadow,background-color] duration-150 disabled:cursor-not-allowed touch-manipulation ${cls}`}
                  style={{ fontFamily: 'var(--font-dm)' }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────
  const correctCount = answers.filter(a => a.correct).length;
  const total = questions.length;
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return (
    <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
      <div className="bg-pf-dark px-4 py-4 rounded-b-[20px]">
        <span className="text-pf-green text-3xl tracking-wide" style={{ fontFamily: 'var(--font-bebas)' }}>
          結果
        </span>
      </div>

      <div className="flex-1 px-4 py-10 flex flex-col items-center gap-6">
        <div className="text-7xl">{pct >= 80 ? '🎉' : pct >= 50 ? '😊' : '😅'}</div>
        <p className="text-5xl font-extrabold text-pf-dark" style={{ fontFamily: 'var(--font-bebas)' }}>
          {correctCount} / {total}問正解
        </p>
        <p className="text-2xl font-bold text-pf-green">{pct}%</p>

        <div className="w-full flex flex-col gap-3 mt-6">
          <button
            type="button"
            onClick={() => { setPhase('setup'); setSelected(null); setAnswers([]); }}
            className="w-full h-14 bg-pf-green text-white font-bold text-lg rounded-[12px] border-[3px] border-pf-dark shadow-[4px_4px_0_#1A1A2E] active:shadow-[2px_2px_0_#1A1A2E] active:translate-x-[1px] active:translate-y-[1px] transition-[transform,box-shadow] duration-75 touch-manipulation"
            style={{ fontFamily: 'var(--font-dm)' }}
          >
            もう一度やる
          </button>
          <Link
            href="/"
            className="w-full h-12 bg-white text-pf-dark font-bold text-base rounded-[12px] border-[3px] border-pf-dark shadow-[4px_4px_0_#1A1A2E] flex items-center justify-center touch-manipulation"
            style={{ fontFamily: 'var(--font-dm)' }}
          >
            トップへ
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "solo" || echo "No errors in solo page"
```

- [ ] **Step 3: Commit**

```bash
git add src/app/solo/page.tsx
git commit -m "feat: solo play mode with grade/subject selector and inline quiz"
```

---

### Task 8: Update home page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace page.tsx**

```tsx
// src/app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
      {/* Header */}
      <div className="bg-pf-dark px-6 pt-16 pb-20 flex flex-col items-center gap-1 rounded-b-[40px]">
        <h1
          className="text-pf-green tracking-wider"
          style={{ fontFamily: 'var(--font-bebas)', fontSize: '4.5rem', lineHeight: 1 }}
        >
          PartyRant
        </h1>
        <p
          className="text-white tracking-[0.3em]"
          style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.8rem', lineHeight: 1 }}
        >
          Family
        </p>
        <p className="text-white/50 text-xs font-bold uppercase tracking-[0.2em] mt-2">
          家族で学ぶ、いちばん楽しい方法
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-4 px-6 py-10">
        <Link
          href="/solo"
          className="w-full h-20 bg-pf-green text-white flex flex-col items-center justify-center gap-1 font-bold rounded-[14px] border-[3px] border-pf-dark shadow-[5px_5px_0_#1A1A2E] active:shadow-[2px_2px_0_#1A1A2E] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation"
          style={{ fontFamily: 'var(--font-dm)' }}
        >
          <span className="text-2xl">📚</span>
          <span className="text-lg">ひとりで練習</span>
        </Link>

        <Link
          href="/presets"
          className="w-full h-20 bg-pf-yellow text-pf-dark flex flex-col items-center justify-center gap-1 font-bold rounded-[14px] border-[3px] border-pf-dark shadow-[5px_5px_0_#1A1A2E] active:shadow-[2px_2px_0_#1A1A2E] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation"
          style={{ fontFamily: 'var(--font-dm)' }}
        >
          <span className="text-2xl">🎮</span>
          <span className="text-lg">みんなで遊ぶ</span>
        </Link>

        <Link
          href="/join"
          className="w-full h-16 bg-pf-dark text-white flex items-center justify-center text-base font-bold rounded-[14px] border-[3px] border-pf-dark shadow-[4px_4px_0_#1A1A2E] active:shadow-[2px_2px_0_#1A1A2E] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation"
          style={{ fontFamily: 'var(--font-dm)' }}
        >
          🔑 コードで入室
        </Link>

        <Link
          href="/auth/login"
          className="text-gray-400 text-sm font-bold underline text-center mt-2 touch-manipulation"
          style={{ fontFamily: 'var(--font-dm)' }}
        >
          ホスト・先生はこちら
        </Link>

        <Link href="/lp" className="text-pf-green text-sm font-bold underline text-center">
          PartyRant Family とは？
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: home page with 3 entry points for PartyRant-fam"
```

---

### Task 9: Update presets page (grade/subject filter, remove opinion)

**Files:**
- Modify: `src/app/presets/page.tsx`

- [ ] **Step 1: Update TYPE_META — remove opinion**

In `src/app/presets/page.tsx`, find `TYPE_META` and replace with:
```ts
const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  trivia:  { label: 'クイズ',    icon: '🧠', color: '#3B82F6' },
  polling: { label: '実態調査', icon: '📊', color: '#00C472' },
};
```

- [ ] **Step 2: Add imports for grade/subject constants**

At the top of the file, add:
```ts
import { SUBJECT_LABELS, SUBJECT_ICONS, GRADE_GROUPS } from '@/types/domain';
import type { Subject } from '@/types/domain';
```

- [ ] **Step 3: Add grade/subject filter state**

Inside the `PresetsPage` component, add these state declarations after existing `useState` calls:
```ts
const [selectedGradeGroup, setSelectedGradeGroup] = useState<{ min: number; max: number } | null>(null);
const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
```

Remove state for `selectedScene` and `selectedType` if you want to replace scene filtering entirely, or keep `selectedType` for trivia/polling toggle.

- [ ] **Step 4: Update filter logic**

Replace the `filtered` const:
```ts
const filtered = presets.filter(p => {
  if (selectedSubject) {
    const hasSubject = p.questions.some(q => (q as { subject?: string }).subject === selectedSubject);
    if (!hasSubject) return false;
  }
  if (selectedGradeGroup) {
    const inRange = p.questions.some(q => {
      const grade = (q as { grade?: number }).grade;
      return grade !== undefined && grade >= selectedGradeGroup.min && grade <= selectedGradeGroup.max;
    });
    if (!inRange) return false;
  }
  return true;
});
```

- [ ] **Step 5: Remove 意見バトルカード section**

Find the section starting with `{/* ── 意見バトルカード ── */}` and delete it (including its closing `</div>`). Also remove the `handleRandom` function and `randomStarting` state.

- [ ] **Step 6: Remove opinion from AI generation form**

Find the AI generation type selector (the `grid-cols-3` buttons). Remove the `'opinion'` entry and change the grid to `grid-cols-2`:
```tsx
{([
  ['trivia',  t('aiTypeTrivia')],
  ['polling', t('aiTypePolling')],
] as const).map(([mode, label]) => (
```
Change `className` from `grid grid-cols-3 gap-2` to `grid grid-cols-2 gap-2`.

Also remove the `{aiMode === 'opinion' && (...)}` block (loss rule selector).

- [ ] **Step 7: Replace scene filter UI with subject filter**

Find the `{/* ── シーンフィルター ── */}` section and replace it with:
```tsx
{/* ── 教科フィルター ── */}
<div className="flex flex-col gap-1.5">
  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-0.5">教科で絞り込む</p>
  <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
    <button
      onClick={() => setSelectedSubject(null)}
      className={`flex-shrink-0 h-9 px-4 rounded-full text-xs font-bold border-[2px] border-pf-dark touch-manipulation transition-colors ${!selectedSubject ? 'bg-pf-dark text-white' : 'bg-white text-pf-dark'}`}
      style={{ fontFamily: 'var(--font-dm)' }}>
      すべて
    </button>
    {(Object.keys(SUBJECT_LABELS) as Subject[]).map(sub => {
      const active = selectedSubject === sub;
      return (
        <button key={sub}
          onClick={() => setSelectedSubject(active ? null : sub)}
          className={`flex-shrink-0 h-9 px-4 rounded-full text-xs font-bold border-[2px] touch-manipulation transition-colors ${active ? 'bg-pf-yellow text-pf-dark border-pf-yellow' : 'bg-white text-pf-dark border-pf-dark'}`}
          style={{ fontFamily: 'var(--font-dm)' }}>
          {SUBJECT_ICONS[sub]} {SUBJECT_LABELS[sub]}
        </button>
      );
    })}
  </div>
</div>

{/* ── 学年フィルター ── */}
<div className="flex flex-col gap-1.5">
  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-0.5">学年で絞り込む</p>
  <div className="flex gap-2">
    <button
      onClick={() => setSelectedGradeGroup(null)}
      className={`flex-1 h-9 rounded-full text-xs font-bold border-[2px] border-pf-dark touch-manipulation transition-colors ${!selectedGradeGroup ? 'bg-pf-dark text-white' : 'bg-white text-pf-dark'}`}
      style={{ fontFamily: 'var(--font-dm)' }}>
      すべて
    </button>
    {GRADE_GROUPS.map(group => {
      const active = selectedGradeGroup?.min === group.min;
      return (
        <button key={group.label}
          onClick={() => setSelectedGradeGroup(active ? null : { min: group.min, max: group.max })}
          className={`flex-1 h-9 rounded-full text-xs font-bold border-[2px] touch-manipulation transition-colors ${active ? 'bg-pf-green text-white border-pf-green' : 'bg-white text-pf-dark border-pf-dark'}`}
          style={{ fontFamily: 'var(--font-dm)' }}>
          {group.label}
        </button>
      );
    })}
  </div>
</div>
```

- [ ] **Step 8: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Fix any remaining opinion/loseRule references flagged by the compiler.

- [ ] **Step 9: Commit**

```bash
git add src/app/presets/page.tsx
git commit -m "feat: presets page — grade/subject filter, remove opinion"
```

---

### Task 10: Update landing page content

**Files:**
- Modify: `messages/ja.json`
- Modify: `src/components/lp/HeroSection.tsx`

- [ ] **Step 1: Read current ja.json lp section**

```bash
cat messages/ja.json | head -200
```

Find the `"lp"` key in the JSON.

- [ ] **Step 2: Update lp messages in ja.json**

Find and replace the `lp` key group. Key fields to update (keep the same key names, change values):

```json
"lp": {
  "heroTagline": "PartyRant Family",
  "heroHeadline": "家族で学ぶ、\nいちばん楽しい方法。",
  "heroSub": "小1から高3まで。教科と学年を選んで今すぐ始めよう。",
  "heroCta1": "ひとりで練習する",
  "heroCta2": "みんなで遊ぶ",
  "usecaseTitle": "こんな場面で使えます",
  "usecase1Icon": "📚",
  "usecase1Title": "ひとり練習",
  "usecase1Desc": "学年と教科を選んでランダム出題。すき間時間に使える。",
  "usecase2Icon": "🏠",
  "usecase2Title": "家族対決",
  "usecase2Desc": "リビングでみんなで答える。学年ミックスもOK。",
  "usecase3Icon": "🏫",
  "usecase3Title": "先生・教室で",
  "usecase3Desc": "プリセット問題を授業に活用。ログイン不要。",
  "featuresTitle": "特徴",
  "feature1Title": "小1〜高3対応",
  "feature1Desc": "国語・算数・理科・社会・英語・道徳。全学年の問題を収録。",
  "feature2Title": "ログイン不要",
  "feature2Desc": "プリセット問題はアカウント不要。すぐ遊べる。",
  "feature3Title": "問題は随時追加",
  "feature3Desc": "コンテンツは定期的に更新予定。",
  "stepsTitle": "はじめかた",
  "step1Title": "学年と教科を選ぶ",
  "step1Desc": "小1〜高3、6教科から選べる。",
  "step2Title": "みんなで答える",
  "step2Desc": "ランダム出題でどんどん進む。",
  "step3Title": "盛り上がる！",
  "step3Desc": "正解発表でわいわい楽しもう。",
  ...
}
```

Keep all keys that exist in the original; update only values in the `lp` section. Do not remove keys used by other pages.

- [ ] **Step 3: Update HeroSection CTA links**

In `src/components/lp/HeroSection.tsx`, ensure `cta1` links to `/solo` and `cta2` links to `/presets`. Read the file first:
```bash
cat src/components/lp/HeroSection.tsx
```
Then update the `href` values on the CTA buttons accordingly.

- [ ] **Step 4: Commit**

```bash
git add messages/ja.json src/components/lp/
git commit -m "feat: LP content updated for PartyRant-Family"
```

---

### Task 11: Update app metadata and branding

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Read layout.tsx**

```bash
cat src/app/layout.tsx | head -40
```

- [ ] **Step 2: Update metadata**

Find the `metadata` export and update:
```ts
export const metadata: Metadata = {
  title: 'PartyRant Family',
  description: '家族で学ぶ、いちばん楽しい方法。小1〜高3の問題でクイズ対決！',
};
```

- [ ] **Step 3: Find remaining jp-specific text**

```bash
grep -rn "PartyRant[^F]" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules"
```

Update any header components that show "PartyRant" without "Family" to show "PartyRant Family" or keep consistent with new branding.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "chore: update app metadata to PartyRant Family"
```

---

### Task 12: Update Supabase schema

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Update mode check in schema.sql**

Find:
```sql
mode text not null check (mode in ('trivia', 'polling', 'opinion')),
```
Replace with:
```sql
mode text not null check (mode in ('trivia', 'polling')),
```

- [ ] **Step 2: Remove lose_rule column**

Find and delete this line:
```sql
lose_rule text check (lose_rule in ('minority', 'majority')),
```

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "chore: update Supabase schema — remove opinion mode and lose_rule"
```

---

### Task 13: Final build check and push

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: 0 errors. Fix any remaining issues before proceeding.

- [ ] **Step 2: Build check**

```bash
pnpm build 2>&1 | tail -30
```

Expected: ✓ Compiled successfully

- [ ] **Step 3: Push to GitHub**

```bash
git push -u origin master
```

---

## Self-Review

**Spec coverage:**
- ✅ Fork from jp (Task 1)
- ✅ New color tokens — green/yellow/blue (Task 2)
- ✅ `grade` + `subject` on Question type (Task 3)
- ✅ `Subject` type extensible via string addition (Task 3)
- ✅ GRADE_GROUPS covers 小1〜高3 (Task 3)
- ✅ trivia + polling only, opinion removed (Tasks 4, 9)
- ✅ `/api/quiz/random` with grade range + subject filter (Task 5)
- ✅ GradeRangeSelector + SubjectSelector components (Task 6)
- ✅ Solo play mode — login-free, grade/subject/count → quiz → result (Task 7)
- ✅ Home page with 3 entry points (Task 8)
- ✅ Presets page — grade/subject filter, opinion removed (Task 9)
- ✅ LP updated for PartyRant-Family (Task 10)
- ✅ App metadata + branding (Task 11)
- ✅ Supabase schema updated (Task 12)
- ✅ Auth: presets login-free, custom games require login (existing mechanism unchanged)
- ✅ Host mode: existing flow preserved (no changes to host/events routes)

**Placeholder scan:** No TBD/TODO in code blocks. Task 9 (presets page edits) gives instructions-style guidance because the full 697-line page can't be replaced wholesale without risking loss of unrelated features. Each step is specific about what to find and change.

**Type consistency:** `SUBJECT_ICONS` defined in `domain.ts` (Task 3) and used in `SubjectSelector.tsx` (Task 6) and `presets/page.tsx` (Task 9). `GRADE_GROUPS` defined in Task 3 and used in Task 6, 7, 9. `Question.grade` / `Question.subject` optional fields defined in Task 3 and read in Task 5 API route. All consistent.
