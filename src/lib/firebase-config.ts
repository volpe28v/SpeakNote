// Firebase設定管理
import type { FirebaseConfig } from '@/types'

// 設定は Vite が **ビルド時** に .env の値へ置き換える。実行時には解決されないため、
// デプロイ用のビルドは必ず .env を読める環境で行うこと。
// .env が読めない環境でビルドすると全項目が空文字になり、
// 実行時に auth/invalid-api-key で認証が一切動かないバンドルができあがる。
export const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

// Vite環境変数の型定義
declare global {
  interface ImportMetaEnv {
    readonly VITE_FIREBASE_API_KEY: string
    readonly VITE_FIREBASE_AUTH_DOMAIN: string
    readonly VITE_FIREBASE_PROJECT_ID: string
    readonly VITE_FIREBASE_STORAGE_BUCKET: string
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
    readonly VITE_FIREBASE_APP_ID: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}
