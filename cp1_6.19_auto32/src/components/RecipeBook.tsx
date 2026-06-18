import React from 'react';
import { RECIPES, INGREDIENTS } from '../data';

interface RecipeBookProps {
  highlightedRecipeId: string | null;
  onSelect?: (recipeId: string) => void;
}

export const RecipeBook: React.FC<RecipeBookProps> = ({ highlightedRecipeId, onSelect }) => {
  const getIngName = (id: string) => INGREDIENTS.find(i => i.id === id)?.name ?? id;

  return (
    <aside className="recipe-book">
      <div className="book-header">
        <h2>配方手册</h2>
        <div className="subtitle">RECIPE · GRIMOIRE</div>
      </div>
      <div className="book-list">
        {RECIPES.map(r => (
          <div
            key={r.id}
            className={`recipe-item ${highlightedRecipeId === r.id ? 'highlighted' : ''}`}
            onClick={() => onSelect?.(r.id)}
          >
            <div className="recipe-title">
              <span
                className="recipe-color-dot"
                style={{ background: r.resultColor, color: r.resultColor }}
              />
              {r.name}
            </div>
            <div className="recipe-desc">{r.description}</div>
            <div className="recipe-ings">
              {r.ingredientIds.map(id => (
                <span key={id} className="ing-chip">
                  {getIngName(id)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default RecipeBook;
