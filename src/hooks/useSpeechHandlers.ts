import { useCallback } from 'react'
import { speakEnglish, speakJapanese } from '../lib/speech'

interface UseSpeechHandlersProps {
  englishText: string
  translationText: string
  selectedText: string
  selectedEnglishText: string
  highlightedLineIndex: number | null
  highlightedJapaneseLineIndex: number | null
  translationLines: string[]
}

export function useSpeechHandlers({
  englishText,
  translationText,
  selectedText,
  selectedEnglishText,
  highlightedLineIndex,
  highlightedJapaneseLineIndex,
  translationLines,
}: UseSpeechHandlersProps) {
  // 選択された英語に対応する元の日本語翻訳を取得
  const getOriginalJapaneseText = useCallback((): string | null => {
    if (!selectedEnglishText) return null

    // 選択された英語テキストが何行目にあるかを特定
    const englishLines = englishText.split('\n')
    let englishLineIndex = -1

    for (let i = 0; i < englishLines.length; i++) {
      if (englishLines[i].includes(selectedEnglishText)) {
        englishLineIndex = i
        break
      }
    }

    if (englishLineIndex >= 0 && englishLineIndex < translationLines.length) {
      return translationLines[englishLineIndex]
    }

    return null
  }, [selectedEnglishText, englishText, translationLines])

  const handleSpeakEnglish = useCallback(() => {
    // 1. 英語テキストが選択されている場合
    if (selectedEnglishText) {
      speakEnglish(selectedEnglishText)
      return
    }

    // 2. 日本語が選択されて英語がハイライトされている場合
    if (highlightedLineIndex !== null && highlightedLineIndex >= 0) {
      const lines = englishText.split('\n')
      if (highlightedLineIndex < lines.length) {
        const lineToSpeak = lines[highlightedLineIndex]
        if (lineToSpeak.trim()) {
          speakEnglish(lineToSpeak.trim())
          return
        }
      }
    }

    // 3. どちらも選択されていない場合は全文を読み上げ
    speakEnglish(englishText)
  }, [selectedEnglishText, highlightedLineIndex, englishText])

  const handleSpeakJapanese = useCallback(() => {
    // 1. 日本語テキストが選択されている場合
    if (selectedText) {
      speakJapanese(selectedText)
      return
    }

    // 2. 英語が選択されて日本語がハイライトされている場合
    if (highlightedJapaneseLineIndex !== null && highlightedJapaneseLineIndex >= 0) {
      if (highlightedJapaneseLineIndex < translationLines.length) {
        const lineToSpeak = translationLines[highlightedJapaneseLineIndex]
        if (lineToSpeak && lineToSpeak.trim()) {
          speakJapanese(lineToSpeak.trim())
          return
        }
      }
    }

    // 3. 英語が選択されている場合は、対応する元の日本語翻訳を読み上げ（フォールバック）
    if (selectedEnglishText) {
      const originalJapanese = getOriginalJapaneseText()
      if (originalJapanese && originalJapanese.trim()) {
        speakJapanese(originalJapanese.trim())
        return
      }
    }

    // 4. どちらも選択されていない場合は全文を読み上げ
    speakJapanese(translationText)
  }, [
    selectedText,
    selectedEnglishText,
    highlightedJapaneseLineIndex,
    translationLines,
    translationText,
    getOriginalJapaneseText,
  ])

  return {
    handleSpeakEnglish,
    handleSpeakJapanese,
    getOriginalJapaneseText,
  }
}
