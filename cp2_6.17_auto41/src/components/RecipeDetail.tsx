import { useState, useMemo, useEffect } from 'react';
import { Recipe } from '../utils/api';

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
  onToggleFavorite: (id: string) => void;
}

const difficultyText: Record<'easy' | 'medium' | 'hard', string> = {
  easy: '低难度',
  medium: '中难度',
  hard: '高难度',
};

function parseAmount(amount: string): { number: number; unit: string } | null {
  const match = amount.match(/^([\d./]+)(.*)$/);
  if (!match) return null;

  let num: number;
  const numStr = match[1];

  if (numStr.includes('/')) {
    const parts = numStr.split('/');
    num = parseFloat(parts[0]) / parseFloat(parts[1]);
  } else {
    num = parseFloat(numStr);
  }

  if (isNaN(num)) return null;
  return { number: num, unit: match[2].trim() || '' };
}

function formatNumber(num: number): string {
  if (Number.isInteger(num)) return num.toString();
  const rounded = Math.round(num * 100) / 100;
  if (Number.isInteger(rounded)) return rounded.toString();
  return rounded.toString();
}

function calculateScaledAmount(amount: string, scale: number): string {
  const parsed = parseAmount(amount);
  if (!parsed) return amount;

  const scaled = parsed.number * scale;
  return `${formatNumber(scaled)}${parsed.unit}`;
}

export default function RecipeDetail({ recipe, onBack, onToggleFavorite }: RecipeDetailProps) {
  const [servings, setServings] = useState(2);
  const [showSlider, setShowSlider] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const baseServings = 2;
  const scale = servings / baseServings;

  const sliderProgress = ((servings - 1) / 9) * 100;

  const scaledIngredients = useMemo(() => {
    return recipe.ingredients.map((ing) => ({
      ...ing,
      scaledAmount: calculateScaledAmount(ing.amount, scale),
    }));
  }, [recipe.ingredients, scale]);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [servings]);

  return (
    <div>
      <button className="back-btn" onClick={onBack}>
        ← 返回菜谱列表
      </button>

      <div className="recipe-detail">
        <div className="recipe-detail-header">
          <img
            className="recipe-detail-image"
            src={recipe.coverImage}
            alt={recipe.name}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect fill="%23d4c9a8" width="400" height="300"/><text x="50%" y="50%" fill="%232e5c4a" font-size="64" text-anchor="middle" dominant-baseline="middle">🍳</text></svg>';
            }}
          />
          <div className="recipe-detail-info">
            <h1 className="recipe-detail-name">{recipe.name}</h1>
            <div className="recipe-detail-meta">
              <span className="recipe-card-time">⏱ 烹饪时间：{recipe.cookTime}分钟</span>
              <span className={`difficulty-badge difficulty-${recipe.difficulty}`}>
                {difficultyText[recipe.difficulty]}
              </span>
            </div>
            <div className="portion-control">
              <button className="portion-btn" onClick={() => setShowSlider(!showSlider)}>
                调整份量（{servings}人份）
              </button>
              {showSlider && (
                <div className="portion-slider-container">
                  <label className="portion-label">份量：{servings} 人份</label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={servings}
                    onChange={(e) => setServings(parseInt(e.target.value))}
                    className="portion-slider"
                    style={
                      {
                        '--slider-progress': `${sliderProgress}%`,
                      } as React.CSSProperties
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <h2 className="section-title">📝 食材清单</h2>
        <ul className="ingredients-list">
          {scaledIngredients.map((ing, index) => {
            const maxAmount = 10;
            const parsed = parseAmount(ing.amount);
            const baseNum = parsed ? parsed.number : 1;
            const percent = Math.min((baseNum * scale) / (baseNum * 5) * 100, 100);

            return (
              <li key={index}>
                <div className="ingredient-item">
                  <span>{ing.name}</span>
                  <span style={{ fontWeight: 600, color: '#c0392b' }}>
                    {ing.scaledAmount}
                  </span>
                </div>
                <div className="ingredient-amount-bar">
                  <div
                    key={animKey}
                    className="ingredient-amount-fill"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <h2 className="section-title">👨‍🍳 烹饪步骤</h2>
        <ol className="steps-list">
          {recipe.steps.map((step, index) => (
            <li key={index} className="step-item">
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
