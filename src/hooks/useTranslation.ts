import { useState, useCallback } from 'react'
import { deferredToast } from '@/lib/toast'
import { GAS_TRANSLATE_URL, UI_STRINGS } from '@/constants/appConstants'

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

    // 文字数チェック（25000文字で警告、30000文字が上限）
    if (text.length > 25000) {
      console.warn(
        `Text length (${text.length} characters) exceeds 25000 characters - approaching maximum limit`
      )
      // 上限（30000文字）に近づいているため警告を表示
      deferredToast.warning('Text exceeds 25000 characters. Translation may fail (max: 30000).')
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
          target: 'ja',
        }),
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
        deferredToast.info('Please enter English text')
        return null
      }

      if (isTranslating) {
        return null
      }

      if (!GAS_TRANSLATE_URL) {
        deferredToast.warning(UI_STRINGS.API_NOT_SET)
        return null
      }

      try {
        return await translateWithGoogleAPI(text)
      } catch (error) {
        console.error('Translation error:', error)
        deferredToast.error(UI_STRINGS.TRANSLATION_ERROR)
        return null
      }
    },
    [isTranslating, translateWithGoogleAPI]
  )

  const handleTranslate = useCallback(
    async (englishText: string): Promise<void> => {
      if (!englishText.trim()) {
        deferredToast.info('Please enter English text')
        return
      }

      if (isTranslating) {
        return
      }

      if (!GAS_TRANSLATE_URL) {
        deferredToast.warning(UI_STRINGS.API_NOT_SET)
        return
      }

      setIsTranslating(true)

      try {
        const translatedText = await translateWithGoogleAPI(englishText)
        const lines = translatedText.split('\n')
        setTranslationLinesState(lines)
        deferredToast.success('Translation completed')
      } catch (error) {
        console.error('Translation error:', error)
        deferredToast.error(UI_STRINGS.TRANSLATION_ERROR)
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
