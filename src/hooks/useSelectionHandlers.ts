import { useCallback } from 'react'

interface UseSelectionHandlersProps {
  englishText: string
  translationText: string
  setEnglishHighlight: (selectedText: string, lineNumber: number | null) => void
  setJapaneseHighlight: (selectedText: string, lineNumber: number | null) => void
  clearEnglishSelection: () => void
  clearJapaneseSelection: () => void
}

export function useSelectionHandlers({
  englishText,
  translationText,
  setEnglishHighlight,
  setJapaneseHighlight,
  clearEnglishSelection,
  clearJapaneseSelection,
}: UseSelectionHandlersProps) {
  const handleJapaneseSelection = useCallback(
    (selectedText: string, lineNumber: number | null) => {
      if (selectedText && translationText.includes(selectedText)) {
        // 日本語が選択されたとき、対応する英語行をハイライト
        setJapaneseHighlight(selectedText, lineNumber)
      } else {
        // 選択が解除された場合
        clearJapaneseSelection()
      }
    },
    [translationText, setJapaneseHighlight, clearJapaneseSelection]
  )

  const handleEnglishSelection = useCallback(
    (selectedText: string, lineNumber: number | null) => {
      if (selectedText && englishText.includes(selectedText) && lineNumber !== null) {
        // 英語が選択されたとき、対応する日本語行をハイライト
        // 英語の行番号と日本語の行番号は1:1対応
        setEnglishHighlight(selectedText, lineNumber)
      } else {
        // 選択が解除された場合
        clearEnglishSelection()
      }
    },
    [englishText, setEnglishHighlight, clearEnglishSelection]
  )

  return {
    handleJapaneseSelection,
    handleEnglishSelection,
  }
}
