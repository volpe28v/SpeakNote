// Firebase設定管理
import type { FirebaseConfig } from '@/types'

// Vite環境変数から設定を読み込み（開発環境）
const devConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

// 本番環境用設定（windowオブジェクトから読み込み）
const prodConfig: FirebaseConfig = {
  apiKey: (window as any).FIREBASE_API_KEY || devConfig.apiKey,
  authDomain: (window as any).FIREBASE_AUTH_DOMAIN || devConfig.authDomain,
  projectId: (window as any).FIREBASE_PROJECT_ID || devConfig.projectId,
  storageBucket: (window as any).FIREBASE_STORAGE_BUCKET || devConfig.storageBucket,
  messagingSenderId: (window as any).FIREBASE_MESSAGING_SENDER_ID || devConfig.messagingSenderId,
  appId: (window as any).FIREBASE_APP_ID || devConfig.appId,
}

// 環境判定（localhost以外は本番とみなす）
const isProduction =
  !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')

// 使用する設定を決定
export const firebaseConfig: FirebaseConfig = isProduction ? prodConfig : devConfig

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
