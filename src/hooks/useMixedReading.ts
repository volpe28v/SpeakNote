import { useCallback, useEffect, useRef, useState } from 'react'

// 英語率はノートごとの学習の進み具合そのものなので、ノート単位で覚えておく。
// Firestore に持たせるとスキーマと自動保存の経路に影響が出るため、
// 端末内の localStorage に閉じる。
const STORAGE_PREFIX = 'speaknote.mixRatio.'

const clampPercent = (percent: number): number => Math.min(Math.max(Math.round(percent), 0), 100)

// localStorage は Safari のプライベートモードや容量超過で例外を投げる。
// 英語率は復元できなくても読書は続けられるので、失敗は握りつぶす
const readStoredPercent = (noteId: number): number | null => {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${noteId}`)
    if (raw === null) return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? clampPercent(parsed) : null
  } catch {
    return null
  }
}

const writeStoredPercent = (noteId: number, percent: number): void => {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${noteId}`, String(percent))
  } catch {
    // 保存できなくてもこのセッションの表示には影響しない
  }
}

export interface MixedReading {
  /** 日本語ペインで英語を表示する割合（0〜100） */
  englishPercent: number
  setEnglishPercent: (percent: number) => void
  /**
   * 表示対象のノートが切り替わったときに英語率を入れ替える。
   * ノートを開いた場合はその ID の保存値、新規ノートの場合は 0 に戻す。
   */
  loadForNote: (noteId: number | null) => void
}

/**
 * 日本語ペインの英語率を保持し、ノートごとに復元する。
 *
 * @param noteId 編集中のノートID（未保存の新規ノートは null）
 */
export function useMixedReading(noteId: number | null): MixedReading {
  const [englishPercent, setPercent] = useState(0)

  // 「ノートに ID が付いた瞬間」の effect から最新の英語率を読むための参照。
  // englishPercent を effect の依存に入れると、スライダーを動かすたびに
  // ノート切り替えの処理が走ってしまう
  const percentRef = useRef(englishPercent)
  const noteIdRef = useRef(noteId)
  noteIdRef.current = noteId

  const setEnglishPercent = useCallback((percent: number) => {
    const clamped = clampPercent(percent)
    percentRef.current = clamped
    setPercent(clamped)

    if (noteIdRef.current !== null) {
      writeStoredPercent(noteIdRef.current, clamped)
    }
  }, [])

  const loadForNote = useCallback((targetNoteId: number | null) => {
    const restored = targetNoteId === null ? 0 : (readStoredPercent(targetNoteId) ?? 0)
    percentRef.current = restored
    setPercent(restored)
  }, [])

  // 未保存の新規ノートが自動保存で ID を得たとき、それまでの英語率をその ID に引き継ぐ。
  // ここで保存値を読みに行く実装にすると、翻訳して英語率を上げた直後に
  // 自動保存が走った瞬間、スライダーが 0% に戻ってしまう。
  // ノートを開いたときの復元は loadForNote が担当するため、ここでは書き出しだけでよい。
  useEffect(() => {
    if (noteId === null) return
    writeStoredPercent(noteId, percentRef.current)
  }, [noteId])

  return { englishPercent, setEnglishPercent, loadForNote }
}
