import { useState, useEffect, useCallback } from 'react';
import type { Recipe, RecommendedRecipe, RecipesResponse } from './types';
import IngredientInput from './IngredientInput';
import RecipeList from './RecipeList';
import RecommendResult from './RecommendResult';

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    backgroundColor: '#ff6f00',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    zIndex: 1000,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '22px',
    fontWeight: 'bold',
  },
  recommendBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '2px solid white',
    padding: '8px 20px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
  },
  mainContent: {
    paddingTop: '80px',
    paddingBottom: '40px',
    paddingLeft: '24px',
    paddingRight: '24px',
  },
  recommendSection: {
    backgroundColor: '#fff8e1',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '32px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
};

function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [allIngredients, setAllIngredients] = useState<string[]>([]);
  const [userIngredients, setUserIngredients] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedRecipe[]>([]);
  const [showRecommend, setShowRecommend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/recipes')
      .then((res) => res.json())
      .then((data: RecipesResponse) => {
        setRecipes(data.recipes);
        setAllIngredients(data.allIngredients);
      })
      .catch((err) => console.error('Failed to load recipes:', err));
  }, []);

  const addIngredient = useCallback((ingredient: string) => {
    const trimmed = ingredient.trim();
    if (trimmed && !userIngredients.includes(trimmed)) {
      setUserIngredients((prev) => [...prev, trimmed]);
    }
  }, [userIngredients]);

  const removeIngredient = useCallback((ingredient: string) => {
    setUserIngredients((prev) => prev.filter((i) => i !== ingredient));
  }, []);

  const toggleFavorite = useCallback((recipeId: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
  }, []);

  const handleRecommend = useCallback(async () => {
    if (userIngredients.length === 0) {
      alert('请先添加至少一种食材');
      return;
    }
    setIsLoading(true);
    setShowRecommend(true);
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: userIngredients }),
      });
      const data = await res.json();
      setRecommendations(data.recommendations);
    } catch (err) {
      console.error('Failed to get recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userIngredients]);

  const handleRecommendBtnHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.type === 'mouseenter') {
      (e.target as HTMLButtonElement).style.transform = 'scale(1.05)';
      (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.3)';
    } else {
      (e.target as HTMLButtonElement).style.transform = 'scale(1)';
      (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.2)';
    }
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerTitle}>
          <span style={{ fontSize: '28px' }}>🍳</span>
          <span>智能食谱推荐</span>
        </div>
        <button
          style={styles.recommendBtn}
          onClick={handleRecommend}
          onMouseEnter={handleRecommendBtnHover}
          onMouseLeave={handleRecommendBtnHover}
        >
          🔍 推荐菜谱
        </button>
      </header>

      <main style={styles.mainContent}>
        <section style={styles.recommendSection} className="fade-in">
          <div style={styles.sectionTitle}>
            <span>🥕</span>
            <span>输入手边食材，让我为你推荐菜谱</span>
          </div>
          <IngredientInput
            ingredients={allIngredients}
            userIngredients={userIngredients}
            onAdd={addIngredient}
            onRemove={removeIngredient}
            onRecommend={handleRecommend}
          />
        </section>

        {showRecommend && (
          <RecommendResult
            recommendations={recommendations}
            isLoading={isLoading}
            userIngredients={userIngredients}
            onFavoriteToggle={toggleFavorite}
            favorites={favorites}
          />
        )}

        <RecipeList
          recipes={recipes}
          favorites={favorites}
          onFavoriteToggle={toggleFavorite}
        />
      </main>
    </div>
  );
}

export default App;
