import { useEffect, useRef, useState, useCallback } from 'react'
import { AuthManager, FirestoreManager } from '../lib/firebase'

interface UseAutoSaveOptions {
  text: string
  translations: string[]
  originalContent: string
  authManager: AuthManager | null
  firestoreManager: FirestoreManager | null
  saveFunction: (
    text: string,
    translations: string[],
    authManager: AuthManager,
    firestoreManager: FirestoreManager
  ) => Promise<unknown>
  intervalMs?: number
  minCharsForSave?: number
  enabled?: boolean
}

interface AutoSaveState {
  isAutoSaving: boolean
  lastAutoSavedAt: Date | null
  autoSaveError: string | null
}

export function useAutoSave({
  text,
  translations,
  originalContent,
  authManager,
  firestoreManager,
  saveFunction,
  intervalMs = 30000, // 30秒デフォルト
  minCharsForSave = 10,
  enabled = true,
}: UseAutoSaveOptions): AutoSaveState {
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null)
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedContentRef = useRef<string>('')
  const hasUnsavedChangesRef = useRef(false)

  // 自動保存の実行
  const performAutoSave = useCallback(async () => {
    if (!enabled || !authManager || !firestoreManager || isAutoSaving) {
      return
    }

    const currentText = text.trim()

    // 保存条件のチェック
    if (
      currentText.length < minCharsForSave ||
      currentText === lastSavedContentRef.current ||
      currentText === originalContent.trim()
    ) {
      return
    }

    setIsAutoSaving(true)
    setAutoSaveError(null)

    try {
      const result = await saveFunction(currentText, translations, authManager, firestoreManager)
      if (result) {
        lastSavedContentRef.current = currentText
        setLastAutoSavedAt(new Date())
        hasUnsavedChangesRef.current = false
      }
    } catch (error) {
      console.error('自動保存エラー:', error)
      setAutoSaveError('Auto-save failed')
    } finally {
      setIsAutoSaving(false)
    }
  }, [
    text,
    translations,
    originalContent,
    authManager,
    firestoreManager,
    saveFunction,
    enabled,
    minCharsForSave,
    isAutoSaving,
  ])

  // タイマーのリセット
  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (enabled && authManager && firestoreManager) {
      timeoutRef.current = setTimeout(() => {
        performAutoSave()
      }, intervalMs)
    }
  }, [performAutoSave, intervalMs, enabled, authManager, firestoreManager])

  // テキスト変更の監視
  useEffect(() => {
    const currentText = text.trim()
    const hasChanges =
      currentText !== originalContent.trim() && currentText !== lastSavedContentRef.current

    if (hasChanges && currentText.length >= minCharsForSave) {
      hasUnsavedChangesRef.current = true
      resetTimer()
    } else {
      hasUnsavedChangesRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [text, originalContent, minCharsForSave, resetTimer])

  // フォーカス離脱時の自動保存
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current && enabled) {
        // ブラウザ終了時に最後の保存を試みる
        performAutoSave()
        // ブラウザに警告を表示
        event.preventDefault()
        event.returnValue = '保存されていない変更があります'
        return '保存されていない変更があります'
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden && hasUnsavedChangesRef.current) {
        // タブが非アクティブになった時に保存
        performAutoSave()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [performAutoSave, enabled])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    isAutoSaving,
    lastAutoSavedAt,
    autoSaveError,
  }
}
