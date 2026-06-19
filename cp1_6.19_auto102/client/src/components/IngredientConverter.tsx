import React, { useState, useEffect } from 'react';
import './IngredientConverter.css';

interface Ingredient {
  id: number;
  name: string;
  amount: number;
  unit: string;
}

interface IngredientConverterProps {
  ingredients: Ingredient[];
  defaultServings: number;
  onConvert?: (servings: number, ingredients: Ingredient[]) => void;
}

const IngredientConverter: React.FC<IngredientConverterProps> = ({
  ingredients,
  defaultServings,
  onConvert,
}) => {
  const [servings, setServings] = useState(defaultServings);
  const [convertedIngredients, setConvertedIngredients] = useState<Ingredient[]>(ingredients);
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);
  const [targetUnit, setTargetUnit] = useState('');

  useEffect(() => {
    setConvertedIngredients(ingredients);
    setServings(defaultServings);
  }, [ingredients, defaultServings]);

  const scaleIngredients = (targetServings: number) => {
    const scale = targetServings / defaultServings;
    const scaled = ingredients.map((ing) => ({
      ...ing,
      amount: Number((ing.amount * scale).toFixed(2)),
    }));
    setConvertedIngredients(scaled);
    onConvert?.(targetServings, scaled);
    triggerAnimation();
  };

  const triggerAnimation = () => {
    convertedIngredients.forEach((_, index) => {
      setTimeout(() => {
        setAnimatingIndex(index);
        setTimeout(() => setAnimatingIndex(null), 300);
      }, index * 50);
    });
  };

  const handleServingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value > 0 && value <= 20) {
      setServings(value);
      scaleIngredients(value);
    }
  };

  const handleServingsAdjust = (delta: number) => {
    const newServings = servings + delta;
    if (newServings >= 1 && newServings <= 20) {
      setServings(newServings);
      scaleIngredients(newServings);
    }
  };

  return (
    <div className="ingredient-converter">
      <div className="converter-header">
        <h3 className="converter-title">🥗 食材清单</h3>
        <div className="servings-control">
          <span className="servings-label">份量</span>
          <button
            className="servings-btn"
            onClick={() => handleServingsAdjust(-1)}
            disabled={servings <= 1}
          >
            −
          </button>
          <input
            type="number"
            className="servings-input"
            value={servings}
            onChange={handleServingsChange}
            min="1"
            max="20"
          />
          <button
            className="servings-btn"
            onClick={() => handleServingsAdjust(1)}
            disabled={servings >= 20}
          >
            +
          </button>
          <span className="servings-unit">人份</span>
        </div>
      </div>

      <div className="ingredient-list">
        {convertedIngredients.map((ing, index) => (
          <div
            key={ing.id || index}
            className={`ingredient-item ${animatingIndex === index ? 'number-flash' : ''}`}
          >
            <span className="ingredient-name">{ing.name}</span>
            <span className="ingredient-amount">
              <span className="amount-number">{ing.amount}</span>
              <span className="amount-unit">{ing.unit}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="unit-converter">
        <span className="unit-label">单位转换：</span>
        <select
          className="unit-select"
          value={targetUnit}
          onChange={(e) => setTargetUnit(e.target.value)}
        >
          <option value="">原始单位</option>
          <option value="ml">毫升 (ml)</option>
          <option value="cup">杯 (cup)</option>
          <option value="g">克 (g)</option>
          <option value="kg">千克 (kg)</option>
        </select>
      </div>
    </div>
  );
};

export default IngredientConverter;
