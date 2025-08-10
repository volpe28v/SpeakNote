#!/bin/bash

# Firebase Hosting デプロイスクリプト
# 秘匿情報を環境変数から読み込んで安全にデプロイします

set -e  # エラー時に終了

echo "🚀 SpeakNote Firebase デプロイを開始します..."

# 環境変数の確認（デバッグ情報付き）
echo "🔍 環境変数をチェック中..."
echo "  FIREBASE_API_KEY: ${FIREBASE_API_KEY:0:10}..." # 最初の10文字のみ表示
echo "  FIREBASE_PROJECT_ID: $FIREBASE_PROJECT_ID"

if [ -z "$FIREBASE_API_KEY" ] || [ -z "$FIREBASE_AUTH_DOMAIN" ] || [ -z "$FIREBASE_PROJECT_ID" ] || [ -z "$FIREBASE_STORAGE_BUCKET" ] || [ -z "$FIREBASE_MESSAGING_SENDER_ID" ] || [ -z "$FIREBASE_APP_ID" ]; then
    echo "❌ 必要な環境変数が設定されていません。"
    echo ""
    echo "現在の環境変数の状態:"
    echo "  FIREBASE_API_KEY: ${FIREBASE_API_KEY:-'未設定'}"
    echo "  FIREBASE_AUTH_DOMAIN: ${FIREBASE_AUTH_DOMAIN:-'未設定'}"  
    echo "  FIREBASE_PROJECT_ID: ${FIREBASE_PROJECT_ID:-'未設定'}"
    echo "  FIREBASE_STORAGE_BUCKET: ${FIREBASE_STORAGE_BUCKET:-'未設定'}"
    echo "  FIREBASE_MESSAGING_SENDER_ID: ${FIREBASE_MESSAGING_SENDER_ID:-'未設定'}"
    echo "  FIREBASE_APP_ID: ${FIREBASE_APP_ID:-'未設定'}"
    echo ""
    echo "解決方法:"
    echo "1. .env.local ファイルが存在することを確認"
    echo "2. 以下のコマンドでデプロイを実行:"
    echo "   export \$(cat .env.local | xargs) && ./deploy.sh"
    echo "   または"
    echo "   source .env.local && ./deploy.sh"
    exit 1
fi

echo "✅ 環境変数の確認完了"

# 一時的な設定ファイルを生成
echo "📝 Firebase設定ファイルを生成中..."
sed -e "s/__FIREBASE_API_KEY__/$FIREBASE_API_KEY/g" \
    -e "s/__FIREBASE_AUTH_DOMAIN__/$FIREBASE_AUTH_DOMAIN/g" \
    -e "s/__FIREBASE_PROJECT_ID__/$FIREBASE_PROJECT_ID/g" \
    -e "s/__FIREBASE_STORAGE_BUCKET__/$FIREBASE_STORAGE_BUCKET/g" \
    -e "s/__FIREBASE_MESSAGING_SENDER_ID__/$FIREBASE_MESSAGING_SENDER_ID/g" \
    -e "s/__FIREBASE_APP_ID__/$FIREBASE_APP_ID/g" \
    firebase-config.template.js > firebase-config.js

echo "✅ 設定ファイル生成完了"

# Firebase CLIの確認
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLIがインストールされていません。"
    echo "npm install -g firebase-tools でインストールしてください。"
    rm -f firebase-config.js
    exit 1
fi

# ログイン状態の確認
echo "🔐 Firebase認証状態を確認中..."
if ! firebase projects:list &> /dev/null; then
    echo "❌ Firebaseにログインしていません。"
    echo "firebase login でログインしてください。"
    rm -f firebase-config.js
    exit 1
fi

echo "✅ Firebase認証確認完了"

# デプロイオプションの選択
if [ "$1" = "hosting" ]; then
    echo "🌐 Hostingのみをデプロイします..."
    firebase deploy --only hosting
elif [ "$1" = "firestore" ]; then
    echo "📚 Firestoreルールのみをデプロイします..."
    firebase deploy --only firestore
elif [ "$1" = "all" ] || [ -z "$1" ]; then
    echo "🚀 すべてをデプロイします..."
    firebase deploy
else
    echo "❌ 無効なオプションです。hosting, firestore, all のいずれかを指定してください。"
    rm -f firebase-config.js
    exit 1
fi

# 一時ファイルの削除
echo "🧹 一時ファイルを削除中..."
rm -f firebase-config.js

echo "✅ デプロイ完了！"
echo "🌍 デプロイされたアプリ: https://$FIREBASE_PROJECT_ID.web.app"