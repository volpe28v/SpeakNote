import { createContext, useContext, ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { useNotes } from '@/hooks/useNotes'
import { useNoteSession, type NoteSession } from '@/hooks/useNoteSession'
import { useQuickTranslation } from '@/hooks/useQuickTranslation'

interface AppContextType {
  auth: ReturnType<typeof useAuth>
  translation: ReturnType<typeof useTranslation>
  notes: ReturnType<typeof useNotes>
  /** 編集中のノートの状態。NotesList からも参照するため Context に置く */
  session: NoteSession
  quickTranslation: ReturnType<typeof useQuickTranslation>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const translation = useTranslation()
  const notes = useNotes()
  const session = useNoteSession()
  const quickTranslation = useQuickTranslation()

  return (
    <AppContext.Provider value={{ auth, translation, notes, session, quickTranslation }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
