import { useEffect } from 'react'

interface UseUnsavedChangeTrackerProps {
  englishText: string
  originalContent: string
  markAsModified: () => void
  markAsSaved: () => void
}

export function useUnsavedChangeTracker({
  englishText,
  originalContent,
  markAsModified,
  markAsSaved,
}: UseUnsavedChangeTrackerProps) {
  // 英語テキストの変更を監視して未保存状態を更新
  useEffect(() => {
    const hasChanges = englishText.trim() !== originalContent.trim()
    if (hasChanges && englishText.trim()) {
      markAsModified()
    } else if (!hasChanges) {
      markAsSaved()
    }
  }, [englishText, originalContent, markAsModified, markAsSaved])
}