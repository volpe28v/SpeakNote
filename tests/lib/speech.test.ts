import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { speakWithFallback } from '../../src/lib/speech'

/**
 * speechSynthesis のスタブ。
 * 発話を始めるか、完了通知を返すかを個別に制御できるようにして、
 * 実機で再現しにくい「固まった状態」を作れるようにする。
 */
const createSpeechStub = ({ startsSpeaking = true } = {}) => {
  const utterances: SpeechSynthesisUtterance[] = []

  const stub = {
    speaking: false,
    pending: false,
    cancel: vi.fn(() => {
      stub.speaking = false
    }),
    speak: vi.fn((utterance: SpeechSynthesisUtterance) => {
      utterances.push(utterance)
      stub.speaking = startsSpeaking
    }),
    getVoices: vi.fn(() => []),
  }

  return { stub, utterances }
}

describe('speakWithFallback', () => {
  let utterances: SpeechSynthesisUtterance[]

  const setup = (options?: { startsSpeaking?: boolean }) => {
    const { stub, utterances: list } = createSpeechStub(options)
    utterances = list
    vi.stubGlobal('speechSynthesis', stub)
    return stub
  }

  beforeEach(() => {
    vi.useFakeTimers()
    // jsdom には SpeechSynthesisUtterance が無いので最小限を用意する
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string
        lang = ''
        rate = 1
        pitch = 1
        volume = 1
        voice: unknown = null
        onend: ((event?: unknown) => void) | null = null
        onerror: ((event?: unknown) => void) | null = null
        constructor(text: string) {
          this.text = text
        }
      }
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('読み上げ完了で1回だけ通知する', () => {
    setup()
    const onDone = vi.fn()

    speakWithFallback('Hello.', 'english', onDone)
    expect(onDone).not.toHaveBeenCalled()

    utterances[0].onend?.(new Event('end') as SpeechSynthesisEvent)
    expect(onDone).toHaveBeenCalledTimes(1)

    // タイムアウトが後から発火しても二重に呼ばれない
    vi.advanceTimersByTime(60000)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('読み上げ失敗でも通知する', () => {
    setup()
    const onDone = vi.fn()

    speakWithFallback('Hello.', 'english', onDone)
    utterances[0].onerror?.(new Event('error') as SpeechSynthesisErrorEvent)

    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('発話が始まらなければ早めに諦めて次へ進む', () => {
    // iOS で発話エンジンが固まり speak() が無視される状況
    setup({ startsSpeaking: false })
    const onDone = vi.fn()

    speakWithFallback('Hello.', 'english', onDone)

    vi.advanceTimersByTime(499)
    expect(onDone).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('発話は始まったが完了通知が来ない場合も必ず抜ける', () => {
    setup({ startsSpeaking: true })
    const onDone = vi.fn()

    speakWithFallback('Hello.', 'english', onDone)

    // 開始確認は通過するので、ここではまだ待ち続ける
    vi.advanceTimersByTime(600)
    expect(onDone).not.toHaveBeenCalled()

    // 文長に応じた上限で必ず脱出する
    vi.advanceTimersByTime(60000)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('長い文ほど待ち時間が長い', () => {
    setup({ startsSpeaking: true })
    const shortDone = vi.fn()
    speakWithFallback('Hi.', 'english', shortDone)
    vi.advanceTimersByTime(3000 + 3 * 200)
    expect(shortDone).toHaveBeenCalledTimes(1)

    vi.clearAllTimers()
    const longText = 'x'.repeat(100)
    const longDone = vi.fn()
    speakWithFallback(longText, 'english', longDone)
    vi.advanceTimersByTime(3000 + 3 * 200)
    expect(longDone).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100 * 200)
    expect(longDone).toHaveBeenCalledTimes(1)
  })

  it('打ち切ると以後は通知されない', () => {
    setup()
    const onDone = vi.fn()

    const cancel = speakWithFallback('Hello.', 'english', onDone)
    cancel()

    utterances[0].onend?.(new Event('end') as SpeechSynthesisEvent)
    vi.advanceTimersByTime(60000)

    expect(onDone).not.toHaveBeenCalled()
  })
})
