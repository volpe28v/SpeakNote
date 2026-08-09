import React, { useState, useEffect, useRef, useMemo } from 'react'
import type { Note } from '@/types'
import {
  PRACTICE_TIMEOUTS,
  THINKING_TIME_OPTIONS,
  REPEAT_COUNT_OPTIONS,
  INFINITE_THINKING_TIME,
} from '@/constants/practiceConstants'
import { extractValidPairs } from '@/utils/textUtils'
import { speakText, stopSpeech } from '@/lib/speech'
import './QuickTranslationPractice.css'

interface QuickTranslationPracticeProps {
  note: Note
  onClose: () => void
}

// Fisher-Yatesシャッフル
const shuffleArray = (length: number): number[] => {
  const arr = Array.from({ length }, (_, i) => i)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const QuickTranslationPractice: React.FC<QuickTranslationPracticeProps> = ({ note, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentPhase, setCurrentPhase] = useState<
    'idle' | 'japanese' | 'thinking' | 'english' | 'pause'
  >('idle')
  const [thinkingTime, setThinkingTime] = useState(5) // 秒
  const [englishRepeatCount, setEnglishRepeatCount] = useState(2)
  const [isRandom, setIsRandom] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [englishRepeatCurrent, setEnglishRepeatCurrent] = useState(0)

  // 出題順。ref をレンダー中に読むと React の管理外の値に描画が依存するため state で持つ
  const [order, setOrder] = useState<number[]>([])

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const phaseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const practiceScreenRef = useRef<HTMLDivElement>(null)

  // 有効な練習ペアを抽出。毎レンダー作り直すと currentPair の参照も変わり、
  // effect の依存に含められなくなる
  const validPairs = useMemo(
    () => extractValidPairs(note.text.split('\n'), note.translations || []),
    [note]
  )

  const totalLines = validPairs.length

  // 現在の出題ペアを取得
  const currentPair = validPairs[order[currentIndex] ?? currentIndex]

  const clearTimers = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current)
      phaseTimeoutRef.current = null
    }
  }

  const cleanup = () => {
    clearTimers()
    stopSpeech()
  }

  const stopPractice = () => {
    cleanup()
    setIsPlaying(false)
    setCurrentPhase('idle')
    setCurrentIndex(0)
    setTimeRemaining(0)
    setEnglishRepeatCurrent(0)
  }

  // practice-screenにフォーカスを当てる
  useEffect(() => {
    if (isPlaying) {
      practiceScreenRef.current?.focus()
    }
  }, [isPlaying])

  useEffect(() => {
    if (!isPlaying || currentPhase === 'idle' || totalLines === 0) {
      return
    }

    // この effect 実行が破棄されたかを示す。停止やフェーズ切り替えで cleanup が
    // 走った後に、キャンセル済みの読み上げの onend が遅れて発火して次フェーズを
    // 進めてしまうのを防ぐ（speechSynthesis.cancel() は onend を呼ぶ）
    let cancelled = false

    const advance = (delayMs: number, action: () => void) => {
      if (cancelled) return
      phaseTimeoutRef.current = setTimeout(() => {
        if (cancelled) return
        action()
      }, delayMs)
    }

    const goToThinking = () => {
      setCurrentPhase('thinking')
      setTimeRemaining(thinkingTime)
    }

    const goToNextRepeatOrPause = (delayMs: number) => {
      const nextRepeat = englishRepeatCurrent + 1
      if (nextRepeat < englishRepeatCount) {
        advance(delayMs, () => {
          setEnglishRepeatCurrent(nextRepeat)
          setCurrentPhase('english')
        })
      } else {
        advance(delayMs, () => setCurrentPhase('pause'))
      }
    }

    const executePhase = () => {
      if (cancelled) return

      switch (currentPhase) {
        case 'japanese': {
          // 日本語を読み上げ
          const japaneseText = currentPair?.japanese
          if (japaneseText && japaneseText.trim()) {
            const handleSpeechEnd = () => advance(PRACTICE_TIMEOUTS.PHASE_TRANSITION, goToThinking)
            speakText(japaneseText, 'japanese', handleSpeechEnd, handleSpeechEnd)
          } else {
            // テキストがない場合は即座に次へ
            advance(PRACTICE_TIMEOUTS.QUICK_TRANSITION, goToThinking)
          }
          break
        }

        case 'thinking':
          if (thinkingTime === INFINITE_THINKING_TIME) {
            // 無限モード：ユーザーがボタンを押すまで待機
            setTimeRemaining(INFINITE_THINKING_TIME)
          } else {
            // カウントダウン開始
            let countdown = thinkingTime
            setTimeRemaining(countdown)

            intervalRef.current = setInterval(() => {
              if (cancelled) return
              countdown--
              if (countdown <= 0) {
                clearTimers()
                setCurrentPhase('english')
                setEnglishRepeatCurrent(0)
              } else {
                setTimeRemaining(countdown)
              }
            }, PRACTICE_TIMEOUTS.COUNTDOWN_INTERVAL)
          }
          break

        case 'english': {
          // 英語を読み上げ
          const englishText = currentPair?.english
          if (englishText && englishText.trim()) {
            const handleNextPhase = () =>
              goToNextRepeatOrPause(PRACTICE_TIMEOUTS.ENGLISH_REPEAT_INTERVAL)
            speakText(englishText, 'english', handleNextPhase, handleNextPhase)
          } else {
            // テキストがない場合は即座に次へ
            goToNextRepeatOrPause(PRACTICE_TIMEOUTS.QUICK_TRANSITION)
          }
          break
        }

        case 'pause':
          // 短い休憩後、次の文へ
          advance(PRACTICE_TIMEOUTS.PAUSE_DURATION, () => {
            setCurrentIndex((currentIndex + 1) % totalLines)
            setEnglishRepeatCurrent(0)
            setCurrentPhase('japanese')
          })
          break
      }
    }

    const startTimer = setTimeout(executePhase, PRACTICE_TIMEOUTS.PHASE_START_DELAY)

    // 破棄時にタイマーと読み上げを完全に止める。
    // ここを中途半端にすると、フェーズが進まなくなったり
    // 停止後に読み上げが鳴り続けたりする
    return () => {
      cancelled = true
      clearTimeout(startTimer)
      clearTimers()
      stopSpeech()
    }
  }, [
    isPlaying,
    currentPhase,
    currentIndex,
    currentPair,
    totalLines,
    englishRepeatCurrent,
    thinkingTime,
    englishRepeatCount,
  ])

  const startPractice = () => {
    cleanup()
    setOrder(isRandom ? shuffleArray(totalLines) : Array.from({ length: totalLines }, (_, i) => i))
    setIsPlaying(true)
    setCurrentIndex(0)
    setEnglishRepeatCurrent(0)
    setTimeRemaining(0)
    setCurrentPhase('japanese') // idle -> japanese
  }

  const handleStop = () => {
    stopPractice()
  }

  const handleClose = () => {
    stopPractice()
    onClose()
  }

  const handleShowAnswer = () => {
    if (currentPhase === 'thinking' && thinkingTime === INFINITE_THINKING_TIME) {
      setCurrentPhase('english')
      setEnglishRepeatCurrent(0)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    event.preventDefault()

    if (event.key === 'Escape') {
      handleStop()
    } else if (currentPhase === 'thinking' && thinkingTime === INFINITE_THINKING_TIME) {
      if (event.key === 'Enter' || event.key === ' ') {
        handleShowAnswer()
      }
    }
  }

  if (totalLines === 0) {
    return (
      <div className="quick-translation-overlay">
        <div className="quick-translation-modal">
          <div className="quick-translation-header">
            <h2>瞬間英作文練習</h2>
            <button className="close-button" onClick={handleClose}>
              ✕
            </button>
          </div>
          <div className="quick-translation-content">
            <p className="error-message">このノートには練習できる文がありません。</p>
            <p className="error-message">英語と日本語訳の両方が必要です。</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="quick-translation-overlay">
      <div className="quick-translation-modal">
        <div className="quick-translation-header">
          <h2>瞬間英作文練習</h2>
          <button className="close-button" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="quick-translation-content">
          {!isPlaying ? (
            <div className="start-screen">
              <p className="practice-description">
                日本語を聞いて英語を考える練習です。
                <br />
                {totalLines}個の文を繰り返し練習します。
              </p>

              <div className="settings">
                <div className="setting-item">
                  <label>考える時間：</label>
                  <select
                    value={thinkingTime}
                    onChange={(e) => setThinkingTime(Number(e.target.value))}
                  >
                    {THINKING_TIME_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="setting-item">
                  <label>英語の繰り返し回数：</label>
                  <select
                    value={englishRepeatCount}
                    onChange={(e) => setEnglishRepeatCount(Number(e.target.value))}
                  >
                    {REPEAT_COUNT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="setting-item">
                  <label>出題順：</label>
                  <select
                    value={isRandom ? 'random' : 'sequential'}
                    onChange={(e) => setIsRandom(e.target.value === 'random')}
                  >
                    <option value="sequential">順番通り</option>
                    <option value="random">ランダム</option>
                  </select>
                </div>
              </div>

              <button className="start-button" onClick={startPractice}>
                練習を開始
              </button>
            </div>
          ) : (
            <div
              className="practice-screen"
              ref={practiceScreenRef}
              tabIndex={0}
              onKeyDown={handleKeyDown}
            >
              <div className="progress-info">
                <span>
                  文 {currentIndex + 1} / {totalLines}
                </span>
              </div>

              <div className="current-practice">
                <div className={`practice-phase ${currentPhase === 'japanese' ? 'active' : ''}`}>
                  <h3>日本語</h3>
                  <p className="practice-text">{currentPair?.japanese}</p>
                </div>

                {currentPhase === 'thinking' && (
                  <div className="thinking-phase active">
                    <h3>考える時間</h3>
                    {thinkingTime === INFINITE_THINKING_TIME ? (
                      <button className="show-answer-button" onClick={handleShowAnswer}>
                        答えを見る
                      </button>
                    ) : (
                      <div className="countdown">{timeRemaining}</div>
                    )}
                  </div>
                )}

                <div className={`practice-phase ${currentPhase === 'english' ? 'active' : ''}`}>
                  <h3>英語</h3>
                  <p className="practice-text">
                    {currentPhase === 'english' || currentPhase === 'pause'
                      ? currentPair?.english
                      : '???'}
                  </p>
                  {currentPhase === 'english' && englishRepeatCount > 1 && (
                    <span className="repeat-count">
                      ({englishRepeatCurrent + 1}/{englishRepeatCount}回目)
                    </span>
                  )}
                </div>
              </div>

              <button className="stop-button" onClick={handleStop}>
                練習を停止
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuickTranslationPractice
