import { useState, useEffect } from 'react';
import InventoryPanel from './InventoryPanel';
import RecipeSuggestion from './RecipeSuggestion';
import NutritionDashboard from './NutritionDashboard';

export interface Ingredient {
  id: number;
  name: string;
  icon: string;
  color: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: string;
}

export interface UserIngredient extends Ingredient {
  user_ingredient_id: number;
  quantity: number;
  added_at: string;
}

export interface RecipeIngredient {
  id: number;
  ingredient_id: number;
  ingredient_name: string;
  ingredient_icon: string;
  ingredient_color: string;
  quantity: number;
  unit: string;
  is_available: number;
}

export interface Recipe {
  id: number;
  name: string;
  cook_time: number;
  difficulty: number;
  steps: string[];
  servings: number;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  ingredients: RecipeIngredient[];
  match_ratio: number;
  total_ingredients: number;
  matched_ingredients: number;
}

function App() {
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [userIngredients, setUserIngredients] = useState<UserIngredient[]>([]);
  const [recommendedRecipes, setRecommendedRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inventoryCollapsed, setInventoryCollapsed] = useState(false);

  useEffect(() => {
    fetchAllIngredients();
    fetchUserIngredients();
  }, []);

  const fetchAllIngredients = async () => {
    try {
      const res = await fetch('/api/ingredients');
      const data = await res.json();
      setAllIngredients(data.ingredients);
    } catch (error) {
      console.error('获取食材列表失败:', error);
    }
  };

  const fetchUserIngredients = async () => {
    try {
      const res = await fetch('/api/user/ingredients');
      const data = await res.json();
      setUserIngredients(data.ingredients);
    } catch (error) {
      console.error('获取用户食材失败:', error);
    }
  };

  const addIngredient = async (ingredientId: number) => {
    try {
      const res = await fetch('/api/user/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientId }),
      });
      const data = await res.json();
      setUserIngredients(data.ingredients);
    } catch (error) {
      console.error('添加食材失败:', error);
    }
  };

  const removeIngredient = async (ingredientId: number) => {
    try {
      const res = await fetch(`/api/user/ingredients/${ingredientId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      setUserIngredients(data.ingredients);
    } catch (error) {
      console.error('删除食材失败:', error);
    }
  };

  const resetInventory = async () => {
    if (!confirm('确定要重置所有库存吗？')) return;
    try {
      const res = await fetch('/api/user/ingredients', {
        method: 'DELETE',
      });
      const data = await res.json();
      setUserIngredients(data.ingredients);
      setRecommendedRecipes([]);
    } catch (error) {
      console.error('重置库存失败:', error);
    }
  };

  const getRecommendations = async () => {
    if (userIngredients.length === 0) {
      alert('请先添加一些食材！');
      return;
    }
    setIsLoading(true);
    try {
      const ingredientIds = userIngredients.map(ing => ing.id);
      const res = await fetch('/api/recipes/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientIds }),
      });
      const data = await res.json();
      setRecommendedRecipes(data.recipes);
    } catch (error) {
      console.error('获取推荐菜谱失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logMeal = async (recipe: Recipe, mealType: string, servings: number) => {
    try {
      await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId: recipe.id,
          mealType,
          servings,
          calories: recipe.calories_per_serving * servings,
          protein: recipe.protein_per_serving * servings,
          carbs: recipe.carbs_per_serving * servings,
          fat: recipe.fat_per_serving * servings,
        }),
      });
      return true;
    } catch (error) {
      console.error('记录餐食失败:', error);
      return false;
    }
  };

  return (
    <div style={styles.app}>
      <nav style={styles.navbar}>
        <div style={styles.navLeft}>
          <span style={styles.appTitle}>🍳 智能食谱与营养追踪</span>
        </div>
        <div style={styles.navRight}>
          <button className="btn-scale" style={styles.resetBtn} onClick={resetInventory}>
            🗑️ 重置库存
          </button>
        </div>
      </nav>

      <div className="main-content" style={styles.mainContent}>
        <div
          className="left-panel"
          style={{
            ...styles.leftPanel,
            width: inventoryCollapsed ? '60px' : 'calc(33.33% - 20px)',
            transition: 'width 0.3s ease',
          }}
        >
          <div
            style={styles.collapseBtn}
            onClick={() => setInventoryCollapsed(!inventoryCollapsed)}
          >
            {inventoryCollapsed ? '→' : '←'}
          </div>
          {!inventoryCollapsed && (
            <InventoryPanel
              allIngredients={allIngredients}
              userIngredients={userIngredients}
              onAddIngredient={addIngredient}
              onRemoveIngredient={removeIngredient}
            />
          )}
          {inventoryCollapsed && (
            <div style={styles.collapsedLabel}>食材库存</div>
          )}
        </div>

        <div className="right-panel" style={styles.rightPanel}>
          <RecipeSuggestion
            recipes={recommendedRecipes}
            isLoading={isLoading}
            onGetRecommendations={getRecommendations}
            onLogMeal={logMeal}
            userIngredientIds={userIngredients.map(i => i.id)}
          />
          <NutritionDashboard />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#F0F0F0',
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 30px',
    height: '60px',
    backgroundColor: '#2C2C2C',
    flexShrink: 0,
  },
  navLeft: {},
  navRight: {},
  appTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  resetBtn: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    padding: '30px 40px',
    gap: '40px',
    overflow: 'hidden',
    position: 'relative',
  },
  leftPanel: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: '15px',
    border: '1px solid #E0E0E0',
    overflow: 'hidden',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  collapseBtn: {
    position: 'absolute',
    right: '-12px',
    top: '20px',
    width: '24px',
    height: '24px',
    backgroundColor: '#F5A623',
    color: '#FFFFFF',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    zIndex: 10,
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    userSelect: 'none',
  },
  collapsedLabel: {
    writingMode: 'vertical-rl',
    textOrientation: 'mixed',
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#666666',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
    overflow: 'auto',
  },
};

export default App;
