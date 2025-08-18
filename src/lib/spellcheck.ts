import { EditorView, Decoration, DecorationSet } from '@codemirror/view'
import { StateField } from '@codemirror/state'
import Typo from 'typo-js'

// 英語辞書の初期化
let dictionary: Typo | null = null
let dictionaryPromise: Promise<Typo | null> | null = null

// 辞書の非同期読み込み
async function loadDictionary() {
  if (dictionary) return dictionary
  if (dictionaryPromise) return dictionaryPromise

  dictionaryPromise = (async () => {
    try {
      // CDNから辞書ファイルを読み込む
      const affResponse = await fetch(
        'https://cdn.jsdelivr.net/npm/typo-js@1.3.1/dictionaries/en_US/en_US.aff'
      )
      const dicResponse = await fetch(
        'https://cdn.jsdelivr.net/npm/typo-js@1.3.1/dictionaries/en_US/en_US.dic'
      )

      const affData = await affResponse.text()
      const dicData = await dicResponse.text()

      dictionary = new Typo('en_US', affData, dicData)
      return dictionary
    } catch (error) {
      console.error('Failed to load dictionary:', error)
      return null
    }
  })()

  return dictionaryPromise
}

// スペルミスのある単語に適用する装飾
const misspelledMark = Decoration.mark({
  attributes: { class: 'cm-spellcheck-error' },
})

// ドキュメントをスペルチェックして装飾を作成
function checkSpelling(doc: { toString(): string }): DecorationSet {
  if (!dictionary) return Decoration.none

  const decorationList: ReturnType<typeof misspelledMark.range>[] = []
  const text = doc.toString()
  const wordRegex = /\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b/g
  let match

  while ((match = wordRegex.exec(text)) !== null) {
    const word = match[0]
    const from = match.index
    const to = from + word.length

    // 辞書でスペルチェック
    if (!dictionary.check(word)) {
      // 一般的な略語や固有名詞は除外
      const commonWords = [
        'url',
        'api',
        'id',
        'ui',
        'ux',
        'app',
        'ok',
        'etc',
        'vs',
        'http',
        'https',
      ]
      if (!commonWords.includes(word.toLowerCase()) && word.length > 2) {
        decorationList.push(misspelledMark.range(from, to))
      }
    }
  }

  return Decoration.set(decorationList)
}

// スペルチェック用のStateField
export const spellCheckField = StateField.define<DecorationSet>({
  create(state) {
    return checkSpelling(state.doc)
  },

  update(decorations, tr) {
    // ドキュメントが変更された場合、または辞書が新しく読み込まれた場合に再チェック
    if (tr.docChanged || (!decorations.size && dictionary)) {
      return checkSpelling(tr.state.doc)
    }
    return decorations.map(tr.changes)
  },

  provide: (f) => EditorView.decorations.from(f),
})

// 辞書が読み込まれたらエディタを更新
let updateCallback: (() => void) | null = null

export function setUpdateCallback(callback: () => void) {
  updateCallback = callback
  // すでに辞書が読み込まれている場合はすぐに実行
  if (dictionary) {
    callback()
  }
}

// スペルチェック機能を初期化
export async function initSpellCheck() {
  const dict = await loadDictionary()
  if (dict && updateCallback) {
    updateCallback()
  }
}

// 単語の修正候補を取得
export function getSuggestions(word: string): string[] {
  if (!dictionary) return []
  return dictionary.suggest(word) || []
}
