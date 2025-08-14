# Firebase Hosting デプロイ手順（秘匿情報管理版）

## 1. 事前準備

### Firebase CLIのインストール

```bash
npm install -g firebase-tools
```

### Firebaseへのログイン

```bash
firebase login
```

### 環境変数の設定

```bash
# .env.local.example を .env.local にコピー
cp .env.local.example .env.local

# .env.local を編集して実際のFirebase設定を入力
# （既に正しい値が設定済みの場合はそのまま使用可能）
```

## 2. 初回セットアップ（済み）

以下のファイルは既に設定済みです：

- `firebase.json` - Hosting設定
- `.firebaserc` - プロジェクト設定
- `firestore.rules` - セキュリティルール
- `firestore.indexes.json` - インデックス設定

## 3. 安全なデプロイ実行

### 自動デプロイスクリプトの使用（推奨）

```bash
# 環境変数を読み込んでデプロイ
source .env.local && ./deploy.sh

# ホスティングのみデプロイ
source .env.local && ./deploy.sh hosting

# Firestoreルールのみデプロイ
source .env.local && ./deploy.sh firestore

# すべてをデプロイ
source .env.local && ./deploy.sh all
```

### 手動デプロイ（非推奨）

**⚠️ 注意: 手動デプロイする前に必ず `firebase-config.js` を作成してください**

```bash
# 設定ファイルを手動生成（例）
cp firebase-config.template.js firebase-config.js
# firebase-config.js を編集して実際の設定を入力

# デプロイ実行
firebase deploy --only hosting

# デプロイ後は必ず削除
rm firebase-config.js
```

## 6. デプロイ後の確認

### ホスティングURL

- 本番URL: https://speaknote-60c4f.web.app
- または: https://speaknote-60c4f.firebaseapp.com

### 確認項目

1. ✅ Googleログインが動作する
2. ✅ ノートの作成・編集・削除がFirestoreと同期
3. ✅ レスポンシブデザインが正常に表示
4. ✅ ローカルストレージからの移行が正常に動作

## 7. 秘匿情報管理

### ファイル構成

```
├── firebase-config.template.js  # テンプレート（Git管理対象）
├── firebase-config.js          # 実際の設定（.gitignoreで除外）
├── .env.local.example          # 環境変数例（Git管理対象）
├── .env.local                  # 実際の環境変数（.gitignoreで除外）
└── deploy.sh                   # デプロイスクリプト（Git管理対象）
```

### セキュリティ原則

- `firebase-config.js` は **絶対にGitにコミットしない**
- `.env.local` も **絶対にGitにコミットしない**
- デプロイ後は一時ファイルを自動削除
- テンプレートファイルのみバージョン管理

## 8. トラブルシューティング

### よくある問題

**1. 環境変数が設定されていない**

- `.env.local` ファイルが存在するか確認
- `source .env.local` で環境変数を読み込んでいるか確認

**2. Firebase設定エラー**

- `.env.local` の設定値を確認
- Firebase Console で正しいプロジェクト設定を取得

**2. Firestoreアクセスエラー**

- セキュリティルールが正しく設定されているか確認
- ユーザー認証後にアクセスしているか確認

**3. 静的ファイル404エラー**

- `firebase.json`の`public`設定を確認
- デプロイ対象ファイルが正しく含まれているか確認

### ログの確認

```bash
# Firebase関数のログ確認
firebase functions:log

# ホスティングのアクセスログ確認
firebase hosting:channel:open
```

## 8. 環境管理

### 開発環境

- `localhost`でアクセス時は`firebase-config.js`の開発用設定を使用

### 本番環境

- デプロイされたURLでアクセス時は本番用設定を使用
- 環境変数が必要な場合はFirebase Hostingの環境変数機能を使用

## 9. 継続的デプロイ

GitHub Actionsを使用した自動デプロイも設定可能です：

```yaml
name: Deploy to Firebase Hosting
on:
  push:
    branches:
      - main
jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: speaknote-60c4f
```
