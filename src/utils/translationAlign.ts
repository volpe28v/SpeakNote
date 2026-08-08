// 英文行と訳文行の1:1対応を保証するためのユーティリティ
//
// 訳文配列は「翻訳APIのレスポンスを改行で分割したもの」ではなく、
// 「英文行をキーにキャッシュを引いて組み立てたもの」として扱う。
// これにより訳文配列の長さは常に英文行数と一致し、行の対応がずれない。

export type TranslationCache = Map<string, string>

/**
 * 英文1行からキャッシュのキーを作る
 * @param line 英文の1行
 * @returns キャッシュキー（空行の場合は空文字）
 */
export const toCacheKey = (line: string): string => line.trim()

/**
 * 訳文を1行に正規化する。
 * 翻訳側が1文を複数行に分割して返した場合、そのままキャッシュすると表示上の行がずれるため、
 * 改行を取り除いて1行にまとめる（訳出先が日本語のため空白は挟まない）。
 * @param text 翻訳APIが返した訳文
 * @returns 改行を含まない訳文
 */
export const toSingleLine = (text: string): string => text.replace(/\s*\n+\s*/g, '').trim()

/**
 * 英文行の配列とキャッシュから訳文行の配列を組み立てる
 * @param englishLines 英文の行配列
 * @param cache 英文行 → 訳文のキャッシュ
 * @returns englishLinesと同じ長さの訳文行配列（空行・未訳行は空文字）
 */
export const buildTranslationLines = (englishLines: string[], cache: TranslationCache): string[] =>
  englishLines.map((line) => {
    const key = toCacheKey(line)
    if (!key) return ''
    return cache.get(key) ?? ''
  })

/**
 * まだ翻訳されていない行を重複なしで抽出する
 * @param englishLines 英文の行配列
 * @param cache 英文行 → 訳文のキャッシュ
 * @returns 翻訳が必要な行の配列（空行・翻訳済みの行は含まない）
 */
export const collectUntranslatedLines = (
  englishLines: string[],
  cache: TranslationCache
): string[] => {
  const pending: string[] = []
  const seen = new Set<string>()

  for (const line of englishLines) {
    const key = toCacheKey(line)
    if (!key || cache.has(key) || seen.has(key)) continue
    seen.add(key)
    pending.push(key)
  }

  return pending
}

/**
 * 保存済みノートの訳文をキャッシュに取り込む。
 * 行数が一致しないノートは対応が崩れているため取り込まず、次回の翻訳で作り直させる。
 * @param cache 取り込み先のキャッシュ
 * @param englishLines 英文の行配列
 * @param translations 保存済みの訳文行配列
 */
export const seedTranslationCache = (
  cache: TranslationCache,
  englishLines: string[],
  translations: string[]
): void => {
  if (englishLines.length !== translations.length) return

  englishLines.forEach((line, index) => {
    const key = toCacheKey(line)
    const translated = translations[index]?.trim()
    if (key && translated) {
      cache.set(key, translated)
    }
  })
}

// 1リクエストで送る文字数の上限。翻訳APIの上限（30000文字）に対して余裕を取る
export const MAX_REQUEST_CHARS = 20000

/**
 * 未訳の行をキャッシュに補充する。
 * 1行なら分割不要、複数行はまとめて送って行数を検証する。
 * 文字数が多すぎる場合と、翻訳側が行を結合・分割した場合は、
 * 範囲を半分に絞って訳し直すことで対応が取れる単位まで追い込む。
 * @param lines 翻訳が必要な行（collectUntranslatedLinesの戻り値）
 * @param cache 補充先のキャッシュ
 * @param requestTranslation 翻訳APIの呼び出し（失敗時は例外を投げること）
 * @param onLinesFilled 訳文が確定するたびに、その行数を通知するコールバック
 */
export const fillTranslationCache = async (
  lines: string[],
  cache: TranslationCache,
  requestTranslation: (text: string) => Promise<string>,
  onLinesFilled?: (count: number) => void
): Promise<void> => {
  if (lines.length === 0) return

  // 1行だけならレスポンス全体がその行の訳文。分割しないためずれる余地がない
  if (lines.length === 1) {
    cache.set(lines[0], toSingleLine(await requestTranslation(lines[0])))
    onLinesFilled?.(1)
    return
  }

  const joined = lines.join('\n')

  // 上限を超える量は送らず、先に分割する
  if (joined.length <= MAX_REQUEST_CHARS) {
    const translated = (await requestTranslation(joined)).split('\n')

    if (translated.length === lines.length) {
      lines.forEach((line, index) => cache.set(line, toSingleLine(translated[index])))
      onLinesFilled?.(lines.length)
      return
    }

    console.warn(
      `Translation returned ${translated.length} lines for ${lines.length} inputs; retrying in smaller batches`
    )
  }

  const mid = Math.ceil(lines.length / 2)
  await fillTranslationCache(lines.slice(0, mid), cache, requestTranslation, onLinesFilled)
  await fillTranslationCache(lines.slice(mid), cache, requestTranslation, onLinesFilled)
}
