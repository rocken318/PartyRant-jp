# PartyRant-jp Cloudflare Migration — Phase 1: Foundation & D1 Data Recovery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cloudflare の土台（wrangler + OpenNext + D1）を用意し、削除された 572 プリセット / 5,536 問を D1 に復元・検証する。

**Architecture:** Next.js を OpenNext で Cloudflare Workers 実行できるよう最小構成を追加し、D1 データベースを新規作成。Postgres スキーマを SQLite へ変換して適用し、ローカル `files/` の JSON からプリセットを生成した SQL を D1 に投入する。この時点ではアプリの読み書き配線（D1GameStore）はまだ繋がない — 本フェーズの成果物は「ビルドが通る CF 土台」と「データが復元・検証済みの D1」。

**Tech Stack:** Cloudflare Workers, `@opennextjs/cloudflare`, Wrangler, D1 (SQLite), TypeScript, pnpm, tsx。

参照 spec: `docs/superpowers/specs/2026-08-14-partyrant-jp-cloudflare-migration-design.md`

---

## File Structure

- Create: `wrangler.jsonc` — Worker 設定（D1 バインディング、compatibility flags、OpenNext assets）
- Create: `open-next.config.ts` — OpenNext Cloudflare アダプタ設定
- Create: `migrations/0001_init.sql` — D1 初期スキーマ（SQLite 変換版 + profiles）
- Create: `scripts/gen-seed-sql.ts` — `files/` の JSON → `migrations/seed_presets.sql` を生成
- Create (生成物): `migrations/seed_presets.sql` — 572 プリセットの INSERT 文（gitignore 対象）
- Modify: `package.json` — devDependencies と scripts 追加
- Modify: `.gitignore` — `.open-next/`, `migrations/seed_presets.sql` を除外
- Modify: `next.config.ts` — OpenNext 用に `initOpenNextCloudflareForDev()` を追加

> `scripts/seed-presets.ts`（既存 Supabase 版）のプリセット読み込みロジックを `gen-seed-sql.ts` で再利用（DRY）。DB 投入先だけ変える。

---

### Task 1: Wrangler / OpenNext 依存とスクリプトを追加

**Files:**
- Modify: `package.json`

- [ ] **Step 1: OpenNext と wrangler を dev 依存に追加**

Run:
```bash
pnpm add -D @opennextjs/cloudflare wrangler
```
Expected: `@opennextjs/cloudflare` と `wrangler` が devDependencies に入る。

- [ ] **Step 2: package.json に scripts を追加**

`package.json` の `"scripts"` に以下を追記（既存の dev/build/start は残す）:
```json
"cf:build": "opennextjs-cloudflare build",
"cf:dev": "opennextjs-cloudflare build && wrangler dev",
"cf:deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
"db:migrate:local": "wrangler d1 execute partyrant-jp --local --file=migrations/0001_init.sql",
"db:migrate:remote": "wrangler d1 execute partyrant-jp --remote --file=migrations/0001_init.sql",
"db:seed:gen": "tsx scripts/gen-seed-sql.ts",
"db:seed:remote": "wrangler d1 execute partyrant-jp --remote --file=migrations/seed_presets.sql"
```

- [ ] **Step 3: 確認**

Run: `pnpm run` (or `cat package.json`)
Expected: 上記 scripts が一覧に表示される。

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add OpenNext + wrangler tooling and CF scripts"
```

---

### Task 2: D1 データベースを作成

**Files:** なし（Cloudflare リソース作成）

- [ ] **Step 1: D1 を作成**

Run:
```bash
wrangler d1 create partyrant-jp
```
Expected: `database_id`（UUID）が出力される。この ID を控える。

> 代替: Cloudflare MCP `d1_database_create({name:"partyrant-jp"})` でも作成可。既存アカウントに `dietbattle` / `watashi-kijun` がある。

- [ ] **Step 2: 作成を確認**

Run: `wrangler d1 list`
Expected: `partyrant-jp` が一覧に出る。

---

### Task 3: wrangler.jsonc と OpenNext 設定を作成

**Files:**
- Create: `wrangler.jsonc`
- Create: `open-next.config.ts`
- Modify: `next.config.ts`
- Modify: `.gitignore`

- [ ] **Step 1: `wrangler.jsonc` を作成**（`<DATABASE_ID>` は Task 2 の値に置換）

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "partyrant-jp",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-03-25",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "partyrant-jp",
      "database_id": "<DATABASE_ID>"
    }
  ]
}
```

- [ ] **Step 2: `open-next.config.ts` を作成**

```typescript
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
```

- [ ] **Step 3: `next.config.ts` に OpenNext dev フックを追加**

既存の `next.config.ts` の末尾（export の後）に追記:
```typescript
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
```

- [ ] **Step 4: `.gitignore` に追記**

```
.open-next/
migrations/seed_presets.sql
```

- [ ] **Step 5: ビルド確認**

Run: `pnpm cf:build`
Expected: `.open-next/worker.js` が生成され、ビルドがエラーなく完了する。next-intl 由来の警告が出ても致命的でなければ可。失敗する場合は spec のリスク欄「OpenNext × next-intl 互換」を参照し、`compatibility_date` / `nodejs_compat` を確認。

- [ ] **Step 6: Commit**

```bash
git add wrangler.jsonc open-next.config.ts next.config.ts .gitignore
git commit -m "feat: add Cloudflare Workers config (wrangler + OpenNext + D1 binding)"
```

---

### Task 4: D1 初期スキーマ（SQLite 変換版）を作成・適用

**Files:**
- Create: `migrations/0001_init.sql`

- [ ] **Step 1: `migrations/0001_init.sql` を作成**

```sql
-- PartyRant-jp D1 schema (SQLite). Translated from supabase/schema.sql.
-- bigint->INTEGER, jsonb->TEXT, boolean->INTEGER(0/1), auth.users FK removed (host_id = Clerk userId text).

PRAGMA foreign_keys = ON;

create table if not exists events (
  id         text primary key,
  host_id    text not null,
  name       text not null,
  created_at integer not null
);

create table if not exists games (
  id           text primary key,
  event_id     text references events(id) on delete cascade,
  host_id      text,
  join_code    text unique not null,
  mode         text not null check (mode in ('trivia','polling','opinion')),
  game_mode    text not null default 'live' check (game_mode in ('live','self_paced')),
  title        text not null,
  description  text,
  scene        text,
  lose_rule    text check (lose_rule in ('minority','majority')),
  questions    text not null default '[]',
  status       text not null default 'draft',
  is_preset    integer not null default 0,
  current_question_index      integer not null default -1,
  current_question_started_at integer,
  created_at   integer not null,
  ended_at     integer
);

create table if not exists players (
  id           text primary key,
  game_id      text not null references games(id) on delete cascade,
  display_name text not null,
  joined_at    integer not null
);

create table if not exists answers (
  id               text primary key,
  game_id          text not null references games(id) on delete cascade,
  player_id        text not null references players(id) on delete cascade,
  question_id      text not null,
  choice_index     integer not null,
  answered_at      integer not null,
  response_time_ms integer not null,
  unique (player_id, question_id)
);

create table if not exists profiles (
  id              text primary key,      -- Clerk userId
  plan            text not null default 'free' check (plan in ('free','pro')),
  ai_gen_count    integer not null default 0,
  ai_gen_reset_at integer not null
);

create index if not exists events_host_id_idx        on events(host_id);
create index if not exists games_event_id_idx        on games(event_id);
create index if not exists games_is_preset_idx        on games(is_preset) where is_preset = 1;
create index if not exists players_game_id_idx       on players(game_id);
create index if not exists answers_game_id_idx       on answers(game_id);
create index if not exists answers_game_question_idx on answers(game_id, question_id);
```

- [ ] **Step 2: リモート D1 に適用**

Run: `pnpm db:migrate:remote`
Expected: `4 tables ... executed` 相当の成功メッセージ（events/games/players/answers/profiles + indexes）。

- [ ] **Step 3: テーブル作成を検証**

Run:
```bash
wrangler d1 execute partyrant-jp --remote --command "select name from sqlite_master where type='table' order by name;"
```
Expected: `answers, events, games, players, profiles` が返る。

- [ ] **Step 4: Commit**

```bash
git add migrations/0001_init.sql
git commit -m "feat: add D1 initial schema (SQLite, translated from Supabase)"
```

---

### Task 5: プリセット → seed SQL 生成スクリプト

**Files:**
- Create: `scripts/gen-seed-sql.ts`

このスクリプトは既存 `scripts/seed-presets.ts` と同じソース（`files/` 配下）を読み、Supabase insert の代わりに `migrations/seed_presets.sql` を出力する。

- [ ] **Step 1: `scripts/gen-seed-sql.ts` を作成**

```typescript
/**
 * gen-seed-sql.ts
 * files/ 配下のプリセット JSON を読み、D1 用 INSERT 文を migrations/seed_presets.sql に書き出す。
 * Usage: pnpm db:seed:gen
 */
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface PresetQuestion { text: string; options: string[]; correctIndex: number; timeLimitSec: number; }
interface PresetGame { scene: string; title: string; mode: 'trivia' | 'polling' | 'opinion'; loseRule?: 'minority' | 'majority'; description: string; questions: PresetQuestion[]; }

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
function sql(v: string): string { return "'" + v.replace(/'/g, "''") + "'"; }

function loadPresetsFromDir(dirPath: string, sceneOverride?: string): PresetGame[] {
  const result: PresetGame[] = [];
  for (const f of readdirSync(dirPath).filter(x => x.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(join(dirPath, f), 'utf-8'));
    const arr: PresetGame[] = (Array.isArray(data) ? data : [data])
      .filter((it: unknown) => it !== null && typeof it === 'object' && !Array.isArray(it) && (it as PresetGame).questions !== undefined);
    if (sceneOverride) arr.forEach(p => { p.scene = sceneOverride; });
    result.push(...arr);
  }
  return result;
}

function main() {
  const presets: PresetGame[] = [];
  for (const f of ['../files/partyrant_presets.json', '../files/partyrant_majority_quiz_pack.json']) {
    presets.push(...(JSON.parse(readFileSync(join(__dirname, f), 'utf-8')) as PresetGame[]));
  }
  for (const d of ['../files/0420/partyrant_quizzes', '../files/0420/partyrant_quizzes_vol2', '../files/0420/partyrant_trivia_quizzes', '../files/0420b/partyrant_ultimate_choices']) {
    presets.push(...loadPresetsFromDir(join(__dirname, d)));
  }
  presets.push(...loadPresetsFromDir(join(__dirname, '../files/0421/partyrant_who_is'), 'この中で●●なのは誰だ'));
  presets.push(...loadPresetsFromDir(join(__dirname, '../files/0422/partyrant_cast'), 'キャスト指名'));

  const now = Date.now();
  const lines: string[] = ['-- generated by gen-seed-sql.ts', 'PRAGMA foreign_keys = ON;', 'delete from games where is_preset = 1;'];
  for (const p of presets) {
    const id = randomUUID();
    const questions = JSON.stringify(p.questions.map((q, i) => ({
      id: randomUUID(), text: q.text, options: q.options, correctIndex: q.correctIndex, timeLimitSec: q.timeLimitSec, orderIndex: i,
    })));
    lines.push(
      `insert into games (id, event_id, host_id, join_code, mode, game_mode, lose_rule, title, description, scene, is_preset, questions, status, current_question_index, current_question_started_at, created_at, ended_at) values (` +
      `${sql(id)}, NULL, NULL, ${sql(generateJoinCode())}, ${sql(p.mode)}, 'live', ${p.loseRule ? sql(p.loseRule) : 'NULL'}, ${sql(p.title)}, ${sql(p.description)}, ${sql(p.scene)}, 1, ${sql(questions)}, 'draft', 0, NULL, ${now}, NULL);`
    );
  }
  const out = join(__dirname, '../migrations/seed_presets.sql');
  writeFileSync(out, lines.join('\n'), 'utf-8');
  console.log(`Wrote ${presets.length} presets to ${out}`);
}
main();
```

- [ ] **Step 2: seed SQL を生成**

Run: `pnpm db:seed:gen`
Expected: `Wrote 572 presets to .../migrations/seed_presets.sql`

- [ ] **Step 3: 生成物を軽く検証**

Run:
```bash
grep -c "insert into games" migrations/seed_presets.sql
```
Expected: `572`

- [ ] **Step 4: Commit**（生成 SQL は gitignore 済みなのでスクリプトのみ）

```bash
git add scripts/gen-seed-sql.ts
git commit -m "feat: add D1 seed SQL generator for presets"
```

---

### Task 6: プリセットを D1 に投入し復元を検証

**Files:** なし（データ投入）

- [ ] **Step 1: seed を適用**

Run: `pnpm db:seed:remote`
Expected: 大量の `executed` 出力、エラーなし。

> 巨大ファイルで失敗する場合は分割: `split -l 100 migrations/seed_presets.sql migrations/seed_part_` 後、各 part を `wrangler d1 execute partyrant-jp --remote --file=<part>` で順次適用。または Cloudflare MCP `d1_database_query` でチャンク投入。

- [ ] **Step 2: 件数を検証**

Run:
```bash
wrangler d1 execute partyrant-jp --remote --command "select count(*) as n from games where is_preset = 1;"
```
Expected: `n = 572`

- [ ] **Step 3: 総問題数を検証**

Run:
```bash
wrangler d1 execute partyrant-jp --remote --command "select sum(json_array_length(questions)) as q from games where is_preset = 1;"
```
Expected: `q = 5536`

- [ ] **Step 4: サンプル 1 件の中身を目視**

Run:
```bash
wrangler d1 execute partyrant-jp --remote --command "select title, mode, scene from games where is_preset = 1 limit 3;"
```
Expected: 日本語タイトル・mode(trivia/polling/opinion)・scene が正しく入っている。

- [ ] **Step 5: 復元完了を記録**

Phase 1 完了。D1 にデータ復元済み、CF 土台がビルド可能。Phase 2（D1GameStore 実装）へ。

---

## Self-Review

**Spec coverage:**
- 土台（wrangler/OpenNext/D1 作成/スキーマ適用）→ Task 1–4 ✓
- データ復旧＆シード（572/5,536）→ Task 5–6 ✓
- スキーマ変換（bigint/jsonb/boolean/FK 廃止, profiles 新設）→ Task 4 ✓
- D1GameStore 実装・DO・Clerk・R2・バックアップ → **本フェーズ対象外**（Phase 2–5、spec に記載済み）✓

**Placeholder scan:** `<DATABASE_ID>` は Task 2 出力で必ず埋める旨を明記済み。他に TBD/TODO なし ✓

**Type consistency:** `is_preset` は INTEGER(1) で統一（スキーマ・seed・検証クエリ全て）。`questions` は TEXT(JSON)。`generateJoinCode` / `loadPresetsFromDir` は既存 `seed-presets.ts` と同シグネチャ ✓

## 確認ポイント（ユーザーへ）
- 本フェーズは D1 作成・投入まで。**Cloudflare 課金・外部アカウントは不要**（D1 無料枠内、Clerk/R2/RevenueCat は後フェーズ）。
- `wrangler` のログイン（`wrangler login`）が未済ならローカル実行時に必要。MCP 経由なら不要。
