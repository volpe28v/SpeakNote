import { useState, useCallback, useRef } from 'react'
import { deferredToast } from '@/lib/toast'
import { GAS_TRANSLATE_URL, UI_STRINGS } from '@/constants/appConstants'
import {
  buildTranslationLines,
  collectUntranslatedLines,
  fillTranslationCache,
  seedTranslationCache,
  type TranslationCache,
} from '@/utils/translationAlign'

interface RunOptions {
  // キャッシュを捨てて全行を訳し直す（手動翻訳）
  force?: boolean
  // 失敗をトースト表示せずログのみに留める（自動翻訳）
  silent?: boolean
}

// 分割翻訳の進捗。行数が多く複数回に分けて送る場合のみ設定される
export interface TranslationProgress {
  completed: number
  total: number
}

interface UseTranslationReturn {
  translationLines: string[]
  isTranslating: boolean
  translationProgress: TranslationProgress | null
  handleTranslate: (englishText: string) => Promise<void>
  performAutoTranslation: (englishText: string) => Promise<void>
  loadTranslations: (englishText: string, translations: string[]) => void
  clearTranslationLines: () => void
}

export function useTranslation(): UseTranslationReturn {
  const [translationLines, setTranslationLinesState] = useState<string[]>([])
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationProgress, setTranslationProgress] = useState<TranslationProgress | null>(null)

  // 英文1行 → 訳文 のキャッシュ。編集中のノートに対応する
  const cacheRef = useRef<TranslationCache>(new Map())
  // 多重実行を防ぎつつ、実行中に届いたテキストを取りこぼさないためのキュー
  const isRunningRef = useRef(false)
  const queuedTextRef = useRef<string | null>(null)

  const requestTranslation = useCallback(async (text: string): Promise<string> => {
    // 文字数チェック（25000文字で警告、30000文字が上限）。
    // 複数行はMAX_REQUEST_CHARSで分割済みのため、ここに達するのは1行が極端に長い場合のみ
    if (text.length > 25000) {
      console.warn(
        `Text length (${text.length} characters) exceeds 25000 characters - approaching maximum limit`
      )
      deferredToast.warning('Text exceeds 25000 characters. Translation may fail (max: 30000).')
    }

    // POSTリクエスト（CORSエラー回避のためtext/plainを使用）
    const response = await fetch(GAS_TRANSLATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        text,
        source: 'en',
        target: 'ja',
      }),
    })

    const data = await response.json()

    // 失敗した内容をキャッシュしないよう、エラーは例外として扱う
    if (!data.success) {
      throw new Error(data.error || 'Translation API returned an error')
    }

    return data.text
  }, [])

  const translateInto = useCallback(
    async (englishText: string, force: boolean): Promise<void> => {
      if (force) {
        cacheRef.current.clear()
      }

      const englishLines = englishText.split('\n')
      const cache = cacheRef.current

      // 未訳の行だけを翻訳する。通常は Enter で増えた1行のみで済む
      const pending = collectUntranslatedLines(englishLines, cache)

      // 訳文は必ず英文行から組み立てる。長さが一致するため行の対応がずれない
      const publish = () => setTranslationLinesState(buildTranslationLines(englishLines, cache))

      // 1行で終わらない場合のみ進捗を出す。分割された塊が訳し終わるたびに画面へ反映する
      let completed = 0
      const onLinesFilled =
        pending.length > 1
          ? (count: number) => {
              completed += count
              setTranslationProgress({ completed, total: pending.length })
              publish()
            }
          : undefined

      if (onLinesFilled) {
        setTranslationProgress({ completed: 0, total: pending.length })
      }

      await fillTranslationCache(pending, cache, requestTranslation, onLinesFilled)

      publish()
    },
    [requestTranslation]
  )

  const run = useCallback(
    async (englishText: string, { force = false, silent = false }: RunOptions = {}) => {
      if (!GAS_TRANSLATE_URL) {
        deferredToast.warning(UI_STRINGS.API_NOT_SET)
        return false
      }

      // 実行中なら最新のテキストを控えておき、完了後に続けて処理する
      if (isRunningRef.current) {
        queuedTextRef.current = englishText
        return false
      }

      isRunningRef.current = true
      setIsTranslating(true)

      try {
        await translateInto(englishText, force)

        while (queuedTextRef.current !== null) {
          const queuedText = queuedTextRef.current
          queuedTextRef.current = null
          await translateInto(queuedText, false)
        }
        return true
      } catch (error) {
        console.error('Translation error:', error)
        if (!silent) {
          deferredToast.error(UI_STRINGS.TRANSLATION_ERROR)
        }
        return false
      } finally {
        queuedTextRef.current = null
        isRunningRef.current = false
        setIsTranslating(false)
        setTranslationProgress(null)
      }
    },
    [translateInto]
  )

  const handleTranslate = useCallback(
    async (englishText: string): Promise<void> => {
      if (!englishText.trim()) {
        deferredToast.info('Please enter English text')
        return
      }

      // 手動翻訳は明示的な訳し直し。対応が崩れた既存ノートの修復手段も兼ねる
      if (await run(englishText, { force: true })) {
        deferredToast.success('Translation completed')
      }
    },
    [run]
  )

  const performAutoTranslation = useCallback(
    async (englishText: string): Promise<void> => {
      if (!englishText.trim()) return
      await run(englishText, { silent: true })
    },
    [run]
  )

  const loadTranslations = useCallback((englishText: string, translations: string[]): void => {
    const cache = cacheRef.current
    cache.clear()
    seedTranslationCache(cache, englishText.split('\n'), translations)
    setTranslationLinesState(translations)
  }, [])

  const clearTranslationLines = useCallback((): void => {
    cacheRef.current.clear()
    setTranslationLinesState([])
  }, [])

  return {
    translationLines,
    isTranslating,
    translationProgress,
    handleTranslate,
    performAutoTranslation,
    loadTranslations,
    clearTranslationLines,
  }
}
