// メインエントリーポイント
import './style.css'
import { AuthManager, FirestoreManager } from './lib/firebase'
import { toast } from './lib/toast'
import { checkSpeechSynthesisSupport, speakJapanese, speakMultipleLines } from './lib/speech'
import { APP_VERSION, UI_STRINGS } from './config/constants'
import { TranslationManager } from './managers/TranslationManager'
import { NoteManager } from './managers/NoteManager'
import { AuthUIManager } from './managers/AuthUIManager'
import { InputManager } from './managers/InputManager'
import type { Note, DOMElements } from './types'

// Firebase関連のグローバル変数
let authManager: AuthManager | null = null
let firestoreManager: FirestoreManager | null = null
let isFirebaseReady = false

// Manager instances
let translationManager: TranslationManager
let noteManager: NoteManager
let authUIManager: AuthUIManager
let inputManager: InputManager

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

// Firebase初期化とUI更新（削除 - AuthUIManagerに移行済み）
// 認証UI更新（削除 - AuthUIManagerに移行済み）
// アプリ機能有効化・無効化（削除 - AuthUIManagerに移行済み）
// ログイン・ログアウト処理（削除 - AuthUIManagerに移行済み）

// Firestoreとの同期（読み込み） - 引数でmanagerを受け取るバージョン
async function syncFromFirestoreWithManagers(authMgr: AuthManager, firestoreMgr: FirestoreManager): Promise<void> {
  await noteManager.syncFromFirestore(
    authMgr,
    firestoreMgr,
    (cloudNotes) => {
      // Firestoreのデータを表示
      const listContainer = document.getElementById('saved-sentences-list')!
      noteManager.displayNotesFromData(
        cloudNotes,
        listContainer,
        loadNote,
        async (id: number) => {
          await noteManager.deleteNote(id, authMgr, firestoreMgr, isFirebaseReady)
          await syncFromFirestoreWithManagers(authMgr, firestoreMgr)
          
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

// Firestoreとの同期（読み込み） - グローバル変数を使うバージョン（既存コード互換性のため）
async function syncFromFirestore(): Promise<void> {
  if (!authManager || !firestoreManager) {
    console.warn('Firebase managers not initialized yet')
    return
  }
  
  await syncFromFirestoreWithManagers(authManager, firestoreManager)
}

// 注意: 以下のlocalStorage関数はローカル→Firebase移行時のマイグレーション用として保持（削除 - AuthUIManagerに移行済み）

// 残りの関数は元のscript.jsから移植
// ... (続く)

// Initialization function
async function initialize() {
  console.log('Initializing application...')
  
  try {
    elements = getDOMElements()
    translationManager = TranslationManager.getInstance()
    noteManager = NoteManager.getInstance()
    authUIManager = AuthUIManager.getInstance()
    inputManager = InputManager.getInstance()
    console.log('DOM elements obtained:', elements)
    
    // Check Web Speech API
    if (!checkSpeechSynthesisSupport()) {
      toast.error('お使いのブラウザは音声合成に対応していません。')
    }
    
    // Initialize Firebase
    const firebaseResult = await authUIManager.initializeFirebase(elements, (user, authMgr, firestoreMgr) => {
      if (user) {
        // ログイン時にFirestoreからノートを読み込み
        syncFromFirestoreWithManagers(authMgr, firestoreMgr)
      } else {
        // ログアウト時は機能制限のためノート表示は無効化済み
        authUIManager.disableAppFunctions(elements, () => {
          translationManager.clearTranslationLines()
          noteManager.resetFlags()
        })
      }
    })
    
    authManager = firebaseResult.authManager
    firestoreManager = firebaseResult.firestoreManager
    isFirebaseReady = firebaseResult.isReady
    
    // Firebase認証が必須 - 未ログインの場合は機能を無効化
    if (!isFirebaseReady || !authManager.getCurrentUser()) {
      authUIManager.disableAppFunctions(elements, () => {
        translationManager.clearTranslationLines()
        noteManager.resetFlags()
      })
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
  inputManager.setupKeyboardEvents(elements, async () => {
    await translationManager.performAutoTranslation(
      elements.englishInput,
      elements.translationText,
      elements.translateButton
    )
  })
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
    if (!authManager || !firestoreManager) {
      toast.error('Firebase not initialized')
      return
    }
    
    const result = await noteManager.saveNote(
      englishText,
      translationsArray,
      authManager,
      firestoreManager,
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

// ヘルパー関数（削除 - InputManagerに移行済み）

// 翻訳表示を更新する関数（削除 - TranslationManagerに移行済み）
// キーボードイベントハンドラー（削除 - InputManagerに移行済み）

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