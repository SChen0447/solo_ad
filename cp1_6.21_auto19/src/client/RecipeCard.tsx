import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Recipe } from './types';
import './RecipeCard.css';

interface RecipeCardProps {
  recipe: Recipe;
  onClick?: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}分钟`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}小时${remainMins}分钟` : `${hours}小时`;
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="star-rating">
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= Math.round(rating) ? 'filled' : ''}`}
          >
            ★
          </span>
        ))}
      </div>
      <span className="rating-text">
        {rating > 0 ? rating.toFixed(1) : '暂无评分'}
        {count > 0 && <span className="rating-count"> ({count})</span>}
      </span>
    </div>
  );
}

export default function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleClick = () => {
    if (onClick) onClick();
  };

  return (
    <Link to={`/recipe/${recipe.id}`} className="recipe-card" onClick={handleClick}>
      <div className="recipe-card-image">
        {!imageLoaded && <div className="image-placeholder" />}
        <img
          src={recipe.coverImage}
          alt={recipe.title}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          style={{ opacity: imageLoaded ? 1 : 0 }}
        />
        <div className="recipe-cuisine">
          {recipe.cuisine === 'chinese' && '中餐'}
          {recipe.cuisine === 'japanese' && '日料'}
          {recipe.cuisine === 'western' && '西餐'}
          {recipe.cuisine === 'other' && '其他'}
        </div>
      </div>
      <div className="recipe-card-content">
        <h3 className="recipe-title">{recipe.title}</h3>
        <p className="recipe-description">{recipe.description}</p>
        <div className="recipe-meta">
          <div className="recipe-time">
            <span className="time-icon">⏱</span>
            <span>{formatTime(recipe.totalTime)}</span>
          </div>
          <StarRating
            rating={recipe.averageRating || 0}
            count={recipe.ratingCount || 0}
          />
        </div>
        <div className="recipe-author">by {recipe.authorName}</div>
      </div>
    </Link>
  );
}
