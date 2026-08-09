import React from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView, Decoration } from '@codemirror/view'
import { EditorState, Extension } from '@codemirror/state'
import { spellCheckField, initSpellCheck, addDictionaryListener } from '@/lib/spellcheck'
import { createSpeechKeymap } from '@/lib/codeMirrorKeymap'
import { useKeySound } from '@/hooks/useKeySound'

interface CodeMirrorEditorProps {
  value: string
  onChange: (value: string) => void
  onAutoTranslation?: (text: string) => Promise<void>
  onSelectionChange?: (selectedText: string, lineNumber: number | null) => void
  highlightedLineIndex?: number | null
  // ハイライト行を画面内にスクロールするか。
  // カーソルのある側で有効にすると入力のたびに画面が跳ねるため、反対側だけ有効にする
  scrollHighlightIntoView?: boolean
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
  onAutoTranslation,
  onSelectionChange,
  highlightedLineIndex,
  scrollHighlightIntoView = true,
  placeholder = '',
  disabled = false,
  className = '',
}: CodeMirrorEditorProps) {
  const editorViewRef = React.useRef<EditorView | null>(null)
  const keySound = useKeySound()

  // スペルチェック辞書を初期化
  React.useEffect(() => {
    // 辞書が読み込まれたらエディタを更新。
    // アンマウント後に破棄済みの EditorView へ dispatch しないよう登録を解除する
    const unsubscribe = addDictionaryListener(() => {
      if (editorViewRef.current) {
        // エディタの状態を強制的に更新
        editorViewRef.current.dispatch({})
      }
    })
    initSpellCheck()
    return unsubscribe
  }, [])

  const extensions = React.useMemo(() => {
    const speechKeymap = createSpeechKeymap(onAutoTranslation)
    const keydownHandler = keySound.createKeydownHandler()

    // 選択変更時のイベントハンドラ
    const selectionHandler = EditorView.updateListener.of((update) => {
      if (update.selectionSet && onSelectionChange) {
        const { from, to } = update.state.selection.main
        // 選択していなくてもカーソル行を通知し、反対側の行をハイライトできるようにする
        const line = update.state.doc.lineAt(from)
        const selectedText = from === to ? '' : update.state.doc.sliceString(from, to)
        onSelectionChange(selectedText.trim(), line.number - 1)
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
      scrollHighlightIntoView &&
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
  }, [highlightedLineIndex, scrollHighlightIntoView])

  // Enter キーの処理は codeMirrorKeymap.ts の keymap に一本化している。
  // ここで React の onKeyDown からも処理すると、CodeMirror の keymap は
  // stopPropagation しないため二重に発火し、改行挿入後のカーソル位置を見て
  // 誤った行を読み上げてしまう。

  return (
    <div className={`codemirror-wrapper ${className}`}>
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
