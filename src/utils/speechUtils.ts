// 音声処理ユーティリティ関数

import { SPEECH_CONFIG } from '../constants/practiceConstants'
import { removeEmojis } from './textUtils'

export type SpeechLanguage = 'japanese' | 'english'

/**
 * 音声合成用のUtteranceを作成する関数
 * @param text 読み上げるテキスト
 * @param language 言語設定
 * @returns SpeechSynthesisUtterance
 */
export const createSpeechUtterance = (
  text: string,
  language: SpeechLanguage
): SpeechSynthesisUtterance => {
  const cleanText = removeEmojis(text)
  const utterance = new SpeechSynthesisUtterance(cleanText)

  const config = language === 'japanese' ? SPEECH_CONFIG.JAPANESE : SPEECH_CONFIG.ENGLISH

  utterance.lang = config.lang
  utterance.rate = config.rate
  utterance.pitch = config.pitch
  utterance.volume = config.volume

  return utterance
}

/**
 * 音声を再生する関数
 * @param text 読み上げるテキスト
 * @param language 言語設定
 * @param onEnd 再生完了時のコールバック
 * @param onError エラー時のコールバック
 */
export const speakText = (
  text: string,
  language: SpeechLanguage,
  onEnd?: () => void,
  onError?: () => void
): void => {
  // 前の音声をキャンセル
  window.speechSynthesis.cancel()

  const utterance = createSpeechUtterance(text, language)

  if (onEnd) {
    utterance.onend = onEnd
  }

  if (onError) {
    utterance.onerror = onError
  }

  window.speechSynthesis.speak(utterance)
}

/**
 * 音声を停止する関数
 */
export const stopSpeech = (): void => {
  window.speechSynthesis.cancel()
}