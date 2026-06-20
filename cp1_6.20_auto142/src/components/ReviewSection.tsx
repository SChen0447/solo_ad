import { useState } from 'react'
import { Review } from '../types'
import { motion, AnimatePresence } from 'framer-motion'

interface ReviewSectionProps {
  reviews: Review[]
  artistId: string
  onAddReview: (artistId: string, rating: number, comment: string) => Promise<boolean>
}

function StarRating({
  rating,
  onRate,
  readOnly = false,
  size = 24,
}: {
  rating: number
  onRate?: (rating: number) => void
  readOnly?: boolean
  size?: number
}) {
  const [hoverRating, setHoverRating] = useState(0)

  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.span
          key={star}
          className="star"
          style={{
            color:
              (hoverRating || rating) >= star ? '#f59e0b' : '#d1d5db',
            fontSize: size,
            cursor: readOnly ? 'default' : 'pointer',
          }}
          onMouseEnter={() => !readOnly && setHoverRating(star)}
          onMouseLeave={() => !readOnly && setHoverRating(0)}
          onClick={() => !readOnly && onRate && onRate(star)}
          whileTap={!readOnly ? { scale: 1.3 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 10, duration: 0.15 }}
        >
          ★
        </motion.span>
      ))}
    </div>
  )
}

function ReviewItem({ review }: { review: Review }) {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState('')

  const handleReply = () => {
    setShowReplyInput(false)
    setReplyText('')
  }

  return (
    <motion.div
      className="review-item"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <div className="review-header">
        <img
          src={review.userAvatar}
          alt={review.userName}
          className="review-avatar"
        />
        <div className="review-user-info">
          <span className="review-user-name">{review.userName}</span>
          <div className="review-meta">
            <StarRating rating={review.rating} readOnly size={16} />
            <span className="review-date">{review.date}</span>
          </div>
        </div>
        <button
          className="reply-btn"
          onClick={() => setShowReplyInput(!showReplyInput)}
        >
          回复
        </button>
      </div>

      <p className="review-comment">{review.comment}</p>

      {review.reply && (
        <div className="review-reply">
          <span className="reply-label">艺人回复：</span>
          <span className="reply-text">{review.reply}</span>
          <span className="reply-date">{review.replyDate}</span>
        </div>
      )}

      <AnimatePresence>
        {showReplyInput && (
          <motion.div
            className="reply-input-container"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <textarea
              className="reply-textarea"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="写下你的回复..."
              rows={3}
            />
            <button
              className="submit-reply-btn"
              onClick={handleReply}
              disabled={!replyText.trim()}
            >
              发布回复
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ReviewForm({
  artistId,
  onSubmit,
}: {
  artistId: string
  onSubmit: (artistId: string, rating: number, comment: string) => Promise<boolean>
}) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0 || !comment.trim() || isSubmitting) return
    setIsSubmitting(true)
    const success = await onSubmit(artistId, rating, comment)
    if (success) {
      setRating(0)
      setComment('')
    }
    setIsSubmitting(false)
  }

  return (
    <div className="review-form">
      <h4 className="review-form-title">发表评价</h4>

      <div className="rating-row">
        <span className="rating-label">评分：</span>
        <StarRating rating={rating} onRate={setRating} size={24} />
      </div>

      <textarea
        className="review-textarea"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="分享你的观演感受..."
        rows={3}
      />

      <motion.button
        className="submit-review-btn"
        onClick={handleSubmit}
        disabled={rating === 0 || !comment.trim() || isSubmitting}
        whileHover={rating > 0 && comment.trim() ? { scale: 1.05 } : {}}
        whileTap={rating > 0 && comment.trim() ? { scale: 0.95 } : {}}
        transition={{ duration: 0.2 }}
      >
        {isSubmitting ? '提交中...' : '提交评价'}
      </motion.button>
    </div>
  )
}

function ReviewSection({ reviews, artistId, onAddReview }: ReviewSectionProps) {
  const sortedReviews = [...reviews].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0'

  return (
    <div className="review-section">
      <div className="review-summary">
        <div className="avg-rating">
          <span className="avg-rating-value">{avgRating}</span>
          <StarRating rating={parseFloat(avgRating)} readOnly size={18} />
          <span className="review-count">{reviews.length} 条评价</span>
        </div>
      </div>

      <ReviewForm artistId={artistId} onSubmit={onAddReview} />

      <div className="reviews-list">
        {sortedReviews.length === 0 ? (
          <p className="no-reviews">暂无评价，来做第一个评价的人吧~</p>
        ) : (
          sortedReviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))
        )}
      </div>
    </div>
  )
}

export default ReviewSection
