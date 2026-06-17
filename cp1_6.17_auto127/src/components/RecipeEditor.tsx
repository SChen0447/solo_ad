import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Ingredient, Recipe, RecipeStep } from '../types';
import { recipeApi, shoppingListApi } from '../api';

interface RecipeEditorProps {
  onGenerateShoppingList: (recipeIds: number[]) => void;
  allRecipes: Recipe[];
}

const emptyIngredient: Ingredient = { name: '', quantity: 0, unit: '' };
const emptyStep: RecipeStep = { content: '', order: 0 };

const parseBatchImport = (text: string): Ingredient[] => {
  const lines = text.trim().split('\n').filter((line) => line.trim());
  return lines
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 3) {
        const quantity = parseFloat(parts[parts.length - 2]);
        if (!isNaN(quantity)) {
          return {
            name: parts.slice(0, parts.length - 2).join(' '),
            quantity,
            unit: parts[parts.length - 1]
          };
        }
      }
      if (parts.length >= 2) {
        const quantity = parseFloat(parts[parts.length - 1]);
        if (!isNaN(quantity)) {
          return {
            name: parts.slice(0, parts.length - 1).join(' '),
            quantity,
            unit: ''
          };
        }
      }
      return { name: line.trim(), quantity: 0, unit: '' };
    })
    .filter((ing) => ing.name);
};

export const RecipeEditor: React.FC<RecipeEditorProps> = ({
  onGenerateShoppingList,
  allRecipes
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [recipe, setRecipe] = useState<Partial<Recipe>>({
    title: '',
    description: '',
    cover_image: '',
    difficulty: 1,
    servings: 2,
    cook_time: 30,
    ingredients: [{ ...emptyIngredient }],
    steps: [{ ...emptyStep, order: 0 }]
  });

  const [selectedRecipes, setSelectedRecipes] = useState<number[]>([]);
  const [batchText, setBatchText] = useState('');
  const draggedStepIndex = useRef<number | null>(null);

  const isEditing = !!id;

  useEffect(() => {
    if (id) {
      setLoading(true);
      recipeApi
        .getRecipe(parseInt(id))
        .then((res) => {
          setRecipe(res.data.recipe);
          if (res.data.recipe.id) {
            setSelectedRecipes([res.data.recipe.id]);
          }
        })
        .catch((err) => {
          setError(err.response?.data?.error || '加载食谱失败');
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaving(true);
    setSaved(false);
    saveTimeoutRef.current = setTimeout(() => {
      saveRecipe();
    }, 2000);
  }, [recipe]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const saveRecipe = async () => {
    try {
      setSaving(true);
      setError('');
      if (isEditing && id) {
        await recipeApi.updateRecipe(parseInt(id), recipe);
      } else {
        if (!recipe.title?.trim()) {
          setSaving(false);
          return;
        }
        const res = await recipeApi.createRecipe(recipe);
        setRecipe(res.data.recipe);
        setSelectedRecipes([res.data.recipe.id]);
        navigate(`/editor/${res.data.recipe.id}`, { replace: true });
      }
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || '保存失败');
      setSaving(false);
    }
  };

  const handleRecipeChange = (field: keyof Recipe, value: any) => {
    setRecipe((prev) => ({ ...prev, [field]: value }));
    debouncedSave();
  };

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: any) => {
    setRecipe((prev) => {
      const ingredients = [...(prev.ingredients || [])];
      ingredients[index] = { ...ingredients[index], [field]: value };
      return { ...prev, ingredients };
    });
    debouncedSave();
  };

  const addIngredient = () => {
    setRecipe((prev) => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), { ...emptyIngredient }]
    }));
  };

  const removeIngredient = (index: number) => {
    setRecipe((prev) => {
      const ingredients = prev.ingredients?.filter((_, i) => i !== index) || [];
      return {
        ...prev,
        ingredients: ingredients.length ? ingredients : [{ ...emptyIngredient }]
      };
    });
    debouncedSave();
  };

  const handleBatchImport = () => {
    const parsed = parseBatchImport(batchText);
    if (parsed.length > 0) {
      setRecipe((prev) => {
        const existing = prev.ingredients?.filter((ing) => ing.name.trim()) || [];
        return {
          ...prev,
          ingredients: [...existing, ...parsed]
        };
      });
      setBatchText('');
      debouncedSave();
    }
  };

  const handleStepChange = (index: number, content: string) => {
    setRecipe((prev) => {
      const steps = [...(prev.steps || [])];
      steps[index] = { ...steps[index], content };
      return { ...prev, steps };
    });
    debouncedSave();
  };

  const addStep = () => {
    setRecipe((prev) => {
      const steps = prev.steps || [];
      return {
        ...prev,
        steps: [...steps, { ...emptyStep, order: steps.length }]
      };
    });
  };

  const removeStep = (index: number) => {
    setRecipe((prev) => {
      const steps = prev.steps?.filter((_, i) => i !== index) || [];
      return {
        ...prev,
        steps: steps.length
          ? steps.map((s, i) => ({ ...s, order: i }))
          : [{ ...emptyStep, order: 0 }]
      };
    });
    debouncedSave();
  };

  const handleDragStart = (index: number) => {
    draggedStepIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedStepIndex.current === null || draggedStepIndex.current === index) return;

    setRecipe((prev) => {
      const steps = [...(prev.steps || [])];
      const [draggedItem] = steps.splice(draggedStepIndex.current!, 1);
      steps.splice(index, 0, draggedItem);
      return {
        ...prev,
        steps: steps.map((s, i) => ({ ...s, order: i }))
      };
    });
    draggedStepIndex.current = index;
  };

  const handleDragEnd = () => {
    draggedStepIndex.current = null;
    debouncedSave();
  };

  const handleGenerateList = () => {
    const ids = selectedRecipes.length > 0 ? selectedRecipes : (recipe.id ? [recipe.id] : []);
    if (ids.length === 0) {
      setError('请先保存食谱或选择至少一个食谱');
      return;
    }
    onGenerateShoppingList(ids);
  };

  const toggleRecipeSelection = (recipeId: number) => {
    setSelectedRecipes((prev) =>
      prev.includes(recipeId)
        ? prev.filter((id) => id !== recipeId)
        : [...prev, recipeId]
    );
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">{isEditing ? '编辑食谱' : '新建食谱'}</h1>
        <div
          className={`save-indicator ${saving ? 'saving' : saved ? 'saved' : ''}`}
        >
          {saving ? '⏳ 保存中...' : saved ? '✓ 已保存' : ''}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="recipe-header">
        <input
          type="text"
          placeholder="食谱标题"
          value={recipe.title}
          onChange={(e) => handleRecipeChange('title', e.target.value)}
          onBlur={() => saveRecipe()}
        />
        <textarea
          placeholder="食谱描述"
          value={recipe.description}
          onChange={(e) => handleRecipeChange('description', e.target.value)}
        />
        <div className="recipe-meta-row">
          <label>
            难度等级
            <select
              value={recipe.difficulty}
              onChange={(e) =>
                handleRecipeChange('difficulty', parseInt(e.target.value))
              }
            >
              <option value={1}>🔥 简单</option>
              <option value={2}>🔥🔥 中等</option>
              <option value={3}>🔥🔥🔥 困难</option>
            </select>
          </label>
          <label>
            份量（人份）
            <input
              type="number"
              min="1"
              value={recipe.servings}
              onChange={(e) =>
                handleRecipeChange('servings', parseInt(e.target.value) || 1)
              }
            />
          </label>
          <label>
            烹饪时间（分钟）
            <input
              type="number"
              min="1"
              value={recipe.cook_time}
              onChange={(e) =>
                handleRecipeChange('cook_time', parseInt(e.target.value) || 1)
              }
            />
          </label>
          <label>
            封面图片URL
            <input
              type="text"
              placeholder="图片链接"
              value={recipe.cover_image}
              onChange={(e) => handleRecipeChange('cover_image', e.target.value)}
            />
          </label>
        </div>
      </div>

      {allRecipes.length > 0 && (
        <div className="recipe-selector">
          <div className="recipe-selector-title">
            选择要合并到购物清单的食谱（多选）
          </div>
          <div className="recipe-checkboxes">
            {allRecipes.map((r) => (
              <label key={r.id} className="recipe-checkbox">
                <input
                  type="checkbox"
                  checked={selectedRecipes.includes(r.id)}
                  onChange={() => toggleRecipeSelection(r.id)}
                />
                {r.title}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="editor-layout">
        <div className="editor-section">
          <h2 className="editor-section-title">食材清单</h2>

          <div className="ingredient-input">
            <input
              type="text"
              placeholder="食材名称"
              value={recipe.ingredients?.[recipe.ingredients.length - 1]?.name || ''}
              onChange={(e) =>
                handleIngredientChange(
                  (recipe.ingredients?.length || 1) - 1,
                  'name',
                  e.target.value
                )
              }
              onBlur={addIngredient}
            />
            <input
              type="number"
              placeholder="数量"
              step="0.1"
              value={
                recipe.ingredients?.[recipe.ingredients.length - 1]?.quantity || ''
              }
              onChange={(e) =>
                handleIngredientChange(
                  (recipe.ingredients?.length || 1) - 1,
                  'quantity',
                  parseFloat(e.target.value) || 0
                )
              }
            />
            <input
              type="text"
              placeholder="单位"
              value={recipe.ingredients?.[recipe.ingredients.length - 1]?.unit || ''}
              onChange={(e) =>
                handleIngredientChange(
                  (recipe.ingredients?.length || 1) - 1,
                  'unit',
                  e.target.value
                )
              }
            />
            <button className="btn-primary" onClick={addIngredient}>
              +
            </button>
          </div>

          <div className="ingredient-list">
            {recipe.ingredients
              ?.filter((ing) => ing.name.trim())
              .map((ingredient, index) => (
                <div key={index} className="ingredient-item">
                  <span>{ingredient.name}</span>
                  <span>{ingredient.quantity}</span>
                  <span>{ingredient.unit}</span>
                  <button onClick={() => removeIngredient(index)}>删除</button>
                </div>
              ))}
          </div>

          <div className="batch-import">
            <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#64748b' }}>
              批量导入（每行一个食材，如：面粉 500 克）
            </h3>
            <textarea
              placeholder="面粉 500 克&#10;鸡蛋 3 个&#10;牛奶 200 毫升"
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
            />
            <button className="btn-secondary" onClick={handleBatchImport}>
              导入食材
            </button>
          </div>
        </div>

        <div className="editor-section">
          <h2 className="editor-section-title">烹饪步骤</h2>

          {recipe.steps?.map((step, index) => (
            <div
              key={index}
              className="step-item"
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className="step-number" draggable>
                {index + 1}
              </div>
              <textarea
                placeholder={`第 ${index + 1} 步...`}
                value={step.content}
                onChange={(e) => handleStepChange(index, e.target.value)}
              />
              {(recipe.steps?.length || 0) > 1 && (
                <button onClick={() => removeStep(index)}>删除</button>
              )}
            </div>
          ))}

          <button className="add-step-btn" onClick={addStep}>
            + 添加步骤
          </button>
        </div>
      </div>

      <div className="editor-actions">
        <button className="btn-secondary" onClick={() => navigate('/')}>
          返回食谱库
        </button>
        <button className="btn-primary" onClick={handleGenerateList}>
          🛒 生成购物清单
        </button>
      </div>
    </div>
  );
};

export default RecipeEditor;
