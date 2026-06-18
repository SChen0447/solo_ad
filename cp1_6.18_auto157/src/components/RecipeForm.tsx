import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Recipe, Ingredient, RecipeStep } from '../types';
import { CUISINE_OPTIONS } from '../types';
import { useRecipeStore } from '../dataStore';

interface FormIngredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

interface FormStep {
  id: string;
  description: string;
}

const TOTAL_STEPS = 3;

const RecipeForm: React.FC = () => {
  const { addRecipe, updateRecipe, closeForm, editingRecipeId, recipes } = useRecipeStore();
  const editingRecipe = editingRecipeId ? recipes.find((r) => r.id === editingRecipeId) : null;

  const [step, setStep] = useState(1);
  const [name, setName] = useState(editingRecipe?.name || '');
  const [imageUrl, setImageUrl] = useState(editingRecipe?.imageUrl || '');
  const [cookTime, setCookTime] = useState(editingRecipe?.cookTime?.toString() || '');
  const [difficulty, setDifficulty] = useState<Recipe['difficulty']>(editingRecipe?.difficulty || 'easy');
  const [cuisine, setCuisine] = useState<Recipe['cuisine']>(editingRecipe?.cuisine || '中餐');
  const [ingredients, setIngredients] = useState<FormIngredient[]>(
    editingRecipe?.ingredients?.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity.toString(), unit: i.unit })) || [
      { id: uuidv4(), name: '', quantity: '', unit: '' },
    ]
  );
  const [steps, setSteps] = useState<FormStep[]>(
    editingRecipe?.steps?.map((s) => ({ id: s.id, description: s.description })) || [
      { id: uuidv4(), description: '' },
    ]
  );

  const addIngredient = useCallback(() => {
    setIngredients((prev) => [...prev, { id: uuidv4(), name: '', quantity: '', unit: '' }]);
  }, []);

  const removeIngredient = useCallback((id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateIngredient = useCallback((id: string, field: keyof FormIngredient, value: string) => {
    setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  }, []);

  const addStep = useCallback(() => {
    setSteps((prev) => [...prev, { id: uuidv4(), description: '' }]);
  }, []);

  const removeStep = useCallback((id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateStep = useCallback((id: string, value: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, description: value } : s)));
  }, []);

  const validateStep = (s: number): boolean => {
    if (s === 1) return !!name.trim() && !!cookTime.trim();
    if (s === 2) return ingredients.some((i) => i.name.trim());
    if (s === 3) return steps.some((st) => st.description.trim());
    return true;
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS && validateStep(step)) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    const recipeIngredients: Ingredient[] = ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({
        id: i.id,
        name: i.name.trim(),
        quantity: parseFloat(i.quantity) || 0,
        unit: i.unit.trim(),
      }));

    const recipeSteps: RecipeStep[] = steps
      .filter((s) => s.description.trim())
      .map((s, idx) => ({
        id: s.id,
        order: idx + 1,
        description: s.description.trim(),
      }));

    const recipeData = {
      name: name.trim(),
      imageUrl: imageUrl.trim() || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Delicious%20home%20cooked%20meal%20on%20plate%2C%20food%20photography&image_size=landscape_4_3',
      cookTime: parseInt(cookTime) || 0,
      difficulty,
      cuisine,
      ingredients: recipeIngredients,
      steps: recipeSteps,
    };

    if (editingRecipeId) {
      updateRecipe(editingRecipeId, recipeData);
    } else {
      addRecipe(recipeData);
    }
    closeForm();
  };

  const progressPercent = (step / TOTAL_STEPS) * 100;

  return (
    <div className="recipe-form-overlay" onClick={closeForm}>
      <div className="recipe-form" onClick={(e) => e.stopPropagation()}>
        <div className="recipe-form__progress-bar">
          <div className="recipe-form__progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="recipe-form__progress-text">
          步骤 {step} / {TOTAL_STEPS}
        </div>

        <h2 className="recipe-form__title">
          {editingRecipeId ? '编辑食谱' : '添加食谱'}
        </h2>

        {step === 1 && (
          <div className="recipe-form__section">
            <label className="recipe-form__label">
              菜名 <span className="recipe-form__required">*</span>
            </label>
            <input
              className="recipe-form__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入菜名"
            />

            <label className="recipe-form__label">菜品图片URL</label>
            <input
              className="recipe-form__input"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="输入图片URL（可选）"
            />

            <label className="recipe-form__label">
              烹饪时长（分钟） <span className="recipe-form__required">*</span>
            </label>
            <input
              className="recipe-form__input"
              type="number"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              placeholder="如：30"
            />

            <label className="recipe-form__label">难度等级</label>
            <div className="recipe-form__radio-group">
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <label key={d} className={`recipe-form__radio ${difficulty === d ? 'recipe-form__radio--active' : ''}`}>
                  <input
                    type="radio"
                    name="difficulty"
                    value={d}
                    checked={difficulty === d}
                    onChange={() => setDifficulty(d)}
                  />
                  {d === 'easy' ? '简单' : d === 'medium' ? '中等' : '困难'}
                </label>
              ))}
            </div>

            <label className="recipe-form__label">菜系标签</label>
            <select
              className="recipe-form__select"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value as Recipe['cuisine'])}
            >
              {CUISINE_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        {step === 2 && (
          <div className="recipe-form__section">
            <label className="recipe-form__label">食材列表</label>
            {ingredients.map((ing, idx) => (
              <div key={ing.id} className="recipe-form__ingredient-row">
                <span className="recipe-form__ingredient-num">{idx + 1}</span>
                <input
                  className="recipe-form__input recipe-form__input--name"
                  value={ing.name}
                  onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)}
                  placeholder="食材名称"
                />
                <input
                  className="recipe-form__input recipe-form__input--qty"
                  type="number"
                  value={ing.quantity}
                  onChange={(e) => updateIngredient(ing.id, 'quantity', e.target.value)}
                  placeholder="数量"
                />
                <input
                  className="recipe-form__input recipe-form__input--unit"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                  placeholder="单位"
                />
                <button
                  className="recipe-form__remove-btn"
                  onClick={() => removeIngredient(ing.id)}
                  type="button"
                >
                  ✕
                </button>
              </div>
            ))}
            <button className="recipe-form__add-btn" onClick={addIngredient} type="button">
              + 添加食材
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="recipe-form__section">
            <label className="recipe-form__label">步骤说明</label>
            {steps.map((s, idx) => (
              <div key={s.id} className="recipe-form__step-row">
                <span className="recipe-form__step-num">{idx + 1}</span>
                <textarea
                  className="recipe-form__textarea"
                  value={s.description}
                  onChange={(e) => updateStep(s.id, e.target.value)}
                  placeholder={`步骤 ${idx + 1} 的说明`}
                  rows={2}
                />
                <button
                  className="recipe-form__remove-btn"
                  onClick={() => removeStep(s.id)}
                  type="button"
                >
                  ✕
                </button>
              </div>
            ))}
            <button className="recipe-form__add-btn" onClick={addStep} type="button">
              + 添加步骤
            </button>
          </div>
        )}

        <div className="recipe-form__actions">
          {step > 1 && (
            <button className="btn btn--secondary" onClick={handlePrev} type="button">
              上一步
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              className="btn btn--primary"
              onClick={handleNext}
              type="button"
              disabled={!validateStep(step)}
            >
              下一步
            </button>
          ) : (
            <button
              className="btn btn--primary"
              onClick={handleSubmit}
              type="button"
              disabled={!validateStep(step)}
            >
              {editingRecipeId ? '保存修改' : '提交食谱'}
            </button>
          )}
          <button className="btn btn--ghost" onClick={closeForm} type="button">
            取消
          </button>
        </div>
      </div>

      <style>{`
        .recipe-form-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          animation: overlayIn 0.3s ease;
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .recipe-form {
          background: #fff;
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 85vh;
          overflow-y: auto;
          padding: 24px;
          animation: formSlideIn 0.3s ease;
        }
        @keyframes formSlideIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .recipe-form__progress-bar {
          width: 100%;
          height: 4px;
          background: #E8E0D0;
          border-radius: 2px;
          margin-bottom: 8px;
          overflow: hidden;
        }
        .recipe-form__progress-fill {
          height: 100%;
          background: #C87A5A;
          border-radius: 2px;
          transition: width 0.3s ease;
        }
        .recipe-form__progress-text {
          font-size: 12px;
          color: #999;
          margin-bottom: 16px;
        }
        .recipe-form__title {
          font-size: 22px;
          font-weight: 700;
          color: #2D2D2D;
          margin-bottom: 20px;
        }
        .recipe-form__section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .recipe-form__label {
          font-size: 14px;
          font-weight: 600;
          color: #444;
          margin-top: 4px;
        }
        .recipe-form__required {
          color: #E74C3C;
        }
        .recipe-form__input {
          padding: 10px 12px;
          border: 1.5px solid #E0D8C8;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
          outline: none;
          background: #FDFBF7;
        }
        .recipe-form__input:focus {
          border-color: #C87A5A;
        }
        .recipe-form__select {
          padding: 10px 12px;
          border: 1.5px solid #E0D8C8;
          border-radius: 6px;
          font-size: 14px;
          outline: none;
          background: #FDFBF7;
          cursor: pointer;
        }
        .recipe-form__select:focus {
          border-color: #C87A5A;
        }
        .recipe-form__radio-group {
          display: flex;
          gap: 8px;
        }
        .recipe-form__radio {
          padding: 8px 16px;
          border: 1.5px solid #E0D8C8;
          border-radius: 20px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        .recipe-form__radio input {
          display: none;
        }
        .recipe-form__radio--active {
          background: #C87A5A;
          color: #fff;
          border-color: #C87A5A;
        }
        .recipe-form__ingredient-row,
        .recipe-form__step-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .recipe-form__ingredient-num,
        .recipe-form__step-num {
          width: 24px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 600;
          color: #C87A5A;
          flex-shrink: 0;
        }
        .recipe-form__input--name { flex: 2; }
        .recipe-form__input--qty { flex: 1; min-width: 60px; }
        .recipe-form__input--unit { flex: 0.8; min-width: 50px; }
        .recipe-form__textarea {
          flex: 1;
          padding: 10px 12px;
          border: 1.5px solid #E0D8C8;
          border-radius: 6px;
          font-size: 14px;
          resize: vertical;
          outline: none;
          font-family: inherit;
          background: #FDFBF7;
        }
        .recipe-form__textarea:focus {
          border-color: #C87A5A;
        }
        .recipe-form__remove-btn {
          width: 32px;
          height: 36px;
          border: none;
          background: #FDE8E0;
          color: #C87A5A;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .recipe-form__remove-btn:hover {
          background: #F5C8B8;
        }
        .recipe-form__add-btn {
          padding: 10px 20px;
          border: 2px dashed #C87A5A;
          background: transparent;
          color: #C87A5A;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .recipe-form__add-btn:hover {
          background: #FDF0E6;
        }
        .recipe-form__actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
};

export default RecipeForm;
