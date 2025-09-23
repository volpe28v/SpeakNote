import { keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { speakEnglish, createUtterance, SPEECH_CONFIG } from './speech'
import { keySoundManager } from './keySound'

const getCurrentLine = (state: EditorState): string => {
  const { from } = state.selection.main
  const line = state.doc.lineAt(from)
  return line.text
}

const getLastWord = (text: string): string => {
  const words = text.trim().split(/\s+/)
  return words[words.length - 1] || ''
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
        // キー音を再生
        keySoundManager.playKeySound()

        // ピリオド入力前の状態でカーソル位置の行を取得
        const { from } = view.state.selection.main
        const line = view.state.doc.lineAt(from)
        const currentLine = line.text

        if (currentLine.trim()) {
          window.speechSynthesis.cancel()
          const processedText = currentLine.trim() + '.'
          const utterance = createUtterance(processedText, SPEECH_CONFIG.ENGLISH)
          window.speechSynthesis.speak(utterance)
        }
        return false
      },
    },
    {
      key: '?',
      run: (view) => {
        // キー音を再生
        keySoundManager.playKeySound()

        // 疑問符入力前の状態でカーソル位置の行を取得
        const { from } = view.state.selection.main
        const line = view.state.doc.lineAt(from)
        const currentLine = line.text

        if (currentLine.trim()) {
          window.speechSynthesis.cancel()
          const processedText = currentLine.trim() + '?'
          const utterance = createUtterance(processedText, SPEECH_CONFIG.ENGLISH_QUESTION)
          window.speechSynthesis.speak(utterance)
        }
        return false
      },
    },
    {
      key: '!',
      run: (view) => {
        // キー音を再生
        keySoundManager.playKeySound()

        // 感嘆符入力前の状態でカーソル位置の行を取得
        const { from } = view.state.selection.main
        const line = view.state.doc.lineAt(from)
        const currentLine = line.text

        if (currentLine.trim()) {
          window.speechSynthesis.cancel()
          const processedText = currentLine.trim() + '!'
          const utterance = createUtterance(processedText, SPEECH_CONFIG.ENGLISH)
          window.speechSynthesis.speak(utterance)
        }
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