import { useCallback } from 'react'
import { speakEnglish, createUtterance, SPEECH_CONFIG } from '../lib/speech'

interface UseInputReturn {
  handleKeyboardEvent: (event: React.KeyboardEvent<HTMLTextAreaElement>, onAutoTranslation?: () => Promise<void>) => Promise<void>
}

export function useInput(): UseInputReturn {
  const getCurrentLine = useCallback((textarea: HTMLTextAreaElement): string => {
    const cursorPosition = textarea.selectionStart
    const textBeforeCursor = textarea.value.substring(0, cursorPosition)
    const lines = textBeforeCursor.split('\n')
    return lines[lines.length - 1]
  }, [])

  const getLastWord = useCallback((text: string): string => {
    const words = text.trim().split(/\s+/)
    return words[words.length - 1] || ''
  }, [])

  const handleKeyboardEvent = useCallback(async (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    onAutoTranslation?: () => Promise<void>
  ): Promise<void> => {
    const textarea = event.currentTarget

    if (event.key === 'Enter') {
      const currentLine = getCurrentLine(textarea)
      
      if (currentLine.trim()) {
        speakEnglish(currentLine.trim(), false)
        
        if (onAutoTranslation) {
          await onAutoTranslation()
        }
      }
    } else if (event.key === ' ') {
      const currentLine = getCurrentLine(textarea)
      
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
    } else if (event.key === '.' || event.key === '?' || event.key === '!') {
      const punctuation = event.key
      setTimeout(() => {
        const currentLine = getCurrentLine(textarea)
        if (currentLine.trim()) {
          window.speechSynthesis.cancel()
          const processedText = currentLine.trim()
          const config = punctuation === '?' ? SPEECH_CONFIG.ENGLISH_QUESTION : SPEECH_CONFIG.ENGLISH
          const utterance = createUtterance(processedText, config)
          window.speechSynthesis.speak(utterance)
        }
      }, 50)
    }
  }, [getCurrentLine, getLastWord])

  return {
    handleKeyboardEvent
  }
}