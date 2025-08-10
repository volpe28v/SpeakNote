// メインエントリーポイント
import './style.css'
import { AuthManager, FirestoreManager } from './lib/firebase'
import { toast } from './lib/toast'
import { UI_STRINGS } from './config/constants'
import { TranslationManager } from './managers/TranslationManager'
import { NoteManager } from './managers/NoteManager'
import { AuthUIManager } from './managers/AuthUIManager'
import { InputManager } from './managers/InputManager'
import { UIController } from './managers/UIController'
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
let uiController: UIController

let elements: DOMElements
let EditingState: any

// Firestoreとの同期（引数でmanagerを受け取るバージョン）
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
      // EditingStateが初期化されている場合のみ実行
      if (EditingState) {
        EditingState.updateSavedSentenceHighlight()
      }
    },
    (latestNote) => {
      loadNote(latestNote)
    }
  )
}

// Firestoreとの同期（グローバル変数を使うバージョン）
async function syncFromFirestore(): Promise<void> {
  if (!authManager || !firestoreManager) {
    console.warn('Firebase managers not initialized yet')
    return
  }
  
  await syncFromFirestoreWithManagers(authManager, firestoreManager)
}

// 初期化関数
async function initialize() {
  console.log('Initializing application...')
  
  try {
    // Initialize managers
    translationManager = TranslationManager.getInstance()
    noteManager = NoteManager.getInstance()
    authUIManager = AuthUIManager.getInstance()
    inputManager = InputManager.getInstance()
    uiController = UIController.getInstance()
    
    // Get DOM elements
    elements = uiController.getDOMElements()
    console.log('DOM elements obtained:', elements)
    
    // Create EditingState object
    EditingState = uiController.createEditingState(
      elements,
      () => noteManager.getCurrentEditingId(),
      (id: number | null) => noteManager.setCurrentEditingId(id)
    )
    
    // Initialize UI
    uiController.initialize(
      elements,
      () => translationManager.handleTranslate(
        elements.englishInput,
        elements.translationText,
        elements.translateButton
      ),
      handleSave,
      handleClear,
      () => inputManager.setupKeyboardEvents(elements, async () => {
        await translationManager.performAutoTranslation(
          elements.englishInput,
          elements.translationText,
          elements.translateButton
        )
      })
    )
    
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
    
    // UIを初期状態に設定
    EditingState.startNew()
    
    console.log('Application initialization completed')
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

// イベントリスナーのセットアップ（削除 - UIControllerに移行済み）

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
        if (EditingState) {
          EditingState.updateUI()
        }
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
  if (EditingState) {
    EditingState.startNew()
  }
  
  // フォーカスを英語入力欄に設定
  elements.englishInput.focus()
}

// ノート削除処理（削除 - NoteManagerに移行済み）

// displayNotes関数は削除（Firebase必須のためsyncFromFirestoreを使用）
// 汎用的なノート表示関数（削除 - NoteManagerに移行済み）

// ノートを入力エリアに読み込む関数
function loadNote(item: Note): void {
  if (!EditingState) {
    console.warn('EditingState not initialized yet')
    return
  }
  
  noteManager.loadNote(
    item,
    elements.englishInput,
    elements.translationText,
    translationManager,
    EditingState.startEditing
  )
}