// アプリケーション全体で使用する型定義

export interface Note {
  id: number
  text: string
  translations: string[]
  timestamp: string
}

export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

export interface SpeechConfig {
  lang: string
  rate: number
  pitch: number
  volume: number
}

export interface SaveResult {
  type: 'saved' | 'updated'
  id: number
}

export type ToastType = 'info' | 'success' | 'error' | 'warning'

// UI文字列の型
export interface UIStrings {
  TRANSLATING: string
  TRANSLATING_PROGRESS: (current: number, total: number) => string
  TRANSLATE: string
  TRANSLATION_ERROR: string
  API_NOT_SET: string
}
