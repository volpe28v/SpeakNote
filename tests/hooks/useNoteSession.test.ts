import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNoteSession } from '../../src/hooks/useNoteSession'

describe('useNoteSession', () => {
  it('初期状態は空で未変更', () => {
    const { result } = renderHook(() => useNoteSession())

    expect(result.current.englishText).toBe('')
    expect(result.current.isDirty).toBe(false)
  })

  it('入力すると未保存になる', () => {
    const { result } = renderHook(() => useNoteSession())

    act(() => result.current.setEnglishText('I am ok.'))

    expect(result.current.isDirty).toBe(true)
  })

  it('ノートを開いた直後は未変更', () => {
    const { result } = renderHook(() => useNoteSession())

    act(() => result.current.openNote({ text: 'I am ok.' }))

    expect(result.current.englishText).toBe('I am ok.')
    expect(result.current.isDirty).toBe(false)
  })

  it('保存すると未変更に戻る', () => {
    const { result } = renderHook(() => useNoteSession())

    act(() => result.current.setEnglishText('I am ok.'))
    expect(result.current.isDirty).toBe(true)

    act(() => result.current.markSaved('I am ok.'))
    expect(result.current.isDirty).toBe(false)
  })

  it('保存後にさらに編集すると再び未保存になる', () => {
    const { result } = renderHook(() => useNoteSession())

    act(() => result.current.openNote({ text: 'I am ok.' }))
    act(() => result.current.setEnglishText('I am ok. It was fun.'))

    expect(result.current.isDirty).toBe(true)
  })

  it('前後の空白だけの違いは変更とみなさない', () => {
    const { result } = renderHook(() => useNoteSession())

    act(() => result.current.openNote({ text: 'I am ok.' }))
    act(() => result.current.setEnglishText('  I am ok.  '))

    expect(result.current.isDirty).toBe(false)
  })

  it('新規ノートを開始すると空になり未変更', () => {
    const { result } = renderHook(() => useNoteSession())

    act(() => result.current.openNote({ text: 'I am ok.' }))
    act(() => result.current.setEnglishText('edited'))
    act(() => result.current.startNewNote())

    expect(result.current.englishText).toBe('')
    expect(result.current.isDirty).toBe(false)
  })

  it('保存した内容と異なる内容を markSaved しても基準はその内容になる', () => {
    // 自動保存は「保存した時点のテキスト」を基準にする必要がある。
    // 保存要求後に入力が進んでいれば、その差分は未保存として残る
    const { result } = renderHook(() => useNoteSession())

    act(() => result.current.setEnglishText('I am ok. It was fun.'))
    act(() => result.current.markSaved('I am ok.'))

    expect(result.current.isDirty).toBe(true)
  })

  it('アクションの参照はレンダーをまたいで安定している', () => {
    const { result, rerender } = renderHook(() => useNoteSession())
    const first = {
      setEnglishText: result.current.setEnglishText,
      openNote: result.current.openNote,
      startNewNote: result.current.startNewNote,
      markSaved: result.current.markSaved,
    }

    rerender()

    expect(result.current.setEnglishText).toBe(first.setEnglishText)
    expect(result.current.openNote).toBe(first.openNote)
    expect(result.current.startNewNote).toBe(first.startNewNote)
    expect(result.current.markSaved).toBe(first.markSaved)
  })
})
