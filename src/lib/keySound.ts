// キータイプ音の管理
class KeySoundManager {
  private audioContext: AudioContext | null = null
  private enabled: boolean = true
  private volume: number = 1.0 // 常に100%

  constructor() {
    // 音声ON/OFFのみ保存（音量は常に100%）
    const savedEnabled = localStorage.getItem('keySoundEnabled')

    if (savedEnabled !== null) {
      this.enabled = savedEnabled === 'true'
    }
  }

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  // キータイプ音を再生（短いクリック音）
  public playKeySound() {
    if (!this.enabled) return

    try {
      this.initAudioContext()
      if (!this.audioContext) return

      const currentTime = this.audioContext.currentTime

      // メインのクリック音
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      // 高音の短いクリック音（カシャという音）
      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(4000, currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(1000, currentTime + 0.005)

      // 音量の設定（短く鋭い音）
      gainNode.gain.setValueAtTime(this.volume * 0.15, currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.015)

      oscillator.start(currentTime)
      oscillator.stop(currentTime + 0.015)

      // 追加の低音成分
      const oscillator2 = this.audioContext.createOscillator()
      const gainNode2 = this.audioContext.createGain()

      oscillator2.connect(gainNode2)
      gainNode2.connect(this.audioContext.destination)

      oscillator2.type = 'sine'
      oscillator2.frequency.setValueAtTime(200, currentTime)

      gainNode2.gain.setValueAtTime(this.volume * 0.05, currentTime)
      gainNode2.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.01)

      oscillator2.start(currentTime)
      oscillator2.stop(currentTime + 0.01)
    } catch (error) {
      console.error('Failed to play key sound:', error)
    }
  }

  // スペースキー用の少し低い音
  public playSpaceSound() {
    if (!this.enabled) return

    try {
      this.initAudioContext()
      if (!this.audioContext) return

      const currentTime = this.audioContext.currentTime

      // メインのクリック音（スペース用に少し低めの音）
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(3000, currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(800, currentTime + 0.006)

      gainNode.gain.setValueAtTime(this.volume * 0.12, currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.018)

      oscillator.start(currentTime)
      oscillator.stop(currentTime + 0.018)

      // 追加の低音成分（より強め）
      const oscillator2 = this.audioContext.createOscillator()
      const gainNode2 = this.audioContext.createGain()

      oscillator2.connect(gainNode2)
      gainNode2.connect(this.audioContext.destination)

      oscillator2.type = 'sine'
      oscillator2.frequency.setValueAtTime(150, currentTime)

      gainNode2.gain.setValueAtTime(this.volume * 0.07, currentTime)
      gainNode2.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.012)

      oscillator2.start(currentTime)
      oscillator2.stop(currentTime + 0.012)
    } catch (error) {
      console.error('Failed to play space sound:', error)
    }
  }

  // Enter/改行用の音
  public playEnterSound() {
    if (!this.enabled) return

    try {
      this.initAudioContext()
      if (!this.audioContext) return

      const currentTime = this.audioContext.currentTime

      // メインのクリック音（Enter用により強い音）
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(3500, currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(700, currentTime + 0.008)

      gainNode.gain.setValueAtTime(this.volume * 0.18, currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.025)

      oscillator.start(currentTime)
      oscillator.stop(currentTime + 0.025)

      // 追加の低音成分（より強く長め）
      const oscillator2 = this.audioContext.createOscillator()
      const gainNode2 = this.audioContext.createGain()

      oscillator2.connect(gainNode2)
      gainNode2.connect(this.audioContext.destination)

      oscillator2.type = 'sine'
      oscillator2.frequency.setValueAtTime(120, currentTime)

      gainNode2.gain.setValueAtTime(this.volume * 0.08, currentTime)
      gainNode2.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.02)

      oscillator2.start(currentTime)
      oscillator2.stop(currentTime + 0.02)
    } catch (error) {
      console.error('Failed to play enter sound:', error)
    }
  }

  // バックスペース/削除用の音
  public playDeleteSound() {
    if (!this.enabled) return

    try {
      this.initAudioContext()
      if (!this.audioContext) return

      const currentTime = this.audioContext.currentTime

      // メインのクリック音（削除用により短く軽い音）
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(2500, currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(1500, currentTime + 0.004)

      gainNode.gain.setValueAtTime(this.volume * 0.10, currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.012)

      oscillator.start(currentTime)
      oscillator.stop(currentTime + 0.012)

      // 追加の低音成分（削除音用に軽め）
      const oscillator2 = this.audioContext.createOscillator()
      const gainNode2 = this.audioContext.createGain()

      oscillator2.connect(gainNode2)
      gainNode2.connect(this.audioContext.destination)

      oscillator2.type = 'sine'
      oscillator2.frequency.setValueAtTime(250, currentTime)

      gainNode2.gain.setValueAtTime(this.volume * 0.04, currentTime)
      gainNode2.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.008)

      oscillator2.start(currentTime)
      oscillator2.stop(currentTime + 0.008)
    } catch (error) {
      console.error('Failed to play delete sound:', error)
    }
  }

  // 設定の取得と更新
  public isEnabled(): boolean {
    return this.enabled
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled
    localStorage.setItem('keySoundEnabled', String(enabled))
  }

  public toggleEnabled() {
    this.setEnabled(!this.enabled)
  }
}

// シングルトンインスタンス
export const keySoundManager = new KeySoundManager()