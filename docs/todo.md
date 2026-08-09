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

| フェーズ | 対象ファイル          | 削減行数   | 削減率      | 主な改善点                        |
| -------- | --------------------- | ---------- | ----------- | --------------------------------- |
| 第1      | NotebookContainer.tsx | 426→285行  | 33%削減     | 責務分離、5つのカスタムフック抽出 |
| 第2      | CodeMirrorEditor.tsx  | 471→330行  | 30%削減     | 音声処理分離、キーマップ独立化    |
| **合計** | **主要2ファイル**     | **-252行** | **31%削減** | **保守性・テスタビリティ向上**    |

### 🔶 次回以降の課題

- [ ] 音声処理ロジックを useSpeech フック化
- [ ] 重複するuseEffectの統合・最適化
- [ ] 型定義の整理（src/types/index.ts 拡充）
- [ ] 設定値の外部化（エディタ設定、音声設定）

---

## 🧭 第3フェーズ計画（コードベース全体調査 2026-08-09）

**前提となる気づき:** 第1フェーズはフックを抽出したが**状態の所有権を移していない**。
`useNotebookActions` / `useNoteSync` / `useAutoSave` / `useSpeechHandlers` /
`useUnsavedChangeTracker` / `useTranslationSync` / `useSelectionHandlers` の7つは
自前の状態を持たず全て props で受け取るため、結合度は下がらず「引数の受け渡し面」だけが増えた。
NotebookContainer が配っている引数は合計52個。以下の P0-1 / P1 群はこの構造が原因。

### 🚨 P0: 実害が出ている（最優先）

- [x] **Firestore の無限読み取りループを止める**（課金・帯域に直結）
  - **実測で確定**: Spark プランの1日上限5万回に対し **読み取り 1,142万回 / 書き込み 6回**（228倍超過、割り当て100%消費で読み取りが拒否される状態だった）
  - **対応済み**: `useNoteSync.ts` のコールバックを `handlersRef` 経由に変更し、同期 effect の依存を `[user, authManager, firestoreManager]`（いずれも `useState` 由来で参照が安定）だけに限定。ログイン状態が変わったときのみ同期する
  - 以下は当時の分析メモ
  - `NotebookContainer.tsx:126` `handleNoteLoad` が `useCallback` なし → 毎レンダー新しい関数
  - → `useNoteSync.ts:52` の deps に `onNoteLoad` があり effect が毎レンダー再実行
  - → `syncFromFirestore` → `firebase.ts:176` `getDocs()`（課金される読み取り）
  - → `firebase.ts:178-187` は毎回新配列を返すため `setNotes()` で必ず再レンダー
  - → `AppContext.tsx:30` の value が未メモ化で全 consumer 再レンダー → 最初に戻る
  - 対応: `handleNoteLoad` の `useCallback` 化 → effect の deps を `[user, authManager, firestoreManager]` に絞る → `AppContext` の value を `useMemo` 化
  - **着手前に DevTools Network タブで `RunQuery` の発行回数を実測すること**
- [ ] **自動保存が実質発火していない**（上記と同じ連鎖）
  - `NotebookContainer.tsx:110` `saveFunction` がインライン関数 → `useAutoSave.ts:106` のタイマーが毎レンダー張り直し
  - 「10秒間1度も再レンダーが起きない」場合しか発火しない
- [ ] **Enter の二重処理を一本化**（文中 Enter で最終行が誤読み上げされる）
  - `codeMirrorKeymap.ts:34-62` と `CodeMirrorEditor.tsx:219-284` が二重発火
  - keymap は `stopPropagation` しないため React 側も必ず走り、空行→フォールバックで文書最終行を拾う
  - `speech.ts:121` の `cancel()` が正しい読み上げを打ち消す
  - 対応: `CodeMirrorEditor.tsx:219-284` を削除し keymap に一本化。あわせて `codeMirrorKeymap.ts:57-59` を `insertNewlineAndIndent` に置換（選択状態で Enter しても選択が置換されない不具合も同時に解消）

### ⚡ P1: パフォーマンス（メモ化の連鎖切れ）

- [ ] **`CodeMirrorEditor.tsx:190` の `extensions` useMemo が一度もヒットしていない**
  - 依存5つのうち4つが毎レンダー変化 → 1キーストロークごとに CodeMirror 全 reconfigure
  - 原因: `useKeySound.ts:32-37`（毎回新オブジェクト）/ `useHighlightState.ts:14-33`（useCallback なし）/ `NotebookContainer.tsx:53` `scrollJapaneseToBottom`（素の関数）
- [ ] `NotebookContainer.tsx:259` 日本語側 `onChange={() => {}}` をモジュール定数の NOOP に（`onChange` も reconfigure の deps に含まれる）
- [ ] **スペルチェックが毎トランザクション全文再走査**（`spellcheck.ts:88-94`）
  - `!decorations.size && dictionary` はスペルミス0件だと常に真 → 正しいノートを開くだけで CPU が回る
  - 差分更新 or 可視範囲限定に変更
- [ ] `spellcheck.ts:100-108` `setUpdateCallback` が単一スロットで日本語側に上書きされる（cleanup もなし）。上記を直すと「辞書ロード前の入力に赤線が出ない」として顕在化する
- [ ] `NotebookContainer.tsx:40` `useState(window.innerWidth <= 768)` を遅延初期化に（毎レンダー強制リフロー）

### 🏗️ P2: 構造（拡張の足枷）

- [ ] **`useNoteSession` への状態集約**（※以下4つは同一原因なので分割せず一括で行う）
  - 「編集中のノート」が3箇所に分裂: `useNotes`(id/notes) / `useNotebookState`(englishText等・ローカル) / `useTranslation`(translationLines)
  - `NotesList` がローカル state に到達できず `window.dispatchEvent(new CustomEvent('noteSelected'))` に逃げている（`NotesList.tsx:34` 発行、`useNoteSync.ts:70`・`App.tsx:20` 購読）
  - 副作用1: `NotesList.tsx:28-31` と `useNoteSync.ts:61-66` で `loadTranslations` が二重実行
  - 副作用2: リスナ維持のため `App.tsx:56-62` の `display:none` ハックが必要（Index タブ表示中もループが止まらない）
  - 副作用3: `resetAutoSaveStatusRef` が App→NotebookContainer→useTranslationSync と3階層貫通
  - 副作用4: 保存完了処理が `useNotebookActions.ts:54-84` と `NotebookContainer.tsx:108-119` に重複（自動保存側は `markAsSaved()` が抜けており偶然動いている）
- [ ] **派生値を state にしている箇所を式に戻す**
  - `hasUnsavedChanges` が判定式の違う3実装で管理（`useUnsavedChanges` / `useUnsavedChangeTracker` / `useAutoSave.ts:45` の ref）。離脱警告と画面の `●` が別の値を見ている
  - `translationText` は `translationLines.join('\n')` の派生（`useTranslationSync.ts:17-19`）→ `useMemo` に
  - フック2つ（計51行）が削除できる
- [ ] `AppContext` の `ReturnType<typeof useX>` 露出をやめ、各フックの `UseXReturn` を export して明示する（内部 setter が全部漏れている）
- [ ] `NotebookContainer` の分割（290行/8責務）。`scrollJapaneseToBottom` は `useImperativeHandle` に、`isMobile` の `768` は CSS 側 `style.css:837` と二重管理

### 🧹 P3: 死にコード削除（低リスク・即実行可）

- [ ] **`src/hooks/useInput.ts` 全77行を削除** + `AppContext.tsx:5,13,24,30` の `input`
  - 消費者ゼロ。中身は `codeMirrorKeymap.ts` と重複した textarea 時代の実装
  - 「Enter の挙動」を grep すると3箇所ヒットする原因
- [ ] `spellcheck.ts:119-121` `getSuggestions` / `types/index.ts:10-15` `User` 型
- [ ] `appConstants.ts:5` `APP_VERSION`（`Header.tsx:11` が `ver1.3.0` を直書き）→ 使うか消すか決める
- [ ] `UI_STRINGS` の未使用5件（`SAVE_NEW`/`SAVE_UPDATE`/`NEW_NOTE`/`SAVED_NEW`/`UPDATED`）
- [ ] `useNotes.ts` の `loadNote`/`resetFlags`/`hasAutoLoadedLatestNote`/`setNotes`、`useAuth.ts:78` `isReady`、`useUnsavedChanges.ts:23` `setHasUnsavedChanges`、`useNotebookState.ts:3-8,37`
- [ ] `useKeySound`/`keySound.ts:143-155` のON/OFF API一式（現状キー音を切る手段が存在しない）→ UI を付けるか消すか決める
- [ ] `firebase-config.ts:14-29` `prodConfig`/`isProduction`（`window.FIREBASE_*` への代入がリポジトリ内に存在せず常に devConfig にフォールバック、`any` 6連発）
- [ ] `NotebookContainer.tsx:159-161` 空の `handleKeyDown` と `:213` の配線
- [ ] **`style.css` の約90行**: `#english-input`(504-523) / `#translation-text`(483-502,917-919,1098-1103,1196-1200) / `#speak-selection-button`(451-465,624-632) / 旧ノート一覧(1214-1234) — いずれも DOM に存在しない
- [ ] `index.html:24` の存在しない `style.css` への `<link>`、`public/sw.js:3` の `/src/*` キャッシュ（本番ビルドに存在せず必ず失敗）

### 🎨 P4: 一貫性

- [ ] **CodeMirror スタイルの二重定義を解消**（`!important` が計59箇所に増殖中）
  - `style.css:14-66` ほかと `CodeMirrorEditor.tsx:50-120` の `EditorView.theme` が同じクラスを奪い合い
  - `.cm-scroller` の高さが3値競合、`.cm-editor` は双方 `!important` で**注入順でしか勝敗が決まらない**
  - `EditorView.theme` に一本化し `style.css` から `.cm-*` を削除
- [ ] デザイントークン導入（`:root` 変数が0件。`#2c3e50` が9箇所、紙グラデーションが4箇所に重複）→ ダークモード対応の前提
- [ ] **UI 文言の言語混在を解消**（小学生向けアプリで英語エラーが出る）
  - 英語: `useNotes.ts:52,79,104,145` / `useAutoSave.ts:76` / `NotesList.tsx:67,78`
  - 日本語: `firebase.ts:78,82,89,92,215` / `useAutoSave.ts:131`
- [ ] 命名統一: `translations` と `translationLines` は同一物（`NotebookContainer.tsx:104` で改名）、`selectedText` は実は日本語側、`lineNumber` 引数に0ベース index が入る
- [ ] `lib` 層から UI 依存を追い出す（`firebase.ts:89` に `confirm()`、`:78-95` に `toast`）。`confirm()` は5箇所に散在
- [ ] エラー処理の規約統一（lib=throw / hooks=catch+toast）。`useTranslation.ts:68` と `spellcheck.ts:24` に `response.ok` チェックを追加（辞書は404 HTMLを食っても例外にならず無言で壊れる）

### 🧪 P5: 前提整備

- [ ] **テスト基盤の導入**（現状 `*.test.*` が0件、ランナー未導入）
  - P2 の構造変更は「偶然動いている箇所」を必ず踏むため、先に `utils/translationAlign.ts`・`utils/textUtils.ts` の純関数テストと保存/読込の回帰テストを用意する
- [ ] `QuickTranslationPractice.tsx`（409行/6責務）の分解。他と独立しているため着手しやすい
  - 1つの effect が145行、StrictMode 対策の `setTimeout` ハック、render 中の ref 読み取り
  - **`:230` の exhaustive-deps 警告は「deps を足すだけ」だと練習が永久停止する**（cleanup で `isProcessingRef` をリセットしていないため）。先に `validPairs` の `useMemo` 化と cleanup 修正を行うこと
- [ ] `CLAUDE.md` の構成図を実態に合わせる（`config/constants.ts` / `utils/lineHighlight.ts` / `utils/speechUtils.ts` / `components/common/Tabs.tsx` は存在しない。`utils/translationAlign.ts` が未記載）

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
