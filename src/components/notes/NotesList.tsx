import React from 'react'
import { useApp } from '@/contexts/AppContext'
import { speakMultipleLines } from '@/lib/speech'
import { deferredToast } from '@/lib/toast'
import type { Note } from '@/types'
import QuickTranslationPractice from '@/components/practice/QuickTranslationPractice'

function NotesList() {
  const { auth, translation, notes, session, quickTranslation } = useApp()
  const { user, authManager, firestoreManager } = auth
  const { loadTranslations } = translation
  const { notes: notesList, currentEditingId, deleteNote, setCurrentEditingId } = notes
  const { isDirty } = session
  const { isPracticing, practiceNote, startPractice, stopPractice } = quickTranslation

  // NotebookContainerで既に同期されるため、こちらでは個別の同期処理は不要

  const handleNoteClick = (note: Note) => {
    // 未保存の変更がある場合は確認
    if (isDirty) {
      if (!confirm('There are unsaved changes. Do you want to discard them and load this note?')) {
        return
      }
    }

    // この機能は NotebookContainer 側で処理
    // ここではクリック時の処理をイベント経由で通知する必要がある
    if (note.translations) {
      loadTranslations(note.text, note.translations)
    }
    setCurrentEditingId(note.id)

    // カスタムイベントを発行してNotebookContainerに通知
    const event = new CustomEvent('noteSelected', { detail: note })
    window.dispatchEvent(event)
  }

  const handleDelete = async (noteId: number, event: React.MouseEvent) => {
    event.stopPropagation()

    if (!authManager || !firestoreManager) {
      deferredToast.error('Please login to delete notes')
      return
    }

    if (confirm('Delete this note?')) {
      await deleteNote(noteId, authManager, firestoreManager)
      deferredToast.success('Note deleted')
      // deleteNote内でnotes状態が自動更新されるため、再同期は不要
    }
  }

  const handleSpeak = (noteText: string, event: React.MouseEvent) => {
    event.stopPropagation()
    speakMultipleLines(noteText)
  }

  const handleStartPractice = (note: Note, event: React.MouseEvent) => {
    event.stopPropagation()
    startPractice(note)
  }

  if (!user) {
    return (
      <div id="saved-sentences-container" className="disabled-overlay">
        <div id="saved-sentences-list">
          <div className="no-notes">Please login to view notes</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div id="saved-sentences-container">
        <div id="saved-sentences-list">
          {notesList.length === 0 ? (
            <div className="no-notes">No notes available</div>
          ) : (
            notesList.map((note) => (
              <div
                key={note.id}
                className={`saved-sentence-item ${currentEditingId === note.id ? 'editing' : ''}`}
                onClick={() => handleNoteClick(note)}
              >
                <div className="sentence-content">
                  <div className="sentence-english">{note.text.replace(/\n/g, ' ')}</div>
                  {note.translations && note.translations.length > 0 && (
                    <div className="sentence-japanese">
                      {note.translations
                        .join(' ')
                        .replace(/\s{2,}/g, ' ')
                        .trim()}
                    </div>
                  )}
                </div>
                <div className="sentence-buttons">
                  <button
                    className="action-button speak-action"
                    onClick={(e) => handleSpeak(note.text, e)}
                    title="再生"
                  >
                    ▶️
                  </button>
                  {note.translations && note.translations.length > 0 && (
                    <button
                      className="action-button practice-action"
                      onClick={(e) => handleStartPractice(note, e)}
                      title="瞬間英作"
                    >
                      🎯
                    </button>
                  )}
                  <button
                    className="action-button delete-action"
                    onClick={(e) => handleDelete(note.id, e)}
                    title="削除"
                  >
                    ❌
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {isPracticing && practiceNote && (
        <QuickTranslationPractice note={practiceNote} onClose={stopPractice} />
      )}
    </>
  )
}

export default NotesList
