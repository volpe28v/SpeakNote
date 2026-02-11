import { keymap, EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { speakEnglish, createUtterance, SPEECH_CONFIG } from '@/lib/speech'
import { keySoundManager } from '@/lib/keySound'
import type { SpeechConfig } from '@/types'

const getCurrentLine = (state: EditorState): string => {
  const { from } = state.selection.main
  const line = state.doc.lineAt(from)
  return line.text
}

const getLastWord = (text: string): string => {
  const words = text.trim().split(/\s+/)
  return words[words.length - 1] || ''
}

const speakCurrentLine = (view: EditorView, suffix: string, config: SpeechConfig): void => {
  const { from } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  const currentLine = line.text

  if (currentLine.trim()) {
    window.speechSynthesis.cancel()
    const processedText = currentLine.trim() + suffix
    const utterance = createUtterance(processedText, config)
    window.speechSynthesis.speak(utterance)
  }
}

export const createSpeechKeymap = (onAutoTranslation?: () => Promise<void>) => {
  return keymap.of([
    {
      key: 'Enter',
      run: (view) => {
        // Enter音を再生
        keySoundManager.playEnterSound()

        // 改行前の状態でカーソル位置の行を取得
        const { from } = view.state.selection.main
        const line = view.state.doc.lineAt(from)
        const currentLine = line.text

        // 改行処理の前に音声と翻訳を実行
        if (currentLine.trim()) {
          speakEnglish(currentLine.trim(), false)
          if (onAutoTranslation) {
            setTimeout(() => {
              onAutoTranslation().catch((error) => {
                console.error('Auto translation error:', error)
              })
            }, 100)
          }
        }

        // デフォルトの改行動作を実行
        view.dispatch({
          changes: { from: view.state.selection.main.head, insert: '\n' },
        })

        return true
      },
    },
    {
      key: 'Space',
      run: (view) => {
        // スペース音を再生
        keySoundManager.playSpaceSound()

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
        keySoundManager.playKeySound()
        speakCurrentLine(view, '.', SPEECH_CONFIG.ENGLISH)
        return false
      },
    },
    {
      key: '?',
      run: (view) => {
        keySoundManager.playKeySound()
        speakCurrentLine(view, '?', SPEECH_CONFIG.ENGLISH_QUESTION)
        return false
      },
    },
    {
      key: '!',
      run: (view) => {
        keySoundManager.playKeySound()
        speakCurrentLine(view, '!', SPEECH_CONFIG.ENGLISH)
        return false
      },
    },
    {
      key: 'Backspace',
      run: () => {
        // バックスペース音を再生
        keySoundManager.playDeleteSound()
        return false // デフォルトの削除動作を続行
      },
    },
  ])
}
