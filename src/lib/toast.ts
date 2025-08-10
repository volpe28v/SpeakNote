// トースト通知システム
import type { ToastType } from '@/types'

class ToastManager {
  private container: HTMLElement

  constructor() {
    this.container = document.getElementById('toast-container')!
  }

  show(message: string, type: ToastType = 'info', duration = 3000): void {
    // トースト要素を作成
    const toast = document.createElement('div')
    toast.className = `toast ${type}`
    toast.textContent = message
    
    // コンテナに追加
    this.container.appendChild(toast)
    
    // アニメーション開始
    setTimeout(() => {
      toast.classList.add('show')
    }, 10)
    
    // 自動削除
    setTimeout(() => {
      toast.classList.remove('show')
      setTimeout(() => {
        if (this.container.contains(toast)) {
          this.container.removeChild(toast)
        }
      }, 300)
    }, duration)
  }
  
  success(message: string, duration = 3000): void {
    this.show(message, 'success', duration)
  }
  
  error(message: string, duration = 4000): void {
    this.show(message, 'error', duration)
  }
  
  info(message: string, duration = 3000): void {
    this.show(message, 'info', duration)
  }
  
  warning(message: string, duration = 3500): void {
    this.show(message, 'warning', duration)
  }
}

export const toast = new ToastManager()