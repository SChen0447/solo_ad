import { useState, useEffect, useCallback } from 'react';
import RecipeCard from './components/RecipeCard';
import RecipeDetail from './components/RecipeDetail';
import type { Recipe } from './types';

const USER_ID_KEY = 'recipe_community_user_id';

function generateUserId(): string {
  return 'user_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getOrCreateUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

type FilterType = 'all' | 'favorites';

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId] = useState<string>(getOrCreateUserId());
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchRecipes();
    fetchFavorites();
  }, []);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recipes');
      const data = await res.json();
      setRecipes(data);
    } catch (err) {
      console.error('加载食谱失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const res = await fetch(`/api/favorites?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      setFavoriteIds(data.recipeIds || []);
    } catch (err) {
      console.error('加载收藏失败:', err);
    }
  };

  const toggleFavorite = useCallback(
    async (recipeId: string): Promise<boolean> => {
      const isFavorite = favoriteIds.includes(recipeId);

      setFavoriteIds((prev) =>
        isFavorite ? prev.filter((id) => id !== recipeId) : [...prev, recipeId]
      );

      try {
        if (isFavorite) {
          const res = await fetch(`/api/favorites/${recipeId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          });
          if (!res.ok) {
            throw new Error('取消收藏失败');
          }
        } else {
          const res = await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, recipeId }),
          });
          if (!res.ok) {
            throw new Error('收藏失败');
          }
        }
        return true;
      } catch (err) {
        console.error('收藏操作失败:', err);
        setFavoriteIds((prev) =>
          isFavorite ? [...prev, recipeId] : prev.filter((id) => id !== recipeId)
        );
        return false;
      }
    },
    [favoriteIds, userId]
  );

  const handleCardClick = (id: string) => {
    setSelectedRecipeId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setSelectedRecipeId(null);
    fetchRecipes();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const displayRecipes =
    filter === 'favorites'
      ? recipes.filter((r) => favoriteIds.includes(r.id))
      : recipes;

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>🍳 微型食谱分享社区</h1>
          {selectedRecipeId && (
            <button className="back-btn" onClick={handleBack}>
              ← 返回首页
            </button>
          )}
        </div>
      </header>

      <main className="main">
        {selectedRecipeId ? (
          <RecipeDetail
            recipeId={selectedRecipeId}
            userId={userId}
            isFavorited={favoriteIds.includes(selectedRecipeId)}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          <>
            <div className="filter-bar">
              <button
                className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                全部食谱
              </button>
              <button
                className={`filter-tab ${filter === 'favorites' ? 'active' : ''}`}
                onClick={() => setFilter('favorites')}
              >
                ❤️ 我的收藏 ({favoriteIds.length})
              </button>
            </div>

            <h2 className="page-title">
              {filter === 'all' ? '🍽️ 全部食谱' : '❤️ 我的收藏'}
            </h2>

            {loading ? (
              <div className="loading">加载中...</div>
            ) : displayRecipes.length === 0 ? (
              <div className="empty-state">
                {filter === 'favorites'
                  ? '还没有收藏的食谱，快去收藏你喜欢的吧~'
                  : '暂无食谱'}
              </div>
            ) : (
              <div className="recipes-grid">
                {displayRecipes.map((recipe, idx) => (
                  <div key={recipe.id} style={{ animationDelay: `${idx * 0.05}s` }}>
                    <RecipeCard
                      recipe={recipe}
                      isFavorited={favoriteIds.includes(recipe.id)}
                      onClick={() => handleCardClick(recipe.id)}
                      onFavoriteClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(recipe.id);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
