import React from 'react';
import type { Recipe } from '../types';
import { useLazyLoading } from '../hooks/useLazyLoading';

interface RecipeCardProps {
  recipe: Recipe;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const defaultCover =
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=delicious%20food%20dish%20on%20a%20plate%20professional%20food%20photography&image_size=square_hd';

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onEdit, onDelete }) => {
  const { elementRef, isVisible } = useLazyLoading<HTMLDivElement>();

  const renderDifficulty = (level: number) => {
    return Array(Math.min(Math.max(level, 1), 3))
      .fill(0)
      .map((_, i) => <span key={i}>🔥</span>);
  };

  const renderRating = (rating: number) => {
    const stars = Math.round(rating);
    return (
      <div className="rating">
        {Array(stars)
          .fill(0)
          .map((_, i) => (
            <span key={i}>⭐</span>
          ))}
        {stars === 0 && <span style={{ color: '#94a3b8' }}>暂无评分</span>}
      </div>
    );
  };

  return (
    <div
      ref={elementRef}
      className="recipe-card"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('button')) {
          onEdit(recipe.id);
        }
      }}
    >
      {isVisible ? (
        <img
          src={recipe.cover_image || defaultCover}
          alt={recipe.title}
          className="recipe-card-image"
          loading="lazy"
        />
      ) : (
        <div
          className="recipe-card-image"
          style={{ background: '#f1f5f9' }}
        />
      )}
      <div className="recipe-card-content">
        <h3 className="recipe-card-title">{recipe.title}</h3>
        <div className="recipe-card-meta">
          <div className="difficulty">{renderDifficulty(recipe.difficulty)}</div>
          {renderRating(recipe.rating)}
        </div>
        <div className="recipe-card-actions">
          <button
            className="btn-primary"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(recipe.id);
            }}
          >
            编辑
          </button>
          <button
            className="btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`确定要删除"${recipe.title}"吗？`)) {
                onDelete(recipe.id);
              }
            }}
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
