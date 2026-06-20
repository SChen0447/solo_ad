import React, { useState } from 'react';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  readOnly = false,
  size = 'medium',
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  const handleClick = (value: number) => {
    if (!readOnly && onRatingChange) {
      onRatingChange(value);
    }
  };
  
  const handleMouseEnter = (value: number) => {
    if (!readOnly) {
      setHoverRating(value);
    }
  };
  
  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverRating(0);
    }
  };
  
  const starSize = size === 'small' ? 16 : size === 'large' ? 32 : 24;
  
  return (
    <div className={readOnly ? 'feedback-rating' : 'star-rating'}>
      {[1, 2, 3, 4, 5].map((value) => {
        const isFilled = value <= (hoverRating || rating);
        const isSelected = value <= rating;
        
        return (
          <div
            key={value}
            className={`${readOnly ? 'star-small' : 'star'} ${isFilled ? 'filled' : ''} ${isSelected ? 'selected' : ''}`}
            onClick={() => handleClick(value)}
            onMouseEnter={() => handleMouseEnter(value)}
            onMouseLeave={handleMouseLeave}
            style={{
              width: readOnly ? '16px' : '32px',
              height: readOnly ? '16px' : '32px',
              cursor: readOnly ? 'default' : 'pointer',
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
        );
      })}
    </div>
  );
};

export default StarRating;
