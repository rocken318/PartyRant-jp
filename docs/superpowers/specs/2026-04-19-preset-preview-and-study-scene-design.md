# Preset Preview & Study Scene — Design Spec

**Date:** 2026-04-19  
**Status:** Approved

---

## Overview

Two features added to the existing `/presets` page:

1. **Preset Preview Drawer** — ホストがプリセットを選ぶ前に問題内容を確認できるドロワーUI
2. **Study Scene Scaffold** — 「勉強」sceneの箱を用意し、後から問題集を追加できる構造を作る

---

## Feature 1: Preset Preview Drawer

### Goal

`/presets` ページの各プリセットカードに「中身を見る」ボタンを追加。クリックすると画面右からドロワーがスライドインし、そのプリセットの問題文と選択肢を一覧表示する。

### Approach

純クライアントサイド実装。`/api/presets` は既に全問題データ（`questions[]`）を返しているため、API変更は不要。

### Components

**`src/app/presets/page.tsx`（変更）**
- `useState<Game | null>` を追加し、プレビュー対象のプリセットを管理
- 各プリセットカードに「中身を見る」ボタンを追加（既存のスタートボタンと並置）
- `PresetPreviewDrawer` コンポーネントをページ末尾に配置

**`src/components/PresetPreviewDrawer.tsx`（新規）**
- shadcn/ui の `Sheet`（`side="right"`）を使用
- Props: `preset: Game | null`, `onClose: () => void`
- 表示内容:
  - ヘッダー: プリセットタイトル、問題数、モードバッジ
  - 問題リスト: Q番号・問題文・選択肢（選択肢は箇条書き）
  - 正解マーク: **表示しない**（シンプルに保つ）
  - フッター: 「閉じる」ボタン

### Data Flow

```
/api/presets → useState<Game[]> presets
                    ↓
  カード「中身を見る」クリック → setPreviewPreset(preset)
                    ↓
  PresetPreviewDrawer (open=true, preset=previewPreset)
                    ↓
  「✕」または背景クリック → setPreviewPreset(null)
```

### UI Notes

- ドロワーは `Sheet` の `side="right"` で幅 `w-[400px]` 程度
- モバイルでは全幅 `w-full`
- 問題が多い場合はドロワー内をスクロール（`overflow-y-auto`）
- 翻訳キーは `messages/ja.json` の `presets` セクションに追加

---

## Feature 2: Study Scene Scaffold

### Goal

「勉強」sceneのプリセット枠を作成する。実際の問題集は後から追加するため、現時点ではサンプル問題（ダミー）を含むプレースホルダープリセットを用意する。

### Approach

既存の trivia モードをそのまま使用。`scene: "勉強"` を新しいsceneとして追加するだけ。フィルターUIは動的生成のため自動的に「勉強」タブが出現する。

### Data Changes

**`files/partyrant_presets.json`（変更）**
- `scene: "勉強"`, `mode: "trivia"` のプリセットを追加
- 初期プリセット例:
  - 「英単語チャレンジ（準備中）」— ダミー問題5問
  - 「一般常識クイズ（準備中）」— ダミー問題5問
- ダミー問題は差し替え可能な構造で作成

**`scripts/seed-presets.ts`（変更なしの可能性）**
- JSONから読み込んでDBに登録する仕組みは既存のまま使用

### Scene Filter

`/presets` ページのシーンフィルターは既存プリセットの `scene` フィールドから動的生成されるため、JSONにデータを追加するだけで「勉強」フィルターが自動出現する。

---

## Out of Scope

- 正解マークの表示（プレビューはシンプルに保つ）
- 個人学習モード（パーティー形式のみ）
- 学習統計・正答率の記録
- カスタム問題集のアップロードUI

---

## Translation Keys to Add

```json
// messages/ja.json — presetsセクションに追加
"previewButton": "中身を見る",
"previewClose": "閉じる",
"previewQuestionCount": "全{{count}}問",
"sceneStudy": "勉強"
```

---

## Files Changed

| ファイル | 変更種別 |
|---------|---------|
| `src/app/presets/page.tsx` | 変更 |
| `src/components/PresetPreviewDrawer.tsx` | 新規 |
| `files/partyrant_presets.json` | 変更 |
| `messages/ja.json` | 変更 |
