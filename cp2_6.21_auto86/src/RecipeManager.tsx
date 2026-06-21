import React, { useState, useCallback } from 'react';
import {
  Recipe,
  getRecipes,
  addRecipe,
  deleteRecipe,
  getIngredientCalories,
  estimateCalories,
} from './RecipeData';

interface RecipeManagerProps {
  onSelectRecipe: (recipe: Recipe) => void;
  refreshKey: number;
}

const CUISINE_ICON: Record<string, React.ReactNode> = {
  '中餐': (
    <div style={{
      width: 20, height: 20, borderRadius: '50%', background: '#EF4444',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 10, fontWeight: 'bold',
    }}>中</div>
  ),
  '西餐': (
    <div style={{
      width: 20, height: 20, borderRadius: 3, background: '#3B82F6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 10, fontWeight: 'bold',
    }}>西</div>
  ),
  '日料': (
    <div style={{
      width: 20, height: 20, borderRadius: '50%', background: '#F43F5E',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 10, fontWeight: 'bold',
    }}>日</div>
  ),
  '其他': (
    <div style={{
      width: 20, height: 20, borderRadius: 3, background: '#8B5CF6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 10, fontWeight: 'bold',
    }}>他</div>
  ),
};

export default function RecipeManager({ onSelectRecipe, refreshKey }: RecipeManagerProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(getRecipes());
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formIngredients, setFormIngredients] = useState<string[]>([]);
  const [formIngredientInput, setFormIngredientInput] = useState('');
  const [formCuisine, setFormCuisine] = useState<Recipe['cuisine']>('中餐');
  const [validationError, setValidationError] = useState(false);
  const [shakeName, setShakeName] = useState(false);
  const [shakeIngredients, setShakeIngredients] = useState(false);

  const refresh = useCallback(() => {
    setRecipes(getRecipes());
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refreshKey, refresh]);

  const handleAddIngredientTag = () => {
    const val = formIngredientInput.trim();
    if (val && !formIngredients.includes(val)) {
      setFormIngredients(prev => [...prev, val]);
      setFormIngredientInput('');
    }
  };

  const handleRemoveIngredientTag = (idx: number) => {
    setFormIngredients(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    let hasError = false;

    if (!formName.trim()) {
      setValidationError(true);
      setShakeName(true);
      setTimeout(() => setShakeName(false), 300);
      hasError = true;
    }

    if (formIngredients.length === 0) {
      setShakeIngredients(true);
      setTimeout(() => setShakeIngredients(false), 300);
      hasError = true;
    }

    if (hasError) return;

    addRecipe({ name: formName.trim(), cuisine: formCuisine, ingredients: formIngredients });
    setShowModal(false);
    setFormName('');
    setFormIngredients([]);
    setFormIngredientInput('');
    setFormCuisine('中餐');
    setValidationError(false);
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteRecipe(id);
    refresh();
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowModal(true)}
        style={{
          width: 140, height: 44, borderRadius: 22, border: 'none',
          background: 'linear-gradient(135deg, #F97316, #D97706)',
          color: '#fff', fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: 20,
        }}
        onMouseEnter={e => {
          (e.target as HTMLElement).style.transform = 'translateX(5px)';
          (e.target as HTMLElement).style.filter = 'brightness(0.85)';
        }}
        onMouseLeave={e => {
          (e.target as HTMLElement).style.transform = 'translateX(0)';
          (e.target as HTMLElement).style.filter = 'brightness(1)';
        }}
      >
        + 添加食谱
      </button>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 16,
      }}>
        {recipes.map(recipe => (
          <div
            key={recipe.id}
            onClick={() => onSelectRecipe(recipe)}
            style={{
              width: 200, height: 260, borderRadius: 12,
              background: 'linear-gradient(180deg, #FFF8E7 0%, #FFFFFF 100%)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              padding: 16,
              display: 'flex', flexDirection: 'column',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              position: 'relative',
              boxSizing: 'border-box',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
            }}
          >
            <div style={{ position: 'absolute', top: 12, left: 12 }}>
              {CUISINE_ICON[recipe.cuisine]}
            </div>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: '#333333', fontWeight: 'bold', textAlign: 'center',
              marginTop: 20,
            }}>
              {recipe.name}
            </div>
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 'auto',
            }}>
              {recipe.ingredients.slice(0, 4).map((ing, idx) => (
                <span key={idx} style={{
                  height: 24, borderRadius: 6, background: '#FDE68A',
                  fontSize: 12, color: '#92400E', padding: '2px 8px',
                  display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
                }}>
                  {ing}
                </span>
              ))}
            </div>
            <button
              onClick={e => { e.stopPropagation(); handleDelete(recipe.id); }}
              style={{
                position: 'absolute', top: 8, right: 8,
                width: 24, height: 24, borderRadius: '50%', border: 'none',
                background: '#EF4444', color: '#fff', fontSize: 12,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'scale(1.1)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              width: 440, minHeight: 300, borderRadius: 16, background: '#fff',
              padding: 24, boxSizing: 'border-box',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', color: '#333', fontSize: 20 }}>添加食谱</h3>
            <input
              placeholder="食谱名称"
              value={formName}
              onChange={e => { setFormName(e.target.value); setValidationError(false); }}
              style={{
                width: 360, height: 40, padding: '0 10px', margin: '0 0 10px 0',
                border: `1px solid ${validationError && !formName.trim() ? '#EF4444' : '#ddd'}`,
                borderRadius: 8, fontSize: 14, outline: 'none',
                transition: 'border-color 0.2s, transform 0.2s',
                boxSizing: 'border-box',
                animation: shakeName ? 'shake 0.3s ease' : 'none',
              }}
              onFocus={e => {
                (e.target as HTMLElement).style.borderColor = '#F97316';
                (e.target as HTMLElement).style.transform = 'scale(1.02)';
              }}
              onBlur={e => {
                (e.target as HTMLElement).style.borderColor = '#ddd';
                (e.target as HTMLElement).style.transform = 'scale(1)';
              }}
            />
            <div style={{ margin: '0 0 10px 0' }}>
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 6,
                minHeight: 36, marginBottom: 6,
                border: `1px solid ${shakeIngredients ? '#EF4444' : '#ddd'}`,
                borderRadius: 8, padding: 6, boxSizing: 'border-box',
              }}>
                {formIngredients.map((ing, idx) => (
                  <span key={idx} style={{
                    background: '#FFF3CD', borderRadius: 8, height: 30,
                    display: 'inline-flex', alignItems: 'center', padding: '0 8px',
                    fontSize: 13, gap: 4,
                  }}>
                    {ing}
                    <span
                      onClick={() => handleRemoveIngredientTag(idx)}
                      style={{ cursor: 'pointer', color: '#999', fontWeight: 'bold' }}
                    >×</span>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="输入食材"
                  value={formIngredientInput}
                  onChange={e => setFormIngredientInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddIngredientTag(); }}
                  style={{
                    width: 240, height: 36, padding: '0 8px',
                    border: '1px solid #ddd', borderRadius: 8, fontSize: 14,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={handleAddIngredientTag}
                  style={{
                    width: 60, height: 36, background: '#F97316', color: '#fff',
                    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
                  }}
                >添加</button>
              </div>
            </div>
            <select
              value={formCuisine}
              onChange={e => setFormCuisine(e.target.value as Recipe['cuisine'])}
              style={{
                width: 360, height: 40, padding: '0 10px', margin: '0 0 16px 0',
                border: '1px solid #ddd', borderRadius: 8, fontSize: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
            >
              <option value="中餐">中餐</option>
              <option value="西餐">西餐</option>
              <option value="日料">日料</option>
              <option value="其他">其他</option>
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleSave}
                style={{
                  width: 120, height: 40, background: '#F97316', color: '#fff',
                  border: 'none', borderRadius: 20, cursor: 'pointer',
                  fontSize: 16, fontWeight: 'bold',
                  transition: 'filter 0.2s',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.filter = 'brightness(0.85)'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.filter = 'brightness(1)'; }}
              >保存</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
