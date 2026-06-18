import { useState } from 'react';
import type { Ingredient } from '../types';
import { useRecipeStore } from '../store/recipeStore';
import './CreateRecipeModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const emptyIngredient: Ingredient = {
  name: '',
  amount: 0,
  unit: 'g',
  caloriesPer100g: 0,
  proteinPer100g: 0,
  fatPer100g: 0,
  carbsPer100g: 0,
};

const defaultIngredients: Ingredient[] = [
  { ...emptyIngredient },
  { ...emptyIngredient },
  { ...emptyIngredient },
  { ...emptyIngredient },
];

export function CreateRecipeModal({ open, onClose, onCreated }: Props) {
  const createRecipe = useRecipeStore(s => s.createRecipe);
  const showToast = useRecipeStore(s => s.showToast);

  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [steps, setSteps] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>(defaultIngredients);
  const [errors, setErrors] = useState<{ title?: string }>({});

  if (!open) return null;

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    setIngredients(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addIngredient = () => {
    setIngredients(prev => [...prev, { ...emptyIngredient }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setTitle('');
    setImageUrl('');
    setSteps('');
    setIngredients(defaultIngredients.map(i => ({ ...i })));
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { title?: string } = {};
    if (!title.trim()) {
      newErrors.title = '请输入食谱标题';
    } else if (title.length > 20) {
      newErrors.title = '标题不能超过20字';
    }

    const validIngredients = ingredients.filter(i => i.name.trim() && i.amount > 0);
    if (validIngredients.length === 0) {
      showToast('请至少添加一种有效配料');
      return;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const result = await createRecipe({
      title: title.trim(),
      imageUrl: imageUrl.trim() || undefined,
      ingredients: validIngredients,
      steps: steps.trim(),
    });

    if (result) {
      handleClose();
      onCreated?.();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>创建新食谱</h2>
          <button className="modal-close" onClick={handleClose} aria-label="关闭">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>食谱标题 <span className="required">*</span></label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="例如：番茄炒蛋"
                maxLength={20}
                className={errors.title ? 'error' : ''}
              />
              {errors.title && <span className="error-msg">{errors.title}</span>}
              <span className="char-count">{title.length}/20</span>
            </div>

            <div className="form-group">
              <label>封面图片 URL（可选）</label>
              <input
                type="text"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label>配料列表</label>
              <div className="ingredients-list">
                <div className="ingredients-header">
                  <span>名称</span>
                  <span>数量</span>
                  <span>单位</span>
                  <span>热量/100g</span>
                  <span>蛋白/100g</span>
                  <span>脂肪/100g</span>
                  <span>碳水/100g</span>
                  <span></span>
                </div>
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="ingredient-row">
                    <input
                      type="text"
                      placeholder="食材名"
                      value={ing.name}
                      onChange={e => updateIngredient(idx, 'name', e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={ing.amount || ''}
                      onChange={e => updateIngredient(idx, 'amount', Number(e.target.value))}
                    />
                    <select
                      value={ing.unit}
                      onChange={e => updateIngredient(idx, 'unit', e.target.value)}
                    >
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="个">个</option>
                      <option value="片">片</option>
                      <option value="勺">勺</option>
                      <option value="杯">杯</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="kcal"
                      value={ing.caloriesPer100g || ''}
                      onChange={e => updateIngredient(idx, 'caloriesPer100g', Number(e.target.value))}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="g"
                      value={ing.proteinPer100g || ''}
                      onChange={e => updateIngredient(idx, 'proteinPer100g', Number(e.target.value))}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="g"
                      value={ing.fatPer100g || ''}
                      onChange={e => updateIngredient(idx, 'fatPer100g', Number(e.target.value))}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="g"
                      value={ing.carbsPer100g || ''}
                      onChange={e => updateIngredient(idx, 'carbsPer100g', Number(e.target.value))}
                    />
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeIngredient(idx)}
                      disabled={ingredients.length <= 1}
                      aria-label="删除配料"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="add-ingredient-btn" onClick={addIngredient}>
                <i className="fa-solid fa-plus"></i> 添加配料
              </button>
            </div>

            <div className="form-group">
              <label>做法步骤</label>
              <textarea
                rows={5}
                value={steps}
                onChange={e => setSteps(e.target.value)}
                placeholder="每行描述一个步骤，例如：&#10;1. 番茄切块&#10;2. 鸡蛋打散&#10;3. 热锅下油..."
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              创建食谱
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
