interface AutoSaveStatusProps {
  isAutoSaving: boolean
  lastAutoSavedAt: Date | null
  autoSaveError: string | null
  hasUnsavedChanges: boolean
}

function AutoSaveStatus({
  isAutoSaving,
  lastAutoSavedAt,
  autoSaveError,
  hasUnsavedChanges,
}: AutoSaveStatusProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  if (autoSaveError) {
    return (
      <div className="autosave-status error">
        <span className="autosave-icon">⚠️</span>
        <span className="autosave-text">Auto-save failed</span>
      </div>
    )
  }

  if (isAutoSaving) {
    return (
      <div className="autosave-status saving">
        <span className="autosave-icon">💾</span>
        <span className="autosave-text">Saving...</span>
      </div>
    )
  }

  // 未保存状態は表示しない（うるさいため）
  if (hasUnsavedChanges) {
    return null
  }

  if (lastAutoSavedAt) {
    return (
      <div className="autosave-status saved">
        <span className="autosave-icon">✅</span>
        <span className="autosave-text">Saved {formatTime(lastAutoSavedAt)}</span>
      </div>
    )
  }

  return null
}

export default AutoSaveStatus
