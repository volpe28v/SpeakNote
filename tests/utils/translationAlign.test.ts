import { describe, it, expect, vi } from 'vitest'
import {
  buildTranslationLines,
  collectUntranslatedLines,
  fillTranslationCache,
  seedTranslationCache,
  toCacheKey,
  toSingleLine,
  MAX_REQUEST_CHARS,
  type TranslationCache,
} from '../../src/utils/translationAlign'

const DICT: Record<string, string> = {
  'I went to the park.': '私は公園に行きました。',
  'It was fun.': '楽しかったです。',
  'I ate ice cream.': '私はアイスクリームを食べました。',
  'My name is Ken': '私の名前はケンです',
  'See you tomorrow.': 'また明日。',
}
const ja = (en: string): string => DICT[en] ?? `<${en}>`

/**
 * 実際のGoogle翻訳で観測される挙動を模した翻訳エンジン。
 * 行の対応が崩れる原因そのものを再現する。
 *  - 句読点で終わらない行を次の行と結合する
 *  - 空行を落とす
 *  - オプションで、1文を「。」の後ろで分割して返す
 */
const createFlakyTranslator = ({ splitSentences = false } = {}) => {
  const sentTexts: string[] = []

  const translateOne = (line: string): string => {
    const out = ja(line)
    return splitSentences ? out.replace('。', '。\n') : out
  }

  const translate = async (text: string): Promise<string> => {
    sentTexts.push(text)
    const lines = text.split('\n')
    if (lines.length === 1) return translateOne(lines[0])

    const out: string[] = []
    let buffer: string[] = []
    for (const line of lines) {
      if (!line.trim()) continue // 空行を落とす
      buffer.push(line)
      if (/[.!?]$/.test(line.trim())) {
        out.push(buffer.map(ja).join(''))
        buffer = []
      }
    }
    if (buffer.length) out.push(buffer.map(ja).join(''))
    return out.join('\n')
  }

  return {
    translate,
    sentTexts,
    get callCount() {
      return sentTexts.length
    },
  }
}

/** 訳文配列が英文行と1:1で対応していることを検証する */
const expectAligned = (englishText: string, cache: TranslationCache) => {
  const englishLines = englishText.split('\n')
  const result = buildTranslationLines(englishLines, cache)

  expect(result).toHaveLength(englishLines.length)
  for (const line of result) {
    expect(line).not.toContain('\n')
  }
  englishLines.forEach((en, i) => {
    expect(result[i]).toBe(en.trim() ? ja(en.trim()) : '')
  })
  return result
}

describe('buildTranslationLines', () => {
  it('英文行と同じ長さの配列を返す', () => {
    const cache = new Map([['It was fun.', ja('It was fun.')]])
    const result = buildTranslationLines(['I went to the park.', 'It was fun.'], cache)
    expect(result).toHaveLength(2)
  })

  it('未訳行は空文字で埋め、既訳行の位置を保つ', () => {
    const cache = new Map([['It was fun.', ja('It was fun.')]])
    const result = buildTranslationLines(
      ['I went to the park.', 'It was fun.', 'See you tomorrow.'],
      cache
    )
    expect(result).toEqual(['', ja('It was fun.'), ''])
  })

  it('空行はAPIを介さずそのまま空行になる', () => {
    const result = buildTranslationLines(['', '   '], new Map())
    expect(result).toEqual(['', ''])
  })

  it('前後の空白を無視してキャッシュを引く', () => {
    const cache = new Map([['It was fun.', ja('It was fun.')]])
    expect(buildTranslationLines(['  It was fun.  '], cache)).toEqual([ja('It was fun.')])
  })
})

describe('collectUntranslatedLines', () => {
  it('空行と翻訳済みの行を除外する', () => {
    const cache = new Map([['It was fun.', ja('It was fun.')]])
    expect(collectUntranslatedLines(['I went to the park.', '', 'It was fun.'], cache)).toEqual([
      'I went to the park.',
    ])
  })

  it('同じ英文が複数行あっても1回だけ返す', () => {
    expect(collectUntranslatedLines(['It was fun.', 'It was fun.'], new Map())).toEqual([
      'It was fun.',
    ])
  })
})

describe('toCacheKey / toSingleLine', () => {
  it('キーは前後の空白を落とす', () => {
    expect(toCacheKey('  hello  ')).toBe('hello')
    expect(toCacheKey('   ')).toBe('')
  })

  it('訳文の改行を詰めて1行にする', () => {
    expect(toSingleLine('こんにちは。\nお元気ですか？')).toBe('こんにちは。お元気ですか？')
    expect(toSingleLine('楽しかったです。\n')).toBe('楽しかったです。')
  })
})

describe('seedTranslationCache', () => {
  it('行数が一致するノートは取り込む', () => {
    const cache: TranslationCache = new Map()
    seedTranslationCache(
      cache,
      ['I went to the park.', '', 'It was fun.'],
      [ja('I went to the park.'), '', ja('It was fun.')]
    )
    expect(cache.size).toBe(2)
    expect(cache.get('It was fun.')).toBe(ja('It was fun.'))
  })

  it('行数が一致しないノートは取り込まない（対応が崩れているため）', () => {
    const cache: TranslationCache = new Map()
    seedTranslationCache(
      cache,
      ['I went to the park.', '', 'It was fun.'],
      [ja('I went to the park.'), ja('It was fun.')]
    )
    expect(cache.size).toBe(0)
  })
})

describe('fillTranslationCache', () => {
  it('行の結合と空行の消失が起きても対応がずれない', async () => {
    // 従来ズレていた条件: 空行あり + ピリオド無しの行あり
    const englishText = [
      'I went to the park.',
      '',
      'My name is Ken', // ピリオド無し -> 次行と結合されやすい
      'It was fun.',
      '',
      'I ate ice cream.',
    ].join('\n')
    const cache: TranslationCache = new Map()
    const translator = createFlakyTranslator()

    await fillTranslationCache(
      collectUntranslatedLines(englishText.split('\n'), cache),
      cache,
      translator.translate
    )

    const result = expectAligned(englishText, cache)
    expect(result[1]).toBe('')
    expect(result[4]).toBe('')
  })

  it('1文が複数行に分割されて返っても表示行がずれない', async () => {
    const englishText = 'I went to the park.\nIt was fun.'
    const cache: TranslationCache = new Map()
    const translator = createFlakyTranslator({ splitSentences: true })

    await fillTranslationCache(
      collectUntranslatedLines(englishText.split('\n'), cache),
      cache,
      translator.translate
    )

    expectAligned(englishText, cache)
  })

  it('1行だけの場合は分割せずそのまま採用する', async () => {
    const cache: TranslationCache = new Map()
    const translator = createFlakyTranslator()

    await fillTranslationCache(['It was fun.'], cache, translator.translate)

    expect(translator.callCount).toBe(1)
    expect(translator.sentTexts[0]).toBe('It was fun.')
    expect(cache.get('It was fun.')).toBe(ja('It was fun.'))
  })

  it('増分翻訳: 追加された1行だけを送る', async () => {
    const cache: TranslationCache = new Map()
    const translator = createFlakyTranslator()
    const first = 'I went to the park.\nIt was fun.'
    await fillTranslationCache(
      collectUntranslatedLines(first.split('\n'), cache),
      cache,
      translator.translate
    )
    const callsAfterFirst = translator.callCount

    const second = `${first}\nI ate ice cream.`
    const pending = collectUntranslatedLines(second.split('\n'), cache)

    expect(pending).toEqual(['I ate ice cream.'])
    await fillTranslationCache(pending, cache, translator.translate)
    expect(translator.callCount - callsAfterFirst).toBe(1)
    expect(translator.sentTexts.at(-1)).not.toContain('\n')
    expectAligned(second, cache)
  })

  it('行を削除・並べ替えしても再翻訳が不要', async () => {
    const cache: TranslationCache = new Map()
    const translator = createFlakyTranslator()
    const original = 'I went to the park.\nIt was fun.\nI ate ice cream.'
    await fillTranslationCache(
      collectUntranslatedLines(original.split('\n'), cache),
      cache,
      translator.translate
    )

    const edited = 'I ate ice cream.\nI went to the park.'
    expect(collectUntranslatedLines(edited.split('\n'), cache)).toEqual([])
    expectAligned(edited, cache)
  })

  it('未訳行が無ければAPIを呼ばない', async () => {
    const translator = createFlakyTranslator()
    await fillTranslationCache([], new Map(), translator.translate)
    expect(translator.callCount).toBe(0)
  })

  it('長文は送信前に分割し、1リクエストが上限を超えない', async () => {
    // 1行約200文字 × 400行 = 約8万文字
    const englishLines = Array.from({ length: 400 }, (_, i) => `${'x'.repeat(190)} line${i}.`)
    const cache: TranslationCache = new Map()
    let maxRequestChars = 0

    const translate = async (text: string): Promise<string> => {
      maxRequestChars = Math.max(maxRequestChars, text.length)
      if (text.length > 30000) throw new Error(`API limit exceeded: ${text.length}`)
      return text
        .split('\n')
        .map((l) => `訳:${l}`)
        .join('\n')
    }

    await fillTranslationCache(collectUntranslatedLines(englishLines, cache), cache, translate)

    expect(maxRequestChars).toBeLessThanOrEqual(MAX_REQUEST_CHARS)
    expect(cache.size).toBe(400)
    const result = buildTranslationLines(englishLines, cache)
    expect(result).toHaveLength(400)
    result.forEach((got, i) => expect(got).toBe(`訳:${englishLines[i]}`))
  })

  it('分割のたびに進捗を通知し、合計が総行数と一致する', async () => {
    const englishLines = Array.from({ length: 400 }, (_, i) => `${'x'.repeat(190)} line${i}.`)
    const cache: TranslationCache = new Map()
    const translate = async (text: string): Promise<string> =>
      text
        .split('\n')
        .map((l) => `訳:${l}`)
        .join('\n')

    const progress: number[] = []
    let completed = 0
    await fillTranslationCache(englishLines, cache, translate, (n) => {
      completed += n
      progress.push(completed)
    })

    expect(progress.length).toBeGreaterThan(1)
    expect(progress).toEqual([...progress].sort((a, b) => a - b))
    expect(completed).toBe(englishLines.length)
  })

  it('APIが失敗したら例外を伝播し、失敗内容をキャッシュしない', async () => {
    const cache: TranslationCache = new Map()
    const translate = vi.fn(async () => {
      throw new Error('Translation API returned an error')
    })

    await expect(fillTranslationCache(['It was fun.'], cache, translate)).rejects.toThrow(
      'Translation API returned an error'
    )
    expect(cache.size).toBe(0)
  })
})
