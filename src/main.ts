// メインエントリーポイント
import './style.css'
import { AuthManager, FirestoreManager } from './lib/firebase'
import { toast } from './lib/toast'
import { checkSpeechSynthesisSupport, speakEnglish, speakJapanese, speakMultipleLines, createUtterance, SPEECH_CONFIG } from './lib/speech'
import type { Note, SaveResult, DOMElements, UIStrings } from './types'

// アプリケーションのバージョン
const APP_VERSION = '1.1.0'

// Firebase関連のグローバル変数
let authManager: AuthManager | null = null
let firestoreManager: FirestoreManager | null = null
let isFirebaseReady = false

// 翻訳履歴を管理する配列
let translationLines: string[] = []

// 編集中のアイテムID（更新保存のため）
let currentEditingId: number | null = null

// 保存機能のための定数
const STORAGE_KEY = 'speakNote_savedSentences'
const MAX_SAVED_ITEMS = 100

// Google Apps Script翻訳APIのURL
const GAS_TRANSLATE_URL = 'https://script.google.com/macros/s/AKfycbyTSE6S8wnGYDQhQ3gKeVwIiDt3uwlxZoUBFfJ3YCrc1dCn76sQR3YJ5bM2vsuVEboc/exec'

// 翻訳状態を管理
let isTranslating = false

// UI文字列の定数
const UI_STRINGS: UIStrings = {
  TRANSLATING: '🔄 翻訳中...',
  TRANSLATING_PROGRESS: (current: number, total: number) => `🔄 翻訳中... (${current}/${total})`,
  TRANSLATE: '🔁 翻訳',
  TRANSLATION_ERROR: '翻訳中にエラーが発生しました',
  API_NOT_SET: '翻訳APIが設定されていません。README.mdを参照してGoogle Apps Scriptを設定してください。',
  SAVE_NEW: '💾 保存',
  SAVE_UPDATE: '📝 更新',
  NEW_NOTE: '📄 新規作成',
  SAVED_NEW: '保存しました！',
  UPDATED: '更新しました！'
}

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

// Firebase初期化とUI更新
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
    console.error('Firebase初期化エラー:', error)
    toast.error('Firebase初期化に失敗しました')
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
  translationLines = []
  
  // ノート一覧に制限メッセージを表示
  const listContainer = document.getElementById('saved-sentences-list')!
  listContainer.innerHTML = '<div class="no-notes">ログインしてノートを表示</div>'
}

// ログイン処理
async function handleLogin(): Promise<void> {
  if (!authManager) return
  
  try {
    await authManager.signIn()
    // ローカルストレージからの移行を提案
    const localNotes = getNotes()
    if (localNotes.length > 0) {
      if (confirm(`ローカルに保存された${localNotes.length}件のノートをクラウドに移行しますか？`)) {
        await firestoreManager!.migrateFromLocalStorage()
        syncFromFirestore() // 移行後に再読み込み
      }
    }
  } catch (error) {
    console.error('ログインエラー:', error)
  }
}

// ログアウト処理
async function handleLogout(): Promise<void> {
  if (!authManager) return
  await authManager.signOut()
}

// Firestoreとの同期（読み込み）
async function syncFromFirestore(): Promise<void> {
  if (!firestoreManager || !authManager!.getCurrentUser()) {
    return
  }
  
  try {
    const cloudNotes = await firestoreManager.getUserNotes()
    // Firestoreのデータを表示
    const listContainer = document.getElementById('saved-sentences-list')!
    displayNotesFromData(cloudNotes, listContainer)
    EditingState.updateSavedSentenceHighlight()
  } catch (error) {
    console.error('Firestore同期エラー:', error)
    toast.error('クラウドからの同期に失敗しました')
    // エラー時はローカルデータにフォールバック
    displayNotes()
  }
}

// localStorage関連の関数（Firebaseバックアップ用として保持）
function getNotes(): Note[] {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved ? JSON.parse(saved) : []
}

// 残りの関数は元のscript.jsから移植
// ... (続く)

// 初期化関数
async function initialize() {
  console.log('Initializing application...')
  
  try {
    elements = getDOMElements()
    console.log('DOM elements obtained:', elements)
    
    // Web Speech APIの確認
    if (!checkSpeechSynthesisSupport()) {
      toast.error('お使いのブラウザは音声合成に対応していません。')
    }
    
    // Firebase初期化
    await initializeFirebase()
    
    // 初期表示は認証状態で自動切り替え（updateAuthUIで処理される）
    // 未ログインの場合は初期状態で機能無効化
    if (!isFirebaseReady || !authManager!.getCurrentUser()) {
      disableAppFunctions()
    }
    
    EditingState.startNew() // UIを初期状態に設定
    
    // バージョン表示を動的に更新
    const versionElement = document.querySelector('.version')
    if (versionElement) {
      versionElement.textContent = `ver${APP_VERSION}`
    }
    
    // イベントリスナーの設定
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
        toast.info('翻訳テキストがありません。まず翻訳ボタンを押してください。')
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
      handleTranslate()
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

// 翻訳処理
async function handleTranslate(): Promise<void> {
  const input = elements.englishInput.value.trim()
  
  if (!input) {
    toast.info('英語のテキストを入力してください')
    return
  }
  
  if (isTranslating) {
    return // 既に翻訳中の場合は何もしない
  }
  
  // 翻訳APIが設定されていない場合
  if (!GAS_TRANSLATE_URL) {
    toast.warning(UI_STRINGS.API_NOT_SET)
    return
  }
  
  // 翻訳開始
  isTranslating = true
  elements.translateButton.disabled = true
  elements.translateButton.textContent = UI_STRINGS.TRANSLATING
  elements.translateButton.style.opacity = '0.6'
  
  try {
    const lines = input.split('\n').filter(line => line.trim())
    translationLines = [] // リセット
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line) {
        // 進捗表示更新
        elements.translateButton.textContent = UI_STRINGS.TRANSLATING_PROGRESS(i + 1, lines.length)
        
        // 翻訳実行
        const translation = await translateWithGoogleAPI(line)
        translationLines.push(translation)
        
        // リアルタイム表示更新
        elements.translationText.value = translationLines.join('\n')
      } else {
        translationLines.push('') // 空行はそのまま
      }
    }
    
    toast.success('翻訳が完了しました')
  } catch (error) {
    console.error('Translation error:', error)
    toast.error(UI_STRINGS.TRANSLATION_ERROR)
  } finally {
    // 翻訳終了
    isTranslating = false
    elements.translateButton.disabled = false
    elements.translateButton.textContent = UI_STRINGS.TRANSLATE
    elements.translateButton.style.opacity = '1'
  }
}

// Google翻訳APIを使用した翻訳関数
async function translateWithGoogleAPI(text: string): Promise<string> {
  if (!GAS_TRANSLATE_URL) {
    console.warn('Google Apps Script URLが設定されていません')
    return '翻訳APIが設定されていません'
  }

  try {
    const response = await fetch(
      `${GAS_TRANSLATE_URL}?text=${encodeURIComponent(text)}&source=en&target=ja`
    )
    const data = await response.json()
    
    if (data.success) {
      return data.text
    } else {
      console.error('Translation API error:', data.error)
      return '翻訳エラー: ' + data.error
    }
  } catch (error) {
    console.error('Network error:', error)
    return '通信エラー: 翻訳できませんでした'
  }
}

// 保存処理
async function handleSave(): Promise<void> {
  const englishText = elements.englishInput.value.trim()
  const translationsArray = translationLines
  
  if (!englishText) {
    toast.info('英語のテキストを入力してください')
    return
  }
  
  try {
    const result = await saveNote(englishText, translationsArray)
    
    if (result) {
      if (result.type === 'updated') {
        toast.success(UI_STRINGS.UPDATED)
        // 更新後もEditingStateを維持
        currentEditingId = result.id
      } else {
        toast.success(UI_STRINGS.SAVED_NEW)
        // 保存後は編集状態に切り替え
        currentEditingId = result.id
        EditingState.updateUI()
      }
      
      // ノート一覧を更新
      if (isFirebaseReady && firestoreManager && authManager!.getCurrentUser()) {
        await syncFromFirestore()
      } else {
        displayNotes()
      }
    }
  } catch (error) {
    console.error('Save error:', error)
    toast.error('保存に失敗しました')
  }
}

// 保存処理の実装
async function saveNote(text: string, translations: string[] = []): Promise<SaveResult | false> {
  if (!text.trim()) return false
  
  const trimmedText = text.trim()
  const cleanTranslations = translations || []
  
  // Firebaseが利用可能でログインしている場合
  if (isFirebaseReady && firestoreManager && authManager!.getCurrentUser()) {
    try {
      const noteData: Note = {
        id: currentEditingId || Date.now(),
        text: trimmedText,
        translations: cleanTranslations,
        timestamp: new Date().toISOString()
      }
      
      if (currentEditingId) {
        // 更新処理
        await firestoreManager.updateNote(noteData)
        return { type: 'updated', id: currentEditingId }
      } else {
        // 新規作成処理
        await firestoreManager.saveNote(noteData)
        return { type: 'saved', id: noteData.id }
      }
    } catch (error) {
      console.error('Firestore保存エラー:', error)
      toast.error('クラウド保存に失敗しました。ローカルに保存します。')
      // Firestoreエラー時はlocalStorageにフォールバック
    }
  }
  
  // ローカルストレージでの保存処理
  const notes = getNotes()
  
  // 編集中のアイテムがある場合は更新処理
  if (currentEditingId) {
    const editingIndex = notes.findIndex(item => item.id === currentEditingId)
    if (editingIndex !== -1) {
      // 既存のアイテムを更新
      notes[editingIndex] = {
        ...notes[editingIndex],
        text: trimmedText,
        translations: cleanTranslations,
        timestamp: new Date().toISOString()
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
      return { type: 'updated', id: currentEditingId }
    }
  }
  
  // 新規作成の場合：重複チェック
  const existingItem = notes.find(item => item.text === trimmedText)
  if (existingItem) {
    // 翻訳が同じかチェック
    const existingTranslations = existingItem.translations || []
    
    // 翻訳内容が同じ場合のみ重複エラー
    if (JSON.stringify(existingTranslations) === JSON.stringify(cleanTranslations)) {
      toast.info('このノートは既に保存されています。')
      return false
    }
    
    // 翻訳が異なる場合は確認ダイアログを表示
    if (confirm('同じ英文のノートですが、翻訳が異なります。新しい翻訳で上書きしますか？')) {
      // 既存のアイテムを削除
      const index = notes.findIndex(item => item.id === existingItem.id)
      if (index !== -1) {
        notes.splice(index, 1)
      }
    } else {
      return false
    }
  }
  
  // 新しいアイテムを作成
  const newItem: Note = {
    id: Date.now(),
    text: trimmedText,
    translations: cleanTranslations,
    timestamp: new Date().toISOString()
  }
  
  // 配列の先頭に追加
  notes.unshift(newItem)
  
  // 最大数を超えた場合、古いものを削除
  if (notes.length > MAX_SAVED_ITEMS) {
    notes.splice(MAX_SAVED_ITEMS)
  }
  
  // localStorageに保存
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  
  // 新規作成時はIDを含めた結果を返す
  return { type: 'saved', id: newItem.id }
}

// クリア処理
function handleClear(): void {
  elements.englishInput.value = ''
  elements.translationText.value = ''
  translationLines = []
  
  // 編集状態を新規作成状態に切り替え
  EditingState.startNew()
  
  // フォーカスを英語入力欄に設定
  elements.englishInput.focus()
}

// ノート削除処理
async function deleteNote(id: number): Promise<void> {
  // Firebaseが利用可能でログインしている場合
  if (isFirebaseReady && firestoreManager && authManager!.getCurrentUser()) {
    try {
      await firestoreManager.deleteNote(id)
      return
    } catch (error) {
      console.error('Firestore削除エラー:', error)
      toast.error('クラウドでの削除に失敗しました。ローカルのみ削除します。')
    }
  }
  
  // ローカルストレージでの削除処理
  const notes = getNotes()
  const filtered = notes.filter(item => item.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

// ローカルノート表示
function displayNotes(): void {
  const notes = getNotes()
  const listContainer = document.getElementById('saved-sentences-list')!
  displayNotesFromData(notes, listContainer)
}

// 汎用的なノート表示関数
function displayNotesFromData(notes: Note[], container: HTMLElement): void {
  if (notes.length === 0) {
    container.innerHTML = '<div class="no-notes">ノートがありません</div>'
    return
  }
  
  // 既存の内容をクリア
  container.innerHTML = ''
  
  // 各アイテムを動的に作成
  notes.forEach(item => {
    const itemDiv = document.createElement('div')
    itemDiv.className = 'saved-sentence-item'
    itemDiv.dataset.id = String(item.id)
    
    // 英文と翻訳を含むコンテナ
    const contentDiv = document.createElement('div')
    contentDiv.className = 'sentence-content'
    
    // 英文を表示（改行をスペースに変換して1行表示）
    const englishDiv = document.createElement('div')
    englishDiv.className = 'sentence-english'
    const displayEnglish = item.text.replace(/\n/g, ' ')
    englishDiv.textContent = displayEnglish
    contentDiv.appendChild(englishDiv)
    
    // 翻訳がある場合は表示（改行をスペースに変換して1行表示）
    if (item.translations && item.translations.length > 0) {
      const japaneseDiv = document.createElement('div')
      japaneseDiv.className = 'sentence-japanese'
      const displayJapanese = item.translations.join(' ')
      japaneseDiv.textContent = displayJapanese
      contentDiv.appendChild(japaneseDiv)
    }
    
    // ボタンコンテナ
    const buttonsDiv = document.createElement('div')
    buttonsDiv.className = 'sentence-buttons'
    
    // 再生ボタン
    const playButton = document.createElement('button')
    playButton.textContent = '▶️'
    playButton.className = 'action-button speak-action'
    playButton.onclick = (event) => {
      event.stopPropagation() // ノート選択イベントを防ぐ
      speakMultipleLines(item.text)
    }
    buttonsDiv.appendChild(playButton)
    
    // 削除ボタン
    const deleteButton = document.createElement('button')
    deleteButton.textContent = '❌'
    deleteButton.className = 'action-button delete-action'
    deleteButton.onclick = async (event) => {
      event.stopPropagation() // ノート選択イベントを防ぐ
      if (confirm('このノートを削除しますか？')) {
        await deleteNote(item.id)
        if (isFirebaseReady && firestoreManager && authManager!.getCurrentUser()) {
          await syncFromFirestore()
        } else {
          displayNotes()
        }
        
        // 削除したアイテムが編集中だった場合はクリア
        if (currentEditingId === item.id) {
          handleClear()
        }
        
        toast.success('ノートを削除しました')
      }
    }
    buttonsDiv.appendChild(deleteButton)
    
    // ノート全体をクリッカブルにする
    itemDiv.addEventListener('click', () => {
      loadNote(item)
    })
    
    // 要素をアイテムに追加
    itemDiv.appendChild(contentDiv)
    itemDiv.appendChild(buttonsDiv)
    
    // リストに追加
    container.appendChild(itemDiv)
  })
}

// ノートを入力エリアに読み込む関数
function loadNote(item: Note): void {
  elements.englishInput.value = item.text
  elements.englishInput.focus()
  
  // 保存された翻訳がある場合は表示
  if (item.translations && item.translations.length > 0) {
    translationLines = item.translations
    updateTranslationDisplay()
  } else {
    // 翻訳がない場合はクリア
    translationLines = []
    elements.translationText.value = ''
  }
  
  // 編集状態を開始
  EditingState.startEditing(item.id)
}

// ヘルパー関数：現在の行番号を取得
function getCurrentLineNumber(textarea: HTMLTextAreaElement): number {
  const cursorPosition = textarea.selectionStart
  const textBeforeCursor = textarea.value.substring(0, cursorPosition)
  return textBeforeCursor.split('\n').length - 1
}

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

// 翻訳表示を更新する関数
function updateTranslationDisplay(): void {
  elements.translationText.value = translationLines.join('\n')
}

// キーボードイベントハンドラー
async function handleKeyboardEvents(event: KeyboardEvent): Promise<void> {
  if (event.key === 'Enter') {
    // エンターキーが押される前に現在の行番号と行内容を取得
    const lineNumber = getCurrentLineNumber(elements.englishInput)
    const currentLine = getCurrentLine(elements.englishInput)
    
    if (currentLine.trim()) {
      // 現在行を文として発音
      speakEnglish(currentLine.trim(), false)
      
      // 自動的に現在行を翻訳
      if (GAS_TRANSLATE_URL && !isTranslating) {
        // 翻訳中の状態を表示
        isTranslating = true
        elements.translateButton.disabled = true
        elements.translateButton.textContent = UI_STRINGS.TRANSLATING
        elements.translateButton.style.opacity = '0.6'
        
        try {
          const translation = await translateWithGoogleAPI(currentLine.trim())
          // 翻訳結果を対応する行に設定
          while (translationLines.length <= lineNumber) {
            translationLines.push('')
          }
          translationLines[lineNumber] = translation
          updateTranslationDisplay()
        } catch (error) {
          console.error('Auto translation error:', error)
        } finally {
          // 翻訳終了
          isTranslating = false
          elements.translateButton.disabled = false
          elements.translateButton.textContent = UI_STRINGS.TRANSLATE
          elements.translateButton.style.opacity = '1'
        }
      }
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
    currentEditingId = itemId
    EditingState.updateUI()
    EditingState.updateSavedSentenceHighlight()
  },
  
  startNew: () => {
    currentEditingId = null
    EditingState.updateUI()
    EditingState.updateSavedSentenceHighlight()
  },
  
  updateUI: () => {
    const isEditing = currentEditingId !== null
    elements.saveButton.textContent = isEditing ? UI_STRINGS.SAVE_UPDATE : UI_STRINGS.SAVE_NEW
    elements.clearButton.textContent = UI_STRINGS.NEW_NOTE
  },
  
  updateSavedSentenceHighlight: () => {
    // 全てのノートのハイライトをリセット
    document.querySelectorAll('.saved-sentence-item').forEach(item => {
      item.classList.remove('editing')
    })
    
    // 編集中のアイテムがあればハイライト
    if (currentEditingId) {
      const editingItem = document.querySelector(`[data-id="${currentEditingId}"]`)
      if (editingItem) {
        editingItem.classList.add('editing')
      }
    }
  }
}