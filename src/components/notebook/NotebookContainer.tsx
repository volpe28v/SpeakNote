import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../contexts/AppContext'
import { useAutoSave } from '../../hooks/useAutoSave'
import { useNotebookState } from '../../hooks/useNotebookState'
import { useHighlightState } from '../../hooks/useHighlightState'
import { useNotebookActions } from '../../hooks/useNotebookActions'
import { useSelectionHandlers } from '../../hooks/useSelectionHandlers'
import { useSpeechHandlers } from '../../hooks/useSpeechHandlers'
import CodeMirrorEditor from '../common/CodeMirrorEditor'
import AutoSaveStatus from '../common/AutoSaveStatus'

interface NotebookContainerProps {
  resetAutoSaveStatusRef: React.MutableRefObject<(() => void) | null>
}

function NotebookContainer({ resetAutoSaveStatusRef }: NotebookContainerProps) {
  const { auth, translation, notes, unsavedChanges } = useApp()
  const { user, authManager, firestoreManager } = auth
  const {
    translationLines,
    isTranslating,
    handleTranslate,
    setTranslationLines,
    clearTranslationLines,
    performAutoTranslation,
  } = translation
  const { isSaving, saveNote, setCurrentEditingId, syncFromFirestore } = notes
  const { hasUnsavedChanges, markAsSaved, markAsModified } = unsavedChanges

  // カスタムフックの使用
  const notebookState = useNotebookState()
  const highlightState = useHighlightState()

  const containerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 390)

  // 画面サイズの変更を監視
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 390)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 日本語CodeMirrorエディタを最下部にスクロールする関数
  const scrollJapaneseToBottom = () => {
    setTimeout(() => {
      // CodeMirrorエディタのスクローラー要素を取得
      const japaneseEditor = document.querySelector(
        '.japanese-input-editor .cm-scroller'
      ) as HTMLElement
      if (japaneseEditor) {
        japaneseEditor.scrollTop = japaneseEditor.scrollHeight
      }
    }, 100)
  }

  // カスタムフックの初期化
  const notebookActions = useNotebookActions({
    englishText: notebookState.englishText,
    translationLines,
    setOriginalContent: notebookState.setOriginalContent,
    clearAllSelections: highlightState.clearAllSelections,
    resetState: notebookState.resetState,
    scrollJapaneseToBottom,
    authManager,
    firestoreManager,
    handleTranslate,
    performAutoTranslation,
    isSaving,
    saveNote,
    setCurrentEditingId,
    syncFromFirestore,
    hasUnsavedChanges,
    markAsSaved,
    clearTranslationLines,
  })

  const selectionHandlers = useSelectionHandlers({
    englishText: notebookState.englishText,
    translationText: notebookState.translationText,
    setEnglishHighlight: highlightState.setEnglishHighlight,
    setJapaneseHighlight: highlightState.setJapaneseHighlight,
    clearEnglishSelection: highlightState.clearEnglishSelection,
    clearJapaneseSelection: highlightState.clearJapaneseSelection,
  })

  const speechHandlers = useSpeechHandlers({
    englishText: notebookState.englishText,
    translationText: notebookState.translationText,
    selectedText: highlightState.selectedText,
    selectedEnglishText: highlightState.selectedEnglishText,
    highlightedLineIndex: highlightState.highlightedLineIndex,
    highlightedJapaneseLineIndex: highlightState.highlightedJapaneseLineIndex,
    translationLines,
  })

  // 自動保存機能
  const { isAutoSaving, lastAutoSavedAt, autoSaveError, resetAutoSaveStatus } = useAutoSave({
    text: notebookState.englishText,
    translations: translationLines,
    originalContent: notebookState.originalContent,
    authManager,
    firestoreManager,
    saveFunction: async (text, translations, authManager, firestoreManager) => {
      const result = await saveNote(text, translations, authManager, firestoreManager)
      if (result) {
        // 自動保存成功時に元のcontentを更新して未保存状態を解消
        notebookState.setOriginalContent(text)
        // 新規ノートの場合はIDを設定（履歴の重複を防ぐ）
        if (result.type === 'saved' && result.id) {
          setCurrentEditingId(result.id)
        }
      }
      return result
    },
    intervalMs: 10000, // 10秒間隔
    minCharsForSave: 10,
    enabled: !!user,
  })

  // 親コンポーネントから呼び出せるようにresetAutoSaveStatusを設定
  useEffect(() => {
    resetAutoSaveStatusRef.current = resetAutoSaveStatus
  }, [resetAutoSaveStatus, resetAutoSaveStatusRef])

  useEffect(() => {
    notebookState.setTranslationText(translationLines.join('\n'))
  }, [translationLines, notebookState])

  // 英語テキストの変更を監視して未保存状態を更新
  useEffect(() => {
    const hasChanges = notebookState.englishText.trim() !== notebookState.originalContent.trim()
    if (hasChanges && notebookState.englishText.trim()) {
      markAsModified()
    } else if (!hasChanges) {
      markAsSaved()
    }
  }, [notebookState.englishText, notebookState.originalContent, markAsModified, markAsSaved])

  useEffect(() => {
    if (user && authManager && firestoreManager) {
      syncFromFirestore(authManager, firestoreManager, (note) => {
        notebookState.setEnglishText(note.text)
        notebookState.setOriginalContent(note.text)
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
    notebookState,
  ])

  useEffect(() => {
    const handleNoteSelected = (event: CustomEvent) => {
      const note = event.detail

      notebookState.setEnglishText(note.text)
      notebookState.setOriginalContent(note.text)
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
  }, [setTranslationLines, clearTranslationLines, setCurrentEditingId, markAsSaved, notebookState])

  const handleKeyDown = async () => {
    // CodeMirrorでは独自のキーマップで処理するため、ここでは何もしない
  }

  const disabled = !user

  return (
    <div
      id="notebook-container"
      ref={containerRef}
      className={`${disabled ? 'disabled-overlay' : ''} ${isMobile ? `mobile-view ${notebookState.currentView}-active` : ''}`}
    >
      <div className="notebook-slides">
        <div id="english-side" className="notebook-side">
          {isMobile && (
            <button className="view-indicators" onClick={notebookState.toggleView}>
              <span className={notebookState.currentView === 'english' ? 'active' : ''}>
                English
              </span>
              <span className="separator">⇄</span>
              <span className={notebookState.currentView === 'japanese' ? 'active' : ''}>
                Japanese
              </span>
            </button>
          )}
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
              value={notebookState.englishText}
              onChange={notebookState.setEnglishText}
              onKeyDown={handleKeyDown}
              onAutoTranslation={notebookActions.handleAutoTranslation}
              onSelectionChange={selectionHandlers.handleEnglishSelection}
              highlightedLineIndex={highlightState.highlightedLineIndex}
              placeholder="Type English here (Enter for translation)"
              disabled={disabled}
              className="english-input-editor"
            />
            <div className="button-group">
              <button
                id="speak-button"
                onClick={speechHandlers.handleSpeakEnglish}
                disabled={disabled || !notebookState.englishText.trim()}
              >
                Speak
              </button>
              <button
                id="save-button"
                onClick={notebookActions.handleSave}
                disabled={disabled || !notebookState.englishText.trim() || notebookActions.isSaving}
              >
                {notebookActions.isSaving ? 'Saving...' : 'Save'}
              </button>
              <button id="clear-button" onClick={notebookActions.handleClear} disabled={disabled}>
                New
              </button>
            </div>
          </div>
        </div>

        <div id="japanese-side" className="notebook-side">
          {isMobile && (
            <button className="view-indicators" onClick={notebookState.toggleView}>
              <span className={notebookState.currentView === 'english' ? 'active' : ''}>
                English
              </span>
              <span className="separator">⇄</span>
              <span className={notebookState.currentView === 'japanese' ? 'active' : ''}>
                Japanese
              </span>
            </button>
          )}
          <h2>Japanese</h2>
          <div id="translation-area">
            <CodeMirrorEditor
              value={notebookState.translationText}
              onChange={() => {}} // 読み取り専用
              onSelectionChange={selectionHandlers.handleJapaneseSelection}
              highlightedLineIndex={highlightState.highlightedJapaneseLineIndex}
              placeholder="Japanese translation will appear here"
              disabled={true} // 読み取り専用
              className="japanese-input-editor"
            />
            <div className="button-group">
              <button
                id="speak-japanese-button"
                onClick={speechHandlers.handleSpeakJapanese}
                disabled={disabled || !notebookState.translationText.trim()}
              >
                Speak
              </button>
              <button
                id="translate-button"
                onClick={notebookActions.handleTranslateClick}
                disabled={disabled || !notebookState.englishText.trim() || isTranslating}
              >
                {isTranslating ? 'Translating...' : 'Translate'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotebookContainer
