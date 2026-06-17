import { Recipe } from '../utils/api';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
}

const difficultyText: Record<'easy' | 'medium' | 'hard', string> = {
  easy: '低难度',
  medium: '中难度',
  hard: '高难度',
};

export default function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const ingredientsSummary = recipe.ingredients
    .slice(0, 4)
    .map((ing) => ing.name)
    .join('、');
  const hasMore = recipe.ingredients.length > 4;

  return (
    <div className="recipe-card" onClick={onClick}>
      <img
        className="recipe-card-image"
        src={recipe.coverImage}
        alt={recipe.name}
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect fill="%23d4c9a8" width="400" height="300"/><text x="50%" y="50%" fill="%232e5c4a" font-size="48" text-anchor="middle" dominant-baseline="middle">🍳</text></svg>';
        }}
      />
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
