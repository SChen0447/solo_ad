import React from 'react';
import type { Recipe } from '../types';
import { DIFFICULTY_LABELS } from '../types';
import { useRecipeStore } from '../dataStore';

interface RecipeCardProps {
  recipe: Recipe;
  isRecommended?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, isRecommended }) => {
  const { setSelectedRecipe, toggleFavorite, favorites, getAverageRating } = useRecipeStore();
  const isFav = favorites.has(recipe.id);
  const avgRating = getAverageRating(recipe.id);

  return (
    <div
      className={`recipe-card ${isRecommended ? 'recipe-card--recommended' : ''}`}
      onClick={() => setSelectedRecipe(recipe.id)}
    >
      {isRecommended && (
        <div className="recipe-card__fire-badge">
          <span className="fire-icon">🔥</span>
        </div>
      )}
      <div className="recipe-card__image-wrapper">
        <img src={recipe.imageUrl} alt={recipe.name} loading="lazy" />
        <div className="recipe-card__image-overlay" />
        <button
          className={`recipe-card__fav-btn ${isFav ? 'recipe-card__fav-btn--active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(recipe.id);
          }}
        >
          {isFav ? '❤️' : '🤍'}
        </button>
      </div>
      <div className="recipe-card__content">
        <h3 className="recipe-card__name">{recipe.name}</h3>
        <div className="recipe-card__meta">
          <span className="recipe-card__tag recipe-card__tag--cuisine">{recipe.cuisine}</span>
          <span className="recipe-card__tag recipe-card__tag--difficulty">
            {DIFFICULTY_LABELS[recipe.difficulty]}
          </span>
        </div>
        <div className="recipe-card__info-row">
          <span className="recipe-card__time">⏱ {recipe.cookTime}分钟</span>
          {avgRating > 0 && (
            <span className="recipe-card__rating">
              {'★'.repeat(Math.round(avgRating))}
              {'☆'.repeat(5 - Math.round(avgRating))}
              <span className="recipe-card__rating-num">{avgRating}</span>
            </span>
          )}
        </div>
      </div>

      <style>{`
        .recipe-card {
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          position: relative;
          animation: cardFadeIn 0.4s ease-out both;
        }
        .recipe-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }
        .recipe-card--recommended {
          border: 2px solid #D4A017;
          animation: cardFadeIn 0.4s ease-out both, goldenPulse 2s infinite;
        }
        @keyframes goldenPulse {
          0%, 100% { border-color: #D4A017; }
          50% { border-color: #FFD700; }
        }
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .recipe-card__fire-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          z-index: 2;
          background: rgba(255,255,255,0.9);
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        }
        .fire-icon {
          font-size: 16px;
          animation: fireFlicker 0.8s ease-in-out infinite alternate;
        }
        @keyframes fireFlicker {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.3); opacity: 1; }
        }
        .recipe-card__image-wrapper {
          position: relative;
          width: 100%;
          height: 180px;
          overflow: hidden;
        }
        .recipe-card__image-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .recipe-card:hover .recipe-card__image-wrapper img {
          transform: scale(1.05);
        }
        .recipe-card__image-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40%;
          background: linear-gradient(transparent, rgba(0,0,0,0.3));
        }
        .recipe-card__fav-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(255,255,255,0.85);
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease;
          z-index: 2;
        }
        .recipe-card__fav-btn:hover {
          transform: scale(1.15);
        }
        .recipe-card__fav-btn--active {
          background: rgba(255,255,255,0.95);
        }
        .recipe-card__content {
          padding: 12px 14px;
        }
        .recipe-card__name {
          font-size: 16px;
          font-weight: 600;
          color: #2D2D2D;
          margin-bottom: 8px;
        }
        .recipe-card__meta {
          display: flex;
          gap: 6px;
          margin-bottom: 8px;
        }
        .recipe-card__tag {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 500;
        }
        .recipe-card__tag--cuisine {
          background: #FDF0E6;
          color: #C87A5A;
        }
        .recipe-card__tag--difficulty {
          background: #EFF6E8;
          color: #6B8E23;
        }
        .recipe-card__info-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          color: #888;
        }
        .recipe-card__rating {
          color: #F0A500;
          font-size: 12px;
        }
        .recipe-card__rating-num {
          color: #888;
          margin-left: 4px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default RecipeCard;
