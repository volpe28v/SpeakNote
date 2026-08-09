import { useState, useCallback } from 'react'

// どちら側の操作でハイライトされたか。
// カーソルのある側を自動スクロールさせない（入力中に画面が跳ねる）ために使う
export type HighlightSource = 'english' | 'japanese' | null

export function useHighlightState() {
  const [selectedText, setSelectedText] = useState('')
  const [selectedEnglishText, setSelectedEnglishText] = useState('')
  // 英文行と訳文行は1:1対応のため、ハイライト位置は両ペインで共通
  const [highlightedLineIndex, setHighlightedLineIndex] = useState<number | null>(null)
  const [highlightSource, setHighlightSource] = useState<HighlightSource>(null)

  // これらは CodeMirror の extensions の依存に連なるため useCallback で参照を固定する。
  // 毎レンダー再生成すると 1キーストロークごとに拡張ツリー全体が再構成される
  const clearAllSelections = useCallback(() => {
    setSelectedText('')
    setSelectedEnglishText('')
    setHighlightedLineIndex(null)
    setHighlightSource(null)
  }, [])

  const setEnglishHighlight = useCallback((text: string, lineNumber: number | null) => {
    setSelectedEnglishText(text)
    setSelectedText('')
    setHighlightedLineIndex(lineNumber)
    setHighlightSource('english')
  }, [])

  const setJapaneseHighlight = useCallback((text: string, lineNumber: number | null) => {
    setSelectedText(text)
    setSelectedEnglishText('')
    setHighlightedLineIndex(lineNumber)
    setHighlightSource('japanese')
  }, [])

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
