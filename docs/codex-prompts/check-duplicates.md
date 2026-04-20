# 重複クイズ・アンケート検出タスク

## 目的

PartyRant のプリセットデータ全体（590プリセット・約3,700問）から、重複または類似しているクイズ・アンケートを検出して報告する。

## 対象ファイル

以下のすべてのソースを横断してチェックすること：

```
files/partyrant_presets.json              # 132プリセット
files/partyrant_majority_quiz_pack.json   # 101プリセット
files/0420/partyrant_quizzes/             # 117プリセット（12ファイル、各ファイルはPresetGame[]）
files/0420/partyrant_quizzes_vol2/        # 120プリセット（12ファイル）
files/0420/partyrant_trivia_quizzes/      # 120プリセット（12ファイル）
```

各JSONファイルは `PresetGame[]` 形式：
```ts
interface PresetGame {
  scene: string;
  title: string;
  mode: 'trivia' | 'polling' | 'opinion';
  description: string;
  questions: { text: string; options: string[]; correctIndex: number | null; timeLimitSec: number }[];
}
```

## 検出すべき重複の種類

### 1. タイトル完全一致
- `title` が完全に同じプリセットのペア

### 2. 問題文の重複（クロスプリセット）
- 異なるプリセット間で `question.text` が完全一致するもの
- 特に同じ `mode`（polling 同士 / trivia 同士）の組み合わせを優先して報告

### 3. 選択肢が同一の問題
- `question.text` は異なるが `options` の内容が完全一致するもの（意図的な重複の可能性が高い）

### 4. 類似タイトル（同一トピックの重複パック）
- タイトルから「パートN」を除いたベース名が同じプリセットが、**同じソースファイル群内**に存在する場合は正常（意図的なシリーズ）。  
  **異なるソース**（例：`partyrant_presets.json` と `0420/partyrant_quizzes/`）に同じベース名が存在する場合は重複候補として報告。

## 実装方針

Node.js スクリプト（TypeScript不要、純粋な `.js`）として `scripts/check-duplicates.js` を作成し、以下を出力すること：

1. **タイトル重複リスト** — `[source_a] title` vs `[source_b] title`
2. **問題文重複リスト** — 重複している `question.text`、それが含まれるプリセットタイトルとソース
3. **類似タイトルリスト** — ベース名が一致するクロスソースのペア
4. **サマリー** — 各カテゴリの重複件数

## 出力フォーマット

コンソール出力（日本語）＋ `files/duplicate-report.json` に機械読み取り可能な形式で保存。

`duplicate-report.json` の構造：
```json
{
  "generatedAt": "<ISO date>",
  "summary": {
    "titleDuplicates": 0,
    "questionDuplicates": 0,
    "similarTitles": 0
  },
  "titleDuplicates": [
    { "title": "...", "instances": [{ "source": "...", "presetTitle": "..." }] }
  ],
  "questionDuplicates": [
    { "questionText": "...", "instances": [{ "source": "...", "presetTitle": "...", "mode": "..." }] }
  ],
  "similarTitles": [
    { "baseName": "...", "instances": [{ "source": "...", "fullTitle": "..." }] }
  ]
}
```

## 実行方法

```bash
node scripts/check-duplicates.js
```

## 注意事項

- `files/0420/` 内の各 `.json` ファイルは `PresetGame[]` の配列だが、一部のファイルで文字列要素（`"scene"`, `"title"` 等）が混入している。これらは `typeof item !== 'object'` でスキップすること。
- `question.text` の比較は **完全一致のみ**（類似度計算は不要）。
- スクリプトは `Y:/webwork/PartyRant-jp/` をワーキングディレクトリとして実行されることを前提とする。
