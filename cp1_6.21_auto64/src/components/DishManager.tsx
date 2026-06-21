import { useState } from 'react';
import type { Dish, Ingredient, DishIngredient } from '../App';

interface Props {
  dishes: Dish[];
  ingredients: Ingredient[];
  onDishesChange: () => void;
  onConsume: (dishId: string) => void;
}

interface FormState {
  id?: string;
  name: string;
  price: string;
  ingredients: DishIngredient[];
  manualSoldOut: boolean;
}

const DEFAULT_FORM: FormState = {
  name: '',
  price: '',
  ingredients: [],
  manualSoldOut: false,
};

function DishManager({ dishes, ingredients, onDishesChange, onConsume }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setShowForm(false);
  };

  const handleAddClick = () => {
    setForm(DEFAULT_FORM);
    setShowForm(true);
  };

  const handleEdit = (dish: Dish) => {
    setForm({
      id: dish.id,
      name: dish.name,
      price: String(dish.price),
      ingredients: [...dish.ingredients],
      manualSoldOut: dish.manualSoldOut,
    });
    setShowForm(true);
  };

  const handleAddIngredient = () => {
    if (ingredients.length === 0) return;
    const firstId = ingredients[0].id;
    setForm({
      ...form,
      ingredients: [...form.ingredients, { ingredientId: firstId, amount: 0 }],
    });
  };

  const handleRemoveIngredient = (idx: number) => {
    const newIngs = [...form.ingredients];
    newIngs.splice(idx, 1);
    setForm({ ...form, ingredients: newIngs });
  };

  const handleIngredientChange = (idx: number, key: 'ingredientId' | 'amount', value: string) => {
    const newIngs = [...form.ingredients];
    if (key === 'amount') {
      newIngs[idx] = { ...newIngs[idx], amount: Number(value) };
    } else {
      newIngs[idx] = { ...newIngs[idx], ingredientId: value };
    }
    setForm({ ...form, ingredients: newIngs });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price || form.ingredients.length === 0) {
      alert('请填写完整的菜品信息');
      return;
    }
    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      ingredients: form.ingredients.filter(i => i.amount > 0),
      manualSoldOut: form.manualSoldOut,
    };
    try {
      if (form.id) {
        await fetch(`/api/dishes/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/dishes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      onDishesChange();
      resetForm();
    } catch (err) {
      console.error('Failed to save dish:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除此菜品？')) return;
    try {
      await fetch(`/api/dishes/${id}`, { method: 'DELETE' });
      onDishesChange();
    } catch (err) {
      console.error('Failed to delete dish:', err);
    }
  };

  const handleToggleSoldOut = async (dish: Dish) => {
    try {
      await fetch(`/api/dishes/${dish.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualSoldOut: !dish.manualSoldOut }),
      });
      onDishesChange();
    } catch (err) {
      console.error('Failed to toggle sold out:', err);
    }
  };

  const getIngredientName = (id: string) => {
    const ing = ingredients.find(i => i.id === id);
    return ing ? `${ing.emoji}${ing.name}` : id;
  };

  const getIngredientUnit = (id: string) => {
    const ing = ingredients.find(i => i.id === id);
    return ing?.unit || '';
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={handleAddClick}>
          ➕ 添加菜品
        </button>
      </div>

      {dishes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🍽️</div>
          <div className="empty-text">暂无菜品，点击上方按钮添加</div>
        </div>
      ) : (
        <div className="dish-grid">
          {dishes.map(dish => (
            <div key={dish.id} className={`dish-card ${dish.soldOut ? 'sold-out' : ''}`}>
              <span className={`dish-status ${dish.soldOut ? 'sold-out' : 'available'}`}>
                {dish.soldOut ? '售罄' : '可售'}
              </span>
              <div className="dish-name">{dish.name}</div>
              <div className="dish-price">¥{dish.price.toFixed(2)}</div>
              <div className="dish-ingredients">
                {dish.ingredients.map((di, idx) => (
                  <span key={idx}>
                    {idx > 0 ? '，' : ''}
                    {getIngredientName(di.ingredientId)} {di.amount}{getIngredientUnit(di.ingredientId)}
                  </span>
                ))}
              </div>
              <div className="dish-actions">
                {!dish.soldOut && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onConsume(dish.id)}
                  >
                    消耗
                  </button>
                )}
                <button
                  className={`btn btn-sm ${dish.manualSoldOut ? 'btn-outline' : 'btn-ghost'}`}
                  onClick={() => handleToggleSoldOut(dish)}
                >
                  {dish.manualSoldOut ? '恢复可售' : '售罄'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(dish)}>
                  编辑
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(dish.id)}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="form-overlay" onClick={e => e.target === e.currentTarget && resetForm()}>
          <form className="form-modal" onSubmit={handleSubmit}>
            <div className="form-title">
              {form.id ? '编辑菜品' : '添加菜品'}
            </div>

            <div className="form-group">
              <label className="form-label">菜品名称</label>
              <input
                className="form-input"
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="请输入菜品名称"
              />
            </div>

            <div className="form-group">
              <label className="form-label">价格（元）</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                placeholder="请输入价格"
              />
            </div>

            <div className="form-group">
              <label className="form-label">关联食材及用量</label>
              {form.ingredients.map((di, idx) => (
                <div className="ingredient-row" key={idx}>
                  <select
                    className="form-select"
                    value={di.ingredientId}
                    onChange={e => handleIngredientChange(idx, 'ingredientId', e.target.value)}
                  >
                    {ingredients.map(ing => (
                      <option key={ing.id} value={ing.id}>
                        {ing.emoji} {ing.name} ({ing.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    value={di.amount || ''}
                    onChange={e => handleIngredientChange(idx, 'amount', e.target.value)}
                    placeholder="用量"
                  />
                  <span style={{ fontSize: 12, color: '#999', minWidth: 24 }}>
                    {getIngredientUnit(di.ingredientId)}
                  </span>
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => handleRemoveIngredient(idx)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="add-ingredient-btn" onClick={handleAddIngredient}>
                + 添加食材
              </button>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.manualSoldOut}
                  onChange={e => setForm({ ...form, manualSoldOut: e.target.checked })}
                />
                手动标记为售罄
              </label>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={resetForm}>
                取消
              </button>
              <button type="submit" className="btn btn-primary">
                {form.id ? '保存修改' : '添加菜品'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default DishManager;
