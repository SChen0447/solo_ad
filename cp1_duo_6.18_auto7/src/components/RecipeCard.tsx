import { useState, useEffect } from 'react';
import type { Recipe } from '../types';
import { formatFraction } from '../utils/ingredientUtils';
import { useRecipeStore } from '../store/recipeStore';
import './RecipeCard.css';

interface RecipeCardProps {
  recipe: Recipe;
  onDelete: (id: string) => void;
  isNew: boolean;
}

export function RecipeCard({ recipe, onDelete, isNew }: RecipeCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showEnterAnim, setShowEnterAnim] = useState(isNew);
  const { updateScaleFactor, toggleRecipeSelected } = useRecipeStore();

  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => setShowEnterAnim(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(recipe.id);
    }, 300);
  };

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      updateScaleFactor(recipe.id, value);
    }
  };

  const scaledServings = recipe.servings * recipe.scaleFactor;

  const difficultyColors: Record<string, string> = {
    '简单': '#a5d6a7',
    '中等': '#fff59d',
    '困难': '#ef9a9a',
  };

  return (
    <div
      className={`recipe-card ${isDeleting ? 'deleting' : ''} ${showEnterAnim ? 'card-enter' : ''}`}
    >
      <div className="card-header">
        <label className="recipe-select-label">
          <input
            type="checkbox"
            className="recipe-select"
            checked={recipe.selected}
            onChange={() => toggleRecipeSelected(recipe.id)}
          />
          <span className="select-checkmark" />
        </label>
        <button className="delete-btn" onClick={handleDelete}>
          ×
        </button>
      </div>

      <div className="card-cover">
        <img src={recipe.coverImage} alt={recipe.name} loading="lazy" />
      </div>

      <div className="card-content">
        <h3 className="recipe-name">{recipe.name}</h3>

        <div className="recipe-meta">
          <span className="meta-item">
            <span className="meta-icon">⏱</span>
            {recipe.cookTime} 分钟
          </span>
          <span
            className="difficulty-badge"
            style={{ backgroundColor: difficultyColors[recipe.difficulty] }}
          >
            {recipe.difficulty}
          </span>
        </div>

        <div className="scale-control">
          <label>份量缩放：</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={recipe.scaleFactor}
            onChange={handleScaleChange}
          />
          <span className="scale-suffix">倍</span>
        </div>

        {recipe.scaleFactor !== 1 && (
          <p className="scale-hint">
            准备 {formatFraction(scaledServings)} 人份材料
          </p>
        )}

        <div className="ingredients-section">
          <h4
            className="section-title"
            onClick={() => setExpanded(!expanded)}
          >
            配料 ({recipe.ingredients.length})
            <span className="toggle-icon">{expanded ? '▲' : '▼'}</span>
          </h4>
          {(expanded || recipe.ingredients.length <= 5) && (
            <ul className="ingredient-list">
              {recipe.ingredients.map((ing, idx) => (
                <li key={idx} className="ingredient-item">
                  <span className="ingredient-name">{ing.name}</span>
                  <span className="ingredient-amount">
                    {formatFraction(ing.amount * recipe.scaleFactor)} {ing.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="steps-section">
          <h4 className="section-title">步骤</h4>
          <ol className="step-list">
            {recipe.steps.slice(0, expanded ? undefined : 3).map((step, idx) => (
              <li key={idx} className="step-item">
                {step}
              </li>
            ))}
          </ol>
          {recipe.steps.length > 3 && !expanded && (
            <button
              className="expand-btn"
              onClick={() => setExpanded(true)}
            >
              查看全部 {recipe.steps.length} 步
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
