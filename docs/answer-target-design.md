# answerTarget 型導入 設計書（人当て／キャスト指名系設問の恒久対策）

作成: 2026-09-20 / 設計: Fable / 対象: PartyRant-jp

## 背景・根本原因
設問が「何を選ばせるか（参加者／キャスト／固定内容）」という**意図をデータに持たず**、文字列パターン（`isPlayerPlaceholder` = `/^[A-Z]さん$/`・`/^プレイヤー[A-Z]$/`）と `scene==='キャスト指名'` から3箇所（`advance/route.ts` / `cast/route.ts` / `PlayGameClient.tsx`）で毎回“推測”している。そのため取りこぼしと採点混同が起きる。

### 実データで確認された不一致
1. **人当てなのに採点される（8問）**: options が `Aさん/Bさん/…`（参加者へ差し替わる枠）なのに `correctIndex` が設定され採点される。例「入学してから体重が一番増えたのは？」。
2. **差し替え漏れ**: `[キャストA,キャストB,…]`（5問）・`[AB,CD,EF,いない]`（1問）は regex に拾われず、ダミー名のまま投票される。

### 核心
**回答者(respondents)と選択対象(targets)は別集合になりうる**。一般宴会=対象は参加者自身、キャバ=回答者はお客・対象はキャスト（別集合）、内容投票=対象は固定選択肢（人でない）。

## 採用案（案B）: questions JSON に設問単位の型を追加
```ts
// src/types/domain.ts
export type AnswerTarget = 'fixed' | 'players' | 'casts';
export interface Question {
  // 既存はそのまま
  answerTarget?: AnswerTarget; // undefined = 'fixed'（後方互換）
  excludeSelf?: boolean;       // Phase2以降。既定false
}
```
- 新カラム不要（`answers.choice_index` は options 文字列に依存しないためスキーマ非変更）。
- 採点可否は**導出**（二重に持たない）: `isScored(q) = (q.answerTarget ?? 'fixed')==='fixed' && q.correctIndex != null`。

| answerTarget | options の意味 | 差し替え | 採点 |
|---|---|---|---|
| fixed | 固定内容 | しない | trivia かつ correctIndex!=null のみ |
| players | 参加者本人 | 参加者 displayName で解決 | 常に非採点（名指し集計） |
| casts | ゲームのキャスト | キャスト名で解決 | 常に非採点（名指し集計） |

## 選択肢解決の一元化
`src/lib/game-logic.ts` に唯一の解決関数:
```ts
function resolveOptions(q, ctx: { playerNames: string[]; casts: string[] }): string[] {
  switch (q.answerTarget ?? 'fixed') {
    case 'players': return ctx.playerNames;
    case 'casts':   return ctx.casts.length ? ctx.casts : q.options; // Phase1はcasts源が未整備なら現状維持
    case 'fixed':   return q.options;
  }
}
```
- 解決タイミングは現行踏襲＝**lobby→question で一度だけ確定保存**（回答中に options が変わると票がずれるため）。
- ランタイムの regex 検知は将来廃止。ただし **Phase 1 の間だけ**「answerTarget 未定義の旧ゲーム」向けに現行 regex 判定を fallback で残す。

## 採点・集計ルール
- `calculatePoints` に「`answerTarget!=='fixed'` なら常に0点」ガード（データ修正漏れの恒久防御・不一致①の最終防波堤）。
- players → 現行 `computePersonVoteResults`（名指し回数ランキング）を `answerTarget==='players'` 判定に置換。
- casts → 現行 `computeOptionVoteResults`（option名ベース）を `answerTarget==='casts'` 判定に置換。
- reveal で players/casts は正解ハイライトを出さない。

## 既存5,535問シードの移行（非破壊）
`scripts/gen-seed-sql.ts`（seed生成元）に **ヒューリスティック分類**を組み込み、seed を再生成（seed は `delete where is_preset=1`→再insert で冪等）:
1. options 全てが `/^[A-Z]さん$/`・`/^プレイヤー[A-Z]$/` → `answerTarget:'players'`
2. options に `/^キャスト[A-Z]$/` を含む or preset の scene==='キャスト指名' → `answerTarget:'casts'`
3. それ以外 → `answerTarget:'fixed'`
- **①の8問**: ルール1で players 判定 → `correctIndex` を除去して付与（混在プリセットでもその設問だけ非採点になる、ガードで安全）。
- **ペア枠1問**（[AB,CD,EF,いない]）: 自動分類不能 → `fixed` のまま残す（文言調整は運用対応）。ペア型の新設はしない（YAGNI）。
- 分類結果はログで全件レビューしてから反映。

## /api/trivia/random ・ opinion/random 補正
- trivia/random: pool から `answerTarget!=='fixed' || correctIndex==null` を除外（知識問題のみ）。
- opinion/random: players は含めてよいが casts は除外（キャスト未設定ゲームへの混入防止）。

## キャスト指名統合
- `files/0422/partyrant_cast/cast_キャバクラ指名.json` は `answerTarget:'casts'` 付きの正規プリセットとして合流（options のサンプル名は解決時に無視）。
- キャスト名の供給: **Phase 2** で `games.casts`(JSON) カラム追加、cast PATCH の保存先を options 上書き→`games.casts` に変更、`next`（もう一度）で casts をコピー。`scene==='キャスト指名'` 分岐は全廃し `answerTarget` 判定へ。
- **Phase 1 の間**は既存のキャスト入力（options 上書き）挙動を壊さない。

## 段階導入
- **Phase 1（本実装）**: `answerTarget` 追加 / `resolveOptions`・`isScored` 集約 / `calculatePoints` ガード / advance・PlayGameClient の分岐を型判定へ置換（旧データ regex fallback 付き）/ `gen-seed-sql.ts` にヒューリスティック分類＋①8問の correctIndex 除去 / seed 再生成 / trivia・opinion random フィルタ。→ **不一致①を完全解消、②-players を頑健化、②-cast は型付けまで（実名解決は Phase 2）**。
- **Phase 2**: `games.casts` カラム・cast PATCH 変更・キャスト指名プリセット合流・作成画面に種別切替UI・next での casts 引き継ぎ。
- **Phase 3**: 店舗キャストプリセット等、regex fallback 削除。

## 最小の第一歩（リスクゼロ）
`domain.ts` に `answerTarget` 追加 → `game-logic.ts` に `resolveOptions`/`isScored` 新設 → `calculatePoints` に「fixed 以外は0点」ガード。optional（undefined='fixed'）なので既存挙動は不変・デプロイリスクゼロ。

## 主要ファイル
- `src/types/domain.ts`（Question に answerTarget 追加）
- `src/lib/game-logic.ts`（resolveOptions / isScored / calculatePoints ガード）
- `src/app/api/games/[gameId]/advance/route.ts`（lobby→question の解決を型ベースへ、regex fallback）
- `src/app/play/[gameId]/PlayGameClient.tsx`（scene/regex 分岐3箇所を型判定へ、キャスト入力ゲート）
- `src/app/api/games/[gameId]/cast/route.ts`（Phase2で保存先変更。Phase1は触れないか最小）
- `scripts/gen-seed-sql.ts` + `migrations/seed_presets.sql`（分類＋再生成）
- `src/app/api/trivia/random/route.ts` / `src/app/api/opinion/random/route.ts`（フィルタ）
