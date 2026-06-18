import { useState } from 'react';
import { RecipeCard } from './RecipeCard';
import { useRecipeStore } from '../store/recipeStore';
import type { Difficulty, Ingredient } from '../types';
import './RecipeLibrary.css';

interface RecipeLibraryProps {
  onGenerateShoppingList: () => void;
}

export function RecipeLibrary({ onGenerateShoppingList }: RecipeLibraryProps) {
  const { recipes, addRecipe, deleteRecipe } = useRecipeStore();
  const [showModal, setShowModal] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    cookTime: 30,
    difficulty: '简单' as Difficulty,
    coverImage: '',
    ingredients: [{ name: '', amount: 0, unit: '克' }] as Ingredient[],
    steps: [''],
  });
  const selectedCount = recipes.filter((r) => r.selected).length;

  const handleAddRecipe = () => {
    if (!newRecipe.name.trim()) return;
    if (newRecipe.ingredients.every((i) => !i.name.trim())) return;
    if (newRecipe.steps.every((s) => !s.trim())) return;

    const validIngredients = newRecipe.ingredients.filter(
      (i) => i.name.trim() && i.amount > 0
    );
    const validSteps = newRecipe.steps.filter((s) => s.trim());

    const coverImage = newRecipe.coverImage.trim()
      ? newRecipe.coverImage
      : `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(newRecipe.name + ' delicious food dish')}&image_size=square`;

    addRecipe({
      name: newRecipe.name.trim(),
      cookTime: newRecipe.cookTime,
      difficulty: newRecipe.difficulty,
      coverImage,
      ingredients: validIngredients,
      steps: validSteps,
    });

    setShowModal(false);
    setNewRecipe({
      name: '',
      cookTime: 30,
      difficulty: '简单',
      coverImage: '',
      ingredients: [{ name: '', amount: 0, unit: '克' }],
      steps: [''],
    });
  };

  const addIngredientRow = () => {
    setNewRecipe((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', amount: 0, unit: '克' }],
    }));
  };

  const removeIngredientRow = (index: number) => {
    setNewRecipe((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    setNewRecipe((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      ),
    }));
  };

  const addStep = () => {
    setNewRecipe((prev) => ({
      ...prev,
      steps: [...prev.steps, ''],
    }));
  };

  const updateStep = (index: number, value: string) => {
    setNewRecipe((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? value : s)),
    }));
  };

  const removeStep = (index: number) => {
    setNewRecipe((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="recipe-library">
      <div className="library-toolbar">
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + 添加食谱
        </button>
        <button
          className={`btn btn-success ${selectedCount === 0 ? 'disabled' : ''}`}
          onClick={onGenerateShoppingList}
          disabled={selectedCount === 0}
        >
          生成购物清单 ({selectedCount})
        </button>
      </div>

      <div className="recipe-grid">
        {recipes.map((recipe, index) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onDelete={deleteRecipe}
            isNew={index === 0 && recipes.length > 0}
          />
        ))}
      </div>

      {recipes.length === 0 && (
        <div className="empty-state">
          <p>还没有食谱，点击"添加食谱"开始创建你的第一道菜吧！</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>添加新食谱</h2>

            <div className="form-group">
              <label>食谱名称</label>
              <input
                type="text"
                value={newRecipe.name}
                onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
                placeholder="例如：番茄炒蛋"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>烹饪时间（分钟）</label>
                <input
                  type="number"
                  min="1"
                  value={newRecipe.cookTime}
                  onChange={(e) =>
                    setNewRecipe({ ...newRecipe, cookTime: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="form-group">
                <label>难度等级</label>
                <select
                  value={newRecipe.difficulty}
                  onChange={(e) =>
                    setNewRecipe({ ...newRecipe, difficulty: e.target.value as Difficulty })
                  }
                >
                  <option value="简单">简单</option>
                  <option value="中等">中等</option>
                  <option value="困难">困难</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>封面图片 URL（可选）</label>
              <input
                type="text"
                value={newRecipe.coverImage}
                onChange={(e) => setNewRecipe({ ...newRecipe, coverImage: e.target.value })}
                placeholder="留空将自动生成"
              />
            </div>

            <div className="form-group">
              <label>配料清单</label>
              <div className="ingredient-form-list">
                {newRecipe.ingredients.map((ing, idx) => (
                  <div key={idx} className="ingredient-form-row">
                    <input
                      type="text"
                      placeholder="配料名称"
                      value={ing.name}
                      onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                      className="ing-name-input"
                    />
                    <input
                      type="number"
                      placeholder="用量"
                      min="0"
                      step="0.1"
                      value={ing.amount || ''}
                      onChange={(e) =>
                        updateIngredient(idx, 'amount', parseFloat(e.target.value) || 0)
                      }
                      className="ing-amount-input"
                    />
                    <select
                      value={ing.unit}
                      onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                      className="ing-unit-input"
                    >
                      <option value="克">克</option>
                      <option value="个">个</option>
                      <option value="勺">勺</option>
                      <option value="杯">杯</option>
                      <option value="ml">ml</option>
                      <option value="片">片</option>
                      <option value="根">根</option>
                      <option value="瓣">瓣</option>
                      <option value="块">块</option>
                      <option value="把">把</option>
                    </select>
                    <button
                      type="button"
                      className="btn-remove-row"
                      onClick={() => removeIngredientRow(idx)}
                      disabled={newRecipe.ingredients.length === 1}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn-add-row" onClick={addIngredientRow}>
                + 添加配料
              </button>
            </div>

            <div className="form-group">
              <label>步骤说明</label>
              <div className="step-form-list">
                {newRecipe.steps.map((step, idx) => (
                  <div key={idx} className="step-form-row">
                    <span className="step-number">{idx + 1}.</span>
                    <textarea
                      value={step}
                      onChange={(e) => updateStep(idx, e.target.value)}
                      placeholder="描述这一步..."
                      rows={2}
                    />
                    <button
                      type="button"
                      className="btn-remove-row"
                      onClick={() => removeStep(idx)}
                      disabled={newRecipe.steps.length === 1}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn-add-row" onClick={addStep}>
                + 添加步骤
              </button>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleAddRecipe}>
                保存食谱
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
