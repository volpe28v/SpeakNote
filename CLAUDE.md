# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

SpeakNoteは小学生や英語初級者向けの英語学習Webアプリケーションです。英語のスペルと発音を同時に学習できるシンプルなツールです。

## 技術スタック

- **フロントエンド**: バニラJavaScript（フレームワークなし）
- **音声機能**: Web Speech API
- **認証**: Firebase Authentication（Google認証）
- **データ保存**: Firebase Firestore + localStorage（フォールバック）
- **ホスティング**: Firebase Hosting

## 開発環境のセットアップ

現在は静的HTMLファイルとして動作するため、特別なセットアップは不要です。

```bash
# ローカルで開発する場合
# index.htmlをブラウザで直接開くか、簡易サーバーを起動
python3 -m http.server 8000
# または
npx http-server
```

## アーキテクチャ

### UIレイアウト

- ノート風のデザイン（左側に英語、右側に日本語訳）
- レスポンシブ対応（モバイルでは縦並び）

### 主要機能

1. **入力と表示**: 英語と日本語訳のペアを管理
2. **音声読み上げ**: Web Speech APIを使用した発音機能
3. **保存機能**: localStorageを使用（最大20件）
4. **スペルチェック**: 簡易的なスペルミス検出

### ファイル構成

```
├── index.html             # メインHTMLファイル
├── style.css             # スタイルシート
├── script.js             # メインのJavaScriptファイル
├── firebase.js           # Firebase SDK設定と操作
├── firebase-config.js    # Firebase設定（環境別）
├── firebase.json         # Firebase Hosting設定
├── .firebaserc          # Firebase プロジェクト設定
├── firestore.rules      # Firestore セキュリティルール
├── firestore.indexes.json # Firestore インデックス設定
├── DEPLOY.md            # デプロイ手順書
└── docs/
    └── description.md   # 詳細な仕様書
```

## 実装時の注意事項

1. **Web Speech API**: ブラウザ互換性を確認（Chrome推奨）
2. **Firebase Authentication**: Google認証のみ実装
3. **Firestore**: ユーザー毎のデータ分離を厳格に実装
4. **レスポンシブデザイン**: モバイルファーストで実装
5. **アクセシビリティ**: 小学生が使いやすいUIを心がける
6. **セキュリティ**: Firestoreルールでユーザーデータを保護

## 参考資料

詳細な仕様については `docs/description.md` を参照してください。
