# PartyRant-jp Architecture

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| Database | Supabase Postgres — `questions` column is JSONB array |
| Realtime | Supabase Realtime Broadcast (REST API → channel per gameId) |
| Auth | Supabase Auth (optional — unauthenticated guests can play) |
| Hosting | Vercel, Node.js runtime for all API routes (`export const runtime = 'nodejs'`) |
| i18n | next-intl v4 |
| AI | OpenAI SDK v6 (`/api/ai/generate`) |

---

## Directory Structure

```
src/
  app/
    presets/page.tsx          — preset list, filters, random start, AI generate
    play/[gameId]/
      PlayGameClient.tsx      — THE host screen (lobby → question → reveal → ended)
    host/[gameId]/page.tsx    — redirects to /host (HostGameClient.tsx is NEVER rendered)
    join/[code]/
      GuestGameClient.tsx     — guest screen (all phases)
    api/
      presets/[id]/start/     — create live game from preset (no auth required)
      games/[gameId]/
        route.ts              — GET game
        advance/              — POST: advance state machine, name substitution
        next/                 — POST: "もう一度" — clone game, broadcast next_game
        players/              — GET list / POST add player
        answers/              — GET list / POST submit (upsert)
        scores/               — GET computed trivia scores
        reset/                — POST reset to lobby
      stream/[gameId]/        — GET SSE endpoint (EventSource-compatible)
      ai/generate/            — POST OpenAI-powered game generation
      opinion/random/         — POST random opinion game
      trivia/random/          — POST random trivia game
  lib/
    store/supabase-store.ts   — all DB operations (SupabaseGameStore class)
    events/
      types.ts                — GameEvent union type
      broadcast.ts            — broadcastGameEvent() via Supabase Realtime REST
    hooks/
      useGameStream.ts        — EventSource wrapper, dispatches GameEvent objects
      useLocalPlayer.ts       — localStorage persistence for playerId/displayName
  types/domain.ts             — Game, Player, Answer, Score, Question, GameStatus
scripts/
  seed-presets.ts             — deletes ALL presets then re-inserts; re-run after adding content
```

---

## Domain Types

```ts
type GameType   = 'trivia' | 'polling' | 'opinion'
type PlayMode   = 'live' | 'self_paced'
type LoseRule   = 'minority' | 'majority'
type GameStatus = 'draft' | 'lobby' | 'question' | 'reveal' | 'ended'
```

Questions are stored as a JSONB array on the `games` row — no separate `questions` table.
Scores are computed on the fly; there is no `scores` table.

---

## Game Modes

| Mode | Correct answer | Scoring | Result screen |
|---|---|---|---|
| `trivia` | Yes (`correctIndex`) | 1 point per correct | Leaderboard |
| `polling` | No | None | VoteBar per question, 選ばれた回数, みんなの実態 |
| `opinion` | No | `loseRule` determines loser | 負け数ランキング |

---

## Game Status State Machine

```
draft → lobby → question ↔ reveal → ended
```

`advanceQuestion()` in `supabase-store.ts` drives all transitions:
- `lobby → question`: index=0, timestamp set
- `question → reveal`: status only
- `reveal → question`: next index + timestamp
- `reveal → ended`: when `currentQuestionIndex + 1 >= questions.length`

The `/api/games/[gameId]/advance` route wraps this and fires SSE broadcasts.

---

## Game Start Flow

1. User clicks "はじめる" on a preset card in `/presets`
2. `POST /api/presets/[id]/start` — copies preset fields into a new live game (`status=draft`), immediately calls `updateGameStatus → lobby`. `hostId` set from Supabase Auth if present; null otherwise.
3. Host is redirected to `/play/[gameId]`
4. Guests scan QR or enter code → `/join/[code]` → `GuestGameClient`
5. Host's "ゲーム開始" button is **disabled** while `players.length === 0` — host must use "ホストも参加する" or wait for guests
6. `POST /api/games/[gameId]/advance` → `lobby → question`

---

## SSE / Realtime Architecture

```
API route (advance/next/answers)
  └─ broadcastGameEvent()
       └─ POST supabase/realtime/v1/api/broadcast  (REST, service role key)
            └─ Supabase channel "game-{gameId}"

Client (PlayGameClient / GuestGameClient)
  └─ useGameStream(gameId, onEvent)
       └─ EventSource /api/stream/{gameId}
            └─ Node.js SSE handler subscribes to same Supabase channel
                 └─ forwards payload as "data: {...}\n\n"
```

- SSE route uses `force-dynamic` and 15-second `': ping\n\n'` keepalives
- On `connected` event, host client immediately re-fetches game/players/answers (sync after reconnect)
- `req.signal` abort cleans up Supabase channel subscription

---

## Name Substitution System (JP-specific)

Preset questions use `プレイヤーA` / `Aさん` as option placeholders (`/^[A-Z]さん$/` or `/^プレイヤー[A-Z]$/`).

On `lobby → question` advance:
1. `advance` route fetches current players
2. Detects placeholder pattern in any question's options
3. Replaces **entire options array** with all player `displayName`s (supports any player count)
4. Writes substituted questions directly to `games.questions` via Supabase client
5. Re-fetches the updated game row, includes it as `game` field in `question_started` broadcast

`GuestGameClient`: when `event.game` is present on `question_started`, replaces the local game state entirely so guests see actual player names.

**Critical**: `PlayGameClient.handleAdvance()` dispatches `GAME_UPDATED` with the HTTP response (which has the substituted game), not the SSE event. The SSE `question_started` in `PlayGameClient` dispatches `QUESTION_STARTED` (updates index/timestamp/status only).

---

## "もう一度" Flow

1. Host clicks "🔄 もう一度" → `POST /api/games/[gameId]/next`
2. Server clones the current game config (same mode/questions/title) into a new game, `status=lobby`
3. Broadcasts `{ type: 'next_game', joinCode }` to the **old** game's SSE channel
4. Guests on ended screen auto-redirect to `/join/[newJoinCode]` on receiving this event
5. Host navigates to `/play/[newGameId]` via the HTTP response

If `game.hostId` is set, guests also see a "次のゲームを待つ" button that polls `/api/games/next-lobby?hostId=...&exceptGameId=...` every 3s as a fallback.

---

## Host Participation Mode

- "ホストも参加する" button in lobby — enters a name, POSTs to `/api/games/[gameId]/players`
- State tracked entirely in `PlayGameClient` (no server side flag):
  - `hostParticipating`, `hostPlayerId`, `hostAnsweredIds` (Set), `hostSelectedChoice`
- During `question` phase: `showVoteBar = !hostParticipating || game.status !== 'question' || hostAnswered`
  - VoteBar is hidden until host answers (prevents spoiling live vote distribution)
- Host answer submission is an upsert (player_id + question_id conflict key) — can change answer until question ends

---

## Polling Results (ended screen, both host and guest)

Per-question VoteBar is always shown.

Two optional summary sections computed from answers + players:

**選ばれた回数** (`computePersonVoteResults`): only shown when all options in a question exactly match player `displayName`s (name-substituted questions). Counts how many times each person was chosen across those questions.

**みんなの実態まとめ** (`computePollingResults`): majority/minority win counts per player across all questions. Tags the top-majority player as "多数派王" and top-minority as "少数派".

---

## Self-Paced Mode (`gameMode: 'self_paced'`)

When `game.gameMode === 'self_paced'`, guests skip the lobby wait and immediately enter a solo flow (`sp_question → sp_answered → sp_ended`). Progress is tracked by local `localQuestionIndex` state — no SSE/host involvement. Answers are still submitted to the server for persistence.

---

## AI Game Generation (`/api/ai/generate`)

- Uses OpenAI SDK (model configured in route)
- `getOrCreateProfile()` + `checkAndIncrementAiGen()` enforce per-user free-plan generation limits
- Auth is optional: unauthenticated users get an anonymous profile keyed by IP or session
- Returns a fully created game in `lobby` status; host is immediately redirected to `/play/[gameId]`

---

## Shared Supabase DB (JP vs FAM)

Both `PartyRant-jp` and `PartyRant-fam` share the same Supabase project.

- JP: `store.listPresets()` returns **all** rows where `is_preset = true`, ordered by `scene` then `title`
- FAM: filters by `grade` field or `scene IN ('学生の実態調査', '究極の二択')`
- FAM has a `mode_check` DB constraint that rejects `opinion` mode inserts — JP does not have this constraint

---

## Key Gotchas

- **`HostGameClient.tsx` exists but is NEVER rendered.** `src/app/host/[gameId]/page.tsx` unconditionally redirects to `/host`.
- **Lobby start button is disabled when `players.length === 0`.** Host cannot start without joining themselves or having at least one guest.
- **SSE `question_started` handling differs between host and guest.** Host dispatches `QUESTION_STARTED` (index+timestamp patch only); the substituted game comes from `handleAdvance`'s HTTP response via `GAME_UPDATED`. Guest checks for `event.game` and replaces full game state if present.
- **`submitAnswer` uses upsert** on `(player_id, question_id)` — changing an answer before reveal is supported.
- **Seed script deletes ALL presets** before re-inserting. Add new content to the seed file and re-run `ts-node scripts/seed-presets.ts`.
- **`timeLimitSec` for trivia adds 10s buffer on the guest side** (`q.timeLimitSec + (game.mode === 'trivia' ? 10 : 0)`) to account for network latency before auto-advancing.
