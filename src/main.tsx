import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { checkSpeechSynthesisSupport } from './lib/speech'

// 音声合成APIの初期化
checkSpeechSynthesisSupport()

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
