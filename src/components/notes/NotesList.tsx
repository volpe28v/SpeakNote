import React from 'react'
import { useApp } from '../../contexts/AppContext'
import { speakMultipleLines } from '../../lib/speech'
import { toast } from '../../lib/toast'
import type { Note } from '../../types'

function NotesList() {
  const { auth, translation, notes, unsavedChanges } = useApp()
  const { user, authManager, firestoreManager } = auth
  const { setTranslationLines } = translation
  const { notes: notesList, currentEditingId, deleteNote, setCurrentEditingId } = notes
  const { hasUnsavedChanges } = unsavedChanges

  // NotebookContainerで既に同期されるため、こちらでは個別の同期処理は不要

  const handleNoteClick = (note: Note) => {
    // 未保存の変更がある場合は確認
    if (hasUnsavedChanges) {
      if (!confirm('There are unsaved changes. Do you want to discard them and load this note?')) {
        return
      }
    }

    // この機能は NotebookContainer 側で処理
    // ここではクリック時の処理をイベント経由で通知する必要がある
    if (note.translations) {
      setTranslationLines(note.translations)
    }
    setCurrentEditingId(note.id)

    // カスタムイベントを発行してNotebookContainerに通知
    const event = new CustomEvent('noteSelected', { detail: note })
    window.dispatchEvent(event)
  }

  const handleDelete = async (noteId: number, event: React.MouseEvent) => {
    event.stopPropagation()

    if (!authManager || !firestoreManager) {
      setTimeout(() => toast.error('Please login to delete notes'), 100)
      return
    }

    if (confirm('Delete this note?')) {
      await deleteNote(noteId, authManager, firestoreManager)
      setTimeout(() => toast.success('Note deleted'), 100)
      // deleteNote内でnotes状態が自動更新されるため、再同期は不要
    }
  }

  const handleSpeak = (noteText: string, event: React.MouseEvent) => {
    event.stopPropagation()
    speakMultipleLines(noteText)
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
                >
                  ▶️
                </button>
                <button
                  className="action-button delete-action"
                  onClick={(e) => handleDelete(note.id, e)}
                >
                  ❌
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default NotesList
