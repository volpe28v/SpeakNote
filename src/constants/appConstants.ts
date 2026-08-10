// アプリケーション設定値と定数
import type { UIStrings } from '@/types'

// アプリケーションのバージョン（package.json の version と揃えること）
export const APP_VERSION = '1.4.1'

// Google Apps Script translation API URL
export const GAS_TRANSLATE_URL =
  'https://script.google.com/macros/s/AKfycby-Q8nJL9dNrOK2mtt0ogNRF_tux9Qch6GB9Pu4D-KwBezZ1U4_xPUtK-0kXDufzxoW/exec'

// UI text strings
export const UI_STRINGS: UIStrings = {
  TRANSLATING: 'Translating...',
  TRANSLATING_PROGRESS: (current: number, total: number) => `Translating... (${current}/${total})`,
  TRANSLATE: 'Translate',
  TRANSLATION_ERROR: 'Translation error occurred',
  API_NOT_SET:
    'Translation API is not configured. Please check README.md for Google Apps Script setup.',
}
