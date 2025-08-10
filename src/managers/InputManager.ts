// 入力処理とキーボードイベントを管理するクラス
import { speakEnglish, createUtterance, SPEECH_CONFIG } from '../lib/speech'
import type { DOMElements } from '../types'

export class InputManager {
  private static instance: InputManager | null = null

  private constructor() {}

  static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager()
    }
    return InputManager.instance
  }

  // キーボードイベントのセットアップ
  setupKeyboardEvents(
    elements: DOMElements,
    onAutoTranslation: () => Promise<void>
  ): void {
    if (elements.englishInput) {
      elements.englishInput.addEventListener('keydown', (event) => 
        this.handleKeyboardEvents(event, elements, onAutoTranslation)
      )
      console.log('Keyboard events registered')
    } else {
      console.error('English input not found for keyboard events')
    }
  }

  // キーボードイベントハンドラー
  private async handleKeyboardEvents(
    event: KeyboardEvent,
    elements: DOMElements,
    onAutoTranslation: () => Promise<void>
  ): Promise<void> {
    if (event.key === 'Enter') {
      // エンターキーが押される前に現在の行内容を取得
      const currentLine = this.getCurrentLine(elements.englishInput)
      
      if (currentLine.trim()) {
        // 現在行を文として発音
        speakEnglish(currentLine.trim(), false)
        
        // 自動的に全文を翻訳
        await onAutoTranslation()
      }
      // エンターキーは通常通り改行として動作
    } else if (event.key === ' ') {
      // スペースキーが押されたら現在行の直前の単語を発音（翻訳は更新しない）
      const currentLine = this.getCurrentLine(elements.englishInput)
      
      // 句読点の直後かどうかをチェック
      const lastChar = currentLine.slice(-1)
      const isPunctuationBefore = /[.!?]/.test(lastChar)
      
      if (!isPunctuationBefore && currentLine.trim()) {
        const lastWord = this.getLastWord(currentLine)
        if (lastWord) {
          // 単語のみを発音（翻訳は更新しない）
          window.speechSynthesis.cancel()
          let processedText = lastWord === 'I' ? 'i' : lastWord
          const utterance = createUtterance(processedText, SPEECH_CONFIG.ENGLISH)
          window.speechSynthesis.speak(utterance)
        }
      }
      // スペースは通常通り入力される
    } else if (event.key === '.' || event.key === '?' || event.key === '!') {
      // ピリオド、疑問符、感嘆符が押されたら、現在行を発音のみ（翻訳は更新しない）
      const punctuation = event.key
      setTimeout(() => {
        const currentLine = this.getCurrentLine(elements.englishInput)
        if (currentLine.trim()) {
          // 疑問符の場合は疑問文として発音のみ
          window.speechSynthesis.cancel()
          let processedText = currentLine.trim()
          const config = punctuation === '?' ? SPEECH_CONFIG.ENGLISH_QUESTION : SPEECH_CONFIG.ENGLISH
          const utterance = createUtterance(processedText, config)
          window.speechSynthesis.speak(utterance)
        }
      }, 50)
    }
  }

  // ヘルパー関数：現在の行を取得
  private getCurrentLine(textarea: HTMLTextAreaElement): string {
    const cursorPosition = textarea.selectionStart
    const textBeforeCursor = textarea.value.substring(0, cursorPosition)
    const lines = textBeforeCursor.split('\n')
    return lines[lines.length - 1]
  }

  // ヘルパー関数：直前の単語を取得
  private getLastWord(text: string): string {
    const words = text.trim().split(/\s+/)
    return words[words.length - 1] || ''
  }
}