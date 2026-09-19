# キャスト指名ゲーム 実装確認シート

scene値による完全分岐。`キャスト指名` と `この中で●●なのは誰だ` は別物。

---

## ゲーム種別の定義

| scene | 参加者の役割 | 選択肢の中身 |
|-------|------------|------------|
| `この中で●●なのは誰だ` | 全員が回答者 ＆ 選択肢 | 参加者の名前（自動置換） |
| `キャスト指名` | 客は回答のみ | キャスト名（ホストが事前入力） |
| その他（合コン等） | 全員が回答者 ＆ 選択肢 | 参加者の名前（自動置換） |

---

## 確認ポイント 1 — プレイヤー名の置換スキップ

**ファイル:** `src/app/api/games/[gameId]/advance/route.ts`  
**行:** 36

```
if (prevStatus === 'lobby' && game.scene !== 'キャスト指名') {
```

**確認内容:**
- `キャスト指名` のとき → このブロックに入らない → 置換されない ✓
- `この中で●●なのは誰だ` のとき → このブロックに入る → 参加者名で置換される ✓
- その他のscene → 従来通り ✓

---

## 確認ポイント 2 — キャスト名書き込みエンドポイント

**ファイル:** `src/app/api/games/[gameId]/cast/route.ts`  
**行:** 19

```
if (game.scene !== 'キャスト指名') return NextResponse.json({ error: 'Not a cast game' }, { status: 400 });
```

**確認内容:**
- `キャスト指名` 以外のゲームにこのAPIを叩いても 400 で弾く
- 他ゲームのoptionsは絶対に書き換わらない ✓

---

## 確認ポイント 3 — ロビーUIの出し分け

**ファイル:** `src/app/play/[gameId]/PlayGameClient.tsx`  
**検索キーワード:** `game.scene === 'キャスト指名' && (`

```
{game.scene === 'キャスト指名' && (
  <div ...>キャスト名を入力 ...
```

**確認内容:**
- `キャスト指名` → キャスト名入力フォームが表示される ✓
- `この中で●●なのは誰だ` → フォームは出ない ✓
- その他のゲーム → フォームは出ない ✓

**スタートボタンの制御（同ファイル）:**

```
disabled={players.length === 0 || (game.scene === 'キャスト指名' && !castSaved)}
```

- `キャスト指名` → 「確定」を押すまでスタート不可 ✓
- その他のゲーム → `castSaved` は無関係、`players.length === 0` だけが条件 ✓

---

## 確認ポイント 4 — 終了後の集計

**ファイル（ホスト）:** `src/app/play/[gameId]/PlayGameClient.tsx`  
**ファイル（ゲスト）:** `src/app/join/[code]/GuestGameClient.tsx`  
**検索キーワード:** `game.scene === 'キャスト指名'`

両ファイルとも同じロジック:

```
if (game.scene === 'キャスト指名') {
  computeOptionVoteResults(...)   // キャスト名ベース
} else {
  computePersonVoteResults(...)   // 参加者名ベース（この中で●●も含む）
}
```

| scene | 集計方式 | 理由 |
|-------|---------|------|
| `キャスト指名` | `computeOptionVoteResults` | 選択肢=キャスト名、参加者と無関係 |
| `この中で●●なのは誰だ` | `computePersonVoteResults` | 選択肢=参加者名、一致する |
| その他 polling | `computePersonVoteResults` | 同上 |

**「みんなの実態まとめ」の出し分け（同ファイル内）:**

```
game.scene !== 'キャスト指名' && players.length > 0 && (...)
```

- `キャスト指名` → 表示しない（客と無関係なので不要）✓
- その他 → 表示する ✓

---

## 確認ポイント 5 — ページリロード後の castSaved 復元

**ファイル:** `src/app/play/[gameId]/PlayGameClient.tsx`  
**検索キーワード:** `hasRealNames`

```
if (gameData.scene === 'キャスト指名' && gameData.questions.length > 0) {
  const opts = gameData.questions[0].options;
  const hasRealNames = opts.length > 0 && opts.every(o => !isPlayerPlaceholder(o) && o.trim() !== '');
  if (hasRealNames) {
    setCastNames(opts);
    setCastSaved(true);
  }
}
```

**確認内容:**
- DBにキャスト名が入っている状態でリロードしても `castSaved = true` に復元される ✓
- スタートボタンが無効にならない ✓
- まだキャスト名を入れていない場合は `castSaved = false` のまま（スタート不可）✓

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|--------|---------|
| `src/app/api/games/[gameId]/advance/route.ts` | 36行目に `game.scene !== 'キャスト指名'` 条件追加 |
| `src/app/api/games/[gameId]/cast/route.ts` | 新規作成（PATCH endpoint） |
| `src/app/play/[gameId]/PlayGameClient.tsx` | キャスト入力UI追加、集計条件修正 |
| `src/app/join/[code]/GuestGameClient.tsx` | 集計条件修正 |
