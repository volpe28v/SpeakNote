import { useState } from 'react'

// どちら側の操作でハイライトされたか。
// カーソルのある側を自動スクロールさせない（入力中に画面が跳ねる）ために使う
export type HighlightSource = 'english' | 'japanese' | null

export function useHighlightState() {
  const [selectedText, setSelectedText] = useState('')
  const [selectedEnglishText, setSelectedEnglishText] = useState('')
  // 英文行と訳文行は1:1対応のため、ハイライト位置は両ペインで共通
  const [highlightedLineIndex, setHighlightedLineIndex] = useState<number | null>(null)
  const [highlightSource, setHighlightSource] = useState<HighlightSource>(null)

  const clearAllSelections = () => {
    setSelectedText('')
    setSelectedEnglishText('')
    setHighlightedLineIndex(null)
    setHighlightSource(null)
  }

  const setEnglishHighlight = (text: string, lineNumber: number | null) => {
    setSelectedEnglishText(text)
    setSelectedText('')
    setHighlightedLineIndex(lineNumber)
    setHighlightSource('english')
  }

  const setJapaneseHighlight = (text: string, lineNumber: number | null) => {
    setSelectedText(text)
    setSelectedEnglishText('')
    setHighlightedLineIndex(lineNumber)
    setHighlightSource('japanese')
  }

  return {
    // 状態
    selectedText,
    selectedEnglishText,
    highlightedLineIndex,
    highlightSource,

    // アクション
    clearAllSelections,
    setEnglishHighlight,
    setJapaneseHighlight,
  }
}
