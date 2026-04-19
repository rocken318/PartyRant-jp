# Preset Preview Drawer & Study Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/presets` ページにプリセットの問題をプレビューできるドロワーUIを追加し、「勉強」sceneのプレースホルダープリセットを用意する。

**Architecture:** 純クライアントサイド実装。`/api/presets` のレスポンスには既に `questions[]` が含まれているためAPI変更なし。shadcn/ui の Sheet コンポーネントを使った右スライドドロワーをインストール・追加する。「勉強」sceneはJSONにプレースホルダーを追加してDBにシードするだけ。

**Tech Stack:** Next.js 15 App Router, shadcn/ui (Sheet), Tailwind CSS, next-intl, pnpm

---

## File Map

| ファイル | 変更種別 | 役割 |
|---------|---------|------|
| `src/components/ui/sheet.tsx` | 新規（shadcn生成） | Sheet UIプリミティブ |
| `src/components/PresetPreviewDrawer.tsx` | 新規 | プリセット問題一覧ドロワー |
| `src/app/presets/page.tsx` | 変更 | プレビュー state追加・ボタン追加・ドロワー配置 |
| `messages/ja.json` | 変更 | プレビュー関連翻訳キー追加 |
| `files/partyrant_presets.json` | 変更 | 「勉強」scene プレースホルダー追加 |

---

## Task 1: Sheet コンポーネントのインストール + 翻訳キー追加

**Files:**
- Create: `src/components/ui/sheet.tsx`（shadcn CLI が自動生成）
- Modify: `messages/ja.json`

- [ ] **Step 1: Sheet をインストール**

```bash
cd Y:/webwork/PartyRant-jp
pnpm dlx shadcn@latest add sheet
```

インタラクティブ確認が出た場合は全て `y` で進める。

Expected: `src/components/ui/sheet.tsx` が生成されること。

- [ ] **Step 2: 生成確認**

```bash
ls src/components/ui/sheet.tsx
```

Expected: ファイルが存在する。

- [ ] **Step 3: 翻訳キーを `messages/ja.json` に追加**

`messages/ja.json` の `"presets"` セクションに以下を追記（既存キーの末尾に追加）：

```json
"previewButton": "中身を見る",
"previewClose": "閉じる",
"previewQuestionCount": "全{{count}}問"
```

変更後の `presets` セクション末尾はこうなる：

```json
"presets": {
  "title": "プリセット",
  "subtitle": "ログイン不要・すぐ遊べる",
  "filterAll": "すべて",
  "filterSceneLabel": "シーン",
  "filterTypeLabel": "タイプ",
  "questionCount": "問",
  "resultCount": "件",
  "startButton": "🚀 このゲームで遊ぶ",
  "starting": "準備中...",
  "empty": "プリセットがまだありません",
  "noResults": "条件に合うゲームがありません",
  "randomTitle": "🎲 ランダムアンケート",
  "randomSubtitle": "プリセットの質問からランダムで10問出題！",
  "randomMinority": "🦄 少数派が負け",
  "randomMajority": "🐑 多数派が負け",
  "randomStarting": "ゲーム作成中...",
  "previewButton": "中身を見る",
  "previewClose": "閉じる",
  "previewQuestionCount": "全{{count}}問"
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/sheet.tsx messages/ja.json
git commit -m "feat: install Sheet component + add preview translation keys"
```

---

## Task 2: PresetPreviewDrawer コンポーネントの作成

**Files:**
- Create: `src/components/PresetPreviewDrawer.tsx`

- [ ] **Step 1: コンポーネントファイルを作成**

`src/components/PresetPreviewDrawer.tsx` を以下の内容で作成：

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { Game } from '@/types/domain';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const TYPE_LABEL: Record<string, string> = {
  trivia:  '🧠 クイズ',
  polling: '📊 実態調査',
  opinion: '⚔️ 多数派/少数派',
};

interface Props {
  preset: Game | null;
  onClose: () => void;
}

export default function PresetPreviewDrawer({ preset, onClose }: Props) {
  const t = useTranslations('presets');

  return (
    <Sheet open={preset !== null} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:w-[420px] flex flex-col p-0 overflow-hidden">
        {preset && (
          <>
            <SheetHeader className="px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <SheetTitle className="text-left text-base font-bold text-pr-dark leading-tight">
                {preset.title}
              </SheetTitle>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                <span>{TYPE_LABEL[preset.mode] ?? preset.mode}</span>
                <span>·</span>
                <span>{t('previewQuestionCount', { count: preset.questions.length })}</span>
              </p>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {preset.questions.map((q, i) => (
                <div
                  key={q.id}
                  className="bg-gray-50 rounded-[8px] border border-gray-200 p-4"
                >
                  <p className="text-sm font-bold text-pr-dark mb-3">
                    Q{i + 1}. {q.text}
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {q.options.map((opt, j) => (
                      <li
                        key={j}
                        className="text-xs text-gray-600 bg-white border border-gray-200 rounded-[6px] px-3 py-2"
                      >
                        {opt}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-full h-11 rounded-[6px] border-[2px] border-pr-dark text-pr-dark font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                {t('previewClose')}
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: 型チェック**

```bash
cd Y:/webwork/PartyRant-jp
pnpm tsc --noEmit
```

Expected: エラーなし（または既存エラーのみ）。

- [ ] **Step 3: Commit**

```bash
git add src/components/PresetPreviewDrawer.tsx
git commit -m "feat: add PresetPreviewDrawer component"
```

---

## Task 3: presets/page.tsx にドロワーを組み込む + 勉強 SCENE_META 追加

**Files:**
- Modify: `src/app/presets/page.tsx`

- [ ] **Step 1: import を追加**

`src/app/presets/page.tsx` の既存 import ブロック末尾に追記：

```tsx
import PresetPreviewDrawer from '@/components/PresetPreviewDrawer';
```

- [ ] **Step 2: SCENE_META に「勉強」を追加**

`src/app/presets/page.tsx` の `SCENE_META` オブジェクトに以下を追加：

```tsx
const SCENE_META: Record<string, { icon: string; color: string }> = {
  'みんなで':         { icon: '🎉', color: '#8B5CF6' },
  '多数派クイズ':     { icon: '⚔️', color: '#F97316' },
  '結婚式':           { icon: '💍', color: '#FF0080' },
  '合コン':           { icon: '💕', color: '#FF6B9D' },
  'カップル':         { icon: '🫶', color: '#FF4D6D' },
  'ファミリー':       { icon: '👨‍👩‍👧‍👦', color: '#00C472' },
  '会社飲み会':       { icon: '🏢', color: '#3B82F6' },
  'キャバクラ':       { icon: '🥂', color: '#FFD600' },
  'ホームパーティー': { icon: '🏠', color: '#8B5CF6' },
  'サークル':         { icon: '🎓', color: '#F97316' },
  '居酒屋':           { icon: '🍺', color: '#EF4444' },
  '勉強':             { icon: '📚', color: '#10B981' },  // ← 追加
};
```

- [ ] **Step 3: useState に previewPreset を追加**

`PresetsPage` 関数内の既存 useState 群の末尾に追加：

```tsx
const [previewPreset, setPreviewPreset] = useState<Game | null>(null);
```

- [ ] **Step 4: カードに「中身を見る」ボタンを追加**

`src/app/presets/page.tsx` の「スタートボタン」ブロック（`{/* スタートボタン */}` コメント付き div）を以下に差し替える：

```tsx
{/* アクションボタン */}
<div className="px-4 py-3 flex gap-2">
  <button
    type="button"
    onClick={() => setPreviewPreset(preset)}
    disabled={isStarting || starting !== null}
    className="flex-shrink-0 h-12 px-4 bg-white text-pr-dark font-bold text-sm rounded-[6px] border-[3px] border-pr-dark shadow-[3px_3px_0_#111] active:shadow-[1px_1px_0_#111] active:translate-x-[1px] active:translate-y-[1px] transition-[transform,box-shadow] duration-75 disabled:opacity-50 touch-manipulation"
    style={{ fontFamily: 'var(--font-dm)' }}>
    {t('previewButton')}
  </button>
  <button
    type="button"
    onClick={() => handleStart(preset.id)}
    disabled={isStarting || starting !== null}
    className="flex-1 h-12 bg-pr-pink text-white font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[3px_3px_0_#111] active:shadow-[1px_1px_0_#111] active:translate-x-[1px] active:translate-y-[1px] transition-[transform,box-shadow] duration-75 disabled:opacity-50 touch-manipulation"
    style={{ fontFamily: 'var(--font-dm)' }}>
    {isStarting ? t('starting') : t('startButton')}
  </button>
</div>
```

- [ ] **Step 5: ドロワーを `<main>` 末尾に追加**

`src/app/presets/page.tsx` の `</main>` の直前に追記：

```tsx
      <PresetPreviewDrawer
        preset={previewPreset}
        onClose={() => setPreviewPreset(null)}
      />
    </main>
```

- [ ] **Step 6: 型チェック**

```bash
cd Y:/webwork/PartyRant-jp
pnpm tsc --noEmit
```

Expected: エラーなし。

- [ ] **Step 7: 動作確認**

```bash
pnpm dev
```

ブラウザで `http://localhost:3000/presets` を開いて確認：
1. 各プリセットカードに「中身を見る」と「🚀 このゲームで遊ぶ」の2ボタンが並んでいる
2. 「中身を見る」クリック → 右からドロワーがスライドイン
3. ドロワー内に問題文と選択肢が一覧表示される
4. 「閉じる」ボタン or 背景クリックでドロワーが閉じる
5. 「🚀 このゲームで遊ぶ」ボタンは従来通り動作する

- [ ] **Step 8: Commit**

```bash
git add src/app/presets/page.tsx
git commit -m "feat: preset preview drawer — 中身を見るボタン + ドロワー組み込み"
```

---

## Task 4: 「勉強」sceneプレースホルダープリセットをJSONに追加してシード

**Files:**
- Modify: `files/partyrant_presets.json`

- [ ] **Step 1: JSONにプレースホルダープリセットを追加**

`files/partyrant_presets.json` の配列末尾（最後の `}` の後、`]` の前）に以下を追記：

```json
,
{
  "scene": "勉強",
  "title": "英単語チャレンジ（準備中）",
  "mode": "trivia",
  "description": "英単語の意味を当てよう！問題は随時追加予定。",
  "questions": [
    {
      "text": "「apple」の意味は？",
      "options": ["りんご", "みかん", "ぶどう", "もも"],
      "correctIndex": 0,
      "timeLimitSec": 15
    },
    {
      "text": "「book」の意味は？",
      "options": ["本", "鞄", "机", "椅子"],
      "correctIndex": 0,
      "timeLimitSec": 15
    },
    {
      "text": "「water」の意味は？",
      "options": ["水", "火", "土", "風"],
      "correctIndex": 0,
      "timeLimitSec": 15
    },
    {
      "text": "「friend」の意味は？",
      "options": ["友達", "家族", "先生", "敵"],
      "correctIndex": 0,
      "timeLimitSec": 15
    },
    {
      "text": "「music」の意味は？",
      "options": ["音楽", "映画", "絵画", "料理"],
      "correctIndex": 0,
      "timeLimitSec": 15
    }
  ]
},
{
  "scene": "勉強",
  "title": "一般常識クイズ（準備中）",
  "mode": "trivia",
  "description": "知ってて当たり前？意外と知らない一般常識を出題！問題は随時追加予定。",
  "questions": [
    {
      "text": "日本の首都は？",
      "options": ["東京", "大阪", "名古屋", "福岡"],
      "correctIndex": 0,
      "timeLimitSec": 15
    },
    {
      "text": "1年は何日？",
      "options": ["365日", "360日", "364日", "366日"],
      "correctIndex": 0,
      "timeLimitSec": 15
    },
    {
      "text": "水の沸点は？",
      "options": ["100℃", "90℃", "80℃", "120℃"],
      "correctIndex": 0,
      "timeLimitSec": 15
    },
    {
      "text": "富士山の高さは？",
      "options": ["3776m", "3726m", "3800m", "3650m"],
      "correctIndex": 0,
      "timeLimitSec": 15
    },
    {
      "text": "太陽系で一番大きい惑星は？",
      "options": ["木星", "土星", "天王星", "海王星"],
      "correctIndex": 0,
      "timeLimitSec": 15
    }
  ]
}
```

- [ ] **Step 2: JSON構文を確認**

```bash
cd Y:/webwork/PartyRant-jp
node -e "JSON.parse(require('fs').readFileSync('./files/partyrant_presets.json','utf8')); console.log('JSON OK')"
```

Expected: `JSON OK`

- [ ] **Step 3: DBにシード**

```bash
cd Y:/webwork/PartyRant-jp
pnpm tsx scripts/seed-presets.ts
```

Expected: シードスクリプトが成功し、新しいプリセットが登録されたログが出る。

- [ ] **Step 4: 動作確認**

`http://localhost:3000/presets` でシーンフィルターに「📚 勉強」が表示され、フィルタリングできることを確認。

- [ ] **Step 5: Commit**

```bash
git add files/partyrant_presets.json
git commit -m "feat: 勉強 scene placeholder presets — 英単語・一般常識"
```

---

## Self-Review

**Spec coverage:**
- [x] `/presets` ページにプレビューボタン追加 → Task 3 Step 4
- [x] 右スライドドロワー → Task 2 (PresetPreviewDrawer with Sheet side="right")
- [x] 問題文＋選択肢のみ（正解マークなし） → Task 2 Step 1（correctIndex を表示しない）
- [x] API変更なし → 全タスクでAPIコード変更なし
- [x] 「勉強」sceneのプレースホルダー追加 → Task 4
- [x] シーンフィルターの自動更新 → SCENE_META 追加 (Task 3 Step 2) + JSON追加で自動対応
- [x] 翻訳キー追加 → Task 1 Step 3

**Placeholder scan:** プレースホルダーなし。全ステップに具体的なコードを記載済み。

**Type consistency:** 
- `Game` 型は既存 `@/types/domain` から import
- `preset.questions` → `Question[]` → `q.id`, `q.text`, `q.options` は既存型に合致
- `previewPreset: Game | null` → `PresetPreviewDrawer` の `preset: Game | null` と一致
