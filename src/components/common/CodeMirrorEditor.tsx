import React from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView, Decoration } from '@codemirror/view'
import { EditorState, Extension } from '@codemirror/state'
import { speakEnglish } from '@/lib/speech'
import { spellCheckField, initSpellCheck, setUpdateCallback } from '@/lib/spellcheck'
import { createSpeechKeymap } from '@/lib/codeMirrorKeymap'
import { useKeySound } from '@/hooks/useKeySound'

interface CodeMirrorEditorProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (event: React.KeyboardEvent) => void
  onAutoTranslation?: () => Promise<void>
  onSelectionChange?: (selectedText: string, lineNumber: number | null) => void
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

function CodeMirrorEditor({
  value,
  onChange,
  onKeyDown,
  onAutoTranslation,
  onSelectionChange,
  highlightedLineIndex,
  placeholder = '',
  disabled = false,
  className = '',
}: CodeMirrorEditorProps) {
  const editorViewRef = React.useRef<EditorView | null>(null)
  const keySound = useKeySound()

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
    const keydownHandler = keySound.createKeydownHandler()

    // 選択変更時のイベントハンドラ
    const selectionHandler = EditorView.updateListener.of((update) => {
      if (update.selectionSet && onSelectionChange) {
        const { from, to } = update.state.selection.main
        if (from !== to) {
          // テキストが選択されている場合
          const selectedText = update.state.doc.sliceString(from, to)
          // 選択開始位置の行番号を取得（0ベース）
          const line = update.state.doc.lineAt(from)
          const lineNumber = line.number - 1
          onSelectionChange(selectedText.trim(), lineNumber)
        } else {
          // 選択が解除された場合
          onSelectionChange('', null)
        }
      }
    })

    const baseExtensions = [
      speechKeymap, // キーマップを最初に配置して優先度を高くする
      keydownHandler, // キー入力音のハンドラ
      selectionHandler, // 選択変更のハンドラ
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
  }, [highlightedLineIndex, disabled, onAutoTranslation, onSelectionChange, keySound])

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
      if (event.key === 'Enter') {
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

            if (currentLine.trim()) {
              speakEnglish(currentLine.trim(), false)
              if (onAutoTranslation) {
                setTimeout(() => {
                  onAutoTranslation().catch((error) => {
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

        if (lastNonEmptyLine.trim()) {
          speakEnglish(lastNonEmptyLine.trim(), false)
          if (onAutoTranslation) {
            setTimeout(() => {
              onAutoTranslation().catch((error) => {
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
