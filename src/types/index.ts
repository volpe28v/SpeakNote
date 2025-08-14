// アプリケーション全体で使用する型定義

export interface Note {
  id: number
  text: string
  translations: string[]
  timestamp: string
}

export interface User {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
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
  SAVE_NEW: string
  SAVE_UPDATE: string
  NEW_NOTE: string
  SAVED_NEW: string
  UPDATED: string
}

// DOM要素の型
export interface DOMElements {
  englishInput: HTMLTextAreaElement
  speakButton: HTMLButtonElement
  translateButton: HTMLButtonElement
  translationText: HTMLTextAreaElement
  saveButton: HTMLButtonElement
  speakJapaneseButton: HTMLButtonElement
  clearButton: HTMLButtonElement
  loginButton: HTMLButtonElement
  userInfo: HTMLDivElement
  userAvatar: HTMLImageElement
  userName: HTMLSpanElement
  logoutButton: HTMLButtonElement
  loginRequiredMessage: HTMLDivElement
  loginPromptButton: HTMLButtonElement
  notebookContainer: HTMLDivElement
  savedSentencesContainer: HTMLDivElement
}
