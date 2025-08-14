import { useState, useEffect, useCallback } from 'react'
import { toast } from '../lib/toast'
import { AuthManager, FirestoreManager } from '../lib/firebase'

interface User {
  photoURL?: string | null
  displayName?: string | null
}

interface UseAuthReturn {
  user: User | null
  authManager: AuthManager | null
  firestoreManager: FirestoreManager | null
  isReady: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [authManager, setAuthManager] = useState<AuthManager | null>(null)
  const [firestoreManager, setFirestoreManager] = useState<FirestoreManager | null>(null)
  const [isReady, setIsReady] = useState(false)

  const initializeFirebase = useCallback(async () => {
    try {
      const auth = new AuthManager()
      const firestore = new FirestoreManager(auth)

      await auth.init()

      auth.onAuthStateChanged((authUser) => {
        setUser(authUser)
      })

      setAuthManager(auth)
      setFirestoreManager(firestore)
      setIsReady(true)
    } catch (error) {
      console.error('Firebase initialization error:', error)
      setTimeout(() => {
        toast.error('Firebase initialization failed')
      }, 100)
    }
  }, [])

  const login = useCallback(async () => {
    if (!authManager || !firestoreManager) return

    try {
      await authManager.signIn()
      const localNotes = getLocalNotes()
      if (localNotes.length > 0) {
        if (
          confirm(`Would you like to migrate ${localNotes.length} locally saved notes to cloud?`)
        ) {
          await firestoreManager.migrateFromLocalStorage()
        }
      }
    } catch (error) {
      console.error('Login error:', error)
    }
  }, [authManager, firestoreManager])

  const logout = useCallback(async () => {
    if (!authManager) return
    await authManager.signOut()
  }, [authManager])

  useEffect(() => {
    initializeFirebase()
  }, [initializeFirebase])

  return {
    user,
    authManager,
    firestoreManager,
    isReady,
    login,
    logout,
  }
}

function getLocalNotes(): unknown[] {
  const saved = localStorage.getItem('speakNote_savedSentences')
  return saved ? JSON.parse(saved) : []
}
