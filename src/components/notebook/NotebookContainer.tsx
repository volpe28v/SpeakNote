import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useApp } from '@/contexts/AppContext'
import { UI_STRINGS } from '@/constants/appConstants'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useNotebookState } from '@/hooks/useNotebookState'
import { useHighlightState } from '@/hooks/useHighlightState'
import { useNotebookActions } from '@/hooks/useNotebookActions'
import { useSelectionHandlers } from '@/hooks/useSelectionHandlers'
import { useSpeechHandlers } from '@/hooks/useSpeechHandlers'
import { useNoteSync } from '@/hooks/useNoteSync'
import { useMixedReading } from '@/hooks/useMixedReading'
import { buildMixedLines, countMixableLines, findLineHint } from '@/utils/mixedReading'
import CodeMirrorEditor from '@/components/common/CodeMirrorEditor'
import AutoSaveStatus from '@/components/common/AutoSaveStatus'
import type { AuthManager, FirestoreManager } from '@/lib/firebase'
import type { Note } from '@/types'

// style.css の @media (max-width: 768px) と対応させること
const MOBILE_BREAKPOINT = 768

// 日本語ペインは読み取り専用。インラインの空関数を渡すと参照が毎レンダー変わり、
// @uiw/react-codemirror が onChange を依存に持つため再構成が走る
const NOOP = () => {}

interface NotebookContainerProps {
  resetAutoSaveStatusRef: React.MutableRefObject<(() => void) | null>
}

function NotebookContainer({ resetAutoSaveStatusRef }: NotebookContainerProps) {
  const { auth, translation, notes, session } = useApp()
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
  const { isSaving, saveNote, setCurrentEditingId, syncFromFirestore, currentEditingId } = notes
  const { englishText, isDirty, setEnglishText, openNote, startNewNote, markSaved } = session

  // 日本語ペインの英語率。ノートごとに覚えておき、表示だけを変える
  const { englishPercent, setEnglishPercent, loadForNote } = useMixedReading(currentEditingId)

  // 英語率の入れ替えは「ノートを開いた」ときだけ。自動保存で ID が付いただけの場合と
  // 区別する必要があるので、ノートの読み込み経路そのものに相乗りさせる
  const handleNoteLoad = useCallback(
    (note: Note) => {
      openNote(note)
      loadForNote(note.id)
    },
    [openNote, loadForNote]
  )

  const handleStartNewNote = useCallback(() => {
    startNewNote()
    loadForNote(null)
  }, [startNewNote, loadForNote])

  // カスタムフックの使用
  const notebookState = useNotebookState()
  const highlightState = useHighlightState()

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
    englishText,
    translationLines,
    markSaved,
    clearAllSelections: highlightState.clearAllSelections,
    startNewNote: handleStartNewNote,
    scrollJapaneseToBottom,
    authManager,
    firestoreManager,
    handleTranslate,
    performAutoTranslation,
    isSaving,
    saveNote,
    setCurrentEditingId,
    syncFromFirestore,
    isDirty,
    clearTranslationLines,
  })

  // 訳文テキストは訳文行の連結そのもの。state + effect で同期すると
  // 余分なレンダーが挟まり、一瞬だけ古い訳文が描画される
  const translationText = useMemo(() => translationLines.join('\n'), [translationLines])

  // 日本語ペインの表示用テキスト。英語率に応じて訳文行を英文行に差し替える。
  // 行数は英文行数のままなので、行インデックスで動くハイライト同期と行単位の
  // 読み上げには影響しない。保存されるのは translationLines のままで、
  // 混在させた結果がノートに書き戻ることはない
  const englishLines = useMemo(() => englishText.split('\n'), [englishText])
  const mixableLineCount = useMemo(
    () => countMixableLines(englishLines, translationLines),
    [englishLines, translationLines]
  )
  const displayLines = useMemo(
    () => buildMixedLines(englishLines, translationLines, englishPercent),
    [englishLines, translationLines, englishPercent]
  )
  const displayText = useMemo(() => displayLines.join('\n'), [displayLines])

  // タップした行の下に、反対の言語を薄く添える。英文行なら訳文、訳文行なら英文。
  // どちらを読んでいてもその場で見比べられる。出すのは常に1行だけで、
  // 英語ペイン側のクリックでは出さない（読んでいるのは日本語ペインのため）
  const lineHint = useMemo(() => {
    const lineIndex = highlightState.highlightedLineIndex
    if (lineIndex === null || lineIndex < 0) return null
    if (highlightState.highlightSource !== 'japanese') return null

    const hint = findLineHint(lineIndex, displayLines, englishLines, translationLines)
    return hint ? { lineIndex, ...hint } : null
  }, [
    highlightState.highlightedLineIndex,
    highlightState.highlightSource,
    displayLines,
    englishLines,
    translationLines,
  ])

  const selectionHandlers = useSelectionHandlers({
    setEnglishHighlight: highlightState.setEnglishHighlight,
    setJapaneseHighlight: highlightState.setJapaneseHighlight,
    clearHighlight: highlightState.clearAllSelections,
  })

  const speechHandlers = useSpeechHandlers({
    englishText,
    translationText,
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
        markSaved(text)
        // 新規ノートの場合はIDを設定（履歴の重複を防ぐ）
        if (result.type === 'saved' && result.id) {
          setCurrentEditingId(result.id)
        }
      }
      return result
    },
    [saveNote, markSaved, setCurrentEditingId]
  )

  // 自動保存機能
  const { isAutoSaving, lastAutoSavedAt, autoSaveError, resetAutoSaveStatus } = useAutoSave({
    text: englishText,
    translations: translationLines,
    savedText: session.savedText,
    authManager,
    firestoreManager,
    saveFunction: handleAutoSave,
    intervalMs: 10000, // 10秒間隔
    minCharsForSave: 10,
    enabled: !!user,
  })

  useNoteSync({
    user,
    authManager,
    firestoreManager,
    syncFromFirestore,
    loadTranslations,
    clearTranslationLines,
    setCurrentEditingId,
    onNoteLoad: handleNoteLoad,
  })

  // 親（App）からタブ切り替え時に自動保存ステータスを消せるようにする
  useEffect(() => {
    resetAutoSaveStatusRef.current = resetAutoSaveStatus
  }, [resetAutoSaveStatus, resetAutoSaveStatusRef])

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
              {isDirty && !isAutoSaving && <span className="unsaved-indicator">●</span>}
            </h2>
            <span className="char-count">{englishText.length.toLocaleString()} chars</span>
            {user && (
              <AutoSaveStatus
                isAutoSaving={isAutoSaving}
                lastAutoSavedAt={lastAutoSavedAt}
                autoSaveError={autoSaveError}
                isDirty={isDirty}
              />
            )}
          </div>
          <div id="input-area">
            <CodeMirrorEditor
              value={englishText}
              onChange={setEnglishText}
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
                disabled={disabled || !englishText.trim()}
              >
                Speak
              </button>
              <button
                id="save-button"
                onClick={notebookActions.handleSave}
                disabled={disabled || !englishText.trim() || notebookActions.isSaving}
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
          <div className="japanese-header">
            <h2>Japanese</h2>
            {mixableLineCount > 0 && (
              <label className="mix-ratio-control">
                <span className="mix-ratio-label">English {englishPercent}%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={englishPercent}
                  onChange={(event) => setEnglishPercent(Number(event.target.value))}
                  disabled={disabled}
                  aria-label="Percentage of lines shown in English"
                />
              </label>
            )}
          </div>
          <div id="translation-area">
            <CodeMirrorEditor
              value={displayText}
              onChange={NOOP} // 読み取り専用
              onSelectionChange={selectionHandlers.handleJapaneseSelection}
              highlightedLineIndex={highlightState.highlightedLineIndex}
              hintLineIndex={lineHint?.lineIndex ?? null}
              hintText={lineHint?.text ?? ''}
              hintLang={lineHint?.lang ?? 'japanese'}
              scrollHighlightIntoView={highlightState.highlightSource === 'english'}
              placeholder="Japanese translation will appear here"
              disabled={true} // 読み取り専用
              className="japanese-input-editor"
            />
            <div className="button-group">
              <button
                id="speak-japanese-button"
                onClick={speechHandlers.handleSpeakJapanese}
                disabled={disabled || !translationText.trim()}
              >
                Speak
              </button>
              <button
                id="translate-button"
                onClick={notebookActions.handleTranslateClick}
                disabled={disabled || !englishText.trim() || isTranslating}
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
