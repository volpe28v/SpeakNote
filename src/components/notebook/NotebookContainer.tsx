import { useState, useEffect } from 'react'
import { useApp } from '../../contexts/AppContext'
import { speakEnglish, speakJapanese } from '../../lib/speech'
import { toast } from '../../lib/toast'

function NotebookContainer() {
  const { auth, translation, notes, input } = useApp()
  const { user, authManager, firestoreManager } = auth
  const { translationLines, isTranslating, handleTranslate, setTranslationLines, clearTranslationLines } = translation
  const { isSaving, saveNote, setCurrentEditingId, syncFromFirestore } = notes
  const { handleKeyboardEvent } = input

  const [englishText, setEnglishText] = useState('')
  const [translationText, setTranslationText] = useState('')

  useEffect(() => {
    setTranslationText(translationLines.join('\n'))
  }, [translationLines])

  useEffect(() => {
    if (user && authManager && firestoreManager) {
      syncFromFirestore(authManager, firestoreManager, (note) => {
        setEnglishText(note.text)
        if (note.translations) {
          setTranslationLines(note.translations)
        }
        setCurrentEditingId(note.id)
      })
    }
  }, [user, authManager, firestoreManager, syncFromFirestore, setTranslationLines, setCurrentEditingId])

  useEffect(() => {
    const handleNoteSelected = (event: CustomEvent) => {
      const note = event.detail
      setEnglishText(note.text)
      if (note.translations) {
        setTranslationLines(note.translations)
      } else {
        clearTranslationLines()
      }
      setCurrentEditingId(note.id)
    }

    window.addEventListener('noteSelected', handleNoteSelected as EventListener)
    return () => {
      window.removeEventListener('noteSelected', handleNoteSelected as EventListener)
    }
  }, [setTranslationLines, clearTranslationLines, setCurrentEditingId])

  const handleSave = async () => {
    if (!authManager || !firestoreManager) {
      setTimeout(() => toast.error('Please login to save notes'), 100)
      return
    }

    const result = await saveNote(englishText, translationLines, authManager, firestoreManager)
    if (result) {
      if (result.type === 'saved') {
        setTimeout(() => toast.success('Note saved successfully!'), 100)
        setCurrentEditingId(result.id)
      } else if (result.type === 'updated') {
        setTimeout(() => toast.success('Note updated successfully!'), 100)
      }
      syncFromFirestore(authManager, firestoreManager)
    }
  }

  const handleClear = () => {
    setEnglishText('')
    setTranslationText('')
    clearTranslationLines()
    setCurrentEditingId(null)
  }

  const handleTranslateClick = async () => {
    await handleTranslate(englishText)
  }

  const handleAutoTranslation = async () => {
    const { performAutoTranslation } = translation
    await performAutoTranslation(englishText)
  }

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    await handleKeyboardEvent(event, handleAutoTranslation)
  }

  const disabled = !user

  return (
    <div id="notebook-container" className={disabled ? 'disabled-overlay' : ''}>
      <div id="english-side" className="notebook-side">
        <h2>English</h2>
        <div id="input-area">
          <textarea 
            id="english-input"
            value={englishText}
            onChange={(e) => setEnglishText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type English here (Enter for translation)" 
            autoFocus 
            rows={8}
            disabled={disabled}
          />
          <div className="button-group">
            <button 
              id="speak-button"
              onClick={() => speakEnglish(englishText)}
              disabled={disabled || !englishText.trim()}
            >
              Speak
            </button>
            <button 
              id="save-button"
              onClick={handleSave}
              disabled={disabled || !englishText.trim() || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button 
              id="clear-button"
              onClick={handleClear}
              disabled={disabled}
            >
              New
            </button>
          </div>
        </div>
      </div>
      
      <div id="japanese-side" className="notebook-side">
        <h2>Japanese</h2>
        <div id="translation-area">
          <textarea 
            id="translation-text"
            value={translationText}
            readOnly 
            placeholder="Japanese translation will appear here" 
            rows={8}
          />
          <div className="button-group">
            <button 
              id="translate-button"
              onClick={handleTranslateClick}
              disabled={disabled || !englishText.trim() || isTranslating}
            >
              {isTranslating ? 'Translating...' : 'Translate'}
            </button>
            <button 
              id="speak-japanese-button"
              onClick={() => speakJapanese(translationText)}
              disabled={disabled || !translationText.trim()}
            >
              Speak JP
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotebookContainer