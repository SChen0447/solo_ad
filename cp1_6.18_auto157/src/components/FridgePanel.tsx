import React, { useState, useCallback } from 'react';
import { useRecipeStore } from '../dataStore';
import RecipeCard from './RecipeCard';

const FridgePanel: React.FC = () => {
  const {
    fridgeItems,
    addFridgeItem,
    removeFridgeItem,
    updateFridgeItem,
    toggleUsedUp,
    getRecommendations,
  } = useRecipeStore();

  const [collapsed, setCollapsed] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [showRecommend, setShowRecommend] = useState(false);
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  const recommendations = showRecommend ? getRecommendations() : [];

  const handleAdd = useCallback(() => {
    if (!newName.trim()) return;
    addFridgeItem({
      name: newName.trim(),
      quantity: parseFloat(newQty) || 1,
      unit: newUnit.trim() || '个',
      usedUp: false,
    });
    setNewName('');
    setNewQty('');
    setNewUnit('');
  }, [newName, newQty, newUnit, addFridgeItem]);

  const handleQtyChange = useCallback(
    (id: string, delta: number) => {
      const item = fridgeItems.find((f) => f.id === id);
      if (!item) return;
      const newQ = Math.max(0, item.quantity + delta);
      if (newQ === 0) {
        removeFridgeItem(id);
      } else {
        updateFridgeItem(id, { quantity: newQ });
      }
      setAnimatingId(id);
      setTimeout(() => setAnimatingId(null), 300);
    },
    [fridgeItems, removeFridgeItem, updateFridgeItem]
  );

  const handleRecommend = useCallback(() => {
    setShowRecommend((prev) => !prev);
  }, []);

  const activeItems = fridgeItems.filter((f) => !f.usedUp);
  const usedUpItems = fridgeItems.filter((f) => f.usedUp);

  return (
    <div className={`fridge-panel ${collapsed ? 'fridge-panel--collapsed' : ''}`}>
      <button className="fridge-panel__toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? '◀ 冰箱' : '▶ 收起'}
      </button>

      {!collapsed && (
        <div className="fridge-panel__content">
          <h3 className="fridge-panel__title">🧊 我的冰箱</h3>

          <div className="fridge-panel__add-row">
            <input
              className="fridge-panel__input fridge-panel__input--name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="食材名称"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <input
              className="fridge-panel__input fridge-panel__input--qty"
              type="number"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder="数量"
            />
            <input
              className="fridge-panel__input fridge-panel__input--unit"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="单位"
            />
            <button className="fridge-panel__add-btn" onClick={handleAdd}>
              +
            </button>
          </div>

          <div className="fridge-panel__list">
            {activeItems.map((item) => (
              <div
                key={item.id}
                className={`fridge-panel__item ${animatingId === item.id ? 'fridge-panel__item--bounce' : ''}`}
              >
                <div className="fridge-panel__item-info">
                  <span className="fridge-panel__item-name">{item.name}</span>
                  <div className="fridge-panel__qty-control">
                    <button
                      className="fridge-panel__qty-btn"
                      onClick={() => handleQtyChange(item.id, -1)}
                    >
                      −
                    </button>
                    <span className="fridge-panel__qty-value">
                      {item.quantity} {item.unit}
                    </span>
                    <button
                      className="fridge-panel__qty-btn"
                      onClick={() => handleQtyChange(item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="fridge-panel__item-actions">
                  <button
                    className="fridge-panel__used-btn"
                    onClick={() => toggleUsedUp(item.id)}
                    title="标记用完"
                  >
                    🏷️
                  </button>
                  <button
                    className="fridge-panel__del-btn"
                    onClick={() => removeFridgeItem(item.id)}
                    title="删除"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            {usedUpItems.length > 0 && (
              <>
                <div className="fridge-panel__divider">已用完</div>
                {usedUpItems.map((item) => (
                  <div key={item.id} className="fridge-panel__item fridge-panel__item--used">
                    <span className="fridge-panel__item-name">{item.name}</span>
                    <div className="fridge-panel__item-actions">
                      <button
                        className="fridge-panel__restore-btn"
                        onClick={() => toggleUsedUp(item.id)}
                      >
                        恢复
                      </button>
                      <button
                        className="fridge-panel__del-btn"
                        onClick={() => removeFridgeItem(item.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {fridgeItems.length === 0 && (
              <div className="fridge-panel__empty">冰箱空空如也~</div>
            )}
          </div>

          <button
            className={`fridge-panel__recommend-btn ${showRecommend ? 'fridge-panel__recommend-btn--active' : ''}`}
            onClick={handleRecommend}
          >
            🔥 推荐菜谱
          </button>

          {showRecommend && (
            <div className="fridge-panel__recommendations">
              {recommendations.length === 0 ? (
                <div className="fridge-panel__recommend-empty">
                  没有匹配的菜谱，请添加更多食材
                </div>
              ) : (
                recommendations.map((rec) => (
                  <div key={rec.recipe.id} className="fridge-panel__recommend-item">
                    <RecipeCard recipe={rec.recipe} isRecommended />
                    <div className="fridge-panel__coverage">
                      匹配度 {Math.round(rec.coverage * 100)}%
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        .fridge-panel {
          width: 20%;
          min-width: 240px;
          max-width: 320px;
          background: #fff;
          border-left: 1px solid #E8E0D0;
          display: flex;
          flex-direction: column;
          transition: width 0.3s ease, min-width 0.3s ease;
          overflow: hidden;
        }
        .fridge-panel--collapsed {
          width: 48px;
          min-width: 48px;
          max-width: 48px;
        }
        .fridge-panel__toggle {
          padding: 10px;
          background: #FDF0E6;
          border: none;
          border-bottom: 1px solid #E8E0D0;
          cursor: pointer;
          font-size: 13px;
          color: #C87A5A;
          font-weight: 600;
          transition: background 0.15s;
        }
        .fridge-panel__toggle:hover {
          background: #F5DCC8;
        }
        .fridge-panel__content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .fridge-panel__title {
          font-size: 18px;
          font-weight: 700;
          color: #2D2D2D;
        }
        .fridge-panel__add-row {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .fridge-panel__input {
          padding: 8px 10px;
          border: 1.5px solid #E0D8C8;
          border-radius: 6px;
          font-size: 13px;
          outline: none;
          background: #FDFBF7;
        }
        .fridge-panel__input:focus {
          border-color: #C87A5A;
        }
        .fridge-panel__input--name { flex: 1; min-width: 80px; }
        .fridge-panel__input--qty { width: 50px; }
        .fridge-panel__input--unit { width: 45px; }
        .fridge-panel__add-btn {
          width: 34px;
          height: 34px;
          border: none;
          background: #C87A5A;
          color: #fff;
          border-radius: 6px;
          font-size: 18px;
          cursor: pointer;
          transition: transform 0.1s, background 0.15s;
          flex-shrink: 0;
        }
        .fridge-panel__add-btn:hover {
          background: #B06A4A;
          transform: scale(1.05);
        }
        .fridge-panel__add-btn:active {
          transform: scale(1);
        }
        .fridge-panel__list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .fridge-panel__item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          background: #FDFBF7;
          border-radius: 6px;
          border: 1px solid #F0E8D8;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .fridge-panel__item--bounce {
          animation: bounceScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes bounceScale {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        .fridge-panel__item--used {
          opacity: 0.5;
          background: #F5F0E0;
        }
        .fridge-panel__item--used .fridge-panel__item-name {
          text-decoration: line-through;
          color: #999;
        }
        .fridge-panel__item-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .fridge-panel__item-name {
          font-size: 14px;
          font-weight: 500;
          color: #2D2D2D;
        }
        .fridge-panel__qty-control {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .fridge-panel__qty-btn {
          width: 24px;
          height: 24px;
          border: 1px solid #E0D8C8;
          background: #fff;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
          color: #C87A5A;
        }
        .fridge-panel__qty-btn:hover {
          background: #FDF0E6;
        }
        .fridge-panel__qty-value {
          font-size: 12px;
          color: #888;
          min-width: 40px;
          text-align: center;
        }
        .fridge-panel__item-actions {
          display: flex;
          gap: 4px;
        }
        .fridge-panel__used-btn,
        .fridge-panel__restore-btn,
        .fridge-panel__del-btn {
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 13px;
          padding: 4px;
          border-radius: 4px;
          transition: background 0.15s;
        }
        .fridge-panel__used-btn:hover,
        .fridge-panel__restore-btn:hover {
          background: #FDF0E6;
        }
        .fridge-panel__del-btn:hover {
          background: #FDE8E0;
          color: #C87A5A;
        }
        .fridge-panel__restore-btn {
          font-size: 12px;
          color: #6B8E23;
        }
        .fridge-panel__divider {
          font-size: 11px;
          color: #bbb;
          padding: 4px 0;
          border-top: 1px dashed #E0D8C8;
          margin-top: 4px;
        }
        .fridge-panel__empty {
          text-align: center;
          color: #bbb;
          font-size: 13px;
          padding: 20px 0;
        }
        .fridge-panel__recommend-btn {
          padding: 12px 20px;
          background: linear-gradient(135deg, #D4A017, #F0A500);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.1s, box-shadow 0.15s;
          box-shadow: 0 2px 8px rgba(212,160,23,0.3);
        }
        .fridge-panel__recommend-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 14px rgba(212,160,23,0.4);
        }
        .fridge-panel__recommend-btn:active {
          transform: scale(1);
        }
        .fridge-panel__recommend-btn--active {
          background: linear-gradient(135deg, #B08800, #C89500);
        }
        .fridge-panel__recommendations {
          display: flex;
          flex-direction: column;
          gap: 10px;
          animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fridge-panel__recommend-item {
          position: relative;
        }
        .fridge-panel__coverage {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(212,160,23,0.9);
          color: #fff;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 600;
        }
        .fridge-panel__recommend-empty {
          text-align: center;
          color: #999;
          font-size: 13px;
          padding: 16px 0;
        }
      `}</style>
    </div>
  );
};

export default FridgePanel;
