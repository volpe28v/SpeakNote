import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTranslation } from '../../src/hooks/useTranslation'

// トーストは DOM 直接操作なのでテストでは黙らせる
vi.mock('../../src/lib/toast', () => ({
  deferredToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

/** 送信された英文を記録しつつ、行ごとに「訳:」を付けて返す翻訳APIのスタブ */
const createFetchStub = () => {
  const sentTexts: string[] = []

  const fetchStub = vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}'))
    sentTexts.push(body.text)
    return {
      ok: true,
      json: async () => ({
        success: true,
        text: body.text
          .split('\n')
          .map((line: string) => `訳:${line}`)
          .join('\n'),
      }),
    } as unknown as Response
  })

  return { fetchStub, sentTexts }
}

describe('useTranslation', () => {
  let sentTexts: string[]

  beforeEach(() => {
    const stub = createFetchStub()
    sentTexts = stub.sentTexts
    vi.stubGlobal('fetch', stub.fetchStub)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('訳文行は英文行と同じ長さになる', async () => {
    const { result } = renderHook(() => useTranslation())

    await act(async () => {
      await result.current.performAutoTranslation('I am ok.\n\nIt was fun.')
    })

    expect(result.current.translationLines).toHaveLength(3)
    expect(result.current.translationLines[1]).toBe('') // 空行は空行のまま
  })

  it('2回目以降は未訳の行だけを送る（増分翻訳）', async () => {
    const { result } = renderHook(() => useTranslation())

    await act(async () => {
      await result.current.performAutoTranslation('I am ok.')
    })
    expect(sentTexts).toEqual(['I am ok.'])

    await act(async () => {
      await result.current.performAutoTranslation('I am ok.\nIt was fun.')
    })

    // 追加された行だけが送られる
    expect(sentTexts).toEqual(['I am ok.', 'It was fun.'])
    expect(result.current.translationLines).toEqual(['訳:I am ok.', '訳:It was fun.'])
  })

  it('既訳の行しかなければAPIを呼ばない', async () => {
    const { result } = renderHook(() => useTranslation())

    await act(async () => {
      await result.current.performAutoTranslation('I am ok.')
    })
    const callsAfterFirst = sentTexts.length

    await act(async () => {
      await result.current.performAutoTranslation('I am ok.')
    })

    expect(sentTexts.length).toBe(callsAfterFirst)
  })

  it('行を削除しても残った行の対応が保たれる', async () => {
    const { result } = renderHook(() => useTranslation())

    await act(async () => {
      await result.current.performAutoTranslation('A one.\nB two.\nC three.')
    })

    await act(async () => {
      await result.current.performAutoTranslation('A one.\nC three.')
    })

    expect(result.current.translationLines).toEqual(['訳:A one.', '訳:C three.'])
  })

  it('手動翻訳はキャッシュを捨てて訳し直す', async () => {
    const { result } = renderHook(() => useTranslation())

    await act(async () => {
      await result.current.performAutoTranslation('I am ok.')
    })
    expect(sentTexts).toHaveLength(1)

    await act(async () => {
      await result.current.handleTranslate('I am ok.')
    })

    // キャッシュを無視して再送する（対応が崩れた既存ノートの修復手段）
    expect(sentTexts).toEqual(['I am ok.', 'I am ok.'])
  })

  it('保存済みノートは行数が一致するときだけキャッシュに取り込む', async () => {
    const { result } = renderHook(() => useTranslation())

    // 行数が一致 -> 取り込まれるので再翻訳されない
    act(() => {
      result.current.loadTranslations('A one.\nB two.', ['訳:A one.', '訳:B two.'])
    })
    await act(async () => {
      await result.current.performAutoTranslation('A one.\nB two.')
    })
    expect(sentTexts).toHaveLength(0)

    // 行数が不一致 -> 対応が崩れているため取り込まず、訳し直す
    act(() => {
      result.current.loadTranslations('C one.\nD two.', ['訳:C one.'])
    })
    await act(async () => {
      await result.current.performAutoTranslation('C one.\nD two.')
    })
    expect(sentTexts).toHaveLength(1)
    expect(result.current.translationLines).toEqual(['訳:C one.', '訳:D two.'])
  })

  it('翻訳中に届いた変更を取りこぼさない', async () => {
    const { result } = renderHook(() => useTranslation())

    // 1つ目を待たずに2つ目を投げる
    await act(async () => {
      const first = result.current.performAutoTranslation('A one.')
      const second = result.current.performAutoTranslation('A one.\nB two.')
      await Promise.all([first, second])
    })

    // 2つ目が捨てられず、最終状態に反映されている
    await waitFor(() => {
      expect(result.current.translationLines).toEqual(['訳:A one.', '訳:B two.'])
    })
  })

  it('APIが失敗したら訳文を書き換えない', async () => {
    const { result } = renderHook(() => useTranslation())

    await act(async () => {
      await result.current.performAutoTranslation('A one.')
    })
    expect(result.current.translationLines).toEqual(['訳:A one.'])

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ success: false, error: 'boom' }) }))
    )

    await act(async () => {
      await result.current.performAutoTranslation('A one.\nB two.')
    })

    // 失敗した内容がキャッシュされたり、途中状態で上書きされたりしない
    expect(result.current.translationLines).toEqual(['訳:A one.'])
  })

  it('クリアするとキャッシュも消え、次回は訳し直す', async () => {
    const { result } = renderHook(() => useTranslation())

    await act(async () => {
      await result.current.performAutoTranslation('A one.')
    })
    act(() => {
      result.current.clearTranslationLines()
    })
    expect(result.current.translationLines).toEqual([])

    await act(async () => {
      await result.current.performAutoTranslation('A one.')
    })
    expect(sentTexts).toEqual(['A one.', 'A one.'])
  })
})
