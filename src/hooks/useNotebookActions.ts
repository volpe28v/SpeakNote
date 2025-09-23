import { useCallback } from 'react'
import { toast } from '../lib/toast'
import type { AuthManager, FirestoreManager } from '../lib/firebase'
import type { Note } from '../types'

type SaveResult = {
  type: 'saved' | 'updated'
  id?: number
}

interface UseNotebookActionsProps {
  englishText: string
  translationLines: string[]
  setOriginalContent: (content: string) => void
  clearAllSelections: () => void
  resetState: () => void
  scrollJapaneseToBottom: () => void
  authManager: AuthManager | null
  firestoreManager: FirestoreManager | null
  handleTranslate: (text: string) => Promise<void>
  performAutoTranslation: (text: string) => Promise<void>
  isSaving: boolean
  saveNote: (
    text: string,
    translations: string[],
    authManager: AuthManager,
    firestoreManager: FirestoreManager
  ) => Promise<SaveResult | false>
  setCurrentEditingId: (id: number | null) => void
  syncFromFirestore: (
    authManager: AuthManager,
    firestoreManager: FirestoreManager,
    callback?: (note: Note) => void
  ) => Promise<void>
  hasUnsavedChanges: boolean
  markAsSaved: () => void
  clearTranslationLines: () => void
}

export function useNotebookActions({
  englishText,
  translationLines,
  setOriginalContent,
  clearAllSelections,
  resetState,
  scrollJapaneseToBottom,
  authManager,
  firestoreManager,
  handleTranslate,
  performAutoTranslation,
  isSaving,
  saveNote,
  setCurrentEditingId,
  syncFromFirestore,
  hasUnsavedChanges,
  markAsSaved,
  clearTranslationLines,
}: UseNotebookActionsProps) {
  const handleSave = useCallback(async () => {
    if (!authManager || !firestoreManager) {
      setTimeout(() => toast.error('Please login to save notes'), 100)
      return
    }

    const result = await saveNote(englishText, translationLines, authManager, firestoreManager)
    if (result) {
      if (result.type === 'saved' && result.id) {
        setTimeout(() => toast.success('Note saved successfully!'), 100)
        setCurrentEditingId(result.id)
      } else if (result.type === 'updated') {
        setTimeout(() => toast.success('Note updated successfully!'), 100)
      }
      // 保存後は元のコンテンツを更新して未保存状態をリセット
      setOriginalContent(englishText.trim())
      markAsSaved()
      // 保存後はリスト更新のために再同期（自動読み込みは無し）
      syncFromFirestore(authManager, firestoreManager)
    }
  }, [
    authManager,
    firestoreManager,
    englishText,
    translationLines,
    saveNote,
    setCurrentEditingId,
    setOriginalContent,
    markAsSaved,
    syncFromFirestore,
  ])

  const handleClear = useCallback(() => {
    // 未保存の変更がある場合は確認
    if (hasUnsavedChanges) {
      if (
        !confirm('There are unsaved changes. Do you want to discard them and create a new note?')
      ) {
        return
      }
    }

    resetState()
    clearTranslationLines() // 日本語翻訳もクリア
    setCurrentEditingId(null)
    setOriginalContent('')
    clearAllSelections()
    markAsSaved()
  }, [
    hasUnsavedChanges,
    resetState,
    clearTranslationLines,
    setCurrentEditingId,
    setOriginalContent,
    clearAllSelections,
    markAsSaved,
  ])

  const handleTranslateClick = useCallback(async () => {
    await handleTranslate(englishText)
    // 手動翻訳後も日本語訳エリアを一番下にスクロール
    scrollJapaneseToBottom()
  }, [handleTranslate, englishText, scrollJapaneseToBottom])

  const handleAutoTranslation = useCallback(async () => {
    await performAutoTranslation(englishText)
    // 自動翻訳後、日本語訳エリアを一番下にスクロール
    scrollJapaneseToBottom()
  }, [performAutoTranslation, englishText, scrollJapaneseToBottom])

  return {
    handleSave,
    handleClear,
    handleTranslateClick,
    handleAutoTranslation,
    isSaving,
  }
}
