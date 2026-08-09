import { useState } from 'react'

export function useNotebookState() {
  const [englishText, setEnglishText] = useState('')
  const [translationText, setTranslationText] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [currentView, setCurrentView] = useState<'english' | 'japanese'>('english')

  const toggleView = () => {
    setCurrentView((prev) => (prev === 'english' ? 'japanese' : 'english'))
  }

  const resetState = () => {
    setEnglishText('')
    setTranslationText('')
    setOriginalContent('')
  }

  return {
    // 状態
    englishText,
    translationText,
    originalContent,
    currentView,

    // 更新関数
    setEnglishText,
    setTranslationText,
    setOriginalContent,

    // アクション
    toggleView,
    resetState,
  }
}
