import { useState, useEffect } from 'react'
import { useApp } from '../../contexts/AppContext'
import { speakEnglish, speakJapanese } from '../../lib/speech'
import { toast } from '../../lib/toast'

function NotebookContainer() {
  const { auth, translation, notes, input, unsavedChanges } = useApp()
  const { user, authManager, firestoreManager } = auth
  const {
    translationLines,
    isTranslating,
    handleTranslate,
    setTranslationLines,
    clearTranslationLines,
  } = translation
  const { isSaving, saveNote, setCurrentEditingId, syncFromFirestore } = notes
  const { handleKeyboardEvent } = input
  const { hasUnsavedChanges, markAsSaved, markAsModified } = unsavedChanges

  const [englishText, setEnglishText] = useState('')
  const [translationText, setTranslationText] = useState('')
  const [originalContent, setOriginalContent] = useState('')

  useEffect(() => {
    setTranslationText(translationLines.join('\n'))
  }, [translationLines])

  // 英語テキストの変更を監視して未保存状態を更新
  useEffect(() => {
    const hasChanges = englishText.trim() !== originalContent.trim()
    if (hasChanges && englishText.trim()) {
      markAsModified()
    } else if (!hasChanges) {
      markAsSaved()
    }
  }, [englishText, originalContent, markAsModified, markAsSaved])

  useEffect(() => {
    if (user && authManager && firestoreManager) {
      syncFromFirestore(authManager, firestoreManager, (note) => {
        setEnglishText(note.text)
        setOriginalContent(note.text)
        if (note.translations) {
          setTranslationLines(note.translations)
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
    setTranslationLines,
    setCurrentEditingId,
    markAsSaved,
  ])

  useEffect(() => {
    const handleNoteSelected = (event: CustomEvent) => {
      const note = event.detail
      setEnglishText(note.text)
      setOriginalContent(note.text)
      if (note.translations) {
        setTranslationLines(note.translations)
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
  }, [setTranslationLines, clearTranslationLines, setCurrentEditingId, markAsSaved])

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
      // 保存後は元のコンテンツを更新して未保存状態をリセット
      setOriginalContent(englishText.trim())
      markAsSaved()
      // 保存後はリスト更新のために再同期（自動読み込みは無し）
      syncFromFirestore(authManager, firestoreManager)
    }
  }

  const handleClear = () => {
    setEnglishText('')
    setTranslationText('')
    clearTranslationLines()
    setCurrentEditingId(null)
    setOriginalContent('')
    markAsSaved()
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
        <h2>English {hasUnsavedChanges && <span className="unsaved-indicator">●</span>}</h2>
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
            <button id="clear-button" onClick={handleClear} disabled={disabled}>
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
