import type { Recipe } from '../types';

interface Props {
  recipe: Recipe;
  isFavorited: boolean;
  onClick: () => void;
  onFavoriteClick: (e: React.MouseEvent) => void;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg className="star" viewBox="0 0 24 24" fill={filled ? '#fbbf24' : '#e5e7eb'}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="card-favorite-icon"
      viewBox="0 0 24 24"
      fill={filled ? '#ef4444' : 'none'}
      stroke={filled ? '#ef4444' : '#9ca3af'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ImageUploadIcon() {
  return (
    <div className="card-image-placeholder">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <div style={{ marginTop: 8, fontSize: 12 }}>成品图片</div>
    </div>
  );
}

export default function RecipeCard({ recipe, isFavorited, onClick, onFavoriteClick }: Props) {
  const fullStars = Math.round(recipe.averageRating);

  return (
    <div className="recipe-card" onClick={onClick}>
      <div className="card-image">
        {recipe.image ? (
          <img src={recipe.image} alt={recipe.title} />
        ) : (
          <ImageUploadIcon />
        )}
      </div>
      <div className="card-favorite-btn" onClick={onFavoriteClick}>
        <HeartIcon filled={isFavorited} />
      </div>
      <div className="card-content">
        <div className="card-title">{recipe.title}</div>
        <div className="card-author">by {recipe.author}</div>
        <div className="card-rating">
          <div className="stars">
            {[1, 2, 3, 4, 5].map((s) => (
              <StarIcon key={s} filled={s <= fullStars} />
            ))}
          </div>
          <span className="rating-text">
            {recipe.ratingCount > 0 ? recipe.averageRating.toFixed(1) : '暂无评分'}
          </span>
        </div>
      </div>
    </div>
  );
}
