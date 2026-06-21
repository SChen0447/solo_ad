import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: number
  interactive?: boolean
  onRate?: (rating: number) => void
}

export default function StarRating({ rating, maxRating = 5, size = 20, interactive = false, onRate }: StarRatingProps) {
  const [hoverRating, setHoverRating] = React.useState(0)
  const displayRating = hoverRating || rating

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxRating }, (_, i) => {
        const starIndex = i + 1
        const filled = starIndex <= displayRating
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            className={`p-0 border-0 bg-transparent ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={() => interactive && onRate?.(starIndex)}
            onMouseEnter={() => interactive && setHoverRating(starIndex)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            style={{ transition: 'transform 0.2s ease' }}
          >
            <Star
              size={size}
              fill={filled ? '#f6ad55' : 'none'}
              stroke={filled ? '#f6ad55' : '#e2e8f0'}
              strokeWidth={2}
              className={`transition-transform duration-200 ${interactive ? 'hover:scale-[1.15]' : ''}`}
            />
          </button>
        )
      })}
    </div>
  )
}

import React from 'react'
