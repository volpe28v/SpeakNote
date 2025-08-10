// 翻訳機能を管理するクラス
import { toast } from '../lib/toast'
import { GAS_TRANSLATE_URL, UI_STRINGS } from '../config/constants'

export class TranslationManager {
  private static instance: TranslationManager | null = null
  private isTranslating = false
  private translationLines: string[] = []

  private constructor() {}

  static getInstance(): TranslationManager {
    if (!TranslationManager.instance) {
      TranslationManager.instance = new TranslationManager()
    }
    return TranslationManager.instance
  }

  getTranslationLines(): string[] {
    return this.translationLines
  }

  setTranslationLines(lines: string[]): void {
    this.translationLines = lines
  }

  clearTranslationLines(): void {
    this.translationLines = []
  }

  isCurrentlyTranslating(): boolean {
    return this.isTranslating
  }

  // Google翻訳APIを使用した翻訳関数
  async translateWithGoogleAPI(text: string): Promise<string> {
    if (!GAS_TRANSLATE_URL) {
      console.warn('Google Apps Script URL not configured')
      return 'Translation API not configured'
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
        return 'Translation error: ' + data.error
      }
    } catch (error) {
      console.error('Network error:', error)
      return 'Network error: Translation failed'
    }
  }

  // 翻訳処理のメイン関数
  async handleTranslate(
    englishInput: HTMLTextAreaElement,
    translationText: HTMLTextAreaElement,
    translateButton: HTMLButtonElement
  ): Promise<void> {
    const input = englishInput.value
    
    // 完全に空の場合のみエラー
    if (!input.trim()) {
      toast.info('Please enter English text')
      return
    }
    
    if (this.isTranslating) {
      return // 既に翻訳中の場合は何もしない
    }
    
    // 翻訳APIが設定されていない場合
    if (!GAS_TRANSLATE_URL) {
      toast.warning(UI_STRINGS.API_NOT_SET)
      return
    }
    
    // 翻訳開始
    this.isTranslating = true
    translateButton.disabled = true
    translateButton.textContent = UI_STRINGS.TRANSLATING
    translateButton.style.opacity = '0.6'
    
    try {
      // 元のテキストを改行を保持したまま処理
      const originalText = englishInput.value // trimしない（空行保持のため）
      
      // 一括翻訳を実行
      const translatedText = await this.translateWithGoogleAPI(originalText)
      
      // 翻訳結果を行ごとに分割して保存
      this.translationLines = translatedText.split('\n')
      
      // 翻訳結果を表示
      translationText.value = translatedText
      
      toast.success('Translation completed')
    } catch (error) {
      console.error('Translation error:', error)
      toast.error(UI_STRINGS.TRANSLATION_ERROR)
    } finally {
      // 翻訳終了
      this.isTranslating = false
      translateButton.disabled = false
      translateButton.textContent = UI_STRINGS.TRANSLATE
      translateButton.style.opacity = '1'
    }
  }

  // 自動翻訳処理（キーボード入力時用）
  async performAutoTranslation(
    englishInput: HTMLTextAreaElement,
    translationText: HTMLTextAreaElement,
    translateButton: HTMLButtonElement
  ): Promise<void> {
    if (GAS_TRANSLATE_URL && !this.isTranslating) {
      // 翻訳中の状態を表示
      this.isTranslating = true
      translateButton.disabled = true
      translateButton.textContent = UI_STRINGS.TRANSLATING
      translateButton.style.opacity = '0.6'
      
      try {
        // 全文を一括翻訳
        const fullText = englishInput.value
        if (fullText.trim()) {
          const translatedText = await this.translateWithGoogleAPI(fullText)
          
          // 翻訳結果を行ごとに分割して保存
          this.translationLines = translatedText.split('\n')
          
          // 翻訳結果を表示
          translationText.value = translatedText
        }
      } catch (error) {
        console.error('Auto translation error:', error)
      } finally {
        // 翻訳終了
        this.isTranslating = false
        translateButton.disabled = false
        translateButton.textContent = UI_STRINGS.TRANSLATE
        translateButton.style.opacity = '1'
      }
    }
  }

  // 翻訳表示を更新する関数
  updateTranslationDisplay(translationText: HTMLTextAreaElement): void {
    translationText.value = this.translationLines.join('\n')
  }
}