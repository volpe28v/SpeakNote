// 日本語textareaで選択されたテキストが含まれる行番号を取得する関数
export function getSelectedLineNumber(textareaId: string): number | null {
  const textarea = document.getElementById(textareaId) as HTMLTextAreaElement
  if (!textarea) return null

  const selectionStart = textarea.selectionStart
  const selectionEnd = textarea.selectionEnd
  
  // 選択範囲がない場合
  if (selectionStart === selectionEnd) return null

  const text = textarea.value
  const beforeSelection = text.substring(0, selectionStart)
  
  // 選択開始位置までの行数を計算（0ベース）
  const lineNumber = beforeSelection.split('\n').length - 1
  
  return lineNumber
}