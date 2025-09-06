import { useState, useCallback } from 'react'
import { toast } from '../lib/toast'
import { GAS_TRANSLATE_URL, UI_STRINGS } from '../config/constants'

interface UseTranslationReturn {
  translationLines: string[]
  isTranslating: boolean
  translate: (text: string) => Promise<string | null>
  handleTranslate: (englishText: string) => Promise<void>
  performAutoTranslation: (englishText: string) => Promise<void>
  setTranslationLines: (lines: string[]) => void
  clearTranslationLines: () => void
}

export function useTranslation(): UseTranslationReturn {
  const [translationLines, setTranslationLinesState] = useState<string[]>([])
  const [isTranslating, setIsTranslating] = useState(false)

  const translateWithGoogleAPI = useCallback(async (text: string): Promise<string> => {
    if (!GAS_TRANSLATE_URL) {
      console.warn('Google Apps Script URL not configured')
      return 'Translation API not configured'
    }

    // 文字数チェック（5000文字推奨）
    if (text.length > 5000) {
      console.warn(`Text length (${text.length} characters) exceeds recommended limit (5000 characters)`)
      // 長文でも処理は続行するが、警告を表示
      setTimeout(() => toast.warning('Text exceeds 5000 characters. Translation may be slow or fail.'), 100)
    }

    try {
      // POSTリクエストに変更（CORSエラー回避のためtext/plainを使用）
      const response = await fetch(GAS_TRANSLATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          text: text,
          source: 'en',
          target: 'ja'
        })
      })
      
      const data = await response.json()

      if (data.success) {
        return data.text
      } else {
        console.error('Translation API error:', data.error)
        return 'Translation error: ' + data.error
      }
    } catch (error) {
      console.error('Network error:', error)
      // より詳細なエラーメッセージ
      if (error instanceof Error) {
        return `Translation failed: ${error.message}`
      }
      return 'Network error: Translation failed'
    }
  }, [])

  const translate = useCallback(
    async (text: string): Promise<string | null> => {
      if (!text.trim()) {
        setTimeout(() => toast.info('Please enter English text'), 100)
        return null
      }

      if (isTranslating) {
        return null
      }

      if (!GAS_TRANSLATE_URL) {
        setTimeout(() => toast.warning(UI_STRINGS.API_NOT_SET), 100)
        return null
      }

      try {
        return await translateWithGoogleAPI(text)
      } catch (error) {
        console.error('Translation error:', error)
        setTimeout(() => toast.error(UI_STRINGS.TRANSLATION_ERROR), 100)
        return null
      }
    },
    [isTranslating, translateWithGoogleAPI]
  )

  const handleTranslate = useCallback(
    async (englishText: string): Promise<void> => {
      if (!englishText.trim()) {
        setTimeout(() => toast.info('Please enter English text'), 100)
        return
      }

      if (isTranslating) {
        return
      }

      if (!GAS_TRANSLATE_URL) {
        setTimeout(() => toast.warning(UI_STRINGS.API_NOT_SET), 100)
        return
      }

      setIsTranslating(true)

      try {
        const translatedText = await translateWithGoogleAPI(englishText)
        const lines = translatedText.split('\n')
        setTranslationLinesState(lines)
        setTimeout(() => toast.success('Translation completed'), 100)
      } catch (error) {
        console.error('Translation error:', error)
        setTimeout(() => toast.error(UI_STRINGS.TRANSLATION_ERROR), 100)
      } finally {
        setIsTranslating(false)
      }
    },
    [isTranslating, translateWithGoogleAPI]
  )

  const performAutoTranslation = useCallback(
    async (englishText: string): Promise<void> => {
      if (!GAS_TRANSLATE_URL || isTranslating) {
        return
      }

      setIsTranslating(true)

      try {
        if (englishText.trim()) {
          const translatedText = await translateWithGoogleAPI(englishText)
          const lines = translatedText.split('\n')
          setTranslationLinesState(lines)
        }
      } catch (error) {
        console.error('Auto translation error:', error)
      } finally {
        setIsTranslating(false)
      }
    },
    [isTranslating, translateWithGoogleAPI]
  )

  const setTranslationLines = useCallback((lines: string[]) => {
    setTranslationLinesState(lines)
  }, [])

  const clearTranslationLines = useCallback(() => {
    setTranslationLinesState([])
  }, [])

  return {
    translationLines,
    isTranslating,
    translate,
    handleTranslate,
    performAutoTranslation,
    setTranslationLines,
    clearTranslationLines,
  }
}
