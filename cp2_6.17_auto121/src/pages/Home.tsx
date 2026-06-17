import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Plus, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RecipeCard from '@/components/RecipeCard';
import FavoriteCarousel from '@/components/FavoriteCarousel';
import { useRecipeStore } from '@/store/recipeStore';

const DEBOUNCE_DELAY = 300; // 防抖延迟 0.3 秒

function Home() {
  const navigate = useNavigate();
  const recipes = useRecipeStore(state => state.recipes);
  const toggleFavorite = useRecipeStore(state => state.toggleFavorite);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const debounceTimerRef = useRef<number | null>(null);

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearDebounceTimer();
    debounceTimerRef.current = window.setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, DEBOUNCE_DELAY);
    return clearDebounceTimer;
  }, [searchTerm, clearDebounceTimer]);

  useEffect(() => {
    return clearDebounceTimer;
  }, [clearDebounceTimer]);

  const filteredRecipes = useMemo(() => {
    if (!debouncedTerm.trim()) return recipes;
    const term = debouncedTerm.toLowerCase();
    return recipes.filter(r => {
      const titleMatch = r.title.toLowerCase().includes(term);
      const ingredientMatch = r.ingredients.some(ing =>
        ing.name.toLowerCase().includes(term)
      );
      return titleMatch || ingredientMatch;
    });
  }, [recipes, debouncedTerm]);

  const favorites = useMemo(() => {
    return recipes.filter(r => r.isFavorite);
  }, [recipes]);

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(id);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: 60,
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 20px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ width: '100%', maxWidth: 1100, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <BookOpen size={24} color="#3b82f6" />
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>菜谱活页夹</span>
          </div>

          <div style={{ flex: 1, maxWidth: 480, margin: '0 auto', position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
              }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="搜索食谱或食材..."
              style={{
                width: '100%',
                padding: '10px 16px 10px 40px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                fontSize: 14,
                color: '#1f2937',
                outline: 'none',
                background: '#f9fafb',
                transition: 'all 0.2s',
              }}
              onFocus={e => {
                (e.target as HTMLInputElement).style.borderColor = '#3b82f6';
                (e.target as HTMLInputElement).style.background = '#fff';
              }}
              onBlur={e => {
                (e.target as HTMLInputElement).style.borderColor = '#e5e7eb';
                (e.target as HTMLInputElement).style.background = '#f9fafb';
              }}
            />
          </div>

          <div style={{ width: 100, flexShrink: 0 }} />
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 80px' }}>
        {favorites.length > 0 && (
          <FavoriteCarousel favorites={favorites} />
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1f2937' }}>
            全部食谱
            <span style={{ fontSize: 14, color: '#9ca3af', fontWeight: 400, marginLeft: 8 }}>
              ({filteredRecipes.length})
            </span>
          </h2>
        </div>

        {filteredRecipes.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#9ca3af',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍳</div>
            <p style={{ fontSize: 16 }}>
              {debouncedTerm ? '没有找到匹配的食谱' : '还没有食谱，点击右下角 + 添加你的第一道食谱吧'}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, 240px)',
              gap: 20,
              justifyContent: 'center',
            }}
          >
            {filteredRecipes.map(recipe => (
              <RecipeCard
                key={recipe.id}
                id={recipe.id}
                title={recipe.title}
                image={recipe.image}
                time={recipe.cookingTime}
                isFavorite={recipe.isFavorite}
                onClick={() => navigate(`/recipe/${recipe.id}`)}
                onToggleFavorite={e => handleToggleFavorite(recipe.id, e)}
              />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => navigate('/add')}
        style={{
          position: 'fixed',
          right: 32,
          bottom: 32,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
          transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
          zIndex: 50,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(59,130,246,0.5)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(59,130,246,0.4)';
        }}
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export default Home;
