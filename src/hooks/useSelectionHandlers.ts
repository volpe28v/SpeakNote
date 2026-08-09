import { useCallback } from 'react'

interface UseSelectionHandlersProps {
  setEnglishHighlight: (selectedText: string, lineNumber: number | null) => void
  setJapaneseHighlight: (selectedText: string, lineNumber: number | null) => void
  clearHighlight: () => void
}

export function useSelectionHandlers({
  setEnglishHighlight,
  setJapaneseHighlight,
  clearHighlight,
}: UseSelectionHandlersProps) {
  const handleJapaneseSelection = useCallback(
    (selectedText: string, lineNumber: number | null) => {
      // 選択していなくてもカーソルのある行と、対応する英語行をハイライトする
      if (lineNumber !== null) {
        setJapaneseHighlight(selectedText, lineNumber)
      } else {
        clearHighlight()
      }
    },
    [setJapaneseHighlight, clearHighlight]
  )

  const handleEnglishSelection = useCallback(
    (selectedText: string, lineNumber: number | null) => {
      // 英語の行番号と日本語の行番号は1:1対応
      if (lineNumber !== null) {
        setEnglishHighlight(selectedText, lineNumber)
      } else {
        clearHighlight()
      }
    },
    [setEnglishHighlight, clearHighlight]
  )

  return {
    handleJapaneseSelection,
    handleEnglishSelection,
  }
}
