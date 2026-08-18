import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMixedReading } from '../../src/hooks/useMixedReading'

const storedPercent = (noteId: number): string | null =>
  localStorage.getItem(`speaknote.mixRatio.${noteId}`)

describe('useMixedReading', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('初期状態は0%（全行が訳文）', () => {
    const { result } = renderHook(() => useMixedReading(null))

    expect(result.current.englishPercent).toBe(0)
  })

  it('英語率を変えるとノートIDごとに保存される', () => {
    const { result } = renderHook(() => useMixedReading(1))

    act(() => result.current.setEnglishPercent(50))

    expect(result.current.englishPercent).toBe(50)
    expect(storedPercent(1)).toBe('50')
  })

  it('ノートを開くと、そのノートに保存された英語率が復元される', () => {
    localStorage.setItem('speaknote.mixRatio.2', '70')
    const { result, rerender } = renderHook(({ noteId }) => useMixedReading(noteId), {
      initialProps: { noteId: 1 as number | null },
    })

    act(() => result.current.setEnglishPercent(30))
    act(() => result.current.loadForNote(2))
    rerender({ noteId: 2 })

    expect(result.current.englishPercent).toBe(70)
    // 元のノートの英語率は書き換わらない
    expect(storedPercent(1)).toBe('30')
  })

  it('保存された英語率が無いノートを開くと0%に戻る', () => {
    const { result, rerender } = renderHook(({ noteId }) => useMixedReading(noteId), {
      initialProps: { noteId: 1 as number | null },
    })

    act(() => result.current.setEnglishPercent(60))
    act(() => result.current.loadForNote(3))
    rerender({ noteId: 3 })

    expect(result.current.englishPercent).toBe(0)
  })

  it('新規ノートを始めると0%に戻る', () => {
    const { result, rerender } = renderHook(({ noteId }) => useMixedReading(noteId), {
      initialProps: { noteId: 1 as number | null },
    })

    act(() => result.current.setEnglishPercent(60))
    act(() => result.current.loadForNote(null))
    rerender({ noteId: null })

    expect(result.current.englishPercent).toBe(0)
  })

  it('未保存の新規ノートが自動保存でIDを得ても英語率が0%に戻らない', () => {
    // 翻訳して英語率を上げた直後に自動保存が走るのは普通の流れ。
    // ここで保存値を読みに行く実装だとスライダーが勝手に戻る
    const { result, rerender } = renderHook(({ noteId }) => useMixedReading(noteId), {
      initialProps: { noteId: null as number | null },
    })

    act(() => result.current.setEnglishPercent(40))
    rerender({ noteId: 9 })

    expect(result.current.englishPercent).toBe(40)
    expect(storedPercent(9)).toBe('40')
  })

  it('範囲外の値は0〜100に丸めて保存する', () => {
    const { result } = renderHook(() => useMixedReading(1))

    act(() => result.current.setEnglishPercent(140))
    expect(result.current.englishPercent).toBe(100)

    act(() => result.current.setEnglishPercent(-10))
    expect(result.current.englishPercent).toBe(0)
  })

  it('壊れた保存値は無視して0%にする', () => {
    localStorage.setItem('speaknote.mixRatio.4', 'broken')
    const { result } = renderHook(() => useMixedReading(null))

    act(() => result.current.loadForNote(4))

    expect(result.current.englishPercent).toBe(0)
  })
})
