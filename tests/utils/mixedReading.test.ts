import { describe, it, expect } from 'vitest'
import { buildMixedLines, countMixableLines, findLineHint } from '../../src/utils/mixedReading'

const EN = [
  'I woke up early this morning.',
  'It was raining outside.',
  'I made a cup of coffee.',
  'Then I read the newspaper.',
  'The news was about the election.',
  'I did not care much about it.',
  'The train was a little late.',
  'Still, I arrived on time.',
  'My colleague was already there.',
  'We have three meetings today.',
]
const JA = [
  '今朝は早く目が覚めた。',
  '外は雨が降っていた。',
  'コーヒーを一杯淹れた。',
  'それから新聞を読んだ。',
  'ニュースは選挙の話だった。',
  'あまり気にならなかった。',
  '電車は少し遅れていた。',
  'それでも時間通りに着いた。',
  '同僚はもう来ていた。',
  '今日は会議が三つある。',
]

/** 各行が英語表示になっているか */
const englishFlags = (percent: number): boolean[] =>
  buildMixedLines(EN, JA, percent).map((line, index) => line === EN[index])

describe('buildMixedLines', () => {
  it('0% では全行が訳文になる', () => {
    expect(buildMixedLines(EN, JA, 0)).toEqual(JA)
  })

  it('100% では全行が英文になる', () => {
    expect(buildMixedLines(EN, JA, 100)).toEqual(EN)
  })

  it('行数は常に英文行数と一致する（行インデックスの対応が崩れない）', () => {
    for (let percent = 0; percent <= 100; percent += 10) {
      expect(buildMixedLines(EN, JA, percent)).toHaveLength(EN.length)
    }
  })

  it('英語率を上げても、英語だった行が訳文に戻らない（単調性）', () => {
    // 学習者が 30%→50% と上げたとき、読んだ行が入れ替わると読み直しになる
    let previous = englishFlags(0)

    for (let percent = 1; percent <= 100; percent += 1) {
      const current = englishFlags(percent)
      current.forEach((isEnglish, index) => {
        if (previous[index]) expect(isEnglish).toBe(true)
      })
      previous = current
    }
  })

  it('英語率どおりの行数が英語になる', () => {
    expect(englishFlags(50).filter(Boolean)).toHaveLength(5)
    expect(englishFlags(30).filter(Boolean)).toHaveLength(3)
  })

  it('英語行が均等に散らばる（前後の日本語が文脈として残る）', () => {
    // 三距離定理により、英語行どうしの間隔は最大3種類の値しか取らない。
    // 間隔がばらつかない＝英語がまとまって現れないということ
    const longLines = Array.from({ length: 60 }, (_, i) => `English line ${i}.`)
    const longTranslations = longLines.map((_, i) => `日本語の行 ${i}。`)

    for (let percent = 10; percent <= 90; percent += 10) {
      const englishIndexes = buildMixedLines(longLines, longTranslations, percent)
        .map((line, index) => (line === longLines[index] ? index : -1))
        .filter((index) => index >= 0)
      const gaps = englishIndexes.slice(1).map((value, i) => value - englishIndexes[i])

      expect(new Set(gaps).size).toBeLessThanOrEqual(3)
    }
  })

  it('少数派の言語が3行以上続かない', () => {
    // 英語率が低いうちは英語が、高くなったら日本語が「ぽつぽつ」現れてほしい。
    // 少数派がまとまると、混ぜて読む意味が薄れる
    const longLines = Array.from({ length: 60 }, (_, i) => `English line ${i}.`)
    const longTranslations = longLines.map((_, i) => `日本語の行 ${i}。`)

    for (let percent = 10; percent <= 90; percent += 10) {
      const isEnglish = buildMixedLines(longLines, longTranslations, percent).map(
        (line, index) => line === longLines[index]
      )
      const minority = percent <= 50

      let run = 0
      let maxRun = 0
      for (const flag of isEnglish) {
        run = flag === minority ? run + 1 : 0
        maxRun = Math.max(maxRun, run)
      }

      expect(maxRun).toBeLessThanOrEqual(2)
    }
  })

  it('同じ入力からは常に同じ結果になる（決定的）', () => {
    expect(buildMixedLines(EN, JA, 40)).toEqual(buildMixedLines(EN, JA, 40))
  })

  it('英文が空の行は空行のまま残り、英語率の母数に入らない', () => {
    const english = ['Hello.', '', 'Good night.']
    const translations = ['こんにちは。', '', 'おやすみ。']

    // 空行が母数に入っていれば 50% で英語は1行しか出ない
    const mixed = buildMixedLines(english, translations, 50)

    expect(mixed[1]).toBe('')
    expect(mixed.filter((line, index) => line === english[index] && line !== '')).toHaveLength(1)
  })

  it('訳文が無い行は空行のままにする（入力中の行を実況しない）', () => {
    const english = ['Hello.', 'Not translated yet.', 'Good night.']
    const translations = ['こんにちは。', '', 'おやすみ。']

    for (const percent of [0, 50, 100]) {
      expect(buildMixedLines(english, translations, percent)[1]).toBe('')
    }
  })

  it('訳文配列が英文配列より短くても行数を保つ', () => {
    expect(buildMixedLines(EN, [], 50)).toEqual(EN.map(() => ''))
  })

  it('範囲外の英語率は 0〜100 に丸める', () => {
    expect(buildMixedLines(EN, JA, -20)).toEqual(JA)
    expect(buildMixedLines(EN, JA, 120)).toEqual(EN)
  })
})

describe('countMixableLines', () => {
  it('英文と訳文が揃っている行だけを数える', () => {
    const english = ['Hello.', '', 'Not translated yet.', 'Good night.']
    const translations = ['こんにちは。', '', '', 'おやすみ。']

    expect(countMixableLines(english, translations)).toBe(2)
  })

  it('訳文がひとつも無ければ 0 を返す', () => {
    expect(countMixableLines(EN, [])).toBe(0)
  })
})

describe('findLineHint', () => {
  const english = ['Hello.', 'Good night.', 'Not translated yet.', '']
  const translations = ['こんにちは。', 'おやすみ。', '', '']
  // 0行目は英文表示、1行目は訳文表示
  const display = ['Hello.', 'おやすみ。', '', '']

  it('英文が表示されている行には訳文を添える', () => {
    expect(findLineHint(0, display, english, translations)).toEqual({
      text: 'こんにちは。',
      lang: 'japanese',
    })
  })

  it('訳文が表示されている行には英文を添える', () => {
    expect(findLineHint(1, display, english, translations)).toEqual({
      text: 'Good night.',
      lang: 'english',
    })
  })

  it('まだ訳されていない行には何も添えない', () => {
    expect(findLineHint(2, display, english, translations)).toBeNull()
  })

  it('空行には何も添えない', () => {
    expect(findLineHint(3, display, english, translations)).toBeNull()
  })

  it('範囲外の行には何も添えない', () => {
    expect(findLineHint(99, display, english, translations)).toBeNull()
  })

  it('buildMixedLines の結果と組み合わせると、常に表示中と反対の言語を返す', () => {
    const englishLines = ['One.', 'Two.', 'Three.', 'Four.', 'Five.']
    const translationLines = ['いち。', 'に。', 'さん。', 'よん。', 'ご。']
    const displayLines = buildMixedLines(englishLines, translationLines, 50)

    displayLines.forEach((line, index) => {
      const hint = findLineHint(index, displayLines, englishLines, translationLines)
      expect(hint).not.toBeNull()
      // 表示中の行とヒントで言語が必ず食い違う
      expect(hint?.text).not.toBe(line)
      expect(hint?.lang).toBe(line === englishLines[index] ? 'japanese' : 'english')
    })
  })
})
