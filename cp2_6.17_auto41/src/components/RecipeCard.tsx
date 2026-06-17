import { Recipe } from '../utils/api';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  onToggleFavorite: (id: string) => void;
}

const difficultyText: Record<'easy' | 'medium' | 'hard', string> = {
  easy: '低难度',
  medium: '中难度',
  hard: '高难度',
};

export default function RecipeCard({ recipe, onClick, onToggleFavorite }: RecipeCardProps) {
  const ingredientsSummary = recipe.ingredients
    .slice(0, 4)
    .map((ing) => ing.name)
    .join('、');
  const hasMore = recipe.ingredients.length > 4;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(recipe.id);
  };

  return (
    <div className="recipe-card" onClick={onClick}>
      <div style={{ position: 'relative' }}>
        <img
          className="recipe-card-image"
          src={recipe.coverImage}
          alt={recipe.name}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect fill="%23d4c9a8" width="400" height="300"/><text x="50%" y="50%" fill="%232e5c4a" font-size="48" text-anchor="middle" dominant-baseline="middle">🍳</text></svg>';
          }}
        />
        <button
          className={`favorite-btn card-favorite ${recipe.isFavorite ? 'favorited' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={recipe.isFavorite ? '取消收藏' : '收藏'}
        >
          <svg viewBox="0 0 24 24" fill={recipe.isFavorite ? '#c0392b' : 'none'} stroke={recipe.isFavorite ? '#c0392b' : '#95a5a6'} strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>
      <div className="recipe-card-body">
        <h3 className="recipe-card-name">{recipe.name}</h3>
        <p className="recipe-card-ingredients">
          {ingredientsSummary}
          {hasMore ? '...' : ''}
        </p>
        <div className="recipe-card-footer">
          <span className="recipe-card-time">⏱ {recipe.cookTime}分钟</span>
          <span className={`difficulty-badge difficulty-${recipe.difficulty}`}>
            {difficultyText[recipe.difficulty]}
          </span>
        </div>
      </div>
    </div>
  );
}
