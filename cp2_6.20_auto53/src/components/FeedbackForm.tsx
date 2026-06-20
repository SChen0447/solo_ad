import { useState } from 'react'

interface Props {
  onSubmit: (rating: number, comment: string) => Promise<boolean>
}

function Star({ filled, hoverFilled, onHover, onClick }: {
  filled: boolean
  hoverFilled: boolean
  onHover: (v: boolean) => void
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="star-btn"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onClick}
    >
      <svg
        className="star-svg"
        viewBox="0 0 24 24"
        fill={hoverFilled || filled ? '#F59E0B' : 'none'}
        stroke={hoverFilled || filled ? '#F59E0B' : '#D2691E'}
        strokeWidth="1.5"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </button>
  )
}

export default function FeedbackForm({ onSubmit }: Props) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [exceeded, setExceeded] = useState(false)

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setComment(val)
    setExceeded(val.length > 150)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0 || !comment.trim() || comment.length > 150) return
    setSubmitting(true)
    const ok = await onSubmit(rating, comment.trim())
    setSubmitting(false)
    if (ok) {
      setRating(0)
      setComment('')
      setExceeded(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/70 rounded-xl p-5 border border-clay-100">
      <h4 className="font-serif text-sm font-semibold text-clay-700 mb-3">提交课后反馈</h4>

      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            filled={rating >= star}
            hoverFilled={hoverRating >= star}
            onHover={(enter) => setHoverRating(enter ? star : 0)}
            onClick={() => setRating(star)}
          />
        ))}
        <span className="text-xs text-clay-400 ml-2">
          {rating > 0 ? `${rating} 星` : '请评分'}
        </span>
      </div>

      <div className="relative">
        <textarea
          value={comment}
          onChange={handleCommentChange}
          placeholder="分享你的课程体验..."
          rows={3}
          className={`w-full resize-none rounded-lg border px-3 py-2 text-sm text-clay-700 placeholder:text-clay-300 craft-input transition-colors ${
            exceeded ? 'border-red-400 animate-shake' : 'border-clay-200'
          }`}
          style={exceeded ? { borderColor: '#EF4444' } : undefined}
        />
        <div className={`text-xs mt-1 text-right ${exceeded ? 'text-red-400' : 'text-clay-400'}`}>
          {comment.length} / 150
        </div>
      </div>

      <button
        type="submit"
        disabled={rating === 0 || !comment.trim() || comment.length > 150 || submitting}
        className="mt-3 px-5 py-2 bg-clay-500 text-white text-sm font-medium rounded-lg
          hover:bg-clay-600 hover:-translate-y-[1px] transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-custom" />
            提交中
          </span>
        ) : (
          '提交反馈'
        )}
      </button>
    </form>
  )
}
