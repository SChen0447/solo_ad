import { useState, useEffect } from 'react';
import { Ingredient } from '../types';
import { ingredientsAPI } from '../api';
import { useAuth } from '../AuthContext';

interface IngredientPanelProps {
  pantry: Ingredient[];
  setPantry: (pantry: Ingredient[]) => void;
  showOnly?: boolean;
}

const defaultCategories = ['蔬菜', '肉类', '调料', '主食', '海鲜', '蛋奶', '豆制品', '水果', '其他'];

export default function IngredientPanel({ pantry, setPantry, showOnly = false }: IngredientPanelProps) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('个');
  const [category, setCategory] = useState('其他');
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [error, setError] = useState('');

  useEffect(() => {
    ingredientsAPI.getCategories()
      .then(res => setCategories(res.data))
      .catch(() => {});
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('请输入食材名称');
      return;
    }

    if (token) {
      try {
        const res = await ingredientsAPI.addPantry({
          name: name.trim(),
          quantity: parseFloat(quantity) || 1,
          unit,
          category,
        });
        setPantry([...pantry, res.data]);
      } catch (err: any) {
        setError(err.response?.data?.error || '添加失败');
        return;
      }
    } else {
      const newIngredient: Ingredient = {
        id: Date.now().toString(),
        name: name.trim(),
        quantity: parseFloat(quantity) || 1,
        unit,
        category,
      };
      setPantry([...pantry, newIngredient]);
    }

    setName('');
    setQuantity('1');
    setUnit('个');
    setCategory('其他');
  };

  const handleDelete = async (id: string) => {
    if (token) {
      try {
        await ingredientsAPI.deletePantry(id);
      } catch (err) {
        console.error(err);
      }
    }
    setPantry(pantry.filter(i => i.id !== id));
  };

  return (
    <div className="ingredient-panel">
      <h3>🥕 我的食材库</h3>

      {!showOnly && (
        <form className="ingredient-form" onSubmit={handleAdd}>
          <input
            type="text"
            placeholder="食材名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ flex: 1, minWidth: 100 }}
          />
          <input
            type="number"
            placeholder="数量"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            style={{ width: 70 }}
            min="0"
            step="0.1"
          />
          <input
            type="text"
            placeholder="单位"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            style={{ width: 60 }}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: 90 }}
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-secondary">添加</button>
        </form>
      )}

      {error && <div className="error-message">{error}</div>}

      {pantry.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧺</div>
          <p>暂无食材，请添加家中已有食材</p>
        </div>
      ) : (
        <div className="ingredient-list">
          {pantry.map(ing => (
            <div key={ing.id} className="ingredient-item">
              <div className="ingredient-info">
                <span style={{
                  display: 'inline-block',
                  width: 6,
                  height: 24,
                  backgroundColor: '#22c55e',
                  borderRadius: 3,
                }} />
                <div>
                  <div className="ingredient-name">{ing.name}</div>
                  <div className="ingredient-qty">
                    {ing.quantity} {ing.unit} · {ing.category}
                  </div>
                </div>
              </div>
              {!showOnly && (
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => handleDelete(ing.id)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
