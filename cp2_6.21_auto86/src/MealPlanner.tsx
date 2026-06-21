import React, { useState, useCallback } from 'react';
import {
  Recipe,
  getAvailableIngredients,
  addIngredient,
  removeIngredient,
  generateMealPlan,
} from './RecipeData';

interface MealPlan {
  day: string;
  lunch: Recipe | null;
  dinner: Recipe | null;
}

export default function MealPlanner() {
  const [ingredients, setIngredients] = useState<string[]>(getAvailableIngredients());
  const [newIngredient, setNewIngredient] = useState('');
  const [mealPlan, setMealPlan] = useState<MealPlan[]>([]);
  const [generating, setGenerating] = useState(false);
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);

  const refreshIngredients = useCallback(() => {
    setIngredients(getAvailableIngredients());
  }, []);

  const handleAddIngredient = () => {
    const val = newIngredient.trim();
    if (val) {
      addIngredient(val);
      setNewIngredient('');
      refreshIngredients();
      setAnimatingIndex(ingredients.length);
      setTimeout(() => setAnimatingIndex(null), 300);
    }
  };

  const handleRemoveIngredient = (name: string) => {
    removeIngredient(name);
    refreshIngredients();
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const plan = generateMealPlan();
      setMealPlan(plan);
      setGenerating(false);
    }, 500);
  };

  const CUISINE_ICON_SMALL: Record<string, React.ReactNode> = {
    '中餐': <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#EF4444', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8, fontWeight: 'bold' }}>中</div>,
    '西餐': <div style={{ width: 16, height: 16, borderRadius: 2, background: '#3B82F6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8, fontWeight: 'bold' }}>西</div>,
    '日料': <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#F43F5E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8, fontWeight: 'bold' }}>日</div>,
    '其他': <div style={{ width: 16, height: 16, borderRadius: 2, background: '#8B5CF6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8, fontWeight: 'bold' }}>他</div>,
  };

  return (
    <div style={{ display: 'flex', gap: 24, marginTop: 24, position: 'relative' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              width: 200, height: 48, borderRadius: 24, border: 'none',
              background: 'linear-gradient(135deg, #D97706, #F97316)',
              color: '#fff', fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
              transition: 'transform 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseEnter={e => { if (!generating) (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            {generating && (
              <span style={{
                display: 'inline-block', width: 16, height: 16,
                border: '2px solid #fff', borderTopColor: 'transparent',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
            )}
            {generating ? '生成中...' : '生成餐单'}
          </button>
        </div>

        {mealPlan.length > 0 && (
          <div style={{
            display: 'flex', gap: 16,
            flexWrap: 'wrap',
          }}>
            {mealPlan.map((dayPlan, dayIdx) => (
              <div key={dayIdx} style={{
                flex: '0 0 30%', minWidth: 220,
                borderRadius: 12, padding: 16,
                background: '#FFFBF0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                boxSizing: 'border-box',
              }}>
                <div style={{
                  fontSize: 16, background: '#FDE68A', borderRadius: 6,
                  padding: '4px 8px', display: 'inline-block', marginBottom: 12,
                  fontWeight: 'bold', color: '#92400E',
                }}>
                  {dayPlan.day}
                </div>
                {(['lunch', 'dinner'] as const).map((meal, mealIdx) => {
                  const recipe = dayPlan[meal];
                  const label = meal === 'lunch' ? '午餐' : '晚餐';
                  return (
                    <div key={mealIdx} style={{
                      width: '90%', height: 100, borderRadius: 8,
                      background: '#fff', marginBottom: 8, padding: 12,
                      boxSizing: 'border-box',
                      borderBottom: '1px dashed #E5E7EB',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}>
                      {recipe ? (
                        <>
                          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{label}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            {CUISINE_ICON_SMALL[recipe.cuisine]}
                            <span style={{ fontSize: 14, fontWeight: 'bold', color: '#333' }}>{recipe.name}</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {recipe.ingredients.slice(0, 3).map((ing, i) => (
                              <span key={i} style={{
                                fontSize: 11, background: '#FDE68A', borderRadius: 4,
                                padding: '1px 6px', color: '#92400E',
                              }}>{ing}</span>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div style={{
                          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#9CA3AF', fontSize: 13, textAlign: 'center',
                        }}>
                          暂无匹配，请补充食材
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        width: 260, background: '#FEF9E7', borderRadius: 12,
        padding: 16, boxSizing: 'border-box',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        position: 'sticky', top: 20, alignSelf: 'flex-start',
        maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 18, color: '#B45309', fontWeight: 'bold', marginBottom: 16 }}>
          🧊 我的冰箱
        </div>

        <div style={{ marginBottom: 16 }}>
          {ingredients.map((ing, idx) => (
            <div
              key={ing}
              style={{
                height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid #FADFAD',
                transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
                transform: animatingIndex === idx ? 'translateY(20px)' : 'translateY(0)',
                opacity: animatingIndex === idx ? 0 : 1,
              }}
            >
              <span style={{ fontSize: 14, color: '#444' }}>{ing}</span>
              <button
                onClick={() => handleRemoveIngredient(ing)}
                style={{
                  width: 28, height: 28, borderRadius: '50%', border: 'none',
                  background: '#EF4444', color: '#fff', fontSize: 14,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'scale(0.85)'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
              >×</button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            placeholder="添加食材"
            value={newIngredient}
            onChange={e => setNewIngredient(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddIngredient(); }}
            style={{
              width: 160, height: 36, padding: '0 8px',
              border: '1px solid #D97706', borderRadius: 8, fontSize: 13,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleAddIngredient}
            style={{
              width: 60, height: 36, background: '#F97316', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
            }}
          >添加</button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
