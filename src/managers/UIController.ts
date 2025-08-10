// UI制御とイベントリスナー管理を行うクラス
import { toast } from '../lib/toast'
import { checkSpeechSynthesisSupport, speakJapanese, speakMultipleLines } from '../lib/speech'
import { APP_VERSION, UI_STRINGS } from '../config/constants'
import type { DOMElements } from '../types'

export class UIController {
  private static instance: UIController | null = null

  private constructor() {}

  static getInstance(): UIController {
    if (!UIController.instance) {
      UIController.instance = new UIController()
    }
    return UIController.instance
  }

  // DOM要素の取得
  getDOMElements(): DOMElements {
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

  // 初期化処理
  initialize(
    elements: DOMElements,
    onTranslate: () => void,
    onSave: () => void,
    onClear: () => void,
    onKeyboardEvents: () => void
  ): void {
    console.log('Initializing UI...')
    
    // Web Speech API チェック
    if (!checkSpeechSynthesisSupport()) {
      toast.error('お使いのブラウザは音声合成に対応していません。')
    }
    
    // バージョン表示の更新
    this.updateVersionDisplay()
    
    // イベントリスナーのセットアップ
    this.setupEventListeners(elements, onTranslate, onSave, onClear)
    
    // キーボードイベントの設定
    onKeyboardEvents()
    
    console.log('UI initialization completed')
  }

  // バージョン表示の動的更新
  private updateVersionDisplay(): void {
    const versionElement = document.querySelector('.version')
    if (versionElement) {
      versionElement.textContent = `ver${APP_VERSION}`
    }
  }

  // イベントリスナーのセットアップ
  private setupEventListeners(
    elements: DOMElements,
    onTranslate: () => void,
    onSave: () => void,
    onClear: () => void
  ): void {
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
        onTranslate()
      })
    } else {
      console.error('Translate button not found')
    }
    
    // 保存ボタン
    if (elements.saveButton) {
      elements.saveButton.addEventListener('click', () => {
        console.log('Save button clicked')
        onSave()
      })
    } else {
      console.error('Save button not found')
    }
    
    // クリアボタン
    if (elements.clearButton) {
      elements.clearButton.addEventListener('click', () => {
        console.log('Clear button clicked')
        onClear()
      })
    } else {
      console.error('Clear button not found')
    }
  }

  // EditingState管理オブジェクトの作成
  createEditingState(
    elements: DOMElements,
    getCurrentEditingId: () => number | null,
    setCurrentEditingId: (id: number | null) => void
  ) {
    return {
      startEditing: (itemId: number) => {
        setCurrentEditingId(itemId)
        this.updateEditingUI(elements, getCurrentEditingId)
        this.updateSavedSentenceHighlight(getCurrentEditingId)
      },
      
      startNew: () => {
        setCurrentEditingId(null)
        this.updateEditingUI(elements, getCurrentEditingId)
        this.updateSavedSentenceHighlight(getCurrentEditingId)
      },
      
      updateUI: () => {
        this.updateEditingUI(elements, getCurrentEditingId)
      },
      
      updateSavedSentenceHighlight: () => {
        this.updateSavedSentenceHighlight(getCurrentEditingId)
      }
    }
  }

  // 編集UI更新
  private updateEditingUI(elements: DOMElements, getCurrentEditingId: () => number | null): void {
    const isEditing = getCurrentEditingId() !== null
    elements.saveButton.textContent = isEditing ? UI_STRINGS.SAVE_UPDATE : UI_STRINGS.SAVE_NEW
    elements.clearButton.textContent = UI_STRINGS.NEW_NOTE
  }

  // 保存済み文章のハイライト更新
  private updateSavedSentenceHighlight(getCurrentEditingId: () => number | null): void {
    // 全てのノートのハイライトをリセット
    document.querySelectorAll('.saved-sentence-item').forEach(item => {
      item.classList.remove('editing')
    })
    
    // 編集中のアイテムがあればハイライト
    const currentEditingId = getCurrentEditingId()
    if (currentEditingId) {
      const editingItem = document.querySelector(`[data-id="${currentEditingId}"]`)
      if (editingItem) {
        editingItem.classList.add('editing')
      }
    }
  }
}