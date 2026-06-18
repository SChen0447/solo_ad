import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore, Recipe } from '../store/useStore';

interface Filters {
  maxCookTime: number | null;
  cuisine: string;
  difficulty: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
}

function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const { toggleFavorite, isFavorite } = useStore();
  const match = recipe.matchPercentage ?? 0;
  const lowMatch = match < 30;
  const fav = isFavorite(recipe.id);

  return (
    <div
      onClick={onClick}
      style={{
        background: lowMatch ? '#F3F4F6' : '#fff',
        borderRadius: 14,
        padding: 16,
        boxShadow: lowMatch ? 'none' : '0 4px 16px rgba(245, 158, 11, 0.12)',
        cursor: 'pointer',
        position: 'relative',
        opacity: lowMatch ? 0.6 : 1,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        if (!lowMatch) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.2)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = lowMatch ? 'none' : '0 4px 16px rgba(245, 158, 11, 0.12)';
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: match >= 80 ? '#10B981' : match >= 50 ? '#F59E0B' : '#EF4444',
          color: '#fff',
          padding: '4px 10px',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {match}%
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div
          style={{
            fontSize: 40,
            width: 56,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FFF7ED',
            borderRadius: 12,
          }}
        >
          {recipe.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: lowMatch ? '#6B7280' : '#1F2937',
            }}
          >
            {recipe.name}
          </h3>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
            {recipe.cuisine} · {recipe.difficulty} · {recipe.cookTime}分钟
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div
          style={{
            height: 6,
            background: '#F3F4F6',
            borderRadius: 3,
            overflow: 'hidden',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${match}%`,
              background: match >= 80 ? '#10B981' : match >= 50 ? '#F59E0B' : '#EF4444',
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {lowMatch && recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
          <div
            style={{
              fontSize: 12,
              color: '#EF4444',
              marginBottom: 10,
              lineHeight: 1.5,
            }}
          >
            缺少：{recipe.missingIngredients.slice(0, 3).join('、')}
            {recipe.missingIngredients.length > 3 ? '...' : ''}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(recipe);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: fav ? '2px solid #F59E0B' : '2px solid #E5E7EB',
              background: fav ? '#FEF3C7' : '#fff',
              color: fav ? '#D97706' : '#6B7280',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            {fav ? '★ 已收藏' : '☆ 收藏'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface FavoriteThumbProps {
  recipe: Recipe;
  onClick: () => void;
}

function FavoriteThumb({ recipe, onClick }: FavoriteThumbProps) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 110,
        height: 130,
        background: '#fff',
        borderRadius: 12,
        padding: 10,
        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)',
        cursor: 'pointer',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transition: 'transform 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div
        style={{
          fontSize: 36,
          marginTop: 8,
        }}
      >
        {recipe.icon}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#1F2937',
          marginTop: 8,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%',
        }}
      >
        {recipe.name}
      </div>
      <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 4, fontWeight: 600 }}>
        {recipe.matchPercentage ?? 0}%
      </div>
    </div>
  );
}

interface RecipeModalProps {
  recipe: Recipe;
  onClose: () => void;
}

function RecipeModal({ recipe, onClose }: RecipeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { toggleFavorite, isFavorite } = useStore();
  const fav = isFavorite(recipe.id);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        ref={modalRef}
        style={{
          background: '#fff',
          borderRadius: 18,
          width: '100%',
          maxWidth: 560,
          maxHeight: '85vh',
          overflow: 'auto',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: '#F3F4F6',
            cursor: 'pointer',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          ✕
        </button>

        <div style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div
              style={{
                fontSize: 56,
                width: 72,
                height: 72,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#FFF7ED',
                borderRadius: 16,
              }}
            >
              {recipe.icon}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 22, color: '#1F2937' }}>{recipe.name}</h2>
              <div style={{ color: '#6B7280', marginTop: 6, fontSize: 14 }}>
                {recipe.cuisine} · {recipe.difficulty} · {recipe.cookTime}分钟
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    background: '#FEF3C7',
                    color: '#D97706',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  匹配度 {recipe.matchPercentage ?? 0}%
                </span>
                <button
                  onClick={() => toggleFavorite(recipe)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 12,
                    border: fav ? '1px solid #F59E0B' : '1px solid #E5E7EB',
                    background: fav ? '#FEF3C7' : '#fff',
                    color: fav ? '#D97706' : '#6B7280',
                    fontSize: 13,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {fav ? '★ 已收藏' : '☆ 收藏'}
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', margin: '0 0 12px 0' }}>
              所需食材
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
              }}
            >
              {recipe.ingredients.map((ing, idx) => {
                const missing = recipe.missingIngredients?.includes(ing.name);
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      background: missing ? '#FEF2F2' : '#FFF7ED',
                      borderRadius: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 14,
                      color: missing ? '#DC2626' : '#374151',
                    }}
                  >
                    <span>{ing.name}</span>
                    <span style={{ fontWeight: 600 }}>
                      {ing.amount} {ing.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2933', margin: '0 0 12px 0' }}>
              烹饪步骤
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recipe.steps.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#F59E0B',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      paddingTop: 4,
                      fontSize: 14,
                      color: '#374151',
                      lineHeight: 1.6,
                    }}
                  >
                    {step}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RecommendPage() {
  const {
    inventory,
    recommendations,
    setRecommendations,
    favorites,
    selectedRecipe,
    setSelectedRecipe,
  } = useStore();

  const [filters, setFilters] = useState<Filters>({
    maxCookTime: null,
    cuisine: '全部',
    difficulty: '全部',
  });

  const debouncedFilters = useDebounce(filters, 200);
  const loadingRef = useRef(false);

  const fetchRecommendations = useCallback(async () => {
    loadingRef.current = true;
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory,
          filters: debouncedFilters,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      loadingRef.current = false;
    }
  }, [inventory, debouncedFilters, setRecommendations]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const displayedFavorites = favorites.slice(0, 6);

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1F2937' }}>
            菜谱推荐
          </h2>
          <span style={{ color: '#6B7280', fontSize: 14, marginTop: 6 }}>
            根据库存自动匹配最佳菜谱
          </span>
        </div>
      </div>

      {displayedFavorites.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, color: '#1F2937' }}>
              ⭐ 我的收藏
            </h3>
            <span style={{ color: '#9CA3AF', fontSize: 12 }}>
              {favorites.length > 6 ? `显示前6个，共${favorites.length}个` : ''}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              padding: '4px 2px 10px 2px',
              scrollbarWidth: 'thin',
            }}
          >
            {displayedFavorites.map((fav) => (
              <FavoriteThumb
                key={fav.id}
                recipe={fav}
                onClick={() => setSelectedRecipe(fav)}
              />
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          background: '#fff',
          padding: 16,
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)',
          marginBottom: 24,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>
            筛选：
          </label>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={filters.maxCookTime === 30}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                maxCookTime: e.target.checked ? 30 : null,
              }))
            }
            style={{ width: 16, height: 16, accentColor: '#F59E0B' }}
          />
          <span style={{ color: '#374151' }}>≤30分钟</span>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: '#374151' }}>菜系：</span>
          <select
            value={filters.cuisine}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, cuisine: e.target.value }))
            }
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #E5E7EB',
              background: '#fff',
              fontSize: 14,
              outline: 'none',
            }}
          >
            <option value="全部">全部</option>
            <option value="中餐">中餐</option>
            <option value="西餐">西餐</option>
            <option value="日料">日料</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: '#374151' }}>难度：</span>
          <select
            value={filters.difficulty}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, difficulty: e.target.value }))
            }
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #E5E7EB',
              background: '#fff',
              fontSize: 14,
              outline: 'none',
            }}
          >
            <option value="全部">全部</option>
            <option value="简单">简单</option>
            <option value="中等">中等</option>
            <option value="困难">困难</option>
          </select>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🍽️</div>
          <p style={{ fontSize: 16 }}>暂无匹配的菜谱</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
          }}
          className="recommend-grid"
        >
          {recommendations.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => setSelectedRecipe(recipe)}
            />
          ))}
        </div>
      )}

      {selectedRecipe && (
        <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
      )}

      <style>{`
        @media (max-width: 900px) {
          .recommend-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .recommend-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
