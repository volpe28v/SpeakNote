import { EditorView, Decoration, DecorationSet } from '@codemirror/view'
import { StateField, type Text, type Transaction, type Range } from '@codemirror/state'
import Typo from 'typo-js'

// 英語辞書の初期化
let dictionary: Typo | null = null
let dictionaryPromise: Promise<Typo | null> | null = null
// 辞書が差し替わるたびに増える。StateField 側はこの値の変化で全文走査を判断する
let dictionaryGeneration = 0

const DICTIONARY_BASE_URL = 'https://cdn.jsdelivr.net/npm/typo-js@1.3.1/dictionaries/en_US'

// 取得失敗時に 404 の HTML をそのまま辞書として読み込むと、
// 例外にならないまま「壊れた辞書で動く」状態になるため必ず状態を確認する
async function fetchDictionaryFile(fileName: string): Promise<string> {
  const response = await fetch(`${DICTIONARY_BASE_URL}/${fileName}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${fileName}: ${response.status} ${response.statusText}`)
  }
  return response.text()
}

// 辞書の非同期読み込み
async function loadDictionary() {
  if (dictionary) return dictionary
  if (dictionaryPromise) return dictionaryPromise

  dictionaryPromise = (async () => {
    try {
      const [affData, dicData] = await Promise.all([
        fetchDictionaryFile('en_US.aff'),
        fetchDictionaryFile('en_US.dic'),
      ])

      dictionary = new Typo('en_US', affData, dicData)
      dictionaryGeneration += 1
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

// 一般的な略語や固有名詞は除外する。
// 3文字未満の語はそもそも検査対象外なので、ここには3文字以上のものだけを置く
const IGNORED_WORDS = new Set(['url', 'api', 'app', 'etc', 'http', 'https'])

const WORD_PATTERN = /\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b/g

/**
 * 指定範囲のスペルミスを探す
 * @param doc 対象ドキュメント
 * @param from 検査開始位置
 * @param to 検査終了位置
 * @returns スペルミス箇所の装飾範囲
 */
function findMisspellings(doc: Text, from: number, to: number): Range<Decoration>[] {
  if (!dictionary) return []

  const found: Range<Decoration>[] = []
  const text = doc.sliceString(from, to)
  WORD_PATTERN.lastIndex = 0

  let match
  while ((match = WORD_PATTERN.exec(text)) !== null) {
    const word = match[0]
    if (word.length <= 2 || IGNORED_WORDS.has(word.toLowerCase())) continue
    if (dictionary.check(word)) continue

    const start = from + match.index
    found.push(misspelledMark.range(start, start + word.length))
  }

  return found
}

/**
 * 変更のあった行だけを再検査する。
 * 文書全体を走査し直すと、長いノートでは1文字入力するたびに
 * 全単語の辞書引きが走って入力が重くなる。
 */
function updateChangedLines(decorations: DecorationSet, tr: Transaction): DecorationSet {
  const doc = tr.state.doc
  const dirty: { from: number; to: number }[] = []

  tr.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
    // 単語が編集境界をまたぐことがあるため、行単位に広げてから検査する
    dirty.push({ from: doc.lineAt(fromB).from, to: doc.lineAt(toB).to })
  })

  const mapped = decorations.map(tr.changes)
  if (dirty.length === 0) return mapped

  return mapped.update({
    // 再検査する範囲の古い装飾を捨てて、新しい結果で置き換える
    filter: (from, to) => !dirty.some((range) => from < range.to && to > range.from),
    add: dirty.flatMap((range) => findMisspellings(doc, range.from, range.to)),
    sort: true,
  })
}

interface SpellCheckState {
  decorations: DecorationSet
  // この装飾を作ったときの辞書世代
  generation: number
}

// スペルチェック用のStateField
export const spellCheckField = StateField.define<SpellCheckState>({
  create(state) {
    return {
      decorations: Decoration.set(findMisspellings(state.doc, 0, state.doc.length)),
      generation: dictionaryGeneration,
    }
  },

  update(value, tr) {
    // 辞書が読み込まれた直後だけ全文を走査し直す
    if (value.generation !== dictionaryGeneration) {
      return {
        decorations: Decoration.set(findMisspellings(tr.state.doc, 0, tr.state.doc.length)),
        generation: dictionaryGeneration,
      }
    }

    // 文書が変わっていなければ何もしない。
    // ここで再走査すると、選択移動や再構成のたびに全文チェックが走る
    if (!tr.docChanged) return value

    return { decorations: updateChangedLines(value.decorations, tr), generation: value.generation }
  },

  provide: (f) => EditorView.decorations.from(f, (value) => value.decorations),
})

// 辞書が読み込まれたらエディタを更新する。
// エディタは英語側・日本語側の2つがあるため、単一スロットではなく集合で保持する
// （単一スロットだと後からマウントされた側が前の登録を上書きしてしまう）
const dictionaryListeners = new Set<() => void>()

/**
 * 辞書ロード完了の通知を受け取る
 * @param listener 通知時に呼ぶコールバック
 * @returns 登録を解除する関数
 */
export function addDictionaryListener(listener: () => void): () => void {
  dictionaryListeners.add(listener)
  // すでに読み込み済みならすぐに反映させる
  if (dictionary) {
    listener()
  }
  return () => {
    dictionaryListeners.delete(listener)
  }
}

// スペルチェック機能を初期化
export async function initSpellCheck() {
  const dict = await loadDictionary()
  if (dict) {
    dictionaryListeners.forEach((listener) => listener())
  }
}
