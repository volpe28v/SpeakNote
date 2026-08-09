import { describe, it, expect } from 'vitest'
import { removeEmojis, isDateOnly, extractValidPairs } from '../../src/utils/textUtils'

describe('removeEmojis', () => {
  it('絵文字を取り除く', () => {
    expect(removeEmojis('Hello 😀 World 🎉')).toBe('Hello  World ')
  })

  it('絵文字を含まない文字列はそのまま返す', () => {
    expect(removeEmojis('Hello World')).toBe('Hello World')
  })

  it('日本語はそのまま残す', () => {
    expect(removeEmojis('こんにちは😊')).toBe('こんにちは')
  })
})

describe('isDateOnly', () => {
  it.each([
    '2024/01/01',
    '2024-01-01',
    '12/25',
    'January 1, 2024',
    '1st January',
    '2024年1月1日',
    '1月1日',
  ])('日付のみの行を検出する: %s', (text) => {
    expect(isDateOnly(text)).toBe(true)
  })

  it.each(['I went to the park.', 'It was fun.', 'Meet me on 12/25', ''])(
    '日付以外は false を返す: %s',
    (text) => {
      expect(isDateOnly(text)).toBe(false)
    }
  )

  it('前後の空白を無視する', () => {
    expect(isDateOnly('  2024/01/01  ')).toBe(true)
  })
})

describe('extractValidPairs', () => {
  it('英日が揃っている行だけをペアにする', () => {
    const pairs = extractValidPairs(
      ['I went to the park.', 'It was fun.'],
      ['私は公園に行きました。', '楽しかったです。']
    )
    expect(pairs).toEqual([
      { english: 'I went to the park.', japanese: '私は公園に行きました。', originalIndex: 0 },
      { english: 'It was fun.', japanese: '楽しかったです。', originalIndex: 1 },
    ])
  })

  it('訳が空の行はペアにしない', () => {
    const pairs = extractValidPairs(
      ['I went to the park.', 'It was fun.'],
      ['私は公園に行きました。', '']
    )
    expect(pairs).toHaveLength(1)
    expect(pairs[0].originalIndex).toBe(0)
  })

  it('日付のみの行は出題対象から除外する', () => {
    const pairs = extractValidPairs(
      ['2024/01/01', 'It was fun.'],
      ['2024年1月1日', '楽しかったです。']
    )
    expect(pairs).toHaveLength(1)
    expect(pairs[0].english).toBe('It was fun.')
  })

  it('元の行番号を originalIndex として保持する', () => {
    const pairs = extractValidPairs(
      ['', 'I went to the park.', '', 'It was fun.'],
      ['', '私は公園に行きました。', '', '楽しかったです。']
    )
    expect(pairs.map((p) => p.originalIndex)).toEqual([1, 3])
  })

  it('配列の長さが違っても落ちない', () => {
    expect(extractValidPairs(['It was fun.'], [])).toEqual([])
    expect(extractValidPairs([], ['楽しかったです。'])).toEqual([])
  })

  it('前後の空白を落としてペアにする', () => {
    const pairs = extractValidPairs(['  It was fun.  '], ['  楽しかったです。  '])
    expect(pairs[0]).toEqual({
      english: 'It was fun.',
      japanese: '楽しかったです。',
      originalIndex: 0,
    })
  })
})
