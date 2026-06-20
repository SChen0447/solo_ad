import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: number;
}

const StarRating: React.FC<StarRatingProps> = ({ value, onChange, readonly = false, size = 48 }) => {
  const [hoverValue, setHoverValue] = useState(0);

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!readonly) {
      setHoverValue(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverValue(0);
    }
  };

  const displayValue = hoverValue || value;

  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => handleClick(star)}
          onMouseEnter={() => handleMouseEnter(star)}
          onMouseLeave={handleMouseLeave}
          whileHover={!readonly ? { scale: 56 / size } : {}}
          whileTap={!readonly ? { scale: 0.95 } : {}}
          transition={{ duration: 0.2 }}
          className="focus:outline-none"
          style={{ width: size, height: size }}
        >
          <Star
            size={size}
            fill={star <= displayValue ? '#ffc107' : 'none'}
            stroke={star <= displayValue ? '#ffc107' : '#d1d5db'}
            strokeWidth={2}
            className="transition-colors duration-200"
          />
        </motion.button>
      ))}
    </div>
  );
};

export default StarRating;
