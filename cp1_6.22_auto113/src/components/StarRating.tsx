import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: number;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onChange,
  readonly = false,
  size = 24
}) => {
  const [hoverRating, setHoverRating] = React.useState(0);

  const handleClick = (value: number) => {
    if (!readonly && onChange) {
      onChange(value);
    }
  };

  const handleMouseEnter = (value: number) => {
    if (!readonly) {
      setHoverRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverRating(0);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((value) => (
        <div
          key={value}
          className={`star ${value <= displayRating ? 'filled' : ''} ${readonly ? 'readonly' : ''}`}
          onClick={() => handleClick(value)}
          onMouseEnter={() => handleMouseEnter(value)}
          onMouseLeave={handleMouseLeave}
        >
          <Star size={size} />
        </div>
      ))}
    </div>
  );
};

export default StarRating;
