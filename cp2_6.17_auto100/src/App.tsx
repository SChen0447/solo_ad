import { useState, useEffect } from 'react';
import RecipeCard from './components/RecipeCard';
import RecipeDetail from './components/RecipeDetail';
import type { Recipe } from './types';

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipes();
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

  const handleCardClick = (id: string) => {
    setSelectedRecipeId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setSelectedRecipeId(null);
    fetchRecipes();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>
          </h1>
          {selectedRecipeId && (
            <button className="back-btn" onClick={handleBack}>
              ← 返回首页
            </button>
          )}
        </div>
      </header>

      <main className="main">
        {selectedRecipeId ? (
          <RecipeDetail recipeId={selectedRecipeId} />
        ) : (
          <>
            <h2 className="page-title">🍽️ 全部食谱</h2>
            {loading ? (
              <div className="loading">加载中...</div>
            ) : (
              <div className="recipes-grid">
                {recipes.map((recipe, idx) => (
                  <div key={recipe.id} style={{ animationDelay: `${idx * 0.05}s` }}>
                    <RecipeCard recipe={recipe} onClick={() => handleCardClick(recipe.id)} />
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
