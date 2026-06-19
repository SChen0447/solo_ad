import { useState, useMemo, useCallback, useEffect } from 'react'
import type { Card, Deck } from './App'

interface ReviewSessionProps {
  deck: Deck
  onReview: (cardId: string, quality: 0 | 1 | 2) => void
}

type FeedbackState = null | 'forgot' | 'hard' | 'easy'

const ReviewSession = ({ deck, onReview }: ReviewSessionProps) => {
  const dueCards = useMemo(() => {
    const now = Date.now()
    return deck.cards.filter((c) => c.dueDate <= now)
  }, [deck])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [feedbackScale, setFeedbackScale] = useState(false)
  const [showDone, setShowDone] = useState(dueCards.length === 0)

  const currentCard: Card | null = dueCards[currentIndex] ?? null

  const handleFlip = useCallback(() => {
    setIsFlipped((f) => !f)
  }, [])

  const handleAnswer = useCallback(
    (quality: 0 | 1 | 2) => {
      if (!currentCard || feedback) return

      const label: FeedbackState = quality === 0 ? 'forgot' : quality === 1 ? 'hard' : 'easy'
      setFeedback(label)
      setFeedbackScale(true)

      onReview(currentCard.id, quality)

      setTimeout(() => {
        setFeedbackScale(false)
      }, 150)

      setTimeout(() => {
        setFeedback(null)
        setIsFlipped(false)
        if (currentIndex + 1 >= dueCards.length) {
          setShowDone(true)
        } else {
          setCurrentIndex((i) => i + 1)
        }
      }, 500)
    },
    [currentCard, currentIndex, dueCards.length, feedback, onReview],
  )

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showDone) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (!isFlipped) handleFlip()
      } else if (e.code === 'Digit1' && isFlipped) {
        handleAnswer(0)
      } else if (e.code === 'Digit2' && isFlipped) {
        handleAnswer(1)
      } else if (e.code === 'Digit3' && isFlipped) {
        handleAnswer(2)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleAnswer, handleFlip, isFlipped, showDone])

  const difficultyLabel = currentCard
    ? currentCard.difficulty >= 2
      ? '已掌握'
      : currentCard.difficulty === 1
        ? '学习中'
        : '待学习'
    : ''
  const difficultyColor = currentCard
    ? currentCard.difficulty >= 2
      ? '#52c41a'
      : currentCard.difficulty === 1
        ? '#faad14'
        : '#ff4d4f'
    : ''

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: 'calc(100vh - 140px)',
        justifyContent: 'center',
        padding: '20px 0',
      }}
    >
      {showDone ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 40px',
            background: 'var(--bg-card)',
            borderRadius: 16,
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px var(--shadow)',
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 700 }}>复习完成！</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>
            你已完成本次所有待复习的卡片，明天继续加油！
          </p>
          <div
            style={{
              marginTop: 24,
              padding: '12px 20px',
              background: 'rgba(79,142,247,0.1)',
              borderRadius: 8,
              display: 'inline-block',
              color: 'var(--accent)',
              fontWeight: 600,
            }}
          >
            本次复习 {dueCards.length} 张卡片
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                background: 'rgba(79,142,247,0.1)',
                color: 'var(--accent)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              进度 {currentIndex + 1} / {dueCards.length}
            </div>
            {currentCard && (
              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  background: `${difficultyColor}22`,
                  color: difficultyColor,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {difficultyLabel}
              </div>
            )}
          </div>

          <div
            style={{
              perspective: 1500,
              width: '100%',
              maxWidth: 480,
              marginBottom: 32,
            }}
          >
            <div
              onClick={handleFlip}
              style={{
                position: 'relative',
                width: '100%',
                paddingTop: '70%',
                cursor: 'pointer',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                willChange: 'transform',
                ...(feedbackScale ? { transform: `${isFlipped ? 'rotateY(180deg)' : ''} scale(0.96)` } : {}),
              } as React.CSSProperties}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, var(--card-gradient-start), var(--card-gradient-end))',
                  boxShadow: '0 20px 60px var(--shadow)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 24,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                } as React.CSSProperties}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.6)',
                    fontWeight: 500,
                  }}
                >
                  点击翻转
                </div>
                <div
                  style={{
                    fontSize: 'clamp(28px, 6vw, 44px)',
                    fontWeight: 700,
                    color: 'var(--card-front-text)',
                    textShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    textAlign: 'center',
                    marginBottom: 8,
                    wordBreak: 'break-word',
                  }}
                >
                  {currentCard?.front}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.7)',
                    textShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  点击查看释义
                </div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 16,
                  background: 'var(--bg-card)',
                  boxShadow: '0 20px 60px var(--shadow)',
                  padding: 28,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  border: '1px solid var(--border)',
                } as React.CSSProperties}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--accent)',
                    marginBottom: 4,
                  }}
                >
                  {currentCard?.front}
                </div>
                <div
                  style={{
                    fontSize: 'clamp(20px, 4vw, 26px)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 20,
                    lineHeight: 1.4,
                  }}
                >
                  {currentCard?.back}
                </div>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    background: 'var(--bg-primary)',
                    borderLeft: '3px solid var(--accent)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      marginBottom: 6,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      fontWeight: 600,
                    }}
                  >
                    例句
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      color: 'var(--text-primary)',
                      lineHeight: 1.6,
                      fontStyle: 'italic',
                    }}
                  >
                    {currentCard?.example}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              justifyContent: 'center',
              maxWidth: 480,
              width: '100%',
              opacity: isFlipped ? 1 : 0.5,
              pointerEvents: isFlipped ? 'auto' : 'none',
              transition: 'opacity 0.3s',
            }}
          >
            {[
              { key: 0 as const, label: '忘记', hint: '1', color: '#ff4d4f', bg: 'rgba(255,77,79,0.12)' },
              { key: 1 as const, label: '困难', hint: '2', color: '#faad14', bg: 'rgba(250,173,20,0.12)' },
              { key: 2 as const, label: '简单', hint: '3', color: '#52c41a', bg: 'rgba(82,196,26,0.12)' },
            ].map((btn) => {
              const isActive =
                (btn.key === 0 && feedback === 'forgot') ||
                (btn.key === 1 && feedback === 'hard') ||
                (btn.key === 2 && feedback === 'easy')

              return (
                <button
                  key={btn.key}
                  onClick={() => handleAnswer(btn.key)}
                  disabled={!!feedback}
                  style={{
                    flex: 1,
                    minWidth: 100,
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: isActive ? `2px solid ${btn.color}` : '2px solid transparent',
                    background: isActive ? btn.color : btn.bg,
                    color: isActive ? '#fff' : btn.color,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: feedback ? 'default' : 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transform:
                      isActive && feedbackScale
                        ? 'scale(0.92)'
                        : isActive
                          ? 'scale(1.04)'
                          : 'scale(1)',
                  }}
                  onMouseEnter={(e) => {
                    if (!feedback && isFlipped) {
                      e.currentTarget.style.background = btn.color
                      e.currentTarget.style.color = '#fff'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = btn.bg
                      e.currentTarget.style.color = btn.color
                    }
                  }}
                >
                  <span>{btn.label}</span>
                  <span
                    style={{
                      fontSize: 11,
                      opacity: 0.7,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                    }}
                  >
                    {btn.hint}
                  </span>
                </button>
              )
            })}
          </div>

          <div
            style={{
              marginTop: 16,
              fontSize: 12,
              color: 'var(--text-secondary)',
              textAlign: 'center',
            }}
          >
            空格键翻转 &nbsp;·&nbsp; 数字键 1/2/3 快速选择
          </div>
        </>
      )}
    </div>
  )
}

export default ReviewSession
