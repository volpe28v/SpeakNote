import { useEffect } from 'react'
import type { AuthManager, FirestoreManager } from '@/lib/firebase'
import type { Note } from '@/types'

interface UseNoteSyncProps {
  user: { photoURL?: string | null; displayName?: string | null } | null
  authManager: AuthManager | null
  firestoreManager: FirestoreManager | null
  syncFromFirestore: (
    authManager: AuthManager,
    firestoreManager: FirestoreManager,
    callback?: (note: Note) => void
  ) => Promise<void>
  loadTranslations: (englishText: string, translations: string[]) => void
  clearTranslationLines: () => void
  setCurrentEditingId: (id: number | null) => void
  markAsSaved: () => void
  onNoteLoad: (note: Note) => void
}

export function useNoteSync({
  user,
  authManager,
  firestoreManager,
  syncFromFirestore,
  loadTranslations,
  clearTranslationLines,
  setCurrentEditingId,
  markAsSaved,
  onNoteLoad,
}: UseNoteSyncProps) {
  // Firebase からのノート同期
  useEffect(() => {
    if (user && authManager && firestoreManager) {
      syncFromFirestore(authManager, firestoreManager, (note) => {
        onNoteLoad(note)
        if (note.translations) {
          loadTranslations(note.text, note.translations)
        }
        setCurrentEditingId(note.id)
        markAsSaved()
      })
    }
  }, [
    user,
    authManager,
    firestoreManager,
    syncFromFirestore,
    loadTranslations,
    setCurrentEditingId,
    markAsSaved,
    onNoteLoad,
  ])

  // ノート選択イベントの処理
  useEffect(() => {
    const handleNoteSelected = (event: CustomEvent) => {
      const note = event.detail

      onNoteLoad(note)
      if (note.translations) {
        loadTranslations(note.text, note.translations)
      } else {
        clearTranslationLines()
      }
      setCurrentEditingId(note.id)
      markAsSaved()
    }

    window.addEventListener('noteSelected', handleNoteSelected as EventListener)
    return () => {
      window.removeEventListener('noteSelected', handleNoteSelected as EventListener)
    }
  }, [loadTranslations, clearTranslationLines, setCurrentEditingId, markAsSaved, onNoteLoad])
}
