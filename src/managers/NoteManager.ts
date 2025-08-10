// ノート管理機能を管理するクラス
import { toast } from '../lib/toast'
import { speakMultipleLines } from '../lib/speech'
import { AuthManager, FirestoreManager } from '../lib/firebase'
import type { Note, SaveResult } from '../types'

export class NoteManager {
  private static instance: NoteManager | null = null
  private currentEditingId: number | null = null
  private hasAutoLoadedLatestNote = false

  private constructor() {}

  static getInstance(): NoteManager {
    if (!NoteManager.instance) {
      NoteManager.instance = new NoteManager()
    }
    return NoteManager.instance
  }

  getCurrentEditingId(): number | null {
    return this.currentEditingId
  }

  setCurrentEditingId(id: number | null): void {
    this.currentEditingId = id
  }

  getHasAutoLoadedLatestNote(): boolean {
    return this.hasAutoLoadedLatestNote
  }

  setHasAutoLoadedLatestNote(flag: boolean): void {
    this.hasAutoLoadedLatestNote = flag
  }

  resetFlags(): void {
    this.currentEditingId = null
    this.hasAutoLoadedLatestNote = false
  }

  // 保存処理の実装（Firebase必須）
  async saveNote(
    text: string, 
    translations: string[],
    authManager: AuthManager,
    firestoreManager: FirestoreManager,
    isFirebaseReady: boolean
  ): Promise<SaveResult | false> {
    if (!text.trim()) return false
    
    const trimmedText = text.trim()
    const cleanTranslations = translations || []
    
    // Firebase認証が必要
    if (!isFirebaseReady || !firestoreManager || !authManager.getCurrentUser()) {
      toast.error('Please login to save notes')
      return false
    }
    
    try {
      const noteData: Note = {
        id: this.currentEditingId || Date.now(),
        text: trimmedText,
        translations: cleanTranslations,
        timestamp: new Date().toISOString()
      }
      
      if (this.currentEditingId) {
        // 更新処理
        await firestoreManager.updateNote(noteData)
        return { type: 'updated', id: this.currentEditingId }
      } else {
        // 新規作成処理
        await firestoreManager.saveNote(noteData)
        return { type: 'saved', id: noteData.id }
      }
    } catch (error) {
      console.error('Firestore save error:', error)
      toast.error('Save failed. Please try again.')
      return false
    }
  }

  // ノート削除処理（Firebase必須）
  async deleteNote(
    id: number,
    authManager: AuthManager,
    firestoreManager: FirestoreManager,
    isFirebaseReady: boolean
  ): Promise<void> {
    // Firebase認証が必要
    if (!isFirebaseReady || !firestoreManager || !authManager.getCurrentUser()) {
      toast.error('Please login to delete notes')
      return
    }
    
    try {
      await firestoreManager.deleteNote(id)
    } catch (error) {
      console.error('Firestore delete error:', error)
      toast.error('Delete failed. Please try again.')
    }
  }

  // 汎用的なノート表示関数
  displayNotesFromData(
    notes: Note[], 
    container: HTMLElement,
    onNoteLoad: (note: Note) => void,
    onNoteDelete: (id: number) => Promise<void>
  ): void {
    if (notes.length === 0) {
      container.innerHTML = '<div class="no-notes">No notes available</div>'
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
      
      // 翻訳がある場合は表示（空行を保持して対応関係を明確にする）
      if (item.translations && item.translations.length > 0) {
        const japaneseDiv = document.createElement('div')
        japaneseDiv.className = 'sentence-japanese'
        // 空行も含めて結合（ただし、表示時は空行を適切に処理）
        const displayJapanese = item.translations.join(' ').replace(/\s{2,}/g, ' ').trim()
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
        if (confirm('Delete this note?')) {
          await onNoteDelete(item.id)
          toast.success('Note deleted')
        }
      }
      buttonsDiv.appendChild(deleteButton)
      
      // ノート全体をクリッカブルにする
      itemDiv.addEventListener('click', () => {
        onNoteLoad(item)
      })
      
      // 要素をアイテムに追加
      itemDiv.appendChild(contentDiv)
      itemDiv.appendChild(buttonsDiv)
      
      // リストに追加
      container.appendChild(itemDiv)
    })
  }

  // ノートを入力エリアに読み込む関数
  loadNote(
    item: Note,
    englishInput: HTMLTextAreaElement,
    translationText: HTMLTextAreaElement,
    translationManager: any,
    onEditingStart: (id: number) => void
  ): void {
    englishInput.value = item.text
    englishInput.focus()
    
    // 保存された翻訳がある場合は表示
    if (item.translations && item.translations.length > 0) {
      translationManager.setTranslationLines(item.translations)
      translationManager.updateTranslationDisplay(translationText)
    } else {
      // 翻訳がない場合はクリア
      translationManager.clearTranslationLines()
      translationText.value = ''
    }
    
    // 編集状態を開始
    onEditingStart(item.id)
  }

  // Firestoreとの同期（読み込み）
  async syncFromFirestore(
    authManager: AuthManager,
    firestoreManager: FirestoreManager,
    onNotesLoaded: (notes: Note[]) => void,
    onLatestNoteAutoLoad: (note: Note) => void
  ): Promise<void> {
    if (!firestoreManager || !authManager.getCurrentUser()) {
      return
    }
    
    try {
      const cloudNotes = await firestoreManager.getUserNotes()
      onNotesLoaded(cloudNotes)
      
      // ログイン後に最新のノートを自動選択（セッション中1回のみ）
      if (cloudNotes.length > 0 && !this.currentEditingId && !this.hasAutoLoadedLatestNote) {
        const latestNote = cloudNotes[0] // ノートは新しい順に並んでいる
        onLatestNoteAutoLoad(latestNote)
        this.hasAutoLoadedLatestNote = true
        toast.info('Latest note loaded automatically')
      }
    } catch (error) {
      console.error('Firestore sync error:', error)
      toast.error('Failed to sync from cloud')
    }
  }

  // 注意: 以下のlocalStorage関数はローカル→Firebase移行時のマイグレーション用として保持
  getNotes(): Note[] {
    const saved = localStorage.getItem('speakNote_savedSentences')
    return saved ? JSON.parse(saved) : []
  }
}