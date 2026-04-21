# Code Review Prompt — PartyRant

以下の観点でこのNext.jsアプリ全体をレビューしてください。

## アプリ概要

- **PartyRant-jp**: パーティー向けリアルタイムクイズアプリ（日本語版）
- **PartyRant-fam**: 家族・学習向けクイズアプリ（学年・教科フィルター付きソロプレイ＋ホストモード）
- **スタック**: Next.js 14 App Router / TypeScript / Tailwind CSS v4 / Supabase（Realtime Broadcast + Postgres）
- **リアルタイム通信**: サーバー側でSupabase REST Broadcastを送信、クライアント側はSSE（`/api/stream/[gameId]`）でSubscribe

---

## レビュー観点

### 1. バグ・不具合
- API routeにメソッド（GET/POST/PATCH等）の抜けがないか
- Supabaseのクエリでエラー時の戻り値が適切に処理されているか
- Realtimeイベントの取りこぼし（SSE接続前に届いたイベント）が起きうる箇所
- `useEffect`の依存配列の漏れ、stale closure
- ゲーム状態（`status`）の遷移で到達できない・抜けられないケースがないか
- Next.js App RouterのServer Component / Client Componentの境界ミス

### 2. セキュリティ
- APIルートで入力バリデーション（Zod等）が抜けている箇所
- Supabase RLSが無効になっているテーブルで不正アクセスが起きうる操作
- 環境変数（`SUPABASE_SERVICE_ROLE_KEY`等）がクライアントに露出していないか
- `dangerouslySetInnerHTML`やXSSリスクのある箇所
- ゲームIDやjoinCodeの予測しやすさ・衝突リスク

### 3. コード品質
- TypeScriptの型安全性：`as`キャストや`!`（non-null assertion）が必要以上に使われていないか
- `@/types/domain.ts`の型定義と実際のSupabaseスキーマ（`supabase/schema.sql`）が一致しているか
- エラーハンドリングが`catch {}`で飲み込まれている箇所
- 重複したロジック（`store/supabase-store.ts`と各APIルートの重複など）
- `TODO`/`FIXME`/`console.log`の残留

### 4. パフォーマンス
- Supabaseへの不要なN+1クエリ
- `useEffect`や`useState`による不要な再レンダリング
- 画像・アセットの最適化不足
- SSEストリームが切断時にSupabaseチャンネルを確実にクリーンアップしているか
- Vercelのサーバーレスタイムアウト（Node.js runtime: 10秒）に引っかかりうるAPIルート

---

## 調査手順

1. `src/app/api/` 配下のAPIルートを全て確認し、メソッド漏れ・バリデーション漏れを洗い出す
2. `src/lib/store/supabase-store.ts` のDB操作とエラーハンドリングを確認する
3. `src/lib/events/broadcast.ts` と `src/app/api/stream/[gameId]/route.ts` のRealtime実装を確認する
4. `src/app/` 配下のClient Componentで`useEffect`の依存配列と状態管理を確認する
5. `supabase/schema.sql` とTypeScriptの型定義の整合性を確認する

---

## 出力フォーマット

各問題について以下の形式で報告してください：

```
### [重要度: 高/中/低] 問題タイトル

**ファイル**: `src/path/to/file.ts:行番号`
**カテゴリ**: バグ / セキュリティ / コード品質 / パフォーマンス
**説明**: 何が問題か
**修正案**: どう直すか（コード例があれば）
```

最後に優先度高の問題をまとめたリストを出力してください。
