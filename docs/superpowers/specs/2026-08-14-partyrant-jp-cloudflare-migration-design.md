# PartyRant-jp → Cloudflare 移行設計（パイロット）

- 日付: 2026-08-14
- 対象: `PartyRant-jp`（パイロット。型が固まり次第 en/fam、将来モバイルへ横展開）
- 背景: 未払い/無活動により Supabase プロジェクト（`tqzkqpnxethrkcmrzjhs`）が削除され、DB全滅。プリセット問題データはローカル `files/` に健在で復元可能。恒久対策として Cloudflare へ移行する。

## ゴール / 非ゴール

**ゴール**
- Supabase 依存（DB / Realtime / Auth / Storage）を Cloudflare スタックへ置換する。
- 572 プリセット / 5,536 問をローカル JSON から D1 へ復元する。
- 「無活動で自動削除されない」構成にし、加えて多重バックアップで再発を防ぐ。
- 既存の画面・ゲームロジック・API のビジネスロジックを最大限そのまま再利用する（エンジン載せ替え方式）。

**非ゴール（今回やらない）**
- en / fam / モバイル(Expo) の移行（横展開フェーズ）。ただし API・トークン形はモバイル横展開を壊さないよう配慮する。
- WebSocket 化（SSE を維持）。
- 課金基盤の刷新（RevenueCat は据え置き。webhook 宛先のみ変更）。
- UI / ゲーム仕様の変更。

## 決定事項（確定）

| 項目 | 決定 |
|---|---|
| スコープ | PartyRant-jp 1本をパイロット |
| ホスティング | フル Cloudflare（OpenNext で Next.js を Workers 実行） |
| DB | Cloudflare D1（SQLite） |
| Realtime | Durable Objects（1ゲーム=1インスタンス）→ SSE で配信 |
| 認証 | Clerk（無料枠） |
| ストレージ | R2（要ダッシュボード有効化） |
| 課金 | RevenueCat 据え置き、webhook 宛先を Worker へ変更 |
| AI 生成 | Gemini API 据え置き（env のみ） |

## 現行アーキテクチャ（把握結果）

- Next.js（App Router / next-intl）。Vercel 想定。
- DB は `GameStore` インターフェースで抽象化済み（`src/lib/store/`）。実装は `supabase-store.ts` と `memory-store.ts`。`store/index.ts` が具象を選ぶ。
- テーブル: `events` / `games` / `players` / `answers`（`supabase/schema.sql`）＋ `profiles`（plan / ai_gen クォータ）。RLS は無効。
- Realtime: サーバーが `/realtime/v1/api/broadcast` へ POST → SSE ルート `api/stream/[gameId]` が Supabase channel を購読しブラウザへ中継。イベント型は `src/lib/events/types.ts` の `GameEvent`。
- Auth: Supabase Auth（`@supabase/ssr`）。メール＋パスワードのみ。Web=Cookie、モバイル=Bearer JWT の両対応（`getUserFromRequest`）。認証で守るのはホスト側 API。プレイヤー参加は認証不要。
- Storage: Supabase Storage（`api/upload`）。
- 課金: RevenueCat webhook → `profiles.plan`。
- `store` を経由せず `supabase.from()` を直叩きするルート: `games/next-lobby`, `games/[gameId]/advance`, `games/[gameId]/cast`, `games/[gameId]/reset`, `stream/[gameId]`, `upload`。

## 再利用 / 変更の切り分け

**そのまま再利用（約8〜9割）**
- 画面 15 / コンポーネント 27 / ゲームロジック等 lib 14。
- プリセット 572件・5,536問（`files/` の JSON 47ファイル）。
- i18n・翻訳メッセージ。
- `GameStore` インターフェース、ドメイン型、`GameEvent` 型。
- 24 API ルートのビジネスロジック（叩く先だけ差し替え）。
- AI 生成のプロンプト/ロジック、RevenueCat 連携ロジック。

**作り替え（配管のみ、約1〜2割）**
- DB: 新規 `src/lib/store/d1-store.ts`（既存 `GameStore` 実装）、`store/index.ts` 1行差し替え、直叩き6ルートを `store` 経由へリファクタ。
- 認証: `auth-server.ts` / `auth/login` / `auth/signup` / `middleware.ts` を Clerk へ置換。
- Realtime: `events/broadcast.ts` と `stream` ルートを DO 接続へ付け替え＋新規 `GameRoom` DO。
- 新規: wrangler 設定 / OpenNext アダプタ / D1 スキーマ(変換版) / D1 用シード script / バックアップ GitHub Action。

## コンポーネント設計

### 1. データ層（D1）
- スキーマ変換（`supabase/schema.sql` → D1）:
  - `bigint` → `INTEGER`、`jsonb`(questions) → `TEXT`（JSON文字列、アプリ層で parse/stringify）、`boolean` → `INTEGER`(0/1)。
  - `references auth.users(id)` FK は廃止。`host_id` は Clerk ユーザーID（text）を格納。
  - `profiles` を D1 に新設（`id`=Clerk userId, `plan`, `ai_gen_count`, `ai_gen_reset_at`）。Supabase トリガーは廃止し、初回アクセス時にアプリ層で lazy 生成（既存 `getOrCreateProfile` のロジックを流用）。
- `D1GameStore implements GameStore`。SQL は D1 バインディング経由。`questions` は境界で JSON 変換。
- 直叩き6ルートは `store` メソッド経由へ寄せ、DB 結合を1箇所に集約する。

### 2. Realtime（Durable Objects）
- `GameRoom` DO を新設。`env.GAME_ROOM.idFromName(gameId)` で 1ゲーム1インスタンス固定。
- DO の責務: (a) SSE 接続の保持、(b) サーバー発火イベントの受領→接続中クライアントへ push、(c) keepalive ping。
- サーバー側のイベント発火（`broadcastGameEvent` 置換）は DO へ `fetch`（内部 POST）で中継。
- クライアントは従来通り `/api/stream/[gameId]` に `EventSource` 接続。ルートは DO の SSE ハンドラへ委譲。
- `GameEvent` の型・イベント名（`game_event` / `player_joined` 等）は不変。
- SSE の長時間接続は Worker 本体でなく DO が保持する設計とし、OpenNext のリクエスト時間制約を回避する。

### 3. 認証（Clerk）
- ログイン/サインアップ UI を Clerk コンポーネントに差し替え（メール＋パスワード）。
- `getSessionUser` / `getUserFromRequest` を Clerk のサーバー検証に置換。Web=Cookie、将来モバイル=Bearer(Clerk トークン) の両対応を維持。
- `middleware.ts` を Clerk のミドルウェアに置換。保護対象は現状のホスト API のまま。
- `host_id` として Clerk userId を全面採用。

### 4. ストレージ（R2）
- `api/upload` を R2 バインディング経由に置換。公開URLは R2 パブリックバケット or Worker 経由配信。
- R2 はダッシュボードで有効化が必要（要ユーザー操作 / 確認ポイント）。

### 5. 課金（RevenueCat）/ AI（Gemini）
- RevenueCat は据え置き。webhook ルートを新 Worker のURLに向け直す（**確認ポイント**）。ロジックは `profiles.plan` 更新のまま。
- Gemini 生成は env（`GEMINI_API_KEY`）を wrangler secret に移すのみ。

## データ復旧＆シード
- 変換版スキーマを D1 に適用。
- `scripts/seed-presets.ts` を D1 版に書き換え、572プリセット/5,536問を投入。元 JSON は健在で損失ゼロ。

## 再発防止（バックアップ）
- D1/DO/R2 は無活動でも消えない → 自動停止問題は構造的に解消。
- 週次バックアップ: GitHub Actions cron で `games`(is_preset) を JSON エクスポートし git へコミット。多重の保険。

## リスクと対策
- **OpenNext × SSE（最重要）**: 長時間 SSE は DO が接続を保持する設計で回避。移行初期にこの一点を PoC 検証する。
- **next-intl × OpenNext 互換**: 基本問題ないが、ビルド/起動時に要確認。
- **Clerk × モバイル横展開**: パイロットは Web のみ。トークン検証を Clerk 準拠にし、後で Bearer 経路を通せるようにしておく。
- **D1 の SQL 方言差**: Postgres 特有構文（`jsonb` 演算, `on conflict` 等）を SQLite 相当へ変換。`answers` の `unique(player_id, question_id)` は SQLite でも維持可能。

## 確認ポイント（実装中にユーザーへ問う）
- RevenueCat webhook の宛先切替と課金テスト（お金が絡む）。
- R2 の有効化（ダッシュボード操作）。
- Clerk アカウント作成 / API キー発行（外部アカウント）。
- 新 Cloudflare 本番URLへの切替（DNS / 公開）。

## 段階（ハイレベル）
1. Cloudflare 土台（wrangler / OpenNext / D1 作成 / スキーマ適用）。
2. `D1GameStore` 実装＋直叩きルートのリファクタ＋シード投入。
3. `GameRoom` DO ＋ SSE 配線の付け替え。
4. Clerk 認証置換。
5. R2 アップロード置換。
6. RevenueCat/AI の env・webhook 調整。
7. バックアップ Action。
8. デプロイ＆E2E 確認。

（詳細な実装計画は writing-plans スキルで別途作成する）
