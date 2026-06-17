import React from 'react'
import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
  size?: number
  activeColor?: string
  inactiveColor?: string
}

const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  size = 24,
  activeColor = '#fadb14',
  inactiveColor = '#4a4a5a',
}) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="transition-transform duration-150 hover:scale-110"
        >
          <Star
            size={size}
            fill={star <= value ? activeColor : 'transparent'}
            stroke={star <= value ? activeColor : inactiveColor}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  )
}

export default StarRating
