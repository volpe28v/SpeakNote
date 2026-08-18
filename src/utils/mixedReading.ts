// 英文行と訳文行を混ぜて表示するためのユーティリティ
//
// 日本語の中に英語の行を混ぜると、英文だけを読み続けるより疲れにくく、
// 前後の日本語が文脈になって英文を推測しやすくなる。英語の割合を少しずつ
// 上げていくことで、読みたい英文を englishPercent=0 から 100 まで持ち上げる。
//
// 英文行と訳文行は translationAlign によって 1:1 に揃っているため、
// ここでは「行ごとにどちらを表示するか」を選ぶだけでよい。
// 行数は入力と同じままなので、行インデックスで動くハイライト同期や
// 行単位の読み上げには影響しない。

// 黄金比の共役。低食い違い列を作るための係数
const GOLDEN_RATIO_CONJUGATE = 0.6180339887498949

const frac = (value: number): number => value - Math.floor(value)

/**
 * 混在の対象になる行か判定する。
 * 英文が空の行と、まだ訳されていない行は切り替えようがないので英語率の母数から外す。
 */
const isMixable = (englishLine: string, translation: string | undefined): boolean =>
  Boolean(englishLine.trim()) && Boolean(translation?.trim())

/**
 * 混在対象の行のうち、何行目を英語にするか決めるスコアを返す。
 *
 * 黄金比の低食い違い列を使うのは、三距離定理により英語行の間隔が
 * 最大3種類の値しか取らず、どの英語率でも英語行が固まらないため。
 * 英語行の前後に日本語が残ることが、文脈から英文を推測できる条件になる。
 *
 * スコアは英語率に依存しないので、英語率を上げたとき既に英語だった行は
 * 英語のままで、英語行が増えるだけになる（単調性）。
 *
 * @param mixableIndex 混在対象の行に 0 から振った連番
 * @returns [0, 1) のスコア
 */
const englishScore = (mixableIndex: number): number =>
  frac((mixableIndex + 0.5) * GOLDEN_RATIO_CONJUGATE)

/**
 * 混在対象になる行数を数える
 * @param englishLines 英文の行配列
 * @param translationLines 訳文の行配列（englishLines と同じ長さ）
 * @returns 英語と日本語を切り替えられる行の数
 */
export const countMixableLines = (englishLines: string[], translationLines: string[]): number =>
  englishLines.reduce(
    (count, line, index) => (isMixable(line, translationLines[index]) ? count + 1 : count),
    0
  )

/**
 * 英語率に応じて英文行と訳文行を混ぜた表示用の行配列を作る。
 * 表示専用の派生値であり、保存される訳文（translationLines）は変更しない。
 *
 * @param englishLines 英文の行配列
 * @param translationLines 訳文の行配列（englishLines と同じ長さ）
 * @param englishPercent 英語で表示する割合（0〜100）
 * @returns englishLines と同じ長さの表示用行配列
 */
export const buildMixedLines = (
  englishLines: string[],
  translationLines: string[],
  englishPercent: number
): string[] => {
  const ratio = Math.min(Math.max(englishPercent, 0), 100) / 100
  const result: string[] = []
  let mixableIndex = 0

  for (const [index, englishLine] of englishLines.entries()) {
    const translation = translationLines[index]

    // 訳が無い行に英文を出すと、入力中の行を日本語ペインが実況してしまう。
    // 未訳のうちは今までどおり空行のままにする
    if (!isMixable(englishLine, translation)) {
      result.push('')
      continue
    }

    const isEnglish = englishScore(mixableIndex) < ratio
    mixableIndex += 1
    result.push(isEnglish ? englishLine : (translation as string))
  }

  return result
}

export type HintLanguage = 'english' | 'japanese'

export interface LineHint {
  text: string
  /** ヒントの言語。表示中の行とは必ず反対側になる */
  lang: HintLanguage
}

/**
 * 行に添えるヒントを返す。表示されているのが英文なら訳文を、訳文なら英文を返す。
 * どちらの言語を読んでいても、その場で反対側を確かめられるようにするため。
 *
 * @param lineIndex 対象の行インデックス
 * @param displayLines buildMixedLines が返した表示中の行配列
 * @param englishLines 英文の行配列
 * @param translationLines 訳文の行配列
 * @returns 添えるヒント。英文と訳文が揃っていなければ null
 */
export const findLineHint = (
  lineIndex: number,
  displayLines: string[],
  englishLines: string[],
  translationLines: string[]
): LineHint | null => {
  const englishLine = englishLines[lineIndex]
  const translation = translationLines[lineIndex]
  // 片方しか無い行は見比べようがない
  if (!englishLine?.trim() || !translation?.trim()) return null

  const displayed = displayLines[lineIndex]
  if (displayed === englishLine) return { text: translation.trim(), lang: 'japanese' }
  if (displayed === translation) return { text: englishLine.trim(), lang: 'english' }

  return null
}
