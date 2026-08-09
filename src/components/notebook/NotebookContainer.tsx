import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '@/contexts/AppContext'
import { UI_STRINGS } from '@/constants/appConstants'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useNotebookState } from '@/hooks/useNotebookState'
import { useHighlightState } from '@/hooks/useHighlightState'
import { useNotebookActions } from '@/hooks/useNotebookActions'
import { useSelectionHandlers } from '@/hooks/useSelectionHandlers'
import { useSpeechHandlers } from '@/hooks/useSpeechHandlers'
import { useNoteSync } from '@/hooks/useNoteSync'
import { useUnsavedChangeTracker } from '@/hooks/useUnsavedChangeTracker'
import { useTranslationSync } from '@/hooks/useTranslationSync'
import CodeMirrorEditor from '@/components/common/CodeMirrorEditor'
import AutoSaveStatus from '@/components/common/AutoSaveStatus'
import type { AuthManager, FirestoreManager } from '@/lib/firebase'

// style.css の @media (max-width: 768px) と対応させること
const MOBILE_BREAKPOINT = 768

// 日本語ペインは読み取り専用。インラインの空関数を渡すと参照が毎レンダー変わり、
// @uiw/react-codemirror が onChange を依存に持つため再構成が走る
const NOOP = () => {}

interface NotebookContainerProps {
  resetAutoSaveStatusRef: React.MutableRefObject<(() => void) | null>
}

function NotebookContainer({ resetAutoSaveStatusRef }: NotebookContainerProps) {
  const { auth, translation, notes, unsavedChanges } = useApp()
  const { user, authManager, firestoreManager } = auth
  const {
    translationLines,
    isTranslating,
    translationProgress,
    handleTranslate,
    loadTranslations,
    clearTranslationLines,
    performAutoTranslation,
  } = translation
  const { isSaving, saveNote, setCurrentEditingId, syncFromFirestore } = notes
  const { hasUnsavedChanges, markAsSaved, markAsModified } = unsavedChanges

  // カスタムフックの使用
  const notebookState = useNotebookState()
  const highlightState = useHighlightState()
  // useState の setter は参照が安定している。分割して取り出すことで
  // 下流の useCallback の依存を安定させる（notebookState 自体は毎レンダー別オブジェクト）
  const { setEnglishText, setOriginalContent } = notebookState

  const containerRef = useRef<HTMLDivElement>(null)
  // 遅延初期化。そうしないと window.innerWidth の読み取り（強制リフロー）が毎レンダー走る
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT)

  // 画面サイズの変更を監視
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 日本語CodeMirrorエディタを最下部にスクロールする関数
  const scrollJapaneseToBottom = useCallback(() => {
    setTimeout(() => {
      // CodeMirrorエディタのスクローラー要素を取得
      const japaneseEditor = document.querySelector(
        '.japanese-input-editor .cm-scroller'
      ) as HTMLElement
      if (japaneseEditor) {
        japaneseEditor.scrollTop = japaneseEditor.scrollHeight
      }
    }, 100)
  }, [])

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
    setEnglishHighlight: highlightState.setEnglishHighlight,
    setJapaneseHighlight: highlightState.setJapaneseHighlight,
    clearHighlight: highlightState.clearAllSelections,
  })

  const speechHandlers = useSpeechHandlers({
    englishText: notebookState.englishText,
    translationText: notebookState.translationText,
    selectedText: highlightState.selectedText,
    selectedEnglishText: highlightState.selectedEnglishText,
    highlightedLineIndex: highlightState.highlightedLineIndex,
    translationLines,
  })

  // 参照を固定する。インラインのままだと useAutoSave のタイマーが毎レンダー張り直され、
  // 「再レンダーが10秒間起きない」場合しか自動保存が発火しなくなる
  const handleAutoSave = useCallback(
    async (
      text: string,
      translations: string[],
      auth: AuthManager,
      firestore: FirestoreManager
    ) => {
      const result = await saveNote(text, translations, auth, firestore)
      if (result) {
        // 自動保存成功時に元のcontentを更新して未保存状態を解消
        setOriginalContent(text)
        // 新規ノートの場合はIDを設定（履歴の重複を防ぐ）
        if (result.type === 'saved' && result.id) {
          setCurrentEditingId(result.id)
        }
      }
      return result
    },
    [saveNote, setOriginalContent, setCurrentEditingId]
  )

  // 自動保存機能
  const { isAutoSaving, lastAutoSavedAt, autoSaveError, resetAutoSaveStatus } = useAutoSave({
    text: notebookState.englishText,
    translations: translationLines,
    originalContent: notebookState.originalContent,
    authManager,
    firestoreManager,
    saveFunction: handleAutoSave,
    intervalMs: 10000, // 10秒間隔
    minCharsForSave: 10,
    enabled: !!user,
  })

  // ノート同期処理
  const handleNoteLoad = useCallback(
    (note: { text: string; translations?: string[]; id: number }) => {
      setEnglishText(note.text)
      setOriginalContent(note.text)
    },
    [setEnglishText, setOriginalContent]
  )

  useNoteSync({
    user,
    authManager,
    firestoreManager,
    syncFromFirestore,
    loadTranslations,
    clearTranslationLines,
    setCurrentEditingId,
    markAsSaved,
    onNoteLoad: handleNoteLoad,
  })

  // 未保存変更の追跡
  useUnsavedChangeTracker({
    englishText: notebookState.englishText,
    originalContent: notebookState.originalContent,
    markAsModified,
    markAsSaved,
  })

  // 翻訳同期処理
  useTranslationSync({
    translationLines,
    setTranslationText: notebookState.setTranslationText,
    resetAutoSaveStatusRef,
    resetAutoSaveStatus,
  })

  const disabled = !user

  // 分割翻訳中は残り行数が分かるようラベルに進捗を出す
  const translateButtonLabel = !isTranslating
    ? UI_STRINGS.TRANSLATE
    : translationProgress
      ? UI_STRINGS.TRANSLATING_PROGRESS(translationProgress.completed, translationProgress.total)
      : UI_STRINGS.TRANSLATING

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
            <span className="char-count">
              {notebookState.englishText.length.toLocaleString()} chars
            </span>
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
              onAutoTranslation={notebookActions.handleAutoTranslation}
              onSelectionChange={selectionHandlers.handleEnglishSelection}
              highlightedLineIndex={highlightState.highlightedLineIndex}
              scrollHighlightIntoView={highlightState.highlightSource === 'japanese'}
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
              onChange={NOOP} // 読み取り専用
              onSelectionChange={selectionHandlers.handleJapaneseSelection}
              highlightedLineIndex={highlightState.highlightedLineIndex}
              scrollHighlightIntoView={highlightState.highlightSource === 'english'}
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
                {translateButtonLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotebookContainer
