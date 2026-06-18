interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const StarRating = ({ rating, onRatingChange, interactive = false, size = 'medium' }: StarRatingProps) => {
  const stars = [1, 2, 3, 4, 5];

  const sizeClass = {
    small: 'star-small',
    medium: 'star-medium',
    large: 'star-large'
  }[size];

  if (interactive) {
    return (
      <div className={`star-rating interactive ${sizeClass}`}>
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            className={`star-btn ${star <= rating ? 'filled' : ''}`}
            onClick={() => onRatingChange && onRatingChange(star)}
          >
            ★
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`star-rating ${sizeClass}`}>
      {stars.map((star) => (
        <span key={star} className={star <= rating ? 'star filled' : 'star'}>
          ★
        </span>
      ))}
    </div>
  );
};
