// 瞬間英作文練習の定数定義

export const PRACTICE_TIMEOUTS = {
  PHASE_TRANSITION: 500, // フェーズ遷移時の遅延
  QUICK_TRANSITION: 100, // 素早い遷移
  ENGLISH_REPEAT_INTERVAL: 2000, // 英語繰り返し間隔
  PAUSE_DURATION: 1000, // ポーズ時間
  REACT_STRICT_DELAY: 50, // React StrictMode対策
} as const

export const SPEECH_CONFIG = {
  JAPANESE: {
    lang: 'ja-JP',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  },
  ENGLISH: {
    lang: 'en-GB',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  },
} as const

export const THINKING_TIME_OPTIONS = [
  { value: 3, label: '3秒' },
  { value: 5, label: '5秒' },
  { value: 7, label: '7秒' },
  { value: 10, label: '10秒' },
  { value: -1, label: '無限' },
] as const

export const REPEAT_COUNT_OPTIONS = [
  { value: 1, label: '1回' },
  { value: 2, label: '2回' },
  { value: 3, label: '3回' },
] as const

export const INFINITE_THINKING_TIME = -1