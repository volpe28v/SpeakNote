// メインエントリーポイント
import './style.css'
import { AuthManager, FirestoreManager } from './lib/firebase'
import { toast } from './lib/toast'
import { checkSpeechSynthesisSupport, speakEnglish, speakJapanese, speakMultipleLines, createUtterance, SPEECH_CONFIG } from './lib/speech'
import { APP_VERSION, UI_STRINGS } from './config/constants'
import { TranslationManager } from './managers/TranslationManager'
import { NoteManager } from './managers/NoteManager'
import type { Note, DOMElements } from './types'

// Firebase関連のグローバル変数
let authManager: AuthManager | null = null
let firestoreManager: FirestoreManager | null = null
let isFirebaseReady = false

// Manager instances
let translationManager: TranslationManager
let noteManager: NoteManager

// DOM要素の取得
function getDOMElements(): DOMElements {
  return {
    englishInput: document.getElementById('english-input') as HTMLTextAreaElement,
    speakButton: document.getElementById('speak-button') as HTMLButtonElement,
    translateButton: document.getElementById('translate-button') as HTMLButtonElement,
    translationText: document.getElementById('translation-text') as HTMLTextAreaElement,
    saveButton: document.getElementById('save-button') as HTMLButtonElement,
    speakJapaneseButton: document.getElementById('speak-japanese-button') as HTMLButtonElement,
    clearButton: document.getElementById('clear-button') as HTMLButtonElement,
    loginButton: document.getElementById('login-button') as HTMLButtonElement,
    userInfo: document.getElementById('user-info') as HTMLDivElement,
    userAvatar: document.getElementById('user-avatar') as HTMLImageElement,
    userName: document.getElementById('user-name') as HTMLSpanElement,
    logoutButton: document.getElementById('logout-button') as HTMLButtonElement,
    loginRequiredMessage: document.getElementById('login-required-message') as HTMLDivElement,
    loginPromptButton: document.getElementById('login-prompt-button') as HTMLButtonElement,
    notebookContainer: document.getElementById('notebook-container') as HTMLDivElement,
    savedSentencesContainer: document.getElementById('saved-sentences-container') as HTMLDivElement
  }
}

let elements: DOMElements

// Initialize FirebaseとUI更新
async function initializeFirebase(): Promise<void> {
  try {
    authManager = new AuthManager()
    firestoreManager = new FirestoreManager(authManager)
    
    // 認証状態の監視開始
    await authManager.init()
    
    // 認証状態変更時のコールバック設定
    authManager.onAuthStateChanged((user) => {
      updateAuthUI(user)
      if (user) {
        // ログイン時にFirestoreからノートを読み込み
        syncFromFirestore()
      } else {
        // ログアウト時は機能制限のためノート表示は無効化済み
        disableAppFunctions()
      }
    })
    
    // ログイン・ログアウトボタンのイベントリスナー設定
    elements.loginButton.addEventListener('click', handleLogin)
    elements.logoutButton.addEventListener('click', handleLogout)
    elements.loginPromptButton.addEventListener('click', handleLogin)
    
    isFirebaseReady = true
  } catch (error) {
    console.error('Firebase initialization error:', error)
    toast.error('Firebase initialization failed')
  }
}

// 認証UI更新
function updateAuthUI(user: any): void {
  if (user) {
    // ログイン状態
    elements.loginButton.style.display = 'none'
    elements.userInfo.style.display = 'flex'
    elements.userAvatar.src = user.photoURL || ''
    elements.userName.textContent = user.displayName || 'ユーザー'
    
    // アプリ機能を有効化
    enableAppFunctions()
  } else {
    // ログアウト状態
    elements.loginButton.style.display = 'block'
    elements.userInfo.style.display = 'none'
    
    // アプリ機能を無効化
    disableAppFunctions()
  }
}

// アプリ機能を有効化
function enableAppFunctions(): void {
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
function disableAppFunctions(): void {
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
  translationManager.clearTranslationLines()
  
  // 編集状態とフラグをリセット
  noteManager.resetFlags()
  
  // ノート一覧に制限メッセージを表示
  const listContainer = document.getElementById('saved-sentences-list')!
  listContainer.innerHTML = '<div class="no-notes">Please login to view notes</div>'
}

// ログイン処理
async function handleLogin(): Promise<void> {
  if (!authManager) return
  
  try {
    await authManager.signIn()
    // ローカルストレージからの移行を提案
    const localNotes = getNotes()
    if (localNotes.length > 0) {
      if (confirm(`Would you like to migrate ${localNotes.length} locally saved notes to cloud?`)) {
        await firestoreManager!.migrateFromLocalStorage()
        syncFromFirestore() // 移行後に再読み込み
      }
    }
  } catch (error) {
    console.error('Login error:', error)
  }
}

// ログアウト処理
async function handleLogout(): Promise<void> {
  if (!authManager) return
  await authManager.signOut()
}

// Firestoreとの同期（読み込み）
async function syncFromFirestore(): Promise<void> {
  await noteManager.syncFromFirestore(
    authManager!,
    firestoreManager!,
    (cloudNotes) => {
      // Firestoreのデータを表示
      const listContainer = document.getElementById('saved-sentences-list')!
      noteManager.displayNotesFromData(
        cloudNotes,
        listContainer,
        loadNote,
        async (id: number) => {
          await noteManager.deleteNote(id, authManager!, firestoreManager!, isFirebaseReady)
          await syncFromFirestore()
          
          // 削除したアイテムが編集中だった場合はクリア
          if (noteManager.getCurrentEditingId() === id) {
            handleClear()
          }
        }
      )
      EditingState.updateSavedSentenceHighlight()
    },
    (latestNote) => {
      loadNote(latestNote)
    }
  )
}

// 注意: 以下のlocalStorage関数はローカル→Firebase移行時のマイグレーション用として保持
function getNotes(): Note[] {
  return noteManager.getNotes()
}

// 残りの関数は元のscript.jsから移植
// ... (続く)

// Initialization function
async function initialize() {
  console.log('Initializing application...')
  
  try {
    elements = getDOMElements()
    translationManager = TranslationManager.getInstance()
    noteManager = NoteManager.getInstance()
    console.log('DOM elements obtained:', elements)
    
    // Check Web Speech API
    if (!checkSpeechSynthesisSupport()) {
      toast.error('お使いのブラウザは音声合成に対応していません。')
    }
    
    // Initialize Firebase
    await initializeFirebase()
    
    // Firebase認証が必須 - 未ログインの場合は機能を無効化
    if (!isFirebaseReady || !authManager!.getCurrentUser()) {
      disableAppFunctions()
    }
    
    EditingState.startNew() // UIを初期状態に設定
    
    // Update version display dynamically
    const versionElement = document.querySelector('.version')
    if (versionElement) {
      versionElement.textContent = `ver${APP_VERSION}`
    }
    
    // Set up event listeners
    setupEventListeners()
    console.log('Event listeners setup completed')
  } catch (error) {
    console.error('Initialization error:', error)
  }
}

// DOMが既に読み込まれている場合はすぐに実行、そうでなければDOMContentLoadedを待つ
if (document.readyState === 'loading') {
  console.log('Waiting for DOMContentLoaded...')
  document.addEventListener('DOMContentLoaded', initialize)
} else {
  console.log('DOM already loaded, initializing immediately...')
  initialize()
}

function setupEventListeners(): void {
  console.log('Setting up event listeners...')
  console.log('Elements:', elements)
  
  // 音声ボタン
  if (elements.speakButton) {
    elements.speakButton.addEventListener('click', () => {
      console.log('Speak button clicked')
      const text = elements.englishInput.value
      console.log('Text to speak:', text)
      speakMultipleLines(text)
    })
  } else {
    console.error('Speak button not found')
  }
  
  // 日本語読上げボタン
  if (elements.speakJapaneseButton) {
    elements.speakJapaneseButton.addEventListener('click', () => {
      console.log('Japanese speak button clicked')
      const japaneseText = elements.translationText.value
      if (!japaneseText.trim()) {
        toast.info('No translation available. Please translate first.')
        return
      }
      speakJapanese(japaneseText)
    })
  } else {
    console.error('Japanese speak button not found')
  }
  
  // 翻訳ボタン
  if (elements.translateButton) {
    elements.translateButton.addEventListener('click', () => {
      console.log('Translate button clicked')
      translationManager.handleTranslate(
        elements.englishInput,
        elements.translationText,
        elements.translateButton
      )
    })
  } else {
    console.error('Translate button not found')
  }
  
  // 保存ボタン
  if (elements.saveButton) {
    elements.saveButton.addEventListener('click', () => {
      console.log('Save button clicked')
      handleSave()
    })
  } else {
    console.error('Save button not found')
  }
  
  // クリアボタン
  if (elements.clearButton) {
    elements.clearButton.addEventListener('click', () => {
      console.log('Clear button clicked')
      handleClear()
    })
  } else {
    console.error('Clear button not found')
  }
  
  // キーボードイベントの設定
  if (elements.englishInput) {
    elements.englishInput.addEventListener('keydown', handleKeyboardEvents)
    console.log('Keyboard events registered')
  } else {
    console.error('English input not found for keyboard events')
  }
}

// 翻訳処理（削除 - TranslationManagerに移行済み）
// Google翻訳API関数（削除 - TranslationManagerに移行済み）

// 保存処理
async function handleSave(): Promise<void> {
  const englishText = elements.englishInput.value.trim()
  const translationsArray = translationManager.getTranslationLines()
  
  if (!englishText) {
    toast.info('Please enter English text')
    return
  }
  
  try {
    const result = await noteManager.saveNote(
      englishText,
      translationsArray,
      authManager!,
      firestoreManager!,
      isFirebaseReady
    )
    
    if (result) {
      if (result.type === 'updated') {
        toast.success(UI_STRINGS.UPDATED)
        // 更新後もEditingStateを維持
        noteManager.setCurrentEditingId(result.id)
      } else {
        toast.success(UI_STRINGS.SAVED_NEW)
        // 保存後は編集状態に切り替え
        noteManager.setCurrentEditingId(result.id)
        EditingState.updateUI()
      }
      
      // ノート一覧を更新（Firebase必須のため常にFirestoreから同期）
      await syncFromFirestore()
    }
  } catch (error) {
    console.error('Save error:', error)
    toast.error('Save failed')
  }
}

// 保存処理の実装（削除 - NoteManagerに移行済み）

// クリア処理
function handleClear(): void {
  elements.englishInput.value = ''
  elements.translationText.value = ''
  translationManager.clearTranslationLines()
  
  // 編集状態を新規作成状態に切り替え
  EditingState.startNew()
  
  // フォーカスを英語入力欄に設定
  elements.englishInput.focus()
}

// ノート削除処理（削除 - NoteManagerに移行済み）

// displayNotes関数は削除（Firebase必須のためsyncFromFirestoreを使用）
// 汎用的なノート表示関数（削除 - NoteManagerに移行済み）

// ノートを入力エリアに読み込む関数
function loadNote(item: Note): void {
  noteManager.loadNote(
    item,
    elements.englishInput,
    elements.translationText,
    translationManager,
    EditingState.startEditing
  )
}

// getCurrentLineNumber関数は削除（一括翻訳により不要）

// ヘルパー関数：現在の行を取得
function getCurrentLine(textarea: HTMLTextAreaElement): string {
  const cursorPosition = textarea.selectionStart
  const textBeforeCursor = textarea.value.substring(0, cursorPosition)
  const lines = textBeforeCursor.split('\n')
  return lines[lines.length - 1]
}

// ヘルパー関数：直前の単語を取得
function getLastWord(text: string): string {
  const words = text.trim().split(/\s+/)
  return words[words.length - 1] || ''
}

// 翻訳表示を更新する関数（削除 - TranslationManagerに移行済み）

// キーボードイベントハンドラー
async function handleKeyboardEvents(event: KeyboardEvent): Promise<void> {
  if (event.key === 'Enter') {
    // エンターキーが押される前に現在の行内容を取得
    const currentLine = getCurrentLine(elements.englishInput)
    
    if (currentLine.trim()) {
      // 現在行を文として発音
      speakEnglish(currentLine.trim(), false)
      
      // 自動的に全文を翻訳
      await translationManager.performAutoTranslation(
        elements.englishInput,
        elements.translationText,
        elements.translateButton
      )
    }
    // エンターキーは通常通り改行として動作
  } else if (event.key === ' ') {
    // スペースキーが押されたら現在行の直前の単語を発音（翻訳は更新しない）
    const currentLine = getCurrentLine(elements.englishInput)
    
    // 句読点の直後かどうかをチェック
    const lastChar = currentLine.slice(-1)
    const isPunctuationBefore = /[.!?]/.test(lastChar)
    
    if (!isPunctuationBefore && currentLine.trim()) {
      const lastWord = getLastWord(currentLine)
      if (lastWord) {
        // 単語のみを発音（翻訳は更新しない）
        window.speechSynthesis.cancel()
        let processedText = lastWord === 'I' ? 'i' : lastWord
        const utterance = createUtterance(processedText, SPEECH_CONFIG.ENGLISH)
        window.speechSynthesis.speak(utterance)
      }
    }
    // スペースは通常通り入力される
  } else if (event.key === '.' || event.key === '?' || event.key === '!') {
    // ピリオド、疑問符、感嘆符が押されたら、現在行を発音のみ（翻訳は更新しない）
    const punctuation = event.key
    setTimeout(() => {
      const currentLine = getCurrentLine(elements.englishInput)
      if (currentLine.trim()) {
        // 疑問符の場合は疑問文として発音のみ
        window.speechSynthesis.cancel()
        let processedText = currentLine.trim()
        const config = punctuation === '?' ? SPEECH_CONFIG.ENGLISH_QUESTION : SPEECH_CONFIG.ENGLISH
        const utterance = createUtterance(processedText, config)
        window.speechSynthesis.speak(utterance)
      }
    }, 50)
  }
}

// EditingState オブジェクト
const EditingState = {
  startEditing: (itemId: number) => {
    noteManager.setCurrentEditingId(itemId)
    EditingState.updateUI()
    EditingState.updateSavedSentenceHighlight()
  },
  
  startNew: () => {
    noteManager.setCurrentEditingId(null)
    EditingState.updateUI()
    EditingState.updateSavedSentenceHighlight()
  },
  
  updateUI: () => {
    const isEditing = noteManager.getCurrentEditingId() !== null
    elements.saveButton.textContent = isEditing ? UI_STRINGS.SAVE_UPDATE : UI_STRINGS.SAVE_NEW
    elements.clearButton.textContent = UI_STRINGS.NEW_NOTE
  },
  
  updateSavedSentenceHighlight: () => {
    // 全てのノートのハイライトをリセット
    document.querySelectorAll('.saved-sentence-item').forEach(item => {
      item.classList.remove('editing')
    })
    
    // 編集中のアイテムがあればハイライト
    const currentEditingId = noteManager.getCurrentEditingId()
    if (currentEditingId) {
      const editingItem = document.querySelector(`[data-id="${currentEditingId}"]`)
      if (editingItem) {
        editingItem.classList.add('editing')
      }
    }
  }
}