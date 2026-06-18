import { memo } from 'react';
import { Link } from 'react-router-dom';
import type { Recipe } from '../types';
import { NutritionBar } from './NutritionBar';
import { useRecipeStore } from '../store/recipeStore';
import { calculateNutritionForRecipe } from '../utils/nutrition';
import './RecipeCard.css';

interface Props {
  recipe: Recipe;
  isNew?: boolean;
}

function RecipeCardComponent({ recipe, isNew = false }: Props) {
  const toggleFavorite = useRecipeStore(s => s.toggleFavorite);
  const nutrition = calculateNutritionForRecipe(recipe, 1);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(recipe.id);
  };

  return (
    <Link
      to={`/recipe/${recipe.id}`}
      className={`recipe-card ${isNew ? 'recipe-card--new' : ''}`}
    >
      <div className="recipe-card__image-wrap">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="recipe-card__image"
            loading="lazy"
          />
        ) : (
          <div className="recipe-card__placeholder">
            <i className="fa-solid fa-utensils"></i>
          </div>
        )}
        <button
          className={`recipe-card__favorite ${recipe.favorite ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={recipe.favorite ? '取消收藏' : '收藏'}
        >
          <i className={`fa-${recipe.favorite ? 'solid' : 'regular'} fa-heart`}></i>
        </button>
      </div>
      <div className="recipe-card__content">
        <h3 className="recipe-card__title">{recipe.title}</h3>
        <div className="recipe-card__meta">
          <span className="recipe-card__ingredients-count">
            <i className="fa-solid fa-carrot"></i>
            {recipe.ingredients.length} 种配料
          </span>
        </div>
        <div className="recipe-card__nutrition">
          <NutritionBar nutrition={nutrition} compact />
        </div>
      </div>
    </Link>
  );
}

export const RecipeCard = memo(RecipeCardComponent);
