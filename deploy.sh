#!/bin/bash

# Firebase Hosting デプロイスクリプト（TypeScript + Vite版）
# 環境変数を使用してビルド・デプロイします

set -e  # エラー時に終了

echo "🚀 SpeakNote Firebase デプロイを開始します..."

# Vite環境変数の確認
echo "🔍 環境変数をチェック中..."
echo "  VITE_FIREBASE_API_KEY: ${VITE_FIREBASE_API_KEY:0:10}..." # 最初の10文字のみ表示
echo "  VITE_FIREBASE_PROJECT_ID: $VITE_FIREBASE_PROJECT_ID"

if [ -z "$VITE_FIREBASE_API_KEY" ] || [ -z "$VITE_FIREBASE_AUTH_DOMAIN" ] || [ -z "$VITE_FIREBASE_PROJECT_ID" ] || [ -z "$VITE_FIREBASE_STORAGE_BUCKET" ] || [ -z "$VITE_FIREBASE_MESSAGING_SENDER_ID" ] || [ -z "$VITE_FIREBASE_APP_ID" ]; then
    echo "❌ 必要な環境変数が設定されていません。"
    echo ""
    echo "現在の環境変数の状態:"
    echo "  VITE_FIREBASE_API_KEY: ${VITE_FIREBASE_API_KEY:-'未設定'}"
    echo "  VITE_FIREBASE_AUTH_DOMAIN: ${VITE_FIREBASE_AUTH_DOMAIN:-'未設定'}"  
    echo "  VITE_FIREBASE_PROJECT_ID: ${VITE_FIREBASE_PROJECT_ID:-'未設定'}"
    echo "  VITE_FIREBASE_STORAGE_BUCKET: ${VITE_FIREBASE_STORAGE_BUCKET:-'未設定'}"
    echo "  VITE_FIREBASE_MESSAGING_SENDER_ID: ${VITE_FIREBASE_MESSAGING_SENDER_ID:-'未設定'}"
    echo "  VITE_FIREBASE_APP_ID: ${VITE_FIREBASE_APP_ID:-'未設定'}"
    echo ""
    echo "解決方法:"
    echo "1. .env ファイルが存在することを確認"
    echo "2. 以下のコマンドでデプロイを実行:"
    echo "   npm run build && ./deploy.sh"
    exit 1
fi

echo "✅ 環境変数の確認完了"

# Node.jsとnpmの確認
if ! command -v npm &> /dev/null; then
    echo "❌ npmがインストールされていません。"
    echo "Node.js をインストールしてください。"
    exit 1
fi

# 依存関係のインストール
if [ ! -d "node_modules" ]; then
    echo "📦 依存関係をインストール中..."
    npm install
fi

# TypeScriptのコンパイルとビルド
echo "🏗️  アプリケーションをビルド中..."
npm run build

echo "✅ ビルド完了"

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

echo "✅ デプロイ完了！"
echo "🌍 デプロイされたアプリ: https://$VITE_FIREBASE_PROJECT_ID.web.app"