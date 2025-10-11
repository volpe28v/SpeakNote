import React, { useState, useEffect, useRef } from 'react'
import type { Note } from '../../types'
import './QuickTranslationPractice.css'

interface QuickTranslationPracticeProps {
  note: Note
  onClose: () => void
}

const QuickTranslationPractice: React.FC<QuickTranslationPracticeProps> = ({ note, onClose }) => {
  // 絵文字を除外する関数
  const removeEmojis = (text: string): string => {
    // 絵文字のUnicode範囲を除外
    return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F1AD}]|[\u{1F910}-\u{1F96B}]|[\u{1F980}-\u{1F9E0}]/gu, '')
  }

  // 日付のみの問題かどうかを判定する関数
  const isDateOnly = (text: string): boolean => {
    const cleanText = text.trim()
    // 日付パターンを検出（例: "2024/01/01", "January 1, 2024", "1st May", "12/25"など）
    const datePatterns = [
      /^\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}$/,  // 2024/01/01, 2024-01-01
      /^\d{1,2}[\/\-]\d{1,2}$/,               // 12/25, 01-15
      /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{0,4}$/i, // January 1, 2024
      /^\d{1,2}(st|nd|rd|th)\s+(January|February|March|April|May|June|July|August|September|October|November|December)$/i, // 1st January
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/i, // Monday, January 1
      /^\d{4}年\d{1,2}月\d{1,2}日$/,          // 2024年1月1日
      /^\d{1,2}月\d{1,2}日$/                  // 1月1日
    ]
    
    return datePatterns.some(pattern => pattern.test(cleanText))
  }
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentPhase, setCurrentPhase] = useState<'idle' | 'japanese' | 'thinking' | 'english' | 'pause'>('idle')
  const [thinkingTime, setThinkingTime] = useState(5) // 秒
  const [englishRepeatCount, setEnglishRepeatCount] = useState(2)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [englishRepeatCurrent, setEnglishRepeatCurrent] = useState(0)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const phaseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isProcessingRef = useRef(false)

  // テキストと翻訳を行ごとに分割し、有効な組み合わせのみを作成
  const allEnglishLines = note.text.split('\n')
  const allJapaneseLines = note.translations || []

  // 英語と日本語の両方に内容がある行のペアのみを抽出
  const validPairs: { english: string; japanese: string; originalIndex: number }[] = []
  const maxLines = Math.max(allEnglishLines.length, allJapaneseLines.length)

  for (let i = 0; i < maxLines; i++) {
    const englishText = allEnglishLines[i] || ''
    const japaneseText = allJapaneseLines[i] || ''

    // 英語と日本語の両方に内容があり、日付のみの問題でない場合のみ追加
    if (englishText.trim() && japaneseText.trim() && !isDateOnly(englishText) && !isDateOnly(japaneseText)) {
      validPairs.push({
        english: englishText.trim(),
        japanese: japaneseText.trim(),
        originalIndex: i
      })
    }
  }

  const totalLines = validPairs.length

  const cleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current)
      phaseTimeoutRef.current = null
    }
    window.speechSynthesis.cancel()
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
    window.speechSynthesis.cancel()

    const executePhase = () => {
      switch (currentPhase) {
        case 'japanese': {
          // 日本語を読み上げ
          const japaneseText = validPairs[currentIndex]?.japanese
          if (japaneseText && japaneseText.trim()) {
            window.speechSynthesis.cancel() // 念のため前の音声をキャンセル

            // 音声の読み上げ完了を待つ
            const utterance = new SpeechSynthesisUtterance(removeEmojis(japaneseText))
            utterance.lang = 'ja-JP'
            utterance.rate = 1.0
            utterance.pitch = 1.0
            utterance.volume = 1.0

            utterance.onend = () => {
              // 読み上げ完了後に考える時間へ移行
              phaseTimeoutRef.current = setTimeout(() => {
                isProcessingRef.current = false
                setCurrentPhase('thinking')
                setTimeRemaining(thinkingTime)
              }, 500) // 少し間を置く
            }

            utterance.onerror = () => {
              // エラーの場合も次に進む
              phaseTimeoutRef.current = setTimeout(() => {
                isProcessingRef.current = false
                setCurrentPhase('thinking')
                setTimeRemaining(thinkingTime)
              }, 500)
            }

            window.speechSynthesis.speak(utterance)
          } else {
            // テキストがない場合は即座に次へ
            phaseTimeoutRef.current = setTimeout(() => {
              isProcessingRef.current = false
              setCurrentPhase('thinking')
              setTimeRemaining(thinkingTime)
            }, 100)
          }
          break
        }

        case 'thinking':
          if (thinkingTime === -1) {
            // 無限モード：ユーザーがボタンを押すまで待機
            setTimeRemaining(-1)
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
          const englishText = validPairs[currentIndex]?.english
          if (englishText && englishText.trim()) {
            window.speechSynthesis.cancel() // 念のため前の音声をキャンセル

            // 音声の読み上げ完了を待つ
            const utterance = new SpeechSynthesisUtterance(removeEmojis(englishText))
            utterance.lang = 'en-GB'
            utterance.rate = 1.0
            utterance.pitch = 1.0
            utterance.volume = 1.0

            utterance.onend = () => {
              const nextRepeat = englishRepeatCurrent + 1

              if (nextRepeat < englishRepeatCount) {
                // もう一度英語を読み上げ
                phaseTimeoutRef.current = setTimeout(() => {
                  setEnglishRepeatCurrent(nextRepeat)
                  isProcessingRef.current = false
                  setCurrentPhase('english')
                }, 2000) // 2秒間隔
              } else {
                // 次の文へ移行
                phaseTimeoutRef.current = setTimeout(() => {
                  isProcessingRef.current = false
                  setCurrentPhase('pause')
                }, 2000)
              }
            }

            utterance.onerror = () => {
              // エラーの場合も次に進む
              const nextRepeat = englishRepeatCurrent + 1

              if (nextRepeat < englishRepeatCount) {
                phaseTimeoutRef.current = setTimeout(() => {
                  setEnglishRepeatCurrent(nextRepeat)
                  isProcessingRef.current = false
                  setCurrentPhase('english')
                }, 2000)
              } else {
                phaseTimeoutRef.current = setTimeout(() => {
                  isProcessingRef.current = false
                  setCurrentPhase('pause')
                }, 2000)
              }
            }

            window.speechSynthesis.speak(utterance)
          } else {
            // テキストがない場合は即座に次へ
            const nextRepeat = englishRepeatCurrent + 1

            if (nextRepeat < englishRepeatCount) {
              phaseTimeoutRef.current = setTimeout(() => {
                setEnglishRepeatCurrent(nextRepeat)
                isProcessingRef.current = false
                setCurrentPhase('english')
              }, 100)
            } else {
              phaseTimeoutRef.current = setTimeout(() => {
                isProcessingRef.current = false
                setCurrentPhase('pause')
              }, 100)
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
    }, 50)

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
    if (currentPhase === 'thinking' && thinkingTime === -1) {
      isProcessingRef.current = false
      setCurrentPhase('english')
      setEnglishRepeatCurrent(0)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    event.preventDefault()
    
    if (event.key === 'Escape') {
      handleStop()
    } else if (currentPhase === 'thinking' && thinkingTime === -1) {
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
            <button className="close-button" onClick={handleClose}>✕</button>
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
          <button className="close-button" onClick={handleClose}>✕</button>
        </div>

        <div className="quick-translation-content">
          {!isPlaying ? (
            <div className="start-screen">
              <p className="practice-description">
                日本語を聞いて英語を考える練習です。<br />
                {totalLines}個の文を繰り返し練習します。
              </p>

              <div className="settings">
                <div className="setting-item">
                  <label>考える時間：</label>
                  <select
                    value={thinkingTime}
                    onChange={(e) => setThinkingTime(Number(e.target.value))}
                  >
                    <option value={3}>3秒</option>
                    <option value={5}>5秒</option>
                    <option value={7}>7秒</option>
                    <option value={10}>10秒</option>
                    <option value={-1}>無限</option>
                  </select>
                </div>

                <div className="setting-item">
                  <label>英語の繰り返し回数：</label>
                  <select
                    value={englishRepeatCount}
                    onChange={(e) => setEnglishRepeatCount(Number(e.target.value))}
                  >
                    <option value={1}>1回</option>
                    <option value={2}>2回</option>
                    <option value={3}>3回</option>
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
              tabIndex={0} 
              onKeyDown={handleKeyDown}
            >
              <div className="progress-info">
                <span>文 {currentIndex + 1} / {totalLines}</span>
              </div>

              <div className="current-practice">
                <div className={`practice-phase ${currentPhase === 'japanese' ? 'active' : ''}`}>
                  <h3>日本語</h3>
                  <p className="practice-text">{validPairs[currentIndex]?.japanese}</p>
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
                      ? validPairs[currentIndex]?.english
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