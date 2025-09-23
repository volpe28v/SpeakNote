# SpeakNote リファクタリング計画

## 🔥 最優先：NotebookContainer.tsx の責務分離

**現状の問題点:**

- 1つのコンポーネントに多すぎる責務（426行）
- useEffectフックが8個と多すぎる
- 複雑な選択・ハイライト処理ロジック

**解決策:**
以下のカスタムフックに分離して責務を明確化：

### 1. useNotebookState

- `englishText`, `translationText`の管理
- `originalContent`, `currentView`の管理
- 基本的な状態管理を担当

### 2. useHighlightState

- `highlightedLineIndex`, `highlightedJapaneseLineIndex`の管理
- `selectedText`, `selectedEnglishText`の管理
- 選択・ハイライト関連の状態を集約

### 3. useNotebookActions

- `handleSave`, `handleClear`の処理
- `handleTranslateClick`, `handleAutoTranslation`の処理
- アクション系の処理を集約

### 4. useSelectionHandlers

- `handleJapaneseSelection`, `handleEnglishSelection`の処理
- 双方向選択処理のロジックを集約

### 5. useSpeechHandlers

- `handleSpeakEnglish`, `handleSpeakJapanese`の処理
- `getOriginalJapaneseText`のロジックを集約

### 6. NotebookContainer統合

- 各カスタムフックを組み合わせてシンプルなコンポーネントに

## 🔶 高優先度（次回以降）

### 音声処理とCodeMirrorエディタの結合度削減

- `createSpeechKeymap()` → 独立したファイルに移動
- 音声処理ロジック → `useSpeech` フック化
- キーサウンド処理 → `useKeySound` フック化

### 重複するuseEffectの統合

- 似たような処理のuseEffectを統合
- 依存配列の単純化

### 型定義の整理

- `src/types/index.ts` 作成
- 共通型定義の集約

### 設定値の外部化

- エディタ設定のconfig化
- 音声設定の外部化

## 進捗

### ✅ 完了済み（第1フェーズ）

- [x] リファクタリング計画の策定
- [x] useNotebookState の作成
- [x] useHighlightState の作成
- [x] useNotebookActions の作成
- [x] useSelectionHandlers の作成
- [x] useSpeechHandlers の作成
- [x] NotebookContainer での統合

**成果:** NotebookContainer.tsx を426行→285行に削減（約33%削減）

### ✅ 完了済み（第2フェーズ）

- [x] createSpeechKeymap() を独立ファイルに移動
- [x] キーサウンド処理を useKeySound フック化

**成果:** CodeMirrorEditor.tsx を471行→330行に削減（約30%削減）

### 📊 リファクタリング成果まとめ

| フェーズ | 対象ファイル | 削減行数 | 削減率 | 主な改善点 |
|---------|-------------|----------|--------|-----------|
| 第1 | NotebookContainer.tsx | 426→285行 | 33%削減 | 責務分離、5つのカスタムフック抽出 |
| 第2 | CodeMirrorEditor.tsx | 471→330行 | 30%削減 | 音声処理分離、キーマップ独立化 |
| **合計** | **主要2ファイル** | **-252行** | **31%削減** | **保守性・テスタビリティ向上** |

### 🔶 次回以降の課題

- [ ] 音声処理ロジックを useSpeech フック化
- [ ] 重複するuseEffectの統合・最適化
- [ ] 型定義の整理（src/types/index.ts 拡充）
- [ ] 設定値の外部化（エディタ設定、音声設定）

---

## 🚀 以前の実装履歴

### フェーズ1: コア機能（発音機能）

- [x] **ステップ1**: 最小限のHTML作成（入力欄とボタンのみ）
- [x] **ステップ2**: Web Speech APIで英語を発音する基本機能実装
- [x] **ステップ3**: エンターキーで自動発音機能を追加
- [x] **ステップ3.1**: スペースキーで直前の単語を発音
- [x] **ステップ3.2**: 大文字「I」の発音修正
- [x] **ステップ3.3**: ピリオド・疑問符・感嘆符で一文発音
- [x] **ステップ3.4**: 句読点後のスペースでは単語発音をスキップ

### フェーズ2: 基本的なUI

- [x] **ステップ4**: 基本的なCSSスタイリング（最小限）
- [x] **ステップ5**: ノート風レイアウト（左：英語、右：日本語訳エリア）

### フェーズ3: データ保存

- [x] **ステップ6**: localStorageへの保存機能
- [x] **ステップ7**: 保存済み文の一覧表示

### フェーズ4: 追加機能

- [x] **ステップ8**: 日本語訳表示（Google翻訳API統合）

---

## 📝 実装詳細

### ステップ1: 最小限のHTML作成

**目的**: 入力と発音ボタンだけの最小構成を作成

- `index.html` を作成
- 英語入力用のテキストフィールド
- 「発音する」ボタン
- JavaScriptファイルの読み込み

### ステップ2: Web Speech APIの基本実装

**目的**: ボタンクリックで入力された英語を発音

- `script.js` を作成
- Web Speech APIの初期化
- 英語（en-US）での発音設定
- ボタンクリックイベントの実装

### ステップ3: エンターキーで自動発音

**目的**: 入力後にエンターキーで即座に発音

- キーボードイベントリスナーの追加
- エンターキー検出時の発音処理
- 入力欄のフォーカス管理

### ステップ4: 基本的なCSSスタイリング

**目的**: 最小限の見やすいデザイン

- `style.css` を作成
- フォントサイズと余白の調整
- ボタンの基本スタイル

### ステップ5: ノート風レイアウト

**目的**: 左に英語、右に日本語訳のレイアウト実装

- Flexboxを使った2カラムレイアウト
- レスポンシブ対応（モバイルでは縦並び）
- ノート風の罫線やデザイン

### ステップ6: localStorageへの保存機能

**目的**: 入力した英文を最大20件保存

- 保存ボタンの追加
- localStorage APIの実装
- 20件制限のロジック

### ステップ7: 保存済み文の一覧表示

**目的**: 保存した文を表示・操作できるように

- 一覧表示エリアの追加
- 各文に対する操作ボタン（発音・編集・削除）
- 一覧の自動更新

### ステップ8: 日本語訳表示（Google翻訳API統合）

**目的**: 英文の日本語訳を表示

- Google Apps Scriptを使用した翻訳API実装
- 翻訳ボタンの追加と非同期処理
- 翻訳結果の表示エリア

---

## 🎯 完了基準

各ステップは以下の基準で完了とする：

- 機能が正常に動作すること
- コードがシンプルで理解しやすいこと
- 次のステップに進む準備ができていること
