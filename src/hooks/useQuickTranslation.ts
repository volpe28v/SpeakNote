import { useState } from 'react'
import type { Note } from '@/types'

export function useQuickTranslation() {
  const [isPracticing, setIsPracticing] = useState(false)
  const [practiceNote, setPracticeNote] = useState<Note | null>(null)

  const startPractice = (note: Note) => {
    setPracticeNote(note)
    setIsPracticing(true)
  }

  const stopPractice = () => {
    setIsPracticing(false)
    setPracticeNote(null)
  }

  return {
    isPracticing,
    practiceNote,
    startPractice,
    stopPractice,
  }
}
