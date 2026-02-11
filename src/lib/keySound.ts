// キータイプ音の管理

interface SoundParams {
  mainFreqStart: number
  mainFreqEnd: number
  mainFreqRamp: number
  mainGain: number
  mainDuration: number
  subFreq: number
  subGain: number
  subDuration: number
}

const SOUND_PARAMS: Record<string, SoundParams> = {
  key: {
    mainFreqStart: 4000,
    mainFreqEnd: 1000,
    mainFreqRamp: 0.005,
    mainGain: 0.15,
    mainDuration: 0.015,
    subFreq: 200,
    subGain: 0.05,
    subDuration: 0.01,
  },
  space: {
    mainFreqStart: 3000,
    mainFreqEnd: 800,
    mainFreqRamp: 0.006,
    mainGain: 0.12,
    mainDuration: 0.018,
    subFreq: 150,
    subGain: 0.07,
    subDuration: 0.012,
  },
  enter: {
    mainFreqStart: 3500,
    mainFreqEnd: 700,
    mainFreqRamp: 0.008,
    mainGain: 0.18,
    mainDuration: 0.025,
    subFreq: 120,
    subGain: 0.08,
    subDuration: 0.02,
  },
  delete: {
    mainFreqStart: 2500,
    mainFreqEnd: 1500,
    mainFreqRamp: 0.004,
    mainGain: 0.1,
    mainDuration: 0.012,
    subFreq: 250,
    subGain: 0.04,
    subDuration: 0.008,
  },
}

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
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
  }

  private playSound(params: SoundParams) {
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

      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(params.mainFreqStart, currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(
        params.mainFreqEnd,
        currentTime + params.mainFreqRamp
      )

      gainNode.gain.setValueAtTime(this.volume * params.mainGain, currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + params.mainDuration)

      oscillator.start(currentTime)
      oscillator.stop(currentTime + params.mainDuration)

      // 追加の低音成分
      const oscillator2 = this.audioContext.createOscillator()
      const gainNode2 = this.audioContext.createGain()

      oscillator2.connect(gainNode2)
      gainNode2.connect(this.audioContext.destination)

      oscillator2.type = 'sine'
      oscillator2.frequency.setValueAtTime(params.subFreq, currentTime)

      gainNode2.gain.setValueAtTime(this.volume * params.subGain, currentTime)
      gainNode2.gain.exponentialRampToValueAtTime(0.001, currentTime + params.subDuration)

      oscillator2.start(currentTime)
      oscillator2.stop(currentTime + params.subDuration)
    } catch (error) {
      console.error('Failed to play sound:', error)
    }
  }

  public playKeySound() {
    this.playSound(SOUND_PARAMS.key)
  }

  public playSpaceSound() {
    this.playSound(SOUND_PARAMS.space)
  }

  public playEnterSound() {
    this.playSound(SOUND_PARAMS.enter)
  }

  public playDeleteSound() {
    this.playSound(SOUND_PARAMS.delete)
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
