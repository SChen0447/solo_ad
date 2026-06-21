import { useState, useEffect, useCallback } from 'react';
import DishManager from './components/DishManager';
import InventoryDashboard from './components/InventoryDashboard';
import ReorderSuggestions from './components/ReorderSuggestions';

export interface DishIngredient {
  ingredientId: string;
  amount: number;
}

export interface Dish {
  id: string;
  name: string;
  price: number;
  ingredients: DishIngredient[];
  soldOut: boolean;
  manualSoldOut: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  emoji: string;
  stock: number;
  unit: string;
  minStock: number;
  price: number;
}

export interface ReorderSuggestion {
  id: string;
  name: string;
  emoji: string;
  currentStock: number;
  minStock: number;
  unit: string;
  unitPrice: number;
  reorderAmount: number;
  estimatedCost: number;
  shortage: number;
}

export interface ReorderData {
  suggestions: ReorderSuggestion[];
  totalEstimated: number;
}

function App() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  const fetchDishes = useCallback(async () => {
    try {
      const res = await fetch('/api/dishes');
      const data = await res.json();
      setDishes(data);
    } catch (err) {
      console.error('Failed to fetch dishes:', err);
    }
  }, []);

  const fetchIngredients = useCallback(async () => {
    try {
      const res = await fetch('/api/ingredients');
      const data = await res.json();
      setIngredients(data);
    } catch (err) {
      console.error('Failed to fetch ingredients:', err);
    }
  }, []);

  useEffect(() => {
    fetchDishes();
    fetchIngredients();
    const interval = setInterval(() => {
      fetchDishes();
      fetchIngredients();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchDishes, fetchIngredients]);

  const handleConsume = async (dishId: string) => {
    try {
      const res = await fetch('/api/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishId }),
      });
      if (res.ok) {
        const data = await res.json();
        setDishes(data.dishes);
        setIngredients(data.ingredients);
      } else {
        const err = await res.json();
        alert(err.error || '消耗失败');
      }
    } catch (err) {
      console.error('Failed to consume:', err);
    }
  };

  const handleRefreshAll = () => {
    fetchDishes();
    fetchIngredients();
  };

  return (
    <>
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'all' || activeTab === 'dishes' ? 'active' : ''}`}
          onClick={() => setActiveTab('dishes')}
        >
          🍽️ 菜品管理
        </button>
        <button
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          📦 库存看板
        </button>
        <button
          className={`tab-btn ${activeTab === 'reorder' ? 'active' : ''}`}
          onClick={() => setActiveTab('reorder')}
        >
          🛒 采购建议
        </button>
      </div>

      <div className="app-container">
        <div className={`panel ${activeTab === 'all' || activeTab === 'dishes' ? 'active' : ''}`}>
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-icon">🍽️</span>
              菜品管理
            </div>
          </div>
          <div className="panel-body">
            <DishManager
              dishes={dishes}
              ingredients={ingredients}
              onDishesChange={fetchDishes}
              onConsume={handleConsume}
            />
          </div>
        </div>

        <div className={`panel ${activeTab === 'all' || activeTab === 'inventory' ? 'active' : ''}`}>
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-icon">📦</span>
              实时库存看板
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleRefreshAll}>
              🔄 刷新
            </button>
          </div>
          <div className="panel-body">
            <InventoryDashboard
              ingredients={ingredients}
              onIngredientsChange={fetchIngredients}
            />
          </div>
        </div>

        <div className={`panel ${activeTab === 'all' || activeTab === 'reorder' ? 'active' : ''}`}>
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-icon">🛒</span>
              采购建议
            </div>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column' }}>
            <ReorderSuggestions ingredients={ingredients} />
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
