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

// 音声リストが読み込まれているか確認し、必要に応じて読み込む
let voicesLoaded = false

// Web Speech APIの確認と初期化
export function checkSpeechSynthesisSupport(): boolean {
  if ('speechSynthesis' in window) {
    // 音声リストの初期読み込みをトリガー
    if (!voicesLoaded) {
      window.speechSynthesis.getVoices()

      // 音声リストの読み込み完了を待つ
      window.speechSynthesis.onvoiceschanged = () => {
        voicesLoaded = true
      }
    }
    return true
  }
  return false
}

// 利用可能な音声を取得し、適切な音声を選択する関数
function selectVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()

  // 優先順位で音声を選択
  // 1. 完全一致する言語コードの音声
  let voice = voices.find((v) => v.lang === lang)

  // 2. 言語コードの前半が一致する音声（例: en-GB が見つからない場合は en-US など）
  if (!voice) {
    const langPrefix = lang.split('-')[0]
    voice = voices.find((v) => v.lang.startsWith(langPrefix))
  }

  // 3. デフォルトの音声
  if (!voice && lang.startsWith('en')) {
    voice = voices.find((v) => v.lang.includes('en'))
  }

  return voice || null
}

// 音声合成用のUtteranceを作成する共通関数
export function createUtterance(text: string, config: SpeechConfig): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = config.lang
  utterance.rate = config.rate
  utterance.pitch = config.pitch
  utterance.volume = config.volume

  // 適切な音声を選択して設定
  const voice = selectVoice(config.lang)
  if (voice) {
    utterance.voice = voice
  }

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
