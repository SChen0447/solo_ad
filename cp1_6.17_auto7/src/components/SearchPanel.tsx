import { useState, useEffect, type KeyboardEvent } from 'react';
import type { DietGoal } from '../types';

interface SearchPanelProps {
  onSearch: (ingredients: string[], goal: DietGoal) => void;
  initialIngredients?: string[];
  initialGoal?: DietGoal;
}

const DIET_OPTIONS: { value: DietGoal; label: string; icon: string }[] = [
  { value: 'balanced', label: '均衡饮食', icon: '🍽️' },
  { value: 'low_cal', label: '低卡减脂', icon: '🔥' },
  { value: 'high_protein', label: '高蛋白增肌', icon: '💪' },
  { value: 'vegetarian', label: '素食健康', icon: '🥬' }
];

const SUGGESTED_INGREDIENTS = [
  '鸡胸肉', '西兰花', '糙米', '番茄', '鸡蛋', '胡萝卜',
  '黄瓜', '香菇', '豆腐', '虾仁', '香蕉', '燕麦'
];

function SearchPanel({ onSearch, initialIngredients = [], initialGoal = 'balanced' }: SearchPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [ingredients, setIngredients] = useState<string[]>(initialIngredients);
  const [dietGoal, setDietGoal] = useState<DietGoal>(initialGoal);

  useEffect(() => {
    setIngredients(initialIngredients);
  }, [initialIngredients]);

  const addIngredient = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (ingredients.some((ing) => ing.toLowerCase() === trimmed.toLowerCase())) return;
    setIngredients((prev) => [...prev, trimmed]);
    setInputValue('');
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.includes('，') || inputValue.includes(',')) {
        inputValue
          .split(/[,，]/)
          .forEach((v) => addIngredient(v));
      } else {
        addIngredient(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && ingredients.length > 0) {
      removeIngredient(ingredients.length - 1);
    }
  };

  const handleSearch = () => {
    if (inputValue.trim()) {
      const finalIngredients = [...ingredients];
      inputValue.split(/[,，]/).forEach((v) => {
        const trimmed = v.trim();
        if (trimmed && !finalIngredients.includes(trimmed)) {
          finalIngredients.push(trimmed);
        }
      });
      onSearch(finalIngredients, dietGoal);
    } else {
      onSearch(ingredients, dietGoal);
    }
  };

  return (
    <div className="search-panel">
      <div className="search-card">
        <h2 className="search-title">
          <span className="title-icon">🔍</span>
          搜索您的健康食谱
        </h2>
        <p className="search-subtitle">
          输入食材（多个用逗号分隔），选择饮食目标，为您推荐合适的食谱
        </p>

        <div className="search-input-wrapper">
          <div className="ingredients-input-container">
            <div className="ingredients-tags">
              {ingredients.map((ing, index) => (
                <span key={index} className="ingredient-tag">
                  {ing}
                  <button
                    type="button"
                    className="tag-remove"
                    onClick={() => removeIngredient(index)}
                    aria-label={`删除 ${ing}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                className="ingredients-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={ingredients.length === 0 ? '如：鸡胸肉,西兰花,糙米' : '继续添加食材...'}
              />
            </div>
          </div>
          <button
            type="button"
            className="search-button"
            onClick={handleSearch}
          >
            搜索食谱
          </button>
        </div>

        <div className="suggested-ingredients">
          <span className="suggested-label">常见食材：</span>
          {SUGGESTED_INGREDIENTS.map((ing) => (
            <button
              key={ing}
              type="button"
              className={`suggested-chip ${
                ingredients.includes(ing) ? 'selected' : ''
              }`}
              onClick={() => {
                if (ingredients.includes(ing)) {
                  removeIngredient(ingredients.indexOf(ing));
                } else {
                  addIngredient(ing);
                }
              }}
            >
              {ing}
            </button>
          ))}
        </div>

        <div className="diet-options">
          <span className="diet-label">饮食目标：</span>
          <div className="diet-options-grid">
            {DIET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`diet-option ${dietGoal === opt.value ? 'selected' : ''}`}
                onClick={() => setDietGoal(opt.value)}
              >
                <span className="diet-icon">{opt.icon}</span>
                <span className="diet-text">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SearchPanel;
