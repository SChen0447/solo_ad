import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, ReviewGrade, fetchDueCards, renderMarkdownSimple, formatDate } from '../api'

interface Props {
  onReview: (id: string, grade: ReviewGrade) => Promise<void>
  onBack: () => void
  onEditCard: (card: Card) => void
}

export default function ReviewPanel({ onReview, onBack, onEditCard }: Props) {
  const [queue, setQueue] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)
  const [reviewedToday, setReviewedToday] = useState(0)
  const flipCardRef = useRef<HTMLDivElement>(null)

  const loadDueCards = useCallback(async () => {
    setLoading(true)
    try {
      const cards = await fetchDueCards()
      setQueue(cards)
      setCurrentIndex(0)
      setFlipped(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDueCards()
  }, [loadDueCards])

  const currentCard: Card | undefined = queue[currentIndex]

  const handleFlip = () => {
    if (isAnimating) return
    setFlipped(f => !f)
  }

  const goNext = useCallback(() => {
    setIsAnimating(true)
    setFlipped(false)
    setTimeout(() => {
      setCurrentIndex(i => i + 1)
      setIsAnimating(false)
    }, 300)
  }, [])

  const handleGrade = async (grade: ReviewGrade) => {
    if (!currentCard || isAnimating) return
    setIsAnimating(true)
    try {
      await onReview(currentCard.id, grade)
      setReviewedToday(n => n + 1)
    } catch (_e) {
      // error handled in App
    }
    goNext()
  }

  const totalCount = queue.length
  const remaining = Math.max(0, totalCount - currentIndex)
  const progress = totalCount > 0 ? Math.min(100, (reviewedToday / Math.max(totalCount, 1)) * 100) : 0

  return (
    <div className="review-panel">
      <div className="review-header">
        <div className="review-header-left">
          <h2 className="review-title">🔄 复习模式</h2>
          <div className="review-stats">
            <span>今日已复习: <strong>{reviewedToday}</strong></span>
            <span>剩余: <strong>{remaining}</strong></span>
            <span>总数: <strong>{totalCount}</strong></span>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={onBack}>← 返回列表</button>
      </div>

      <div className="review-progress">
        <div
          className="review-progress-bar"
          style={{ width: `${progress}%`, transition: 'width 0.3s ease' }}
        />
      </div>

      {loading && <div className="loading">加载中...</div>}

      {!loading && totalCount === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <h3>太棒了！没有待复习的卡片</h3>
          <p>所有卡片都已按计划复习完毕，继续保持学习的好习惯！</p>
          <button className="btn btn-primary" onClick={onBack}>返回列表</button>
        </div>
      )}

      {!loading && currentCard && (
        <div className="review-body">
          <div
            className="flip-card"
            onClick={handleFlip}
            style={{ perspective: '1000px' }}
          >
            <div
              ref={flipCardRef}
              className={`flip-card-inner ${flipped ? 'is-flipped' : ''}`}
              style={{
                transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="flip-card-face flip-card-front">
                <div className="card-face-header">
                  <span className="face-label">正面 - 点击翻转查看答案</span>
                  {currentCard.tags.length > 0 && (
                    <div className="card-tags">
                      {currentCard.tags.map((t, i) => (
                        <span key={`${t}-${i}`} className="card-tag">#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="card-face-body">
                  <h2 className="review-card-title">{currentCard.title}</h2>
                </div>
                <div className="card-face-footer">
                  <span>已复习 {currentCard.repetitions} 次</span>
                  <span>下次复习: {formatDate(currentCard.nextReviewAt)}</span>
                </div>
              </div>

              <div className="flip-card-face flip-card-back">
                <div className="card-face-header">
                  <span className="face-label">背面 - 评价你的记忆程度</span>
                </div>
                <div
                  className="card-face-body markdown-body review-card-content"
                  dangerouslySetInnerHTML={{ __html: renderMarkdownSimple(currentCard.content) }}
                />
                <div className="card-face-footer">
                  <button
                    className="card-btn-edit"
                    onClick={e => {
                      e.stopPropagation()
                      onEditCard(currentCard)
                    }}
                  >
                    ✏️ 编辑卡片
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="review-actions" style={{ opacity: flipped ? 1 : 0, pointerEvents: flipped ? 'auto' : 'none', transition: 'opacity 0.3s ease' }}>
            <div className="review-hint">请根据记忆程度选择：</div>
            <div className="grade-buttons">
              <button
                className="grade-btn grade-hard"
                onClick={() => handleGrade('hard')}
                disabled={isAnimating}
              >
                <span className="grade-emoji">😓</span>
                <span className="grade-name">困难</span>
                <span className="grade-desc">完全想不起来</span>
              </button>
              <button
                className="grade-btn grade-normal"
                onClick={() => handleGrade('normal')}
                disabled={isAnimating}
              >
                <span className="grade-emoji">🤔</span>
                <span className="grade-name">一般</span>
                <span className="grade-desc">有点模糊但记得</span>
              </button>
              <button
                className="grade-btn grade-easy"
                onClick={() => handleGrade('easy')}
                disabled={isAnimating}
              >
                <span className="grade-emoji">😊</span>
                <span className="grade-name">容易</span>
                <span className="grade-desc">清晰记得</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && !currentCard && totalCount > 0 && (
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <h3>本轮复习完成！</h3>
          <p>你今天复习了 {reviewedToday} 张卡片，做得很棒！</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={loadDueCards}>再刷一轮</button>
            <button className="btn btn-secondary" onClick={onBack}>返回列表</button>
          </div>
        </div>
      )}
    </div>
  )
}
