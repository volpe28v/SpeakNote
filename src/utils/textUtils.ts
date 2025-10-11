// テキスト処理ユーティリティ関数

/**
 * 絵文字を除外する関数
 * @param text 処理対象のテキスト
 * @returns 絵文字を除去したテキスト
 */
export const removeEmojis = (text: string): string => {
  // 絵文字のUnicode範囲を除外
  return text.replace(
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F1AD}]|[\u{1F910}-\u{1F96B}]|[\u{1F980}-\u{1F9E0}]/gu,
    ''
  )
}

/**
 * 日付パターンの定義
 */
const DATE_PATTERNS = [
  /^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$/, // 2024/01/01, 2024-01-01
  /^\d{1,2}[/-]\d{1,2}$/, // 12/25, 01-15
  /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{0,4}$/i, // January 1, 2024
  /^\d{1,2}(st|nd|rd|th)\s+(January|February|March|April|May|June|July|August|September|October|November|December)$/i, // 1st January
  /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/i, // Monday, January 1
  /^\d{4}年\d{1,2}月\d{1,2}日$/, // 2024年1月1日
  /^\d{1,2}月\d{1,2}日$/, // 1月1日
] as const

/**
 * 日付のみの問題かどうかを判定する関数
 * @param text 判定対象のテキスト
 * @returns 日付のみの場合true
 */
export const isDateOnly = (text: string): boolean => {
  const cleanText = text.trim()
  return DATE_PATTERNS.some((pattern) => pattern.test(cleanText))
}

/**
 * 有効な練習ペアを抽出する関数
 * @param englishLines 英語のテキスト行配列
 * @param japaneseLines 日本語のテキスト行配列
 * @returns 有効な練習ペアの配列
 */
export const extractValidPairs = (
  englishLines: string[],
  japaneseLines: string[]
): Array<{ english: string; japanese: string; originalIndex: number }> => {
  const validPairs: Array<{ english: string; japanese: string; originalIndex: number }> = []
  const maxLines = Math.max(englishLines.length, japaneseLines.length)

  for (let i = 0; i < maxLines; i++) {
    const englishText = englishLines[i] || ''
    const japaneseText = japaneseLines[i] || ''

    // 英語と日本語の両方に内容があり、日付のみの問題でない場合のみ追加
    if (
      englishText.trim() &&
      japaneseText.trim() &&
      !isDateOnly(englishText) &&
      !isDateOnly(japaneseText)
    ) {
      validPairs.push({
        english: englishText.trim(),
        japanese: japaneseText.trim(),
        originalIndex: i,
      })
    }
  }

  return validPairs
}