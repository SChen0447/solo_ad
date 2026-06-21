import { useState } from 'react';
import type { Ingredient } from '../App';

interface Props {
  ingredients: Ingredient[];
  onIngredientsChange: () => void;
}

function InventoryDashboard({ ingredients, onIngredientsChange }: Props) {
  const [refillIng, setRefillIng] = useState<Ingredient | null>(null);
  const [refillAmount, setRefillAmount] = useState<string>('');

  const handleOpenRefill = (ing: Ingredient) => {
    setRefillIng(ing);
    setRefillAmount('');
  };

  const handleRefill = async () => {
    if (!refillIng || !refillAmount || Number(refillAmount) <= 0) return;
    try {
      await fetch(`/api/ingredients/${refillIng.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: refillIng.stock + Number(refillAmount) }),
      });
      onIngredientsChange();
      setRefillIng(null);
      setRefillAmount('');
    } catch (err) {
      console.error('Failed to refill:', err);
    }
  };

  const getStockPercentage = (ing: Ingredient) => {
    if (ing.minStock === 0) return 100;
    return Math.min(100, Math.round((ing.stock / (ing.minStock * 2)) * 100));
  };

  const getStatusText = (ing: Ingredient) => {
    if (ing.stock <= 0) return <span className="text-danger">缺货</span>;
    if (ing.stock < ing.minStock) return <span className="text-warning">不足</span>;
    return <span className="text-success">正常</span>;
  };

  if (ingredients.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📦</div>
        <div className="empty-text">暂无库存数据</div>
      </div>
    );
  }

  return (
    <div className="inventory-table-wrapper">
      <table className="inventory-table">
        <thead>
          <tr>
            <th>食材</th>
            <th>当前库存</th>
            <th>预警量</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map(ing => {
            const isLow = ing.stock < ing.minStock;
            return (
              <tr key={ing.id} className={isLow ? 'low-stock' : ''}>
                <td>
                  <span className="ingredient-emoji">{ing.emoji}</span>
                  <strong>{ing.name}</strong>
                </td>
                <td>
                  <div className="stock-level">
                    <div className="stock-bar">
                      <div
                        className={`stock-bar-fill ${isLow ? 'low' : ''}`}
                        style={{ width: `${getStockPercentage(ing)}%` }}
                      />
                    </div>
                    <span style={{ fontWeight: 700 }}>
                      {ing.stock} {ing.unit}
                    </span>
                  </div>
                </td>
                <td style={{ color: '#666' }}>
                  {ing.minStock} {ing.unit}
                </td>
                <td>{getStatusText(ing)}</td>
                <td>
                  <div className="stock-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleOpenRefill(ing)}
                    >
                      补货
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {refillIng && (
        <div className="form-overlay" onClick={e => e.target === e.currentTarget && setRefillIng(null)}>
          <div className="form-modal refill-modal">
            <div className="form-title">
              补货 - {refillIng.emoji} {refillIng.name}
            </div>
            <div className="form-group">
              <label className="form-label">当前库存</label>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>
                {refillIng.stock} {refillIng.unit}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">补货数量（{refillIng.unit}）</label>
              <input
                className="form-input"
                type="number"
                min="1"
                value={refillAmount}
                onChange={e => setRefillAmount(e.target.value)}
                placeholder="请输入补货数量"
                autoFocus
              />
            </div>
            {refillAmount && Number(refillAmount) > 0 && (
              <div className="form-group" style={{ color: '#666', fontSize: 13 }}>
                补货后库存：<strong style={{ color: '#389e0d' }}>
                  {refillIng.stock + Number(refillAmount)} {refillIng.unit}
                </strong>
              </div>
            )}
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={() => setRefillIng(null)}>
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRefill}
                disabled={!refillAmount || Number(refillAmount) <= 0}
              >
                确认补货
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryDashboard;
