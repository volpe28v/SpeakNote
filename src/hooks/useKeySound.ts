import { useCallback } from 'react'
import { keySoundManager } from '../lib/keySound'
import { EditorView } from '@codemirror/view'

export function useKeySound() {
  const createKeydownHandler = useCallback(() => {
    return EditorView.domEventHandlers({
      keydown: (event) => {
        const key = event.key
        // 特殊キー以外の通常の文字入力を検出
        if (
          key.length === 1 && // 単一文字
          !event.ctrlKey && // Ctrlキーが押されていない
          !event.metaKey && // Cmdキーが押されていない
          !event.altKey && // Altキーが押されていない
          key !== ' ' && // スペース以外（スペースは別途処理）
          key !== '.' && // ピリオド以外（別途処理）
          key !== '?' && // 疑問符以外（別途処理）
          key !== '!' // 感嘆符以外（別途処理）
        ) {
          keySoundManager.playKeySound()
        }
        return false
      },
    })
  }, [])

  const isEnabled = keySoundManager.isEnabled()
  const setEnabled = keySoundManager.setEnabled.bind(keySoundManager)
  const toggleEnabled = keySoundManager.toggleEnabled.bind(keySoundManager)

  return {
    createKeydownHandler,
    isEnabled,
    setEnabled,
    toggleEnabled,
  }
}