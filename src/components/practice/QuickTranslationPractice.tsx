import React, { useState, useEffect, useRef } from 'react'
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

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const phaseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isProcessingRef = useRef(false)
  const orderIndicesRef = useRef<number[]>([])

  // 有効な練習ペアを抽出
  const validPairs = extractValidPairs(note.text.split('\n'), note.translations || [])

  const totalLines = validPairs.length

  // 現在の出題ペアを取得
  const currentPair = validPairs[orderIndicesRef.current[currentIndex]] ?? validPairs[currentIndex]

  const cleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current)
      phaseTimeoutRef.current = null
    }
    stopSpeech()
    isProcessingRef.current = false
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
      const practiceScreen = document.querySelector('.practice-screen') as HTMLElement
      if (practiceScreen) {
        practiceScreen.focus()
      }
    }
  }, [isPlaying])

  useEffect(() => {
    if (!isPlaying || currentPhase === 'idle' || totalLines === 0) {
      return
    }

    // 既に処理中の場合はスキップ（重複実行を防ぐ）
    if (isProcessingRef.current) {
      return
    }
    isProcessingRef.current = true

    // 前のタイマーをクリアして音声もキャンセル
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current)
      phaseTimeoutRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    stopSpeech()

    const executePhase = () => {
      switch (currentPhase) {
        case 'japanese': {
          // 日本語を読み上げ
          const japaneseText = currentPair?.japanese
          if (japaneseText && japaneseText.trim()) {
            const handleSpeechEnd = () => {
              phaseTimeoutRef.current = setTimeout(() => {
                isProcessingRef.current = false
                setCurrentPhase('thinking')
                setTimeRemaining(thinkingTime)
              }, PRACTICE_TIMEOUTS.PHASE_TRANSITION)
            }

            speakText(japaneseText, 'japanese', handleSpeechEnd, handleSpeechEnd)
          } else {
            // テキストがない場合は即座に次へ
            phaseTimeoutRef.current = setTimeout(() => {
              isProcessingRef.current = false
              setCurrentPhase('thinking')
              setTimeRemaining(thinkingTime)
            }, PRACTICE_TIMEOUTS.QUICK_TRANSITION)
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
              countdown--
              if (countdown <= 0) {
                if (intervalRef.current) {
                  clearInterval(intervalRef.current)
                  intervalRef.current = null
                }
                isProcessingRef.current = false
                setCurrentPhase('english')
                setEnglishRepeatCurrent(0)
              } else {
                setTimeRemaining(countdown)
              }
            }, 1000)
          }
          break

        case 'english': {
          // 英語を読み上げ
          const englishText = currentPair?.english
          if (englishText && englishText.trim()) {
            const handleNextPhase = () => {
              const nextRepeat = englishRepeatCurrent + 1

              if (nextRepeat < englishRepeatCount) {
                // もう一度英語を読み上げ
                phaseTimeoutRef.current = setTimeout(() => {
                  setEnglishRepeatCurrent(nextRepeat)
                  isProcessingRef.current = false
                  setCurrentPhase('english')
                }, PRACTICE_TIMEOUTS.ENGLISH_REPEAT_INTERVAL)
              } else {
                // 次の文へ移行
                phaseTimeoutRef.current = setTimeout(() => {
                  isProcessingRef.current = false
                  setCurrentPhase('pause')
                }, PRACTICE_TIMEOUTS.ENGLISH_REPEAT_INTERVAL)
              }
            }

            speakText(englishText, 'english', handleNextPhase, handleNextPhase)
          } else {
            // テキストがない場合は即座に次へ
            const nextRepeat = englishRepeatCurrent + 1

            if (nextRepeat < englishRepeatCount) {
              phaseTimeoutRef.current = setTimeout(() => {
                setEnglishRepeatCurrent(nextRepeat)
                isProcessingRef.current = false
                setCurrentPhase('english')
              }, PRACTICE_TIMEOUTS.QUICK_TRANSITION)
            } else {
              phaseTimeoutRef.current = setTimeout(() => {
                isProcessingRef.current = false
                setCurrentPhase('pause')
              }, PRACTICE_TIMEOUTS.QUICK_TRANSITION)
            }
          }
          break
        }

        case 'pause':
          // 短い休憩後、次の文へ
          phaseTimeoutRef.current = setTimeout(() => {
            const nextIndex = (currentIndex + 1) % totalLines
            setCurrentIndex(nextIndex)
            setEnglishRepeatCurrent(0)
            isProcessingRef.current = false
            setCurrentPhase('japanese')
          }, 1000)
          break
      }
    }

    // 少し遅延を入れて実行（React StrictModeの二重実行対策）
    const timer = setTimeout(() => {
      executePhase()
    }, PRACTICE_TIMEOUTS.REACT_STRICT_DELAY)

    return () => {
      clearTimeout(timer)
      if (phaseTimeoutRef.current) {
        clearTimeout(phaseTimeoutRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [currentPhase, currentIndex, englishRepeatCurrent, thinkingTime, englishRepeatCount]) // 必要な依存を追加

  const startPractice = () => {
    cleanup()
    orderIndicesRef.current = isRandom
      ? shuffleArray(totalLines)
      : Array.from({ length: totalLines }, (_, i) => i)
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
      isProcessingRef.current = false
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
            <div className="practice-screen" tabIndex={0} onKeyDown={handleKeyDown}>
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
                    {thinkingTime === -1 ? (
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
