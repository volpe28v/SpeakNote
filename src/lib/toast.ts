// トースト通知システム
import type { ToastType } from '@/types'

class ToastManager {
  private getContainer(): HTMLElement | null {
    return document.getElementById('toast-container')
  }

  show(message: string, type: ToastType = 'info', duration = 3000): void {
    const container = this.getContainer()
    if (!container) {
      console.warn('Toast container not found')
      return
    }

    // トースト要素を作成
    const toast = document.createElement('div')
    toast.className = `toast ${type}`
    toast.textContent = message

    // コンテナに追加
    container.appendChild(toast)

    // アニメーション開始
    setTimeout(() => {
      toast.classList.add('show')
    }, 10)

    // 自動削除
    setTimeout(() => {
      toast.classList.remove('show')
      setTimeout(() => {
        const currentContainer = this.getContainer()
        if (currentContainer && currentContainer.contains(toast)) {
          currentContainer.removeChild(toast)
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

// 遅延実行トーストユーティリティ（CodeMirrorのフォーカス問題回避用）
const DEFERRED_DELAY = 100

export const deferredToast = {
  success: (message: string, duration?: number) =>
    setTimeout(() => toast.success(message, duration), DEFERRED_DELAY),
  error: (message: string, duration?: number) =>
    setTimeout(() => toast.error(message, duration), DEFERRED_DELAY),
  info: (message: string, duration?: number) =>
    setTimeout(() => toast.info(message, duration), DEFERRED_DELAY),
  warning: (message: string, duration?: number) =>
    setTimeout(() => toast.warning(message, duration), DEFERRED_DELAY),
}
