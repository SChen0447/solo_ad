import { useState, useRef, useEffect } from 'react';
import type { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  isFavorite: boolean;
  onView: (recipeId: number) => void;
  onToggleFavorite: (recipe: Recipe) => Promise<boolean>;
}

function RecipeCard({ recipe, isFavorite, onView, onToggleFavorite }: RecipeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [favorited, setFavorited] = useState(isFavorite);
  const [viewed, setViewed] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [detailsHeight, setDetailsHeight] = useState(0);

  useEffect(() => {
    setFavorited(isFavorite);
  }, [isFavorite]);

  useEffect(() => {
    if (detailsRef.current) {
      setDetailsHeight(expanded ? detailsRef.current.scrollHeight : 0);
    }
  }, [expanded]);

  const handleToggleExpand = () => {
    const willExpand = !expanded;
    setExpanded(willExpand);
    if (willExpand && !viewed) {
      setViewed(true);
      onView(recipe.id);
    }
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await onToggleFavorite(recipe);
    setFavorited(result);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).src = 
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI0ZGRDhDMiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSI1MCI+8J+OuSDwn5K0PC90ZXh0Pjwvc3ZnPg==';
  };

  return (
    <div className={`recipe-card ${expanded ? 'expanded' : ''}`}>
      <div className="recipe-image-container">
        <img
          src={recipe.image_url}
          alt={recipe.name}
          className="recipe-image"
          onError={handleImageError}
          loading="lazy"
        />
        <div className="recipe-overlay">
          <div className="recipe-calories">
            <span className="calorie-icon">🔥</span>
            <span>{recipe.calories} kcal</span>
          </div>
          <button
            type="button"
            className={`favorite-button ${favorited ? 'favorited' : ''}`}
            onClick={handleFavoriteClick}
            aria-label={favorited ? '取消收藏' : '收藏'}
          >
            <svg viewBox="0 0 24 24" className="favorite-icon" fill={favorited ? 'currentColor' : 'none'}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="recipe-content">
        <div className="recipe-header">
          <h3 className="recipe-name" title={recipe.name}>{recipe.name}</h3>
          <div className="recipe-tags">
            {recipe.tags.slice(0, 2).map((tag, i) => (
              <span key={i} className={`recipe-tag tag-${tag === '高蛋白' ? 'protein' : tag === '低卡' ? 'lowcal' : tag === '素食' ? 'veg' : 'default'}`}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="nutrition-mini">
          <div className="nutrient-item" title="蛋白质">
            <span className="nutrient-dot dot-protein"></span>
            <span className="nutrient-label">蛋白</span>
            <span className="nutrient-value">{recipe.protein}g</span>
          </div>
          <div className="nutrient-item" title="脂肪">
            <span className="nutrient-dot dot-fat"></span>
            <span className="nutrient-label">脂肪</span>
            <span className="nutrient-value">{recipe.fat}g</span>
          </div>
          <div className="nutrient-item" title="碳水化合物">
            <span className="nutrient-dot dot-carbs"></span>
            <span className="nutrient-label">碳水</span>
            <span className="nutrient-value">{recipe.carbs}g</span>
          </div>
        </div>

        <button
          type="button"
          className="expand-toggle"
          onClick={handleToggleExpand}
        >
          <span>{expanded ? '收起详情' : '查看详情'}</span>
          <svg
            viewBox="0 0 24 24"
            className={`expand-arrow ${expanded ? 'up' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div
        className="recipe-details"
        style={{ maxHeight: `${detailsHeight}px` }}
      >
        <div ref={detailsRef}>
          <div className="details-section">
            <h4 className="details-title">
              <span className="title-icon">🥕</span>配料清单
            </h4>
            <ul className="ingredients-list">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="ingredient-item">
                  <span className="ingredient-check">✓</span>
                  {ing}
                </li>
              ))}
            </ul>
          </div>
          <div className="details-section">
            <h4 className="details-title">
              <span className="title-icon">👨‍🍳</span>烹饪步骤
            </h4>
            <ol className="steps-list">
              {recipe.steps.map((step, i) => (
                <li key={i} className="step-item">
                  <span className="step-number">{i + 1}</span>
                  <span className="step-text">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecipeCard;
