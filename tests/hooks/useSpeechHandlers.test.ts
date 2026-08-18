import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSpeechHandlers } from '../../src/hooks/useSpeechHandlers'
import { speakEnglish, speakJapanese } from '../../src/lib/speech'

vi.mock('../../src/lib/speech', () => ({
  speakEnglish: vi.fn(),
  speakJapanese: vi.fn(),
}))

const ENGLISH_TEXT = ['I woke up early.', 'Then I read the newspaper.'].join('\n')
const TRANSLATION_LINES = ['早く目が覚めた。', 'それから新聞を読んだ。']

const setup = (overrides: Partial<Parameters<typeof useSpeechHandlers>[0]> = {}) =>
  renderHook(() =>
    useSpeechHandlers({
      englishText: ENGLISH_TEXT,
      translationText: TRANSLATION_LINES.join('\n'),
      selectedText: '',
      selectedEnglishText: '',
      highlightedLineIndex: null,
      translationLines: TRANSLATION_LINES,
      ...overrides,
    })
  )

describe('useSpeechHandlers の日本語読み上げ', () => {
  beforeEach(() => {
    vi.mocked(speakEnglish).mockClear()
    vi.mocked(speakJapanese).mockClear()
  })

  it('日本語を選択したらそのまま読み上げる', () => {
    const { result } = setup({ selectedText: 'それから新聞を読んだ。', highlightedLineIndex: 1 })

    result.current.handleSpeakJapanese()

    expect(speakJapanese).toHaveBeenCalledWith('それから新聞を読んだ。')
  })

  it('混在表示の英文行を選んだら、その行の訳文を日本語で読み上げる', () => {
    const { result } = setup({
      selectedText: 'Then I read the newspaper.',
      highlightedLineIndex: 1,
    })

    result.current.handleSpeakJapanese()

    // 英文を日本語の音声で読ませない。かつ意味が分かるよう訳文を読む
    expect(speakJapanese).toHaveBeenCalledWith('それから新聞を読んだ。')
    expect(speakEnglish).not.toHaveBeenCalled()
  })

  it('訳が無い英文行を選んだら英語として読み上げる', () => {
    const { result } = setup({
      selectedText: 'Not translated yet.',
      highlightedLineIndex: 1,
      translationLines: ['早く目が覚めた。', ''],
    })

    result.current.handleSpeakJapanese()

    expect(speakEnglish).toHaveBeenCalledWith('Not translated yet.')
    expect(speakJapanese).not.toHaveBeenCalled()
  })

  it('何も選択していなければ訳文全体を読み上げる', () => {
    const { result } = setup()

    result.current.handleSpeakJapanese()

    expect(speakJapanese).toHaveBeenCalledWith(TRANSLATION_LINES.join('\n'))
  })
})
