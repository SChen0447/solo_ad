import React, { useState, useCallback, useEffect } from 'react';
import {
  Recipe,
  getRecipes,
  addRecipe,
  deleteRecipe,
  isFavorite,
  getFavoriteRecipes,
  syncFavoritesFromBackend,
  toggleFavoriteAsync,
  fetchFavoriteRecipes,
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

const FORM_INPUT_WIDTH = '100%';

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? '#EF4444' : 'none'}
      stroke={filled ? '#EF4444' : '#999'} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: 'all 0.2s ease' }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

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
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoritesTick, setFavoritesTick] = useState(0);
  const [favoriteRecipesCache, setFavoriteRecipesCache] = useState<Recipe[]>([]);
  const [isFilterLoading, setIsFilterLoading] = useState(false);

  useEffect(() => {
    syncFavoritesFromBackend().then(() => setFavoritesTick(prev => prev + 1));
  }, []);

  const refresh = useCallback(() => {
    setRecipes(getRecipes());
    setFavoritesTick(prev => prev + 1);
  }, []);

  useEffect(() => {
    refresh();
  }, [refreshKey, refresh]);

  const displayedRecipes = showFavoritesOnly ? favoriteRecipesCache : recipes;

  const handleToggleFavorite = async (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    await toggleFavoriteAsync(recipeId);
    setFavoritesTick(prev => prev + 1);
    if (showFavoritesOnly) {
      const favs = await fetchFavoriteRecipes();
      setFavoriteRecipesCache(favs);
    }
  };

  const handleToggleFilter = async () => {
    const nextShowFavorites = !showFavoritesOnly;
    setShowFavoritesOnly(nextShowFavorites);
    if (nextShowFavorites) {
      setIsFilterLoading(true);
      const favs = await fetchFavoriteRecipes();
      setFavoriteRecipesCache(favs);
      setIsFilterLoading(false);
    } else {
      refresh();
    }
  };

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

  const inputStyle: React.CSSProperties = {
    width: FORM_INPUT_WIDTH,
    height: 40,
    padding: '0 10px',
    margin: '0 0 10px 0',
    boxSizing: 'border-box',
    border: `1px solid ${validationError && !formName.trim() ? '#EF4444' : '#ddd'}`,
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s, transform 0.2s',
  };

  const selectStyle: React.CSSProperties = {
    width: FORM_INPUT_WIDTH,
    height: 40,
    padding: '0 10px',
    margin: '0 0 10px 0',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    background: '#fff',
    transition: 'border-color 0.2s, transform 0.2s',
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            width: 140, height: 44, borderRadius: 22, border: 'none',
            background: 'linear-gradient(135deg, #F97316, #D97706)',
            color: '#fff', fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
            transition: 'all 0.2s ease',
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

        <button
          onClick={handleToggleFilter}
          disabled={isFilterLoading}
          style={{
            height: 44, padding: '0 20px', borderRadius: 22, border: 'none',
            background: showFavoritesOnly
              ? 'linear-gradient(135deg, #EF4444, #DC2626)'
              : 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
            color: showFavoritesOnly ? '#fff' : '#92400E',
            fontSize: 14, fontWeight: 'bold', cursor: isFilterLoading ? 'wait' : 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: isFilterLoading ? 0.7 : 1,
          }}
          onMouseEnter={e => { if (!isFilterLoading) (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        >
          <HeartIcon filled={showFavoritesOnly} />
          {isFilterLoading ? '加载中...' : (showFavoritesOnly ? '全部食谱' : '只看收藏')}
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 16,
      }}>
        {displayedRecipes.map(recipe => {
          const favorited = isFavorite(recipe.id);
          return (
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

              <button
                onClick={e => handleToggleFavorite(e, recipe.id)}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 28, height: 28, borderRadius: '50%', border: 'none',
                  background: favorited ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.8)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                <HeartIcon filled={favorited} />
              </button>

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
                  position: 'absolute', bottom: 12, right: 12,
                  width: 22, height: 22, borderRadius: '50%', border: 'none',
                  background: '#EF4444', color: '#fff', fontSize: 12,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.2s ease',
                  opacity: 0.7,
                }}
                onMouseEnter={e => {
                  (e.target as HTMLElement).style.transform = 'scale(1.1)';
                  (e.target as HTMLElement).style.opacity = '1';
                }}
                onMouseLeave={e => {
                  (e.target as HTMLElement).style.transform = 'scale(1)';
                  (e.target as HTMLElement).style.opacity = '0.7';
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {displayedRecipes.length === 0 && !isFilterLoading && (
        <div style={{
          textAlign: 'center', padding: 60, color: '#9CA3AF', fontSize: 14,
        }}>
          {showFavoritesOnly ? '暂无收藏的食谱' : '暂无食谱，点击上方按钮添加'}
        </div>
      )}

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
                ...inputStyle,
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
            <select
              value={formCuisine}
              onChange={e => setFormCuisine(e.target.value as Recipe['cuisine'])}
              style={selectStyle}
              onFocus={e => {
                (e.target as HTMLElement).style.borderColor = '#F97316';
                (e.target as HTMLElement).style.transform = 'scale(1.02)';
              }}
              onBlur={e => {
                (e.target as HTMLElement).style.borderColor = '#ddd';
                (e.target as HTMLElement).style.transform = 'scale(1)';
              }}
            >
              <option value="中餐">中餐</option>
              <option value="西餐">西餐</option>
              <option value="日料">日料</option>
              <option value="其他">其他</option>
            </select>
            <div style={{ margin: '0 0 16px 0' }}>
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
