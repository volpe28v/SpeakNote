// 音声合成関連の機能
import type { SpeechConfig } from '@/types'

// 音声合成の設定定数
export const SPEECH_CONFIG: Record<string, SpeechConfig> = {
  ENGLISH: {
    lang: 'en-GB',
    rate: 0.7,
    pitch: 1.0,
    volume: 1.0,
  },
  ENGLISH_QUESTION: {
    lang: 'en-GB',
    rate: 0.7,
    pitch: 1.2,
    volume: 1.0,
  },
  JAPANESE: {
    lang: 'ja-JP',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  },
  PAUSE: {
    lang: 'en-GB',
    rate: 0.5,
    pitch: 1.0,
    volume: 1.0,
  },
}

// Web Speech APIの確認
export function checkSpeechSynthesisSupport(): boolean {
  return 'speechSynthesis' in window
}

// 音声合成用のUtteranceを作成する共通関数
export function createUtterance(text: string, config: SpeechConfig): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = config.lang
  utterance.rate = config.rate
  utterance.pitch = config.pitch
  utterance.volume = config.volume
  return utterance
}

// 複数行のテキストを順番に発音する関数
export function speakMultipleLines(text: string): void {
  const lines = text.split('\n').filter((line) => line.trim())

  // 既存の発音をキャンセル
  window.speechSynthesis.cancel()

  // 各行を順番に発音（間に一拍置く）
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const utterance = createUtterance(line, SPEECH_CONFIG.ENGLISH)
    window.speechSynthesis.speak(utterance)

    // 最後の行でなければ一拍置く
    if (i < lines.length - 1) {
      const pause = createUtterance(' ', SPEECH_CONFIG.PAUSE)
      window.speechSynthesis.speak(pause)
    }
  }
}

// 英語を発音する関数
export function speakEnglish(text: string, isQuestion = false): void {
  // 空文字の場合は処理しない
  if (!text.trim()) return

  // 既存の発音をキャンセル
  window.speechSynthesis.cancel()

  // 単独の大文字「I」の場合、発音を改善するため小文字に変換
  let processedText = text
  if (text === 'I') {
    processedText = 'i'
  }

  // 設定を選択して発音実行
  const config = isQuestion ? SPEECH_CONFIG.ENGLISH_QUESTION : SPEECH_CONFIG.ENGLISH
  const utterance = createUtterance(processedText, config)
  window.speechSynthesis.speak(utterance)
}

// 日本語を発音する関数
export function speakJapanese(text: string): void {
  // 空文字の場合は処理しない
  if (!text.trim()) {
    return
  }

  // 既存の発音をキャンセル
  window.speechSynthesis.cancel()

  // 発音実行
  const utterance = createUtterance(text, SPEECH_CONFIG.JAPANESE)
  window.speechSynthesis.speak(utterance)
}
