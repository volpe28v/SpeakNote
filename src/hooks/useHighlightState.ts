import { useState } from 'react'

export interface HighlightState {
  selectedText: string
  selectedEnglishText: string
  highlightedLineIndex: number | null
  highlightedJapaneseLineIndex: number | null
}

export function useHighlightState() {
  const [selectedText, setSelectedText] = useState('')
  const [selectedEnglishText, setSelectedEnglishText] = useState('')
  const [highlightedLineIndex, setHighlightedLineIndex] = useState<number | null>(null)
  const [highlightedJapaneseLineIndex, setHighlightedJapaneseLineIndex] = useState<number | null>(
    null
  )

  const clearEnglishSelection = () => {
    setSelectedEnglishText('')
    setHighlightedJapaneseLineIndex(null)
  }

  const clearJapaneseSelection = () => {
    setSelectedText('')
    setHighlightedLineIndex(null)
  }

  const clearAllSelections = () => {
    clearEnglishSelection()
    clearJapaneseSelection()
  }

  const setEnglishHighlight = (selectedText: string, lineNumber: number | null) => {
    setSelectedEnglishText(selectedText)
    setHighlightedJapaneseLineIndex(lineNumber)
    // 日本語の選択状態をクリア
    clearJapaneseSelection()
  }

  const setJapaneseHighlight = (selectedText: string, lineNumber: number | null) => {
    setSelectedText(selectedText)
    setHighlightedLineIndex(lineNumber)
    // 英語の選択状態をクリア
    clearEnglishSelection()
  }

  return {
    // 状態
    selectedText,
    selectedEnglishText,
    highlightedLineIndex,
    highlightedJapaneseLineIndex,

    // 更新関数
    setSelectedText,
    setSelectedEnglishText,
    setHighlightedLineIndex,
    setHighlightedJapaneseLineIndex,

    // アクション
    clearEnglishSelection,
    clearJapaneseSelection,
    clearAllSelections,
    setEnglishHighlight,
    setJapaneseHighlight,
  }
}
