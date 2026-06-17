import { useState, useRef, useEffect } from 'react'
import { useKanbanStore } from '../store/useKanbanStore'
import { getQuadrant } from '../types'
import '../styles/CardDetailPanel.css'

function CardDetailPanel() {
  const {
    cards,
    comments,
    selectedCardId,
    setSelectedCardId,
    voteCard,
    addComment,
  } = useKanbanStore()
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [isVoting, setIsVoting] = useState(false)
  const commentsRef = useRef<HTMLDivElement>(null)

  const card = cards.find((c) => c.id === selectedCardId)
  const cardComments = comments[selectedCardId || ''] || []

  useEffect(() => {
    if (commentsRef.current) {
      commentsRef.current.scrollTop = commentsRef.current.scrollHeight
    }
  }, [cardComments.length])

  if (!card) return null

  const quadrant = getQuadrant(card.urgency, card.importance)

  const handleVote = () => {
    if (isVoting) return
    setIsVoting(true)
    voteCard(card.id)
    setTimeout(() => setIsVoting(false), 600)
  }

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!author.trim() || !content.trim()) return
    addComment(card.id, author.trim(), content.trim())
    setContent('')
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="detail-overlay" onClick={() => setSelectedCardId(null)}>
      <div
        className={`detail-panel detail-panel-${quadrant}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="detail-close" onClick={() => setSelectedCardId(null)}>
          ×
        </button>

        <div className="detail-header">
          <div className="detail-ratings">
            <span className="detail-rating urgency">
              紧急 {card.urgency}
            </span>
            <span className="detail-rating importance">
              重要 {card.importance}
            </span>
          </div>
          <h2 className="detail-title">{card.title}</h2>
          <p className="detail-description">{card.description}</p>
        </div>

        <div className="detail-vote-section">
          <button
            className={`vote-btn ${isVoting ? 'voting' : ''}`}
            onClick={handleVote}
          >
            <span className="vote-icon">👍</span>
            <span className="vote-count">{card.votes}</span>
            <span className="vote-text">+1</span>
          </button>
          <p className="vote-hint">点击为这个需求投票</p>
        </div>

        <div className="detail-comments-section">
          <h3 className="comments-title">评论 ({cardComments.length})</h3>
          
          <div className="comments-list" ref={commentsRef}>
            {cardComments.length === 0 ? (
              <p className="comments-empty">暂无评论，来抢沙发吧~</p>
            ) : (
              cardComments.map((comment) => (
                <div
                  key={comment.id}
                  className="comment-item"
                  style={{ animation: 'commentFade 0.3s ease-out' }}
                >
                  <div className="comment-author">{comment.author}</div>
                  <div className="comment-content">{comment.content}</div>
                  <div className="comment-time">{formatTime(comment.createdAt)}</div>
                </div>
              ))
            )}
          </div>

          <form className="comment-form" onSubmit={handleSubmitComment}>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="你的昵称"
              className="comment-author-input"
            />
            <div className="comment-input-wrapper">
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="写下你的评论..."
                className="comment-input"
              />
              <button type="submit" className="comment-submit">
                发送
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CardDetailPanel
