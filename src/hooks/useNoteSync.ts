import { useEffect, useRef } from 'react'
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
  // コールバック類は呼び出し側で毎レンダー再生成されるため、effect の依存には含めない。
  // 依存に入れると同期 effect が毎レンダー再実行され、
  // Firestore の読み取り → setNotes → 再レンダー → 再同期 が無限に回る。
  const handlersRef = useRef({
    syncFromFirestore,
    loadTranslations,
    clearTranslationLines,
    setCurrentEditingId,
    markAsSaved,
    onNoteLoad,
  })

  useEffect(() => {
    handlersRef.current = {
      syncFromFirestore,
      loadTranslations,
      clearTranslationLines,
      setCurrentEditingId,
      markAsSaved,
      onNoteLoad,
    }
  })

  // 保存済みノートを読み込んで編集中の状態に反映する
  const applyNote = (note: Note, clearWhenNoTranslations: boolean) => {
    const handlers = handlersRef.current
    handlers.onNoteLoad(note)
    if (note.translations) {
      handlers.loadTranslations(note.text, note.translations)
    } else if (clearWhenNoTranslations) {
      handlers.clearTranslationLines()
    }
    handlers.setCurrentEditingId(note.id)
    handlers.markAsSaved()
  }
  const applyNoteRef = useRef(applyNote)
  applyNoteRef.current = applyNote

  // 依存にはオブジェクトではなく真偽値を使う。user の参照が毎レンダー変わる実装に
  // なった瞬間に同期が無限ループするため、識別子の同一性に依存させない
  const isLoggedIn = Boolean(user)

  // ログイン状態が確定したときに一度だけクラウドと同期する
  useEffect(() => {
    if (!isLoggedIn || !authManager || !firestoreManager) {
      return
    }

    handlersRef.current.syncFromFirestore(authManager, firestoreManager, (note) => {
      applyNoteRef.current(note, false)
    })
  }, [isLoggedIn, authManager, firestoreManager])

  // ノート選択イベントの処理
  useEffect(() => {
    const handleNoteSelected = (event: Event) => {
      applyNoteRef.current((event as CustomEvent<Note>).detail, true)
    }

    window.addEventListener('noteSelected', handleNoteSelected)
    return () => {
      window.removeEventListener('noteSelected', handleNoteSelected)
    }
  }, [])
}
