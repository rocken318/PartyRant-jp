# Next.js Backend — Lint / Auth / Monetization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 lint errors, add auth/owner checks to host API routes, add Bearer JWT support for Expo, and implement profiles + RevenueCat webhook + Free/Pro plan limits.

**Architecture:** All changes are in the existing Next.js app (`PartyRant-jp` and `PartyRant-fam`). A new `profiles` table in Supabase tracks plan status and AI usage. A new `getUserFromRequest()` helper accepts both cookie-based (web) and Bearer JWT (Expo) auth. Plan limits are enforced server-side in API routes. RevenueCat webhook updates `profiles.plan` when a subscription changes.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + Auth), Zod, RevenueCat webhooks

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/hooks/useGameStream.ts` | Modify | Fix lint: wrap ref assignment in useLayoutEffect |
| `src/components/GameQRCode.tsx` | Modify | Fix lint: derive isLocalhost from url, remove setState-in-effect |
| `src/lib/supabase/auth-server.ts` | Modify | Add `getUserFromRequest(req)` — Bearer JWT + cookie fallback |
| `src/lib/supabase/profiles.ts` | Create | `getOrCreateProfile`, `countUserGames`, `incrementAiGenCount`, `setPlan` |
| `src/app/api/games/[gameId]/route.ts` | Modify | Add owner check to PATCH |
| `src/app/api/games/[gameId]/advance/route.ts` | Modify | Add owner check |
| `src/app/api/games/[gameId]/reset/route.ts` | Modify | Add owner check |
| `src/app/api/games/route.ts` | Modify | Add Free plan game limit check |
| `src/app/api/ai/generate/route.ts` | Modify | Add auth + Free plan AI limit check |
| `src/app/api/webhook/revenuecat/route.ts` | Create | Handle RevenueCat subscription events |

**Apply identical changes to `PartyRant-fam`** after completing each task for `-jp`.

---

## Task 1: Fix lint — `useGameStream.ts`

**Files:**
- Modify: `src/lib/hooks/useGameStream.ts`

**Problem:** `onEventRef.current = onEvent` is set during render, which the lint rule flags as "Cannot update ref during render."

**Fix:** Move the assignment into `useLayoutEffect` with no deps array (runs after every render, before paint).

- [ ] **Replace the file content:**

```typescript
'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { GameEvent } from '@/lib/events/types';

export function useGameStream(
  gameId: string | null,
  onEvent: (event: GameEvent) => void
): void {
  const onEventRef = useRef(onEvent);
  useLayoutEffect(() => {
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    if (!gameId) return;

    const es = new EventSource(`/api/stream/${gameId}`);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as GameEvent;
        onEventRef.current(event);
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      es.close();
    };
  }, [gameId]);
}
```

- [ ] **Apply the same change to `PartyRant-fam`** (`src/lib/hooks/useGameStream.ts`)

---

## Task 2: Fix lint — `GameQRCode.tsx`

**Files:**
- Modify: `src/components/GameQRCode.tsx`

**Problem:** `setIsLocalhost(localhost)` is called synchronously inside `useEffect`, which the lint rule flags.

**Fix:** Remove `isLocalhost` state entirely. Derive it from `url` string at render time (the warning badge only renders after `url` is set, so this is equivalent).

- [ ] **Replace the file content:**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export function GameQRCode({ joinCode }: { joinCode: string }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const origin = window.location.origin;
    const localhost = origin.includes('localhost') || origin.includes('127.0.0.1');

    if (!localhost) {
      setUrl(`${origin}/join/${joinCode}`);
      return;
    }

    // On localhost: fetch the PC's local network IP so mobile can reach it
    fetch('/api/local-url')
      .then(r => r.ok ? r.json() as Promise<{ networkUrl: string | null }> : Promise.resolve({ networkUrl: null }))
      .then(({ networkUrl }) => {
        const base = networkUrl ?? origin;
        setUrl(`${base}/join/${joinCode}`);
      })
      .catch(() => setUrl(`${origin}/join/${joinCode}`));
  }, [joinCode]);

  // Derive isLocalhost from the resolved URL — only relevant after url is set
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');

  if (!url) {
    return (
      <div className="w-64 h-64 bg-gray-100 rounded-[8px] border-[3px] border-pr-dark animate-pulse" />
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="p-4 bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[5px_5px_0_#111]">
        <QRCodeSVG value={url} size={224} />
      </div>
      <p className="text-xs text-gray-400 text-center break-all max-w-xs">{url}</p>
      {isLocalhost && (
        <p className="text-xs text-amber-600 font-bold text-center max-w-xs bg-amber-50 rounded-[6px] px-3 py-1.5 border border-amber-200">
          ⚠️ ローカル開発中: PCとスマホを同じWi-Fiに接続してください
        </p>
      )}
    </div>
  );
}
```

- [ ] **Apply the same change to `PartyRant-fam`**

- [ ] **Run lint to confirm 0 errors:**

```bash
pnpm lint
```

Expected: no errors (warnings are OK)

- [ ] **Commit both repos:**

```bash
# in PartyRant-jp
git add src/lib/hooks/useGameStream.ts src/components/GameQRCode.tsx
git commit -m "fix: resolve lint errors in useGameStream and GameQRCode"

# in PartyRant-fam
git add src/lib/hooks/useGameStream.ts src/components/GameQRCode.tsx
git commit -m "fix: resolve lint errors in useGameStream and GameQRCode"
```

---

## Task 3: Add `profiles` table to Supabase

**This is a manual SQL step — run in the Supabase dashboard SQL editor for both projects.**

- [ ] **Run the following SQL in PartyRant-jp Supabase dashboard:**

```sql
-- profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  ai_gen_count int not null default 0,
  ai_gen_reset_at timestamptz not null default (date_trunc('month', now()) + interval '1 month')
);

-- RLS: users can only read their own profile
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Auto-create profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, plan, ai_gen_count, ai_gen_reset_at)
  values (
    new.id,
    'free',
    0,
    date_trunc('month', now()) + interval '1 month'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

- [ ] **Run the same SQL in PartyRant-fam Supabase dashboard.**

---

## Task 4: Add `profiles.ts` helper + `getUserFromRequest` to auth-server

**Files:**
- Create: `src/lib/supabase/profiles.ts`
- Modify: `src/lib/supabase/auth-server.ts`

- [ ] **Create `src/lib/supabase/profiles.ts`:**

```typescript
import { createServerClient } from '@/lib/supabase/server';

export type Plan = 'free' | 'pro';

export interface Profile {
  id: string;
  plan: Plan;
  aiGenCount: number;
  aiGenResetAt: Date;
}

/** Get or create a user's profile. Safe to call on every request. */
export async function getOrCreateProfile(userId: string): Promise<Profile> {
  const db = createServerClient();
  const { data } = await db.from('profiles').select().eq('id', userId).maybeSingle();
  if (data) {
    return {
      id: data.id as string,
      plan: data.plan as Plan,
      aiGenCount: data.ai_gen_count as number,
      aiGenResetAt: new Date(data.ai_gen_reset_at as string),
    };
  }
  // Existing user without profile — create it (new users get one via DB trigger)
  const resetAt = new Date();
  resetAt.setMonth(resetAt.getMonth() + 1, 1);
  resetAt.setHours(0, 0, 0, 0);

  const { data: created, error } = await db
    .from('profiles')
    .insert({
      id: userId,
      plan: 'free',
      ai_gen_count: 0,
      ai_gen_reset_at: resetAt.toISOString(),
    })
    .select()
    .single();

  if (error || !created) throw new Error(error?.message ?? 'Failed to create profile');
  return {
    id: created.id as string,
    plan: created.plan as Plan,
    aiGenCount: created.ai_gen_count as number,
    aiGenResetAt: new Date(created.ai_gen_reset_at as string),
  };
}

/** Count the user's non-preset games. */
export async function countUserGames(userId: string): Promise<number> {
  const db = createServerClient();
  const { count } = await db
    .from('games')
    .select('id', { count: 'exact', head: true })
    .eq('host_id', userId)
    .eq('is_preset', false);
  return count ?? 0;
}

/**
 * Increment AI generation count.
 * Resets the counter if the reset date has passed.
 * Returns true if the increment succeeded, false if the limit was already reached.
 */
export async function checkAndIncrementAiGen(userId: string, profile: Profile): Promise<boolean> {
  const db = createServerClient();
  const now = new Date();
  let count = profile.aiGenCount;
  let resetAt = profile.aiGenResetAt;

  // Reset if past reset date
  if (now >= resetAt) {
    count = 0;
    resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  if (profile.plan === 'free' && count >= 3) return false;

  const nextResetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  await db
    .from('profiles')
    .update({
      ai_gen_count: count + 1,
      ai_gen_reset_at: (now >= profile.aiGenResetAt ? nextResetAt : resetAt).toISOString(),
    })
    .eq('id', userId);

  return true;
}

/** Update a user's plan. Used by the RevenueCat webhook. */
export async function setPlan(userId: string, plan: Plan): Promise<void> {
  const db = createServerClient();
  const resetAt = new Date();
  resetAt.setMonth(resetAt.getMonth() + 1, 1);
  resetAt.setHours(0, 0, 0, 0);

  await db
    .from('profiles')
    .upsert({
      id: userId,
      plan,
      ai_gen_count: 0,
      ai_gen_reset_at: resetAt.toISOString(),
    });
}
```

- [ ] **Add `getUserFromRequest` to `src/lib/supabase/auth-server.ts`:**

Add this import at the top of the file:
```typescript
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
```

Add this function at the bottom of the file:
```typescript
/**
 * Accepts both Bearer JWT (Expo app) and cookie session (web).
 * Use this in API routes that need to support both clients.
 */
export async function getUserFromRequest(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabase.auth.getUser(token);
    return user ?? null;
  }
  return getSessionUser();
}
```

- [ ] **Apply the same changes to `PartyRant-fam`**

- [ ] **Run `npx tsc --noEmit` in both repos to confirm no TypeScript errors**

- [ ] **Commit both repos:**

```bash
git add src/lib/supabase/profiles.ts src/lib/supabase/auth-server.ts
git commit -m "feat: add profiles helper and Bearer JWT auth support"
```

---

## Task 5: Add owner check to host-facing API routes

**Files:**
- Modify: `src/app/api/games/[gameId]/route.ts` (PATCH only)
- Modify: `src/app/api/games/[gameId]/advance/route.ts`
- Modify: `src/app/api/games/[gameId]/reset/route.ts`

**Owner check rule:**
- If `game.hostId` is set → require auth AND `user.id === game.hostId`
- If `game.hostId` is null → allow (preset-derived anonymous games)

- [ ] **Modify `src/app/api/games/[gameId]/route.ts` — add owner check to PATCH:**

```typescript
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import { broadcastGameEvent } from '@/lib/events/broadcast';
import { getUserFromRequest } from '@/lib/supabase/auth-server';

const patchSchema = z.object({
  status: z.enum(['draft', 'lobby', 'question', 'reveal', 'ended']),
});

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await context.params;
    const game = await store.getGame(gameId);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    return NextResponse.json(game);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await context.params;
    const game = await store.getGame(gameId);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.hostId) {
      const user = await getUserFromRequest(req);
      if (!user || user.id !== game.hostId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const updated = await store.updateGameStatus(gameId, parsed.data.status);

    if (game.status === 'draft' && parsed.data.status === 'lobby') {
      await broadcastGameEvent(gameId, { type: 'game_started', game: updated });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Modify `src/app/api/games/[gameId]/advance/route.ts` — add owner check after game fetch:**

Add this import at the top:
```typescript
import { getUserFromRequest } from '@/lib/supabase/auth-server';
```

Add this block immediately after `if (!game) { return ... }`:
```typescript
    if (game.hostId) {
      const user = await getUserFromRequest(_req);
      if (!user || user.id !== game.hostId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
```

Also change the parameter name from `_req` to `req` in the function signature so it can be used:
```typescript
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ gameId: string }> }
)
```

And update the owner check to use `req`:
```typescript
      const user = await getUserFromRequest(req);
```

- [ ] **Modify `src/app/api/games/[gameId]/reset/route.ts` — add owner check:**

Replace the file content:
```typescript
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { createServerClient } from '@/lib/supabase/server';
import { getUserFromRequest } from '@/lib/supabase/auth-server';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await context.params;
    const game = await store.getGame(gameId);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.hostId) {
      const user = await getUserFromRequest(req);
      if (!user || user.id !== game.hostId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const db = createServerClient();
    await db.from('answers').delete().eq('game_id', gameId);
    await db.from('players').delete().eq('game_id', gameId);
    const { data, error } = await db
      .from('games')
      .update({
        status: 'lobby',
        current_question_index: -1,
        current_question_started_at: null,
        ended_at: null,
      })
      .eq('id', gameId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Reset failed' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Apply all 3 route changes to `PartyRant-fam`**

- [ ] **Run `npx tsc --noEmit` in both repos**

- [ ] **Commit both repos:**

```bash
git add src/app/api/games/\[gameId\]/route.ts src/app/api/games/\[gameId\]/advance/route.ts src/app/api/games/\[gameId\]/reset/route.ts
git commit -m "feat: add owner check to host-facing game API routes"
```

---

## Task 6: Add Free plan game limit to `POST /api/games`

**Files:**
- Modify: `src/app/api/games/route.ts`

- [ ] **Replace `src/app/api/games/route.ts`:**

```typescript
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import { getUserFromRequest } from '@/lib/supabase/auth-server';
import { getOrCreateProfile, countUserGames } from '@/lib/supabase/profiles';

const questionSchema = z.object({
  text: z.string().min(1),
  imageUrl: z.string().optional(),
  options: z.array(z.string()).min(2).max(4),
  correctIndex: z.number().int().min(0).optional(),
  timeLimitSec: z.number().int().min(1),
});

const createGameSchema = z.object({
  eventId: z.string().min(1),
  mode: z.enum(['trivia', 'polling', 'opinion']),
  gameMode: z.enum(['live', 'self_paced']).default('live'),
  loseRule: z.enum(['minority', 'majority']).optional(),
  title: z.string().min(1),
  questions: z.array(questionSchema).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await getOrCreateProfile(user.id);
    if (profile.plan === 'free') {
      const gameCount = await countUserGames(user.id);
      if (gameCount >= 2) {
        return NextResponse.json(
          { error: 'game_limit_reached', message: '無料プランはゲームを2本まで作成できます。Proにアップグレードしてください。' },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const parsed = createGameSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

    const game = await store.createGame({ ...parsed.data, hostId: user.id });
    return NextResponse.json(game, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Apply same change to `PartyRant-fam`** (remove `opinion` from mode enum and `loseRule` field to match -fam's schema):

```typescript
const createGameSchema = z.object({
  eventId: z.string().min(1),
  mode: z.enum(['trivia', 'polling']),
  gameMode: z.enum(['live', 'self_paced']).default('live'),
  title: z.string().min(1),
  questions: z.array(questionSchema).min(1),
});
```

- [ ] **Run `npx tsc --noEmit` in both repos**

- [ ] **Commit both repos:**

```bash
git add src/app/api/games/route.ts
git commit -m "feat: enforce Free plan game limit (max 2) on POST /api/games"
```

---

## Task 7: Add auth + Free plan AI limit to `POST /api/ai/generate`

**Files:**
- Modify: `src/app/api/ai/generate/route.ts`

The AI generate route currently has no auth check. We need to:
1. Require auth
2. Check monthly AI gen limit for free users
3. Increment count on success

- [ ] **Replace the full content of `src/app/api/ai/generate/route.ts`:**

```typescript
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { store } from '@/lib/store';
import { getUserFromRequest } from '@/lib/supabase/auth-server';
import { getOrCreateProfile, checkAndIncrementAiGen } from '@/lib/supabase/profiles';

const schema = z.object({
  theme: z.string().min(1).max(50).transform(s => s.replace(/[`"\\]/g, '').trim()),
  mode: z.enum(['trivia', 'polling', 'opinion']),
  count: z.number().int().min(3).max(15),
  loseRule: z.enum(['minority', 'majority']).optional(),
});

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
  correctIndex?: number;
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
    const rawCorrectIndex = q.correctIndex === null || q.correctIndex === undefined
      ? null
      : typeof q.correctIndex === 'number' ? q.correctIndex : null;
    const correctIndex = rawCorrectIndex !== null && rawCorrectIndex >= 0 && rawCorrectIndex < options.length
      ? rawCorrectIndex
      : rawCorrectIndex === null ? null : 0;
    const timeLimitSec = typeof q.timeLimitSec === 'number'
      ? Math.max(10, Math.min(25, q.timeLimitSec))
      : 15;
    return { text: q.text.trim(), options, ...(correctIndex !== null ? { correctIndex } : {}), timeLimitSec };
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getOrCreateProfile(user.id);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { theme, mode, count, loseRule } = parsed.data;

    // Check + increment AI gen count (also handles monthly reset)
    const allowed = await checkAndIncrementAiGen(user.id, profile);
    if (!allowed) {
      return NextResponse.json(
        { error: 'ai_limit_reached', message: '無料プランのAI生成は月3回までです。Proにアップグレードしてください。' },
        { status: 403 }
      );
    }

    const prompt = buildPrompt(theme, mode, count);

    const client = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
    const completion = await client.chat.completions.create({
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.9,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    let raw: unknown;
    try {
      raw = JSON.parse(content);
    } catch {
      console.error('OpenAI returned invalid JSON:', content.slice(0, 200));
      throw new Error('Invalid JSON from OpenAI');
    }
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

- [ ] **For `PartyRant-fam`:** Apply the same change but use `mode: z.enum(['trivia', 'polling'])` in the schema (no `opinion`) and remove `loseRule` from the schema and handler.

- [ ] **Run `npx tsc --noEmit` in both repos**

- [ ] **Commit both repos:**

```bash
git add src/app/api/ai/generate/route.ts
git commit -m "feat: add auth and Free plan AI generation limit to /api/ai/generate"
```

---

## Task 8: Add RevenueCat webhook handler

**Files:**
- Create: `src/app/api/webhook/revenuecat/route.ts`

RevenueCat sends a POST with `Authorization: Bearer <secret>` and a JSON body. We update `profiles.plan` based on the event type.

- [ ] **Create `src/app/api/webhook/revenuecat/route.ts`:**

```typescript
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { setPlan } from '@/lib/supabase/profiles';

export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = req.headers.get('authorization');
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json() as {
      event: {
        type: string;
        app_user_id: string;
      };
    };

    const { type, app_user_id: userId } = body.event;

    if (type === 'INITIAL_PURCHASE' || type === 'RENEWAL' || type === 'UNCANCELLATION') {
      await setPlan(userId, 'pro');
    } else if (type === 'CANCELLATION' || type === 'EXPIRATION' || type === 'BILLING_ISSUE') {
      await setPlan(userId, 'free');
    }
    // Other event types (PRODUCT_CHANGE, TRANSFER, etc.) are silently ignored

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Add `REVENUECAT_WEBHOOK_SECRET` to `.env.local` in both repos** (value comes from RevenueCat dashboard → Project Settings → Webhooks):

```
REVENUECAT_WEBHOOK_SECRET=your_secret_here
```

- [ ] **Apply the same route to `PartyRant-fam`**

- [ ] **Run `npx tsc --noEmit` in both repos**

- [ ] **Commit both repos:**

```bash
git add src/app/api/webhook/revenuecat/route.ts
git commit -m "feat: add RevenueCat webhook handler for plan updates"
```

---

## Task 9: Add `GET /api/profile` route

**Files:**
- Create: `src/app/api/profile/route.ts`

This route is used by the Expo settings screen to display plan status.

- [ ] **Create `src/app/api/profile/route.ts` in both repos:**

```typescript
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/auth-server';
import { getOrCreateProfile } from '@/lib/supabase/profiles';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await getOrCreateProfile(user.id);
    return NextResponse.json({
      plan: profile.plan,
      aiGenCount: profile.aiGenCount,
      aiGenResetAt: profile.aiGenResetAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Commit both repos:**

```bash
git add src/app/api/profile/route.ts
git commit -m "feat: add GET /api/profile for plan status"
```

---

## Task 10: Final verification

- [ ] **Run `pnpm lint` in both repos — confirm 0 errors**

- [ ] **Run `npx tsc --noEmit` in both repos — confirm clean**

- [ ] **Manual smoke test — game limit:**

  1. Log in as a free user
  2. Create 2 games — both should succeed
  3. Create a 3rd game — should get `403` with `error: "game_limit_reached"`

- [ ] **Manual smoke test — AI limit:**

  1. Log in as a free user
  2. Generate AI questions 3 times — all should succeed
  3. 4th attempt — should get `403` with `error: "ai_limit_reached"`

- [ ] **Manual smoke test — unauthenticated AI:**

  ```bash
  curl -X POST https://partyrant.jp/api/ai/generate \
    -H "Content-Type: application/json" \
    -d '{"theme":"テスト","mode":"trivia","count":3}'
  ```
  Expected: `401 Unauthorized`

- [ ] **Manual smoke test — owner check:**

  Using a game you own, call advance with no auth header:
  ```bash
  curl -X POST https://partyrant.jp/api/games/<gameId>/advance
  ```
  Expected: `403 Forbidden`

- [ ] **Push both repos:**

```bash
git push
```
