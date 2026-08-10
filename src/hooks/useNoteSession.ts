import { useState, useCallback, useMemo } from 'react'
import type { Note } from '@/types'

export interface NoteSession {
  /** 編集中の英文 */
  englishText: string
  /** 最後に保存された内容。未保存判定の基準になる */
  savedText: string
  /** 未保存の変更があるか。state ではなく派生値 */
  isDirty: boolean
  setEnglishText: (text: string) => void
  /** 保存済みノートを読み込んで編集対象にする */
  openNote: (note: Pick<Note, 'text'>) => void
  /** 新規ノートを開始する */
  startNewNote: () => void
  /** 保存が完了した内容を基準として記録する */
  markSaved: (text: string) => void
}

/**
 * 「いま編集しているノート」の状態を1箇所で持つ。
 *
 * 以前は englishText が NotebookContainer のローカル state にあり、
 * NotesList から到達できないために CustomEvent で迂回していた。
 * また未保存判定が useUnsavedChanges の state・useUnsavedChangeTracker の
 * effect・useAutoSave の ref の3箇所で別々の式によって管理され、
 * 離脱警告と画面のインジケータが別の値を見ている状態だった。
 */
export function useNoteSession(): NoteSession {
  const [englishText, setEnglishText] = useState('')
  const [savedText, setSavedText] = useState('')

  // 未保存かどうかは englishText と savedText から一意に決まる。
  // state で持つと真実の源が増え、同期のための effect が必要になる
  const isDirty = useMemo(() => englishText.trim() !== savedText.trim(), [englishText, savedText])

  const openNote = useCallback((note: Pick<Note, 'text'>) => {
    setEnglishText(note.text)
    setSavedText(note.text)
  }, [])

  const startNewNote = useCallback(() => {
    setEnglishText('')
    setSavedText('')
  }, [])

  const markSaved = useCallback((text: string) => {
    setSavedText(text)
  }, [])

  return {
    englishText,
    savedText,
    isDirty,
    setEnglishText,
    openNote,
    startNewNote,
    markSaved,
  }
}
