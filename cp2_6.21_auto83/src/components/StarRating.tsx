import './StarRating.css';

interface StarRatingProps {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

function StarRating({ rating, size = 28, interactive = false, onChange }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  const handleClick = (star: number) => {
    if (interactive && onChange) {
      onChange(star);
    }
  };

  return (
    <div className={`star-rating ${interactive ? 'interactive' : ''}`}>
      {stars.map((star) => (
        <svg
          key={star}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={star <= rating ? '#F59E0B' : '#D1D5FA'}
          className="star-icon"
          onClick={() => handleClick(star)}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default StarRating;
