import { useState, useCallback } from 'react'

interface UseUnsavedChangesReturn {
  hasUnsavedChanges: boolean
  setHasUnsavedChanges: (hasChanges: boolean) => void
  markAsSaved: () => void
  markAsModified: () => void
}

export function useUnsavedChanges(): UseUnsavedChangesReturn {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const markAsSaved = useCallback(() => {
    setHasUnsavedChanges(false)
  }, [])

  const markAsModified = useCallback(() => {
    setHasUnsavedChanges(true)
  }, [])

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    markAsSaved,
    markAsModified,
  }
}
