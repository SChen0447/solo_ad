import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import RecipeHub from './RecipeHub';
import MealPlanner from './MealPlanner';
import type { Recipe, Page as PageType, DayOfWeek, MealSlot } from './types';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('recipes');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<Map<string, number | null>>(() => {
    const map = new Map<string, number | null>();
    DAYS.forEach((d) => SLOTS.forEach((s) => map.set(`${d}-${s}`, null)));
    return map;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/recipes');
        setRecipes(res.data.recipes || []);
      } catch (err) {
        console.error('加载食谱失败:', err);
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const addRecipe = useCallback(async (newRecipe: Omit<Recipe, 'id' | 'dominantColor'>) => {
    try {
      const res = await axios.post('/api/recipes', newRecipe);
      setRecipes((prev) => [...prev, res.data.recipe]);
      return res.data.recipe;
    } catch (err) {
      console.error('创建食谱失败:', err);
      return null;
    }
  }, []);

  const setMeal = useCallback((day: DayOfWeek, slot: MealSlot, recipeId: number | null) => {
    setMealPlan((prev) => {
      const next = new Map(prev);
      next.set(`${day}-${slot}`, recipeId);
      return next;
    });
  }, []);

  const swapMeals = useCallback((fromKey: string, toKey: string) => {
    setMealPlan((prev) => {
      const next = new Map(prev);
      const fromVal = next.get(fromKey);
      const toVal = next.get(toKey);
      next.set(fromKey, toVal);
      next.set(toKey, fromVal);
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '18px', color: '#666' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍳</div>
          <div>美食工坊加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>🍳</span>
          <div>
            <h1 style={titleStyle}>美食工坊</h1>
            <p style={subtitleStyle}>食谱分享 · 智能排餐 · 美好生活</p>
          </div>
        </div>
        <nav style={navStyle}>
          <button
            onClick={() => setCurrentPage('recipes')}
            style={{
              ...navBtnStyle,
              ...(currentPage === 'recipes' ? navBtnActiveStyle : {}),
            }}
          >
            📖 食谱中心
          </button>
          <button
            onClick={() => setCurrentPage('planner')}
            style={{
              ...navBtnStyle,
              ...(currentPage === 'planner' ? navBtnActiveStyle : {}),
            }}
          >
            📅 排餐计划
          </button>
        </nav>
      </header>

      <main style={{ flex: 1, padding: '24px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        {currentPage === 'recipes' ? (
          <RecipeHub recipes={recipes} addRecipe={addRecipe} />
        ) : (
          <MealPlanner
            recipes={recipes}
            mealPlan={mealPlan}
            setMeal={setMeal}
            swapMeals={swapMeals}
          />
        )}
      </main>

      <footer style={footerStyle}>
        <span>🍳 美食工坊 - 让每一餐都充满爱与美味</span>
      </footer>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 32px',
  background: 'linear-gradient(135deg, #fffaf0 0%, #fff0e6 100%)',
  borderBottom: '1px solid #ffe4d6',
  boxShadow: '0 2px 12px rgba(255, 127, 80, 0.08)',
  flexWrap: 'wrap',
  gap: '16px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#333',
  margin: 0,
  background: 'linear-gradient(135deg, #ff7f50, #e66a3d)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#999',
  margin: 0,
  marginTop: '2px',
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  background: '#fff',
  padding: '6px',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
};

const navBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: 'transparent',
  color: '#666',
  fontSize: '14px',
  fontWeight: 500,
  borderRadius: '8px',
  transition: 'all 0.2s ease',
};

const navBtnActiveStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #ff7f50, #e66a3d)',
  color: '#fff',
  boxShadow: '0 2px 8px rgba(255, 127, 80, 0.3)',
};

const footerStyle: React.CSSProperties = {
  padding: '16px 32px',
  textAlign: 'center',
  color: '#999',
  fontSize: '13px',
  borderTop: '1px solid #ffe4d6',
  background: '#fffaf0',
};

export default App;
