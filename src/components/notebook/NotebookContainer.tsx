import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../contexts/AppContext'
import { speakEnglish, speakJapanese } from '../../lib/speech'
import { toast } from '../../lib/toast'
import { getSelectedLineNumber } from '../../utils/lineHighlight'
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
  const [showSelectionButton, setShowSelectionButton] = useState(false)
  const [highlightedLineIndex, setHighlightedLineIndex] = useState<number | null>(null)
  const [highlightedJapaneseLineIndex, setHighlightedJapaneseLineIndex] = useState<number | null>(null)

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

  // 日本語テキストエリアのハイライト効果
  useEffect(() => {
    const textarea = document.getElementById('translation-text') as HTMLTextAreaElement
    const wrapper = document.querySelector('.textarea-highlight-wrapper') as HTMLElement
    if (!textarea || !wrapper) return

    // 既存のハイライトオーバーレイを削除
    const existingOverlay = wrapper.querySelector('.japanese-highlight-overlay')
    if (existingOverlay) {
      existingOverlay.remove()
    }

    if (highlightedJapaneseLineIndex !== null && highlightedJapaneseLineIndex >= 0) {
      const lines = translationText.split('\n')
      if (highlightedJapaneseLineIndex < lines.length) {
        // ハイライトオーバーレイを作成
        const overlay = document.createElement('div')
        overlay.className = 'japanese-highlight-overlay'
        
        // textareaのスタイルを取得
        const computedStyle = getComputedStyle(textarea)
        const fontSize = parseFloat(computedStyle.fontSize) || 22
        const lineHeightValue = computedStyle.lineHeight
        // line-heightが数値の場合と、'normal'や'%'の場合を処理
        let lineHeight: number
        if (lineHeightValue === 'normal') {
          lineHeight = fontSize * 1.2 // normalの場合の標準値
        } else if (lineHeightValue.endsWith('px')) {
          lineHeight = parseFloat(lineHeightValue)
        } else {
          // line-heightが倍数値の場合（例: "1.6"）
          lineHeight = fontSize * parseFloat(lineHeightValue)
        }
        
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0
        const paddingRight = parseFloat(computedStyle.paddingRight) || 0
        
        // ハイライトする行の位置を計算
        const topPosition = paddingTop + (highlightedJapaneseLineIndex * lineHeight) - textarea.scrollTop
        
        overlay.style.position = 'absolute'
        overlay.style.left = `${paddingLeft}px`
        overlay.style.right = `${paddingRight}px`
        overlay.style.top = `${topPosition}px`
        overlay.style.height = `${lineHeight}px`
        overlay.style.backgroundColor = '#fff3cd'
        overlay.style.borderRadius = '3px'
        overlay.style.pointerEvents = 'none'
        overlay.style.zIndex = '1'
        overlay.style.animation = 'highlight-pulse 0.6s ease-in-out'
        overlay.style.boxShadow = '0 0 8px rgba(255, 193, 7, 0.4)'
        
        // wrapperを相対位置にして、オーバーレイを正しく配置
        wrapper.style.position = 'relative'
        textarea.style.position = 'relative'
        textarea.style.zIndex = '2'
        textarea.style.backgroundColor = 'transparent'
        
        wrapper.appendChild(overlay)

        // ハイライトされた行にスクロール
        const scrollPosition = highlightedJapaneseLineIndex * lineHeight
        textarea.scrollTop = scrollPosition - (textarea.clientHeight / 2 - lineHeight / 2)
        
        // スクロールイベントでオーバーレイ位置を更新
        const handleScroll = () => {
          const newTopPosition = paddingTop + (highlightedJapaneseLineIndex * lineHeight) - textarea.scrollTop
          overlay.style.top = `${newTopPosition}px`
        }
        
        textarea.addEventListener('scroll', handleScroll)
        
        // クリーンアップ
        return () => {
          textarea.removeEventListener('scroll', handleScroll)
        }
      }
    }
  }, [highlightedJapaneseLineIndex, translationText])

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
      setHighlightedJapaneseLineIndex(null) // 日本語のハイライトをクリア
    } else {
      setSelectedText('')
      setShowSelectionButton(false)
      setHighlightedLineIndex(null)
    }
  }

  const handleEnglishSelection = (selectedText: string, lineNumber: number | null) => {
    if (selectedText && englishText.includes(selectedText)) {
      // 英語が選択されたとき、対応する日本語行をハイライト
      setHighlightedJapaneseLineIndex(lineNumber)
      setHighlightedLineIndex(null) // 英語のハイライトをクリア
    } else {
      setHighlightedJapaneseLineIndex(null)
    }
  }

  const handleSpeakSelection = () => {
    if (selectedText) {
      speakJapanese(selectedText)
    }
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
          {isMobile && (
            <button className="view-indicators" onClick={toggleView}>
              <span className={currentView === 'english' ? 'active' : ''}>English</span>
              <span className="separator">⇄</span>
              <span className={currentView === 'japanese' ? 'active' : ''}>Japanese</span>
            </button>
          )}
          <h2>Japanese</h2>
          <div id="translation-area">
            <div className="textarea-highlight-wrapper">
              <textarea
                id="translation-text"
                value={translationText}
                readOnly
                placeholder="Japanese translation will appear here"
                rows={8}
                onMouseUp={handleTextSelection}
                onTouchEnd={handleTextSelection}
              />
            </div>
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
    </div>
  )
}

export default NotebookContainer
