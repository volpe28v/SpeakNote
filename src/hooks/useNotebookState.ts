import { useState, useCallback } from 'react'

export function useNotebookState() {
  const [englishText, setEnglishText] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [currentView, setCurrentView] = useState<'english' | 'japanese'>('english')
  // 集中モード。英語ペインを畳んで日本語ペインを全幅で読む（デスクトップのみ）
  const [isFocusMode, setIsFocusMode] = useState(false)

  // useCallback で参照を固定する。これらは NotebookContainer から他フックへ渡され、
  // 毎レンダー変わると下流の useCallback / useMemo の依存を壊す
  const toggleView = useCallback(() => {
    setCurrentView((prev) => (prev === 'english' ? 'japanese' : 'english'))
  }, [])

  const toggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => !prev)
  }, [])

  const exitFocusMode = useCallback(() => {
    setIsFocusMode(false)
  }, [])

  const resetState = useCallback(() => {
    setEnglishText('')
    setOriginalContent('')
  }, [])

  return {
    // 状態
    englishText,
    originalContent,
    currentView,
    isFocusMode,

    // 更新関数
    setEnglishText,
    setOriginalContent,

    // アクション
    toggleView,
    toggleFocusMode,
    exitFocusMode,
    resetState,
  }
}
