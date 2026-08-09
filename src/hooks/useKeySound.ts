import { useMemo } from 'react'
import { keySoundManager } from '@/lib/keySound'
import { EditorView } from '@codemirror/view'

export function useKeySound() {
  // 戻り値の参照が毎レンダー変わると CodeMirror の extensions メモ化が無効になり、
  // 1キーストロークごとに拡張ツリー全体が再構成されるため useMemo で固定する
  return useMemo(
    () => ({
      createKeydownHandler: () =>
        EditorView.domEventHandlers({
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
        }),
    }),
    []
  )
}
