import { useState, useMemo } from 'react';
import { FridgeItem, Recipe } from '../utils/api';

interface FridgePageProps {
  fridge: FridgeItem[];
  recipes: Recipe[];
  onAddItem: (name: string, quantity: string) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onRecipeClick: (recipe: Recipe) => void;
}

interface MatchedRecipe {
  recipe: Recipe;
  matchPercent: number;
  matchedIngredients: string[];
  missingIngredients: string[];
}

export default function FridgePage({
  fridge,
  recipes,
  onAddItem,
  onDeleteItem,
  onRecipeClick,
}: FridgePageProps) {
  const [newName, setNewName] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fridgeIngredientNames = useMemo(() => {
    return new Set(fridge.map((item) => item.name));
  }, [fridge]);

  const matchedRecipes = useMemo((): MatchedRecipe[] => {
    return recipes
      .map((recipe) => {
        const matched: string[] = [];
        const missing: string[] = [];

        recipe.ingredients.forEach((ing) => {
          if (fridgeIngredientNames.has(ing.name)) {
            matched.push(ing.name);
          } else {
            missing.push(ing.name);
          }
        });

        const matchPercent =
          recipe.ingredients.length > 0
            ? Math.round((matched.length / recipe.ingredients.length) * 100)
            : 0;

        return {
          recipe,
          matchPercent,
          matchedIngredients: matched,
          missingIngredients: missing,
        };
      })
      .filter((r) => r.matchPercent > 0)
      .sort((a, b) => b.matchPercent - a.matchPercent);
  }, [recipes, fridgeIngredientNames]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      await onAddItem(newName.trim(), newQuantity.trim() || '适量');
      setNewName('');
      setNewQuantity('');
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div className="fridge-container">
      <h1 className="page-title" style={{ marginTop: 0 }}>
        🧊 我的冰箱
      </h1>

      <div className="form-group">
        <label className="form-label">添加食材</label>
        <div className="fridge-add-form">
          <input
            type="text"
            placeholder="食材名称（如：鸡蛋）"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <input
            type="text"
            placeholder="数量（如：5个）"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="add-btn" onClick={handleAdd} disabled={isAdding}>
            + 添加
          </button>
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: 0 }}>
        当前食材
      </h2>
      {fridge.length === 0 ? (
        <div className="empty-state">
          冰箱里还没有食材，快来添加吧！
        </div>
      ) : (
        <div className="fridge-tags">
          {fridge.map((item) => (
            <span key={item.id} className="fridge-tag">
              {item.name}
              {item.quantity && `（${item.quantity}）`}
              <button
                className="fridge-tag-close"
                onClick={() => onDeleteItem(item.id)}
                aria-label="删除"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <h2 className="section-title">🍽 推荐菜谱（按匹配度排序）</h2>
      {matchedRecipes.length === 0 ? (
        <div className="empty-state">
          暂无匹配的菜谱，试试添加更多食材吧！
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {matchedRecipes.map(({ recipe, matchPercent, matchedIngredients }) => (
            <div
              key={recipe.id}
              className="recipe-card"
              style={{ cursor: 'pointer', flexDirection: 'row', minHeight: 120 }}
              onClick={() => onRecipeClick(recipe)}
            >
              <img
                style={{
                  width: 160,
                  height: 'auto',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
                src={recipe.coverImage}
                alt={recipe.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect fill="%23d4c9a8" width="160" height="120"/><text x="50%" y="50%" fill="%232e5c4a" font-size="36" text-anchor="middle" dominant-baseline="middle">🍳</text></svg>';
                }}
              />
              <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <h3 className="recipe-card-name" style={{ fontSize: 16 }}>
                      {recipe.name}
                    </h3>
                    <span className="match-percent">{matchPercent}%</span>
                  </div>
                  <div className="match-progress-bar">
                    <div
                      className="match-progress-fill"
                      style={{ width: `${matchPercent}%` }}
                    />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#7f8c8d', marginTop: 8 }}>
                  已有食材：{matchedIngredients.join('、') || '无'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
