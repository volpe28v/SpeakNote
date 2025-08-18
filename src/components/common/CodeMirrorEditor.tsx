import React from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView, Decoration, keymap } from '@codemirror/view'
import { EditorState, Extension } from '@codemirror/state'
import { speakEnglish, createUtterance, SPEECH_CONFIG } from '../../lib/speech'
import { spellCheckField, initSpellCheck, setUpdateCallback } from '../../lib/spellcheck'

interface CodeMirrorEditorProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (event: React.KeyboardEvent) => void
  onAutoTranslation?: () => Promise<void>
  highlightedLineIndex?: number | null
  placeholder?: string
  disabled?: boolean
  className?: string
}

// 行ハイライト用の装飾定義
const highlightLineDecoration = Decoration.line({
  attributes: { class: 'cm-highlighted-line' },
})

// ハイライト用のエクステンション作成関数
const createHighlightExtension = (lineIndex: number | null): Extension => {
  if (lineIndex === null || lineIndex < 0) {
    return EditorView.decorations.of(Decoration.set([]))
  }

  return EditorView.decorations.of((view) => {
    const decorations = []
    const doc = view.state.doc

    if (lineIndex < doc.lines) {
      const line = doc.line(lineIndex + 1) // CodeMirrorは1ベース
      decorations.push(highlightLineDecoration.range(line.from))
    }

    return Decoration.set(decorations)
  })
}

// カスタムテーマ（ノート風のスタイル）
const noteTheme = EditorView.theme({
  '&': {
    fontSize: '22px',
    fontFamily:
      "'Roboto Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Source Code Pro', monospace",
    height: '100%',
    background: 'transparent',
  },
  '.cm-focused': {
    outline: 'none',
  },
  '.cm-editor': {
    border: 'none !important',
    background: 'transparent !important',
    height: '100%',
  },
  '.cm-scroller': {
    fontFamily:
      "'Roboto Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Source Code Pro', monospace",
    overflow: 'auto !important',
    overflowY: 'auto !important',
    height: '100%',
    minHeight: 'calc(100vh - 254px)',
    maxHeight: 'calc(100vh - 254px)',
    background: 'transparent !important',
    border: 'none !important',
    outline: 'none !important',
  },
  '.cm-content': {
    padding: '0',
    lineHeight: '1.6',
    color: '#2c3e50',
    letterSpacing: '0.3px',
    fontWeight: '500',
    minHeight: '100%',
    background: 'transparent !important',
    border: 'none !important',
    outline: 'none !important',
  },
  '.cm-line': {
    paddingLeft: '0',
    paddingRight: '0',
    paddingTop: '0',
    paddingBottom: '0',
    margin: '0',
    background: 'transparent',
    border: 'none !important',
  },
  '.cm-highlighted-line': {
    backgroundColor: '#fff3cd !important',
    borderRadius: '3px',
    animation: 'highlight-pulse 0.6s ease-in-out',
    boxShadow: '0 0 8px rgba(255, 193, 7, 0.4)',
  },
  '.cm-cursor': {
    borderColor: '#e74c3c !important',
    borderWidth: '2px !important',
    borderStyle: 'solid !important',
    display: 'block !important',
    visibility: 'visible !important',
    opacity: '1 !important',
    animation: 'cursor-blink 1.2s infinite',
    borderRadius: '1px',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(52, 152, 219, 0.3) !important',
  },
  '.cm-gutters': {
    display: 'none',
  },
})

// CodeMirror用のキーマップ作成関数
const createSpeechKeymap = (onAutoTranslation?: () => Promise<void>) => {
  const getCurrentLine = (state: EditorState): string => {
    const { from } = state.selection.main
    const line = state.doc.lineAt(from)
    return line.text
  }

  const getLastWord = (text: string): string => {
    const words = text.trim().split(/\s+/)
    return words[words.length - 1] || ''
  }

  const keymapExtension = keymap.of([
    {
      key: 'Enter',
      run: (view) => {
        console.log('CodeMirror Enter key pressed!')
        const currentLine = getCurrentLine(view.state)
        console.log('Enter pressed, currentLine:', currentLine)
        console.log('onAutoTranslation exists:', !!onAutoTranslation)

        // 改行処理の前に音声と翻訳を実行
        if (currentLine.trim()) {
          speakEnglish(currentLine.trim(), false)
          if (onAutoTranslation) {
            console.log('Calling onAutoTranslation')
            // 非同期処理を適切に処理
            setTimeout(() => {
              onAutoTranslation()
                .then(() => {
                  console.log('Auto translation completed')
                })
                .catch((error) => {
                  console.error('Auto translation error:', error)
                })
            }, 100)
          }
        }

        // デフォルトの改行動作を実行
        view.dispatch({
          changes: { from: view.state.selection.main.head, insert: '\n' },
        })

        return true // イベントを処理済みとする
      },
    },
    {
      key: 'Space',
      run: (view) => {
        const currentLine = getCurrentLine(view.state)
        const lastChar = currentLine.slice(-1)
        const isPunctuationBefore = /[.!?]/.test(lastChar)

        if (!isPunctuationBefore && currentLine.trim()) {
          const lastWord = getLastWord(currentLine)
          if (lastWord) {
            window.speechSynthesis.cancel()
            const processedText = lastWord === 'I' ? 'i' : lastWord
            const utterance = createUtterance(processedText, SPEECH_CONFIG.ENGLISH)
            window.speechSynthesis.speak(utterance)
          }
        }
        return false // デフォルトのスペース入力を続行
      },
    },
    {
      key: '.',
      run: (view) => {
        setTimeout(() => {
          const currentLine = getCurrentLine(view.state)
          if (currentLine.trim()) {
            window.speechSynthesis.cancel()
            const processedText = currentLine.trim() + '.'
            const utterance = createUtterance(processedText, SPEECH_CONFIG.ENGLISH)
            window.speechSynthesis.speak(utterance)
          }
        }, 50)
        return false
      },
    },
    {
      key: '?',
      run: (view) => {
        setTimeout(() => {
          const currentLine = getCurrentLine(view.state)
          if (currentLine.trim()) {
            window.speechSynthesis.cancel()
            const processedText = currentLine.trim() + '?'
            const utterance = createUtterance(processedText, SPEECH_CONFIG.ENGLISH_QUESTION)
            window.speechSynthesis.speak(utterance)
          }
        }, 50)
        return false
      },
    },
    {
      key: '!',
      run: (view) => {
        setTimeout(() => {
          const currentLine = getCurrentLine(view.state)
          if (currentLine.trim()) {
            window.speechSynthesis.cancel()
            const processedText = currentLine.trim() + '!'
            const utterance = createUtterance(processedText, SPEECH_CONFIG.ENGLISH)
            window.speechSynthesis.speak(utterance)
          }
        }, 50)
        return false
      },
    },
  ])

  return keymapExtension
}

function CodeMirrorEditor({
  value,
  onChange,
  onKeyDown,
  onAutoTranslation,
  highlightedLineIndex,
  placeholder = '',
  disabled = false,
  className = '',
}: CodeMirrorEditorProps) {
  const editorViewRef = React.useRef<EditorView | null>(null)

  // スペルチェック辞書を初期化
  React.useEffect(() => {
    // 辞書が読み込まれたらエディタを更新
    setUpdateCallback(() => {
      if (editorViewRef.current) {
        // エディタの状態を強制的に更新
        editorViewRef.current.dispatch({})
      }
    })
    initSpellCheck()
  }, [])

  const extensions = React.useMemo(() => {
    const speechKeymap = createSpeechKeymap(onAutoTranslation)

    const baseExtensions = [
      speechKeymap, // キーマップを最初に配置して優先度を高くする
      noteTheme,
      EditorView.lineWrapping,
      EditorState.readOnly.of(disabled),
      spellCheckField, // スペルチェック機能を追加
      // EditorViewの参照を保持するためのエクステンション
      EditorView.updateListener.of((update) => {
        if (update.view !== editorViewRef.current) {
          editorViewRef.current = update.view
        }
      }),
    ]

    // ハイライトエクステンションを追加
    if (
      highlightedLineIndex !== null &&
      highlightedLineIndex !== undefined &&
      highlightedLineIndex >= 0
    ) {
      baseExtensions.push(createHighlightExtension(highlightedLineIndex))
    }

    return baseExtensions
  }, [highlightedLineIndex, disabled, onAutoTranslation])

  // ハイライトされた行が変更された時にスクロール
  React.useEffect(() => {
    if (
      editorViewRef.current &&
      highlightedLineIndex !== null &&
      highlightedLineIndex !== undefined &&
      highlightedLineIndex >= 0
    ) {
      const view = editorViewRef.current
      const doc = view.state.doc

      // 指定された行番号が存在するかチェック
      if (highlightedLineIndex < doc.lines) {
        const line = doc.line(highlightedLineIndex + 1) // CodeMirrorは1ベース

        // ハイライトされた行を画面内にスクロール
        view.dispatch({
          effects: EditorView.scrollIntoView(line.from, {
            y: 'center', // 画面の中央に配置
            yMargin: 50, // 上下に50pxのマージン
          }),
        })
      }
    }
  }, [highlightedLineIndex])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      console.log('React keyDown event:', event.key)

      if (event.key === 'Enter') {
        console.log('Enter key detected in React handler')

        // ドキュメントのセレクションから現在の行を正確に取得
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)

          // カーソル位置を含む行要素を探す
          let currentElement: Node | null = range.startContainer
          if (currentElement.nodeType === Node.TEXT_NODE) {
            currentElement = currentElement.parentElement
          }

          // .cm-line クラスの要素を見つける
          while (
            currentElement &&
            currentElement.nodeType === Node.ELEMENT_NODE &&
            !(currentElement as Element).classList?.contains('cm-line')
          ) {
            currentElement = (currentElement as Element).parentElement
          }

          if (
            currentElement &&
            currentElement.nodeType === Node.ELEMENT_NODE &&
            (currentElement as Element).classList.contains('cm-line')
          ) {
            const currentLine = currentElement.textContent || ''
            console.log('Current line from DOM element:', currentLine)

            if (currentLine.trim()) {
              console.log('Speaking and translating DOM line:', currentLine.trim())
              speakEnglish(currentLine.trim(), false)
              if (onAutoTranslation) {
                console.log('Calling onAutoTranslation from DOM handler')
                setTimeout(() => {
                  onAutoTranslation()
                    .then(() => {
                      console.log('Auto translation completed from DOM handler')
                    })
                    .catch((error) => {
                      console.error('Auto translation error from DOM handler:', error)
                    })
                }, 100)
              }
              return
            }
          }
        }

        // フォールバック: value から最後の非空行を取得
        const lines = value.split('\n')
        const lastNonEmptyLine = lines.filter((line) => line.trim()).pop() || ''

        console.log('Fallback: Last non-empty line:', lastNonEmptyLine)

        if (lastNonEmptyLine.trim()) {
          console.log('Fallback: Speaking and translating:', lastNonEmptyLine.trim())
          speakEnglish(lastNonEmptyLine.trim(), false)
          if (onAutoTranslation) {
            console.log('Fallback: Calling onAutoTranslation')
            setTimeout(() => {
              onAutoTranslation()
                .then(() => {
                  console.log('Fallback: Auto translation completed')
                })
                .catch((error) => {
                  console.error('Fallback: Auto translation error:', error)
                })
            }, 100)
          }
        }
      }

      if (onKeyDown) {
        onKeyDown(event)
      }
    },
    [onKeyDown, value, onAutoTranslation]
  )

  return (
    <div className={`codemirror-wrapper ${className}`} onKeyDown={handleKeyDown}>
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
          highlightSelectionMatches: false,
          searchKeymap: false,
        }}
        editable={!disabled}
      />
    </div>
  )
}

export default CodeMirrorEditor
