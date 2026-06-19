import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Recipe } from '../types';

interface Props {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <Link to={`/recipe/${recipe.id}`} className="recipe-card">
      <div className="card-cover">
        {!loaded && !imgError && <div className="card-skeleton" />}
        {!imgError ? (
          <img
            src={recipe.coverImage}
            alt={recipe.title}
            loading="lazy"
            className={loaded ? 'loaded' : ''}
            onLoad={() => setLoaded(true)}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="card-cover-fallback">🍽️</div>
        )}
        <div className="card-like-badge">
          <span>❤️</span>
          <span>{recipe.likes}</span>
        </div>
      </div>
      <div className="card-body">
        <h3 className="card-title">{recipe.title}</h3>
        <p className="card-meta">
          <span>🥗 {recipe.ingredients.length} 种食材</span>
          <span>📝 {recipe.steps.length} 个步骤</span>
        </p>
      </div>
    </Link>
  );
}
