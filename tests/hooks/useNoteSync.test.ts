import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNoteSync } from '../../src/hooks/useNoteSync'
import type { AuthManager, FirestoreManager } from '../../src/lib/firebase'
import type { Note } from '../../src/types'

const NOTE: Note = {
  id: 1,
  text: 'I am ok.',
  translations: ['私は大丈夫です。'],
  timestamp: '2026-01-01T00:00:00.000Z',
}

const authManager = {} as AuthManager
const firestoreManager = {} as FirestoreManager

/**
 * useNoteSync の引数を組み立てる。
 * コールバックは毎回新しい関数を渡す＝呼び出し側でメモ化されていない状態を再現する。
 */
const createProps = (syncFromFirestore: ReturnType<typeof vi.fn>) => ({
  user: { displayName: 'tester' },
  authManager,
  firestoreManager,
  syncFromFirestore,
  loadTranslations: vi.fn(),
  clearTranslationLines: vi.fn(),
  setCurrentEditingId: vi.fn(),
  onNoteLoad: vi.fn(),
})

describe('useNoteSync', () => {
  it('ログイン状態が変わらない限り、再レンダーしても同期は1回だけ', async () => {
    // 1,142万回の読み取りを起こした無限ループの再発防止。
    // コールバックが毎レンダー再生成されても effect が再実行されてはいけない
    const syncFromFirestore = vi.fn(async () => {})
    const { rerender } = renderHook(() => useNoteSync(createProps(syncFromFirestore)))

    expect(syncFromFirestore).toHaveBeenCalledTimes(1)

    for (let i = 0; i < 20; i++) {
      rerender()
    }

    expect(syncFromFirestore).toHaveBeenCalledTimes(1)
  })

  it('未ログインでは同期しない', () => {
    const syncFromFirestore = vi.fn(async () => {})
    renderHook(() => useNoteSync({ ...createProps(syncFromFirestore), user: null }))

    expect(syncFromFirestore).not.toHaveBeenCalled()
  })

  it('ログインしたときに同期する', () => {
    const syncFromFirestore = vi.fn(async () => {})
    const { rerender } = renderHook(
      ({ user }: { user: { displayName: string } | null }) =>
        useNoteSync({ ...createProps(syncFromFirestore), user }),
      { initialProps: { user: null as { displayName: string } | null } }
    )

    expect(syncFromFirestore).not.toHaveBeenCalled()

    rerender({ user: { displayName: 'tester' } })
    expect(syncFromFirestore).toHaveBeenCalledTimes(1)
  })

  it('noteSelected イベントで最新のコールバックが呼ばれる', () => {
    const syncFromFirestore = vi.fn(async () => {})
    const props = createProps(syncFromFirestore)
    const { rerender } = renderHook(() => useNoteSync(props))

    // 登録は1回きりだが、参照する関数は常に最新であること
    const latestOnNoteLoad = vi.fn()
    props.onNoteLoad = latestOnNoteLoad
    rerender()

    act(() => {
      window.dispatchEvent(new CustomEvent('noteSelected', { detail: NOTE }))
    })

    expect(latestOnNoteLoad).toHaveBeenCalledWith(NOTE)
    expect(props.loadTranslations).toHaveBeenCalledWith(NOTE.text, NOTE.translations)
    expect(props.setCurrentEditingId).toHaveBeenCalledWith(NOTE.id)
  })

  it('訳文を持たないノートでは訳文をクリアする', () => {
    const syncFromFirestore = vi.fn(async () => {})
    const props = createProps(syncFromFirestore)
    renderHook(() => useNoteSync(props))

    act(() => {
      window.dispatchEvent(
        new CustomEvent('noteSelected', { detail: { ...NOTE, translations: undefined } })
      )
    })

    expect(props.clearTranslationLines).toHaveBeenCalled()
    expect(props.loadTranslations).not.toHaveBeenCalled()
  })

  it('アンマウント後は noteSelected に反応しない', () => {
    const syncFromFirestore = vi.fn(async () => {})
    const props = createProps(syncFromFirestore)
    const { unmount } = renderHook(() => useNoteSync(props))

    unmount()
    act(() => {
      window.dispatchEvent(new CustomEvent('noteSelected', { detail: NOTE }))
    })

    expect(props.onNoteLoad).not.toHaveBeenCalled()
  })
})
