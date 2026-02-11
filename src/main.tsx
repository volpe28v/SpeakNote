import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'
import { checkSpeechSynthesisSupport } from '@/lib/speech'

// 音声合成APIの初期化
checkSpeechSynthesisSupport()

// Service Worker登録（PWA機能）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration)
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError)
      })
  })
}

// DOM要素の存在確認
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
