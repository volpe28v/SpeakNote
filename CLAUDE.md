# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

SpeakNoteは小学生や英語初級者向けの英語学習Webアプリケーションです。英語のスペルと発音を同時に学習できるツールで、PWA対応によりモバイルでもアプリライクに使用できます。

## 技術スタック

- **フロントエンド**: React 19 + TypeScript
- **ビルドツール**: Vite 5
- **エディタ**: CodeMirror（@uiw/react-codemirror）
- **音声機能**: Web Speech API
- **翻訳**: Google Apps Script API
- **スペルチェック**: typo-js
- **認証**: Firebase Authentication（Google認証）
- **データ保存**: Firebase Firestore
- **ホスティング**: Firebase Hosting
- **PWA**: Service Worker + manifest.json

## 開発コマンド

```bash
# 開発サーバー起動（port 3000）
npm run dev

# ビルド（TypeScriptコンパイル + Viteビルド → dist/）
npm run build

# プレビュー
npm run preview

# Lint
npm run lint

# フォーマット
npm run format

# 型チェック
npm run typecheck
```

## アーキテクチャ

### ディレクトリ構成

```
src/
├── App.tsx                    # ルートコンポーネント（Notebook/Indexタブ切り替え）
├── main.tsx                   # エントリポイント（PWA Service Worker登録含む）
├── style.css                  # グローバルスタイル
├── components/
│   ├── common/                # 共通UIコンポーネント
│   │   ├── AutoSaveStatus.tsx   # 自動保存ステータス表示
│   │   ├── CodeMirrorEditor.tsx # CodeMirrorエディタラッパー
│   │   ├── Header.tsx           # ヘッダー（ログインUI含む）
│   │   ├── LoginModal.tsx       # ログインモーダル
│   │   ├── Tabs.tsx             # タブUI
│   │   └── Toast.tsx            # トースト通知
│   ├── notebook/              # ノートブック機能
│   │   └── NotebookContainer.tsx  # メインのノート編集画面
│   ├── notes/                 # ノート一覧機能
│   │   └── NotesList.tsx        # 保存済みノート一覧（Index）
│   └── practice/              # 練習機能
│       ├── QuickTranslationPractice.tsx  # 英→日クイック練習
│       └── QuickTranslationPractice.css
├── contexts/
│   └── AppContext.tsx          # アプリ全体のContext（auth, translation, notes等）
├── hooks/                     # カスタムフック
│   ├── useAuth.ts               # Firebase認証
│   ├── useAutoSave.ts           # 自動保存
│   ├── useHighlightState.ts     # 行ハイライト状態
│   ├── useInput.ts              # 入力状態管理
│   ├── useKeySound.ts           # キー入力音
│   ├── useNoteSync.ts           # ノート同期
│   ├── useNotebookActions.ts    # ノートブック操作
│   ├── useNotebookState.ts      # ノートブック状態
│   ├── useNotes.ts              # ノートCRUD
│   ├── useQuickTranslation.ts   # クイック翻訳練習
│   ├── useSelectionHandlers.ts  # テキスト選択
│   ├── useSpeechHandlers.ts     # 音声読み上げ
│   ├── useTranslation.ts        # 翻訳処理
│   ├── useTranslationSync.ts    # 翻訳同期
│   ├── useUnsavedChangeTracker.ts # 未保存変更追跡
│   └── useUnsavedChanges.ts     # 未保存状態管理
├── lib/                       # 外部サービス・ライブラリ連携
│   ├── codeMirrorKeymap.ts      # CodeMirrorキーマップ設定
│   ├── firebase-config.ts       # Firebase設定値
│   ├── firebase.ts              # Firebase SDK初期化・Firestore操作
│   ├── keySound.ts              # キー入力音再生
│   ├── speech.ts                # Web Speech API
│   ├── spellcheck.ts            # typo-jsスペルチェック
│   └── toast.ts                 # トースト通知ユーティリティ
├── types/
│   ├── index.ts                 # アプリ全体の型定義（Note, User等）
│   └── typo-js.d.ts             # typo-js型宣言
├── utils/                     # ユーティリティ関数
│   ├── lineHighlight.ts         # 行ハイライト処理
│   ├── speechUtils.ts           # 音声処理ヘルパー
│   └── textUtils.ts             # テキスト処理ヘルパー
├── config/
│   └── constants.ts             # 定数（バージョン、API URL、UI文字列）
└── constants/
    └── practiceConstants.ts     # 練習機能の定数
```

### 設計パターン

- **状態管理**: React Context（AppContext）で全体状態を一元管理
- **ロジック分離**: カスタムフックにビジネスロジックを集約（hooks/）
- **コンポーネント構成**: 機能別ディレクトリ（common, notebook, notes, practice）
- **パスエイリアス**: `@/` → `src/`（tsconfig.json + vite.config.ts）

### 主要機能

1. **ノートブック**: CodeMirrorエディタで英文入力、横に日本語訳を並列表示
2. **音声読み上げ**: Web Speech APIで英語/日本語の発音
3. **翻訳**: Google Apps Script APIを使用した英→日翻訳
4. **スペルチェック**: typo-jsによるリアルタイムスペルチェック
5. **ノート管理**: Firestoreへの保存・読み込み・削除
6. **自動保存**: 編集内容の自動保存
7. **クイック練習**: 保存済みノートを使った日→英翻訳練習
8. **PWA**: オフライン対応、ホーム画面追加

## 実装時の注意事項

1. **React 19**: 最新のReact APIを使用
2. **TypeScript strict**: strictモードが有効
3. **Firebase**: ユーザー毎のデータ分離（Firestoreルールで保護）
4. **Web Speech API**: ブラウザ互換性に注意（Chrome推奨）
5. **コードスタイル**: Prettier（セミコロンなし、シングルクォート、printWidth 100）
6. **ESLint**: @typescript-eslint推奨ルール + unused-vars（\_プレフィックスで許可）
7. **ビルド最適化**: vendor/firebaseチャンク分割、terser minify

## デプロイ

```bash
npm run build
firebase deploy
```

Firebase Hosting は `dist/` ディレクトリを公開。SPA用リライトルール設定済み。

## 参考資料

詳細な仕様については `docs/description.md` を参照してください。
