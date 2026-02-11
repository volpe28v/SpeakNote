import { useState, useCallback } from 'react'
import { deferredToast } from '@/lib/toast'
import { AuthManager, FirestoreManager } from '@/lib/firebase'
import type { Note, SaveResult } from '@/types'

interface UseNotesReturn {
  notes: Note[]
  currentEditingId: number | null
  hasAutoLoadedLatestNote: boolean
  isSaving: boolean
  saveNote: (
    text: string,
    translations: string[],
    authManager: AuthManager,
    firestoreManager: FirestoreManager
  ) => Promise<SaveResult | false>
  deleteNote: (
    id: number,
    authManager: AuthManager,
    firestoreManager: FirestoreManager
  ) => Promise<void>
  loadNote: (note: Note, onEditingStart: (id: number) => void) => Note
  setCurrentEditingId: (id: number | null) => void
  setNotes: (notes: Note[]) => void
  resetFlags: () => void
  syncFromFirestore: (
    authManager: AuthManager,
    firestoreManager: FirestoreManager,
    onLatestNoteAutoLoad?: (note: Note) => void
  ) => Promise<void>
}

export function useNotes(): UseNotesReturn {
  const [notes, setNotes] = useState<Note[]>([])
  const [currentEditingId, setCurrentEditingId] = useState<number | null>(null)
  const [hasAutoLoadedLatestNote, setHasAutoLoadedLatestNote] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const saveNote = useCallback(
    async (
      text: string,
      translations: string[],
      authManager: AuthManager,
      firestoreManager: FirestoreManager
    ): Promise<SaveResult | false> => {
      if (!text.trim()) return false

      const trimmedText = text.trim()
      const cleanTranslations = translations || []

      if (!firestoreManager || !authManager.getCurrentUser()) {
        deferredToast.error('Please login to save notes')
        return false
      }

      if (isSaving) {
        return false
      }

      setIsSaving(true)

      try {
        const noteData: Note = {
          id: currentEditingId || Date.now(),
          text: trimmedText,
          translations: cleanTranslations,
          timestamp: new Date().toISOString(),
        }

        if (currentEditingId) {
          await firestoreManager.updateNote(noteData)
          return { type: 'updated', id: currentEditingId }
        } else {
          await firestoreManager.saveNote(noteData)
          return { type: 'saved', id: noteData.id }
        }
      } catch (error) {
        console.error('Firestore save error:', error)
        deferredToast.error('Save failed. Please try again.')
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [currentEditingId, isSaving]
  )

  const deleteNote = useCallback(
    async (
      id: number,
      authManager: AuthManager,
      firestoreManager: FirestoreManager
    ): Promise<void> => {
      if (!firestoreManager || !authManager.getCurrentUser()) {
        deferredToast.error('Please login to delete notes')
        return
      }

      try {
        await firestoreManager.deleteNote(id)
        setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id))
      } catch (error) {
        console.error('Firestore delete error:', error)
        deferredToast.error('Delete failed. Please try again.')
      }
    },
    []
  )

  const loadNote = useCallback((note: Note, onEditingStart: (id: number) => void): Note => {
    onEditingStart(note.id)
    setCurrentEditingId(note.id)
    return note
  }, [])

  const resetFlags = useCallback(() => {
    setCurrentEditingId(null)
    setHasAutoLoadedLatestNote(false)
  }, [])

  const syncFromFirestore = useCallback(
    async (
      authManager: AuthManager,
      firestoreManager: FirestoreManager,
      onLatestNoteAutoLoad?: (note: Note) => void
    ): Promise<void> => {
      if (!firestoreManager || !authManager.getCurrentUser()) {
        return
      }

      try {
        const cloudNotes = await firestoreManager.getUserNotes()
        setNotes(cloudNotes)

        if (cloudNotes.length > 0 && !currentEditingId && !hasAutoLoadedLatestNote) {
          const latestNote = cloudNotes[0]
          if (onLatestNoteAutoLoad) {
            onLatestNoteAutoLoad(latestNote)
          }
          setHasAutoLoadedLatestNote(true)
          deferredToast.info('Latest note loaded automatically')
        }
      } catch (error) {
        console.error('Firestore sync error:', error)
        deferredToast.error('Failed to sync from cloud')
      }
    },
    [currentEditingId, hasAutoLoadedLatestNote]
  )

  return {
    notes,
    currentEditingId,
    hasAutoLoadedLatestNote,
    isSaving,
    saveNote,
    deleteNote,
    loadNote,
    setCurrentEditingId,
    setNotes,
    resetFlags,
    syncFromFirestore,
  }
}
