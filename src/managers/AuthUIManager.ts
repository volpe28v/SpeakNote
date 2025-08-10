// 認証とUI制御を管理するクラス
import { toast } from '../lib/toast'
import { AuthManager, FirestoreManager } from '../lib/firebase'
import type { DOMElements } from '../types'

export class AuthUIManager {
  private static instance: AuthUIManager | null = null

  private constructor() {}

  static getInstance(): AuthUIManager {
    if (!AuthUIManager.instance) {
      AuthUIManager.instance = new AuthUIManager()
    }
    return AuthUIManager.instance
  }

  // Firebase初期化とUI更新
  async initializeFirebase(
    elements: DOMElements,
    onUserChange: (user: any, authManager: AuthManager, firestoreManager: FirestoreManager) => void
  ): Promise<{ authManager: AuthManager, firestoreManager: FirestoreManager, isReady: boolean }> {
    try {
      const authManager = new AuthManager()
      const firestoreManager = new FirestoreManager(authManager)
      
      // 認証状態の監視開始
      await authManager.init()
      
      // 認証状態変更時のコールバック設定
      authManager.onAuthStateChanged((user) => {
        this.updateAuthUI(user, elements)
        onUserChange(user, authManager, firestoreManager)
      })
      
      // ログイン・ログアウトボタンのイベントリスナー設定
      elements.loginButton.addEventListener('click', () => this.handleLogin(authManager, firestoreManager))
      elements.logoutButton.addEventListener('click', () => this.handleLogout(authManager))
      elements.loginPromptButton.addEventListener('click', () => this.handleLogin(authManager, firestoreManager))
      
      return { authManager, firestoreManager, isReady: true }
    } catch (error) {
      console.error('Firebase initialization error:', error)
      toast.error('Firebase initialization failed')
      return { authManager: null as any, firestoreManager: null as any, isReady: false }
    }
  }

  // 認証UI更新
  updateAuthUI(user: any, elements: DOMElements): void {
    if (user) {
      // ログイン状態
      elements.loginButton.style.display = 'none'
      elements.userInfo.style.display = 'flex'
      elements.userAvatar.src = user.photoURL || ''
      elements.userName.textContent = user.displayName || 'ユーザー'
      
      // アプリ機能を有効化
      this.enableAppFunctions(elements)
    } else {
      // ログアウト状態
      elements.loginButton.style.display = 'block'
      elements.userInfo.style.display = 'none'
      
      // アプリ機能を無効化
      this.disableAppFunctions(elements)
    }
  }

  // アプリ機能を有効化
  enableAppFunctions(elements: DOMElements): void {
    console.log('Enabling app functions...')
    
    if (!elements) {
      console.error('Elements not initialized in enableAppFunctions')
      return
    }
    
    elements.loginRequiredMessage.style.display = 'none'
    elements.notebookContainer.classList.remove('disabled-overlay')
    elements.savedSentencesContainer.classList.remove('disabled-overlay')
    
    // 入力フィールドとボタンを有効化
    elements.englishInput.disabled = false
    elements.speakButton.disabled = false
    elements.translateButton.disabled = false
    elements.saveButton.disabled = false
    elements.clearButton.disabled = false
    elements.speakJapaneseButton.disabled = false
    
    console.log('App functions enabled')
  }

  // アプリ機能を無効化
  disableAppFunctions(elements: DOMElements, onReset?: () => void): void {
    elements.loginRequiredMessage.style.display = 'flex'
    elements.notebookContainer.classList.add('disabled-overlay')
    elements.savedSentencesContainer.classList.add('disabled-overlay')
    
    // 入力フィールドとボタンを無効化
    elements.englishInput.disabled = true
    elements.speakButton.disabled = true
    elements.translateButton.disabled = true
    elements.saveButton.disabled = true
    elements.clearButton.disabled = true
    elements.speakJapaneseButton.disabled = true
    
    // 入力内容をクリア
    elements.englishInput.value = ''
    elements.translationText.value = ''
    
    // リセット処理があれば実行
    if (onReset) {
      onReset()
    }
    
    // ノート一覧に制限メッセージを表示
    const listContainer = document.getElementById('saved-sentences-list')!
    listContainer.innerHTML = '<div class="no-notes">Please login to view notes</div>'
  }

  // ログイン処理
  async handleLogin(authManager: AuthManager, firestoreManager: FirestoreManager): Promise<void> {
    try {
      await authManager.signIn()
      // ローカルストレージからの移行を提案
      const localNotes = this.getLocalNotes()
      if (localNotes.length > 0) {
        if (confirm(`Would you like to migrate ${localNotes.length} locally saved notes to cloud?`)) {
          await firestoreManager.migrateFromLocalStorage()
          // 移行後は外部で再読み込み処理を呼ぶ
        }
      }
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  // ログアウト処理
  async handleLogout(authManager: AuthManager): Promise<void> {
    await authManager.signOut()
  }

  // 注意: ローカル→Firebase移行時のマイグレーション用として保持
  private getLocalNotes(): any[] {
    const saved = localStorage.getItem('speakNote_savedSentences')
    return saved ? JSON.parse(saved) : []
  }
}