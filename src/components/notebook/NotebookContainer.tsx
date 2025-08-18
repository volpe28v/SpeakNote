import { useState, useEffect } from 'react'
import { useApp } from '../../contexts/AppContext'
import { speakEnglish, speakJapanese } from '../../lib/speech'
import { toast } from '../../lib/toast'
import { getSelectedLineNumber } from '../../utils/lineHighlight'
import { useAutoSave } from '../../hooks/useAutoSave'
import CodeMirrorEditor from '../common/CodeMirrorEditor'
import AutoSaveStatus from '../common/AutoSaveStatus'

function NotebookContainer() {
  const { auth, translation, notes, unsavedChanges } = useApp()
  const { user, authManager, firestoreManager } = auth
  const {
    translationLines,
    isTranslating,
    handleTranslate,
    setTranslationLines,
    clearTranslationLines,
  } = translation
  const { isSaving, saveNote, setCurrentEditingId, syncFromFirestore } = notes
  // const { handleKeyboardEvent } = input // CodeMirrorで処理するため不要
  const { hasUnsavedChanges, markAsSaved, markAsModified } = unsavedChanges

  const [englishText, setEnglishText] = useState('')
  const [translationText, setTranslationText] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [showSelectionButton, setShowSelectionButton] = useState(false)
  const [highlightedLineIndex, setHighlightedLineIndex] = useState<number | null>(null)

  // 自動保存機能
  const { isAutoSaving, lastAutoSavedAt, autoSaveError } = useAutoSave({
    text: englishText,
    translations: translationLines,
    originalContent,
    authManager,
    firestoreManager,
    saveFunction: async (text, translations, authManager, firestoreManager) => {
      const result = await saveNote(text, translations, authManager, firestoreManager)
      if (result) {
        // 自動保存成功時に元のcontentを更新して未保存状態を解消
        setOriginalContent(text)
      }
      return result
    },
    intervalMs: 10000, // 10秒間隔
    minCharsForSave: 10,
    enabled: !!user,
  })

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
    // 未保存の変更がある場合は確認
    if (hasUnsavedChanges) {
      if (
        !confirm('There are unsaved changes. Do you want to discard them and create a new note?')
      ) {
        return
      }
    }

    setEnglishText('')
    setTranslationText('')
    clearTranslationLines()
    setCurrentEditingId(null)
    setOriginalContent('')
    setHighlightedLineIndex(null)
    markAsSaved()
  }

  const handleTranslateClick = async () => {
    await handleTranslate(englishText)
    // 手動翻訳後も日本語訳エリアを一番下にスクロール
    setTimeout(() => {
      const translationTextarea = document.getElementById('translation-text') as HTMLTextAreaElement
      if (translationTextarea) {
        translationTextarea.scrollTop = translationTextarea.scrollHeight
      }
    }, 100)
  }

  const handleAutoTranslation = async () => {
    const { performAutoTranslation } = translation
    await performAutoTranslation(englishText)
    // 自動翻訳後、日本語訳エリアを一番下にスクロール
    setTimeout(() => {
      const translationTextarea = document.getElementById('translation-text') as HTMLTextAreaElement
      if (translationTextarea) {
        translationTextarea.scrollTop = translationTextarea.scrollHeight
      }
    }, 100)
  }

  const handleKeyDown = async () => {
    // CodeMirrorでは独自のキーマップで処理するため、ここでは何もしない
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    const selectedText = selection?.toString().trim() || ''

    if (selectedText && translationText.includes(selectedText)) {
      setSelectedText(selectedText)
      setShowSelectionButton(true)

      // 日本語選択部分の行数を取得
      const lineNumber = getSelectedLineNumber('translation-text')

      // 対応する英語行をハイライト
      setHighlightedLineIndex(lineNumber)
    } else {
      setSelectedText('')
      setShowSelectionButton(false)
      setHighlightedLineIndex(null)
    }
  }

  const handleSpeakSelection = () => {
    if (selectedText) {
      speakJapanese(selectedText)
    }
  }

  const disabled = !user

  return (
    <div id="notebook-container" className={disabled ? 'disabled-overlay' : ''}>
      <div id="english-side" className="notebook-side">
        <div className="english-header">
          <h2>
            English
            {hasUnsavedChanges && !isAutoSaving && <span className="unsaved-indicator">●</span>}
          </h2>
          {user && (
            <AutoSaveStatus
              isAutoSaving={isAutoSaving}
              lastAutoSavedAt={lastAutoSavedAt}
              autoSaveError={autoSaveError}
              hasUnsavedChanges={hasUnsavedChanges}
            />
          )}
        </div>
        <div id="input-area">
          <CodeMirrorEditor
            value={englishText}
            onChange={setEnglishText}
            onKeyDown={handleKeyDown}
            onAutoTranslation={handleAutoTranslation}
            highlightedLineIndex={highlightedLineIndex}
            placeholder="Type English here (Enter for translation)"
            disabled={disabled}
            className="english-input-editor"
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
            onMouseUp={handleTextSelection}
            onTouchEnd={handleTextSelection}
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
            {showSelectionButton && (
              <button
                id="speak-selection-button"
                onClick={handleSpeakSelection}
                disabled={disabled}
              >
                Selected
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotebookContainer
