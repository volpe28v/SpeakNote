import { useEffect } from 'react'

interface UseTranslationSyncProps {
  translationLines: string[]
  setTranslationText: (text: string) => void
  resetAutoSaveStatusRef: React.MutableRefObject<(() => void) | null>
  resetAutoSaveStatus: () => void
}

export function useTranslationSync({
  translationLines,
  setTranslationText,
  resetAutoSaveStatusRef,
  resetAutoSaveStatus,
}: UseTranslationSyncProps) {
  // 翻訳行の変更を監視してテキストを更新
  useEffect(() => {
    setTranslationText(translationLines.join('\n'))
  }, [translationLines, setTranslationText])

  // 親コンポーネントから呼び出せるようにresetAutoSaveStatusを設定
  useEffect(() => {
    resetAutoSaveStatusRef.current = resetAutoSaveStatus
  }, [resetAutoSaveStatus, resetAutoSaveStatusRef])
}