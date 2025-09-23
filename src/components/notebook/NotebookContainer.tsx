import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../contexts/AppContext'
import { speakEnglish, speakJapanese } from '../../lib/speech'
import { toast } from '../../lib/toast'
import { useAutoSave } from '../../hooks/useAutoSave'
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
  } = translation
  const { isSaving, saveNote, setCurrentEditingId, syncFromFirestore } = notes
  // const { handleKeyboardEvent } = input // CodeMirrorで処理するため不要
  const { hasUnsavedChanges, markAsSaved, markAsModified } = unsavedChanges

  const [englishText, setEnglishText] = useState('')
  const [translationText, setTranslationText] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [selectedEnglishText, setSelectedEnglishText] = useState('')
  const [highlightedLineIndex, setHighlightedLineIndex] = useState<number | null>(null)
  const [highlightedJapaneseLineIndex, setHighlightedJapaneseLineIndex] = useState<number | null>(
    null
  )

  // モバイルでの表示制御
  const [currentView, setCurrentView] = useState<'english' | 'japanese'>('english')
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

  // ビュー切り替えハンドラー
  const toggleView = () => {
    setCurrentView((prev) => (prev === 'english' ? 'japanese' : 'english'))
  }

  // 自動保存機能
  const { isAutoSaving, lastAutoSavedAt, autoSaveError, resetAutoSaveStatus } = useAutoSave({
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

  const handleJapaneseSelection = (selectedText: string, lineNumber: number | null) => {
    if (selectedText && translationText.includes(selectedText)) {
      setSelectedText(selectedText)
      setSelectedEnglishText('') // 英語の選択状態をクリア

      // 対応する英語行をハイライト
      setHighlightedLineIndex(lineNumber)
      setHighlightedJapaneseLineIndex(null) // 日本語のハイライトをクリア
    } else {
      setSelectedText('')
      setHighlightedLineIndex(null)
    }
  }

  const handleEnglishSelection = (selectedText: string, lineNumber: number | null) => {
    if (selectedText && englishText.includes(selectedText) && lineNumber !== null) {
      // 英語が選択されたとき、対応する日本語行をハイライト
      setSelectedEnglishText(selectedText)
      setSelectedText('') // 日本語の選択状態をクリア

      // 英語の行番号と日本語の行番号は1:1対応
      setHighlightedJapaneseLineIndex(lineNumber)
      setHighlightedLineIndex(null) // 英語のハイライトをクリア
    } else {
      setSelectedEnglishText('')
      setHighlightedJapaneseLineIndex(null)
    }
  }

  const handleSpeakEnglish = () => {
    // 1. 英語テキストが選択されている場合
    if (selectedEnglishText) {
      speakEnglish(selectedEnglishText)
      return
    }

    // 2. 日本語が選択されて英語がハイライトされている場合
    if (highlightedLineIndex !== null && highlightedLineIndex >= 0) {
      const lines = englishText.split('\n')
      if (highlightedLineIndex < lines.length) {
        const lineToSpeak = lines[highlightedLineIndex]
        if (lineToSpeak.trim()) {
          speakEnglish(lineToSpeak.trim())
          return
        }
      }
    }

    // 3. どちらも選択されていない場合は全文を読み上げ
    speakEnglish(englishText)
  }

  // 選択された英語に対応する元の日本語翻訳を取得
  const getOriginalJapaneseText = (): string | null => {
    if (!selectedEnglishText) return null

    // 選択された英語テキストが何行目にあるかを特定
    const englishLines = englishText.split('\n')
    let englishLineIndex = -1

    for (let i = 0; i < englishLines.length; i++) {
      if (englishLines[i].includes(selectedEnglishText)) {
        englishLineIndex = i
        break
      }
    }

    if (englishLineIndex >= 0 && englishLineIndex < translationLines.length) {
      return translationLines[englishLineIndex]
    }

    return null
  }

  const handleSpeakJapanese = () => {
    // 1. 日本語テキストが選択されている場合
    if (selectedText) {
      speakJapanese(selectedText)
      return
    }

    // 2. 英語が選択されて日本語がハイライトされている場合
    if (highlightedJapaneseLineIndex !== null && highlightedJapaneseLineIndex >= 0) {
      if (highlightedJapaneseLineIndex < translationLines.length) {
        const lineToSpeak = translationLines[highlightedJapaneseLineIndex]
        if (lineToSpeak && lineToSpeak.trim()) {
          speakJapanese(lineToSpeak.trim())
          return
        }
      }
    }

    // 3. 英語が選択されている場合は、対応する元の日本語翻訳を読み上げ（フォールバック）
    if (selectedEnglishText) {
      const originalJapanese = getOriginalJapaneseText()
      if (originalJapanese && originalJapanese.trim()) {
        speakJapanese(originalJapanese.trim())
        return
      }
    }

    // 4. どちらも選択されていない場合は全文を読み上げ
    speakJapanese(translationText)
  }

  const disabled = !user

  return (
    <div
      id="notebook-container"
      ref={containerRef}
      className={`${disabled ? 'disabled-overlay' : ''} ${isMobile ? `mobile-view ${currentView}-active` : ''}`}
    >
      <div className="notebook-slides">
        <div id="english-side" className="notebook-side">
          {isMobile && (
            <button className="view-indicators" onClick={toggleView}>
              <span className={currentView === 'english' ? 'active' : ''}>English</span>
              <span className="separator">⇄</span>
              <span className={currentView === 'japanese' ? 'active' : ''}>Japanese</span>
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
              value={englishText}
              onChange={setEnglishText}
              onKeyDown={handleKeyDown}
              onAutoTranslation={handleAutoTranslation}
              onSelectionChange={handleEnglishSelection}
              highlightedLineIndex={highlightedLineIndex}
              placeholder="Type English here (Enter for translation)"
              disabled={disabled}
              className="english-input-editor"
            />
            <div className="button-group">
              <button
                id="speak-button"
                onClick={handleSpeakEnglish}
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
          {isMobile && (
            <button className="view-indicators" onClick={toggleView}>
              <span className={currentView === 'english' ? 'active' : ''}>English</span>
              <span className="separator">⇄</span>
              <span className={currentView === 'japanese' ? 'active' : ''}>Japanese</span>
            </button>
          )}
          <h2>Japanese</h2>
          <div id="translation-area">
            <CodeMirrorEditor
              value={translationText}
              onChange={() => {}} // 読み取り専用
              onSelectionChange={handleJapaneseSelection}
              highlightedLineIndex={highlightedJapaneseLineIndex}
              placeholder="Japanese translation will appear here"
              disabled={true} // 読み取り専用
              className="japanese-input-editor"
            />
            <div className="button-group">
              <button
                id="speak-japanese-button"
                onClick={handleSpeakJapanese}
                disabled={disabled || !translationText.trim()}
              >
                Speak
              </button>
              <button
                id="translate-button"
                onClick={handleTranslateClick}
                disabled={disabled || !englishText.trim() || isTranslating}
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
