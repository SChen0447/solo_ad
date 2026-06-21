import React, { useState } from 'react';
import RecipeManager from './RecipeManager';
import MealPlanner from './MealPlanner';
import { Recipe, getIngredientCalories, estimateCalories } from './RecipeData';

const CUISINE_ICON_LARGE: Record<string, React.ReactNode> = {
  '中餐': <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 'bold' }}>中</div>,
  '西餐': <div style={{ width: 40, height: 40, borderRadius: 6, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 'bold' }}>西</div>,
  '日料': <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F43F5E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 'bold' }}>日</div>,
  '其他': <div style={{ width: 40, height: 40, borderRadius: 6, background: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 'bold' }}>他</div>,
};

export default function App() {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setPanelOpen(true);
  };

  const handleClosePanel = () => {
    setPanelOpen(false);
    setTimeout(() => setSelectedRecipe(null), 300);
  };

  const calories = selectedRecipe ? estimateCalories(selectedRecipe.ingredients) : 0;

  return (
    <div style={{
      minHeight: '100vh', background: '#FFF5E6',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '24px 32px', position: 'relative',
    }}>
      <h1 style={{
        fontSize: 28, color: '#B45309', marginBottom: 8,
        background: 'linear-gradient(135deg, #D97706, #F97316)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        fontWeight: 'bold',
      }}>
        🍳 食谱收藏与智能餐单
      </h1>
      <p style={{ color: '#92400E', fontSize: 14, marginBottom: 24 }}>
        管理你的食谱收藏，根据冰箱食材智能生成三天餐单
      </p>

      <div style={{ marginBottom: 24 }}>
        <RecipeManager onSelectRecipe={handleSelectRecipe} refreshKey={refreshKey} />
      </div>

      <div style={{ borderTop: '1px solid #FDE68A', paddingTop: 24 }}>
        <h2 style={{ fontSize: 22, color: '#B45309', marginBottom: 8 }}>📅 智能餐单计划</h2>
        <MealPlanner />
      </div>

      {selectedRecipe && (
        <>
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.3)', zIndex: 999,
              opacity: panelOpen ? 1 : 0,
              transition: 'opacity 0.3s ease',
              pointerEvents: panelOpen ? 'auto' : 'none',
            }}
            onClick={handleClosePanel}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 400, background: '#FFF8E7', zIndex: 1000,
            boxShadow: '-4px 0 16px rgba(0,0,0,0.1)',
            padding: 32, boxSizing: 'border-box',
            transform: panelOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s ease-out',
            overflowY: 'auto',
          }}>
            <button
              onClick={handleClosePanel}
              style={{
                position: 'absolute', top: 16, right: 16,
                width: 24, height: 24, borderRadius: '50%', border: 'none',
                background: 'transparent', color: '#666', fontSize: 18,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >×</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              {CUISINE_ICON_LARGE[selectedRecipe.cuisine]}
              <h2 style={{ fontSize: 24, color: '#333', margin: 0 }}>{selectedRecipe.name}</h2>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, color: '#666', marginBottom: 8 }}>所需食材</h3>
              {selectedRecipe.ingredients.map((ing, idx) => {
                const info = getIngredientCalories(ing);
                return (
                  <div key={idx} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: '1px solid #FDE68A',
                    fontSize: 14, color: '#444',
                  }}>
                    <span>{ing}</span>
                    <span style={{ color: '#999' }}>{info.amount}</span>
                  </div>
                );
              })}
            </div>

            <div style={{
              padding: 16, borderRadius: 12, background: '#F0FDF4',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: 14, color: '#666' }}>热量估计</span>
              <div style={{ fontSize: 28, color: '#16A34A', fontWeight: 'bold', marginTop: 4 }}>
                约{calories}千卡
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
