import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';

interface InventoryPageProps {
  isMobile: boolean;
}

const CATEGORIES = ['全部', '服装', '音乐', '周边'];

const InventoryPage: React.FC<InventoryPageProps> = ({ isMobile }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [filterCategory, setFilterCategory] = useState('全部');
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState(0);
  const [newItem, setNewItem] = useState({
    name: '',
    category: '服装',
    price: 0,
    stock: 0,
    coverUrl: ''
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    filterInventory();
  }, [inventory, filterCategory]);

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/inventory');
      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    }
  };

  const filterInventory = () => {
    let result = [...inventory];
    if (filterCategory !== '全部') {
      result = result.filter(item => item.category === filterCategory);
    }
    setFilteredInventory(result);
  };

  const getStockPercentage = (item: InventoryItem) => {
    if (item.initialStock <= 0) return 0;
    return Math.min(100, Math.round((item.stock / item.initialStock) * 100));
  };

  const isLowStock = (item: InventoryItem) => {
    return getStockPercentage(item) < 10;
  };

  const CircularProgress: React.FC<{ percentage: number; isLow: boolean; size?: number }> = ({
    percentage,
    isLow,
    size = 60
  }) => {
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    const color = isLow ? '#FF6B6B' : '#4ECDC4';

    return (
      <svg width={size} height={size} className={isLow ? 'low-stock-blink' : ''}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2a3a5c"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={isLow ? '#FF6B6B' : '#e0e0e0'}
          fontSize="14"
          fontWeight="bold"
        >
          {percentage}%
        </text>
      </svg>
    );
  };

  const handleCardClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setStockAdjustment(0);
    setShowModal(true);
  };

  const handleStockUpdate = async () => {
    if (!selectedItem) return;
    try {
      const newStock = Math.max(0, selectedItem.stock + stockAdjustment);
      await fetch(`/api/inventory/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock: newStock,
          initialStock: selectedItem.initialStock || selectedItem.stock
        })
      });
      fetchInventory();
      setShowModal(false);
    } catch (error) {
      console.error('Failed to update stock:', error);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          initialStock: newItem.stock
        })
      });
      fetchInventory();
      setShowAddModal(false);
      setNewItem({
        name: '',
        category: '服装',
        price: 0,
        stock: 0,
        coverUrl: ''
      });
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const cardWidth = isMobile ? '100%' : '200px';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>📦 库存管理</h2>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#533483',
            color: 'white',
            fontWeight: '500'
          }}
        >
          + 添加商品
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            style={{
              padding: '8px 16px',
              backgroundColor: filterCategory === cat ? '#533483' : '#16213e',
              color: 'white',
              border: filterCategory === cat ? '2px solid #a855f7' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px',
        alignItems: 'flex-start'
      }}>
        {filteredInventory.map(item => {
          const percentage = getStockPercentage(item);
          const lowStock = isLowStock(item);

          return (
            <div
              key={item.id}
              onClick={() => handleCardClick(item)}
              className={lowStock ? 'low-stock-blink' : ''}
              style={{
                width: cardWidth,
                backgroundColor: '#16213e',
                borderRadius: '8px',
                boxShadow: 'inset 0 0 4px rgba(0,0,0,0.3)',
                padding: '16px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {item.coverUrl && (
                <div style={{ width: '100%', height: '150px', marginBottom: '12px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#1a1a2e' }}>
                  <img
                    src={item.coverUrl}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '8px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  backgroundColor: '#45B7D1',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  {item.category}
                </span>
              </div>

              <h3 style={{
                fontSize: '16px',
                fontWeight: 'bold',
                marginBottom: '4px',
                color: '#e0e0e0'
              }}>
                {item.name}
              </h3>

              <div style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#4ECDC4',
                marginBottom: '12px'
              }}>
                ¥{item.price}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '13px', color: '#a0a0c0' }}>
                  库存: {item.stock}件
                </div>
                <CircularProgress percentage={percentage} isLow={lowStock} size={50} />
              </div>

              {lowStock && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  backgroundColor: '#FF6B6B',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}>
                  库存不足
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && selectedItem && (
        <>
          <div
            onClick={() => setShowModal(false)}
            className="fade-in"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 2000
            }}
          />
          <div
            className="scale-in"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#16213e',
              color: '#e0e0e0',
              padding: '30px',
              borderRadius: '12px',
              width: isMobile ? '90%' : '400px',
              zIndex: 2001,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
              {selectedItem.name}
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#a0a0c0' }}>分类</span>
                <span>{selectedItem.category}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#a0a0c0' }}>单价</span>
                <span style={{ color: '#4ECDC4', fontWeight: 'bold' }}>¥{selectedItem.price}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#a0a0c0' }}>当前库存</span>
                <span style={{ fontWeight: 'bold' }}>{selectedItem.stock}件</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#a0a0c0' }}>初始库存</span>
                <span>{selectedItem.initialStock || selectedItem.stock}件</span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500' }}>
                调整库存数量
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setStockAdjustment(prev => prev - 1)}
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#FF6B6B',
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: 'bold'
                  }}
                >
                  -
                </button>
                <div style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: stockAdjustment >= 0 ? '#4ECDC4' : '#FF6B6B'
                }}>
                  {stockAdjustment >= 0 ? '+' : ''}{stockAdjustment}
                </div>
                <button
                  type="button"
                  onClick={() => setStockAdjustment(prev => prev + 1)}
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#4ECDC4',
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: 'bold'
                  }}
                >
                  +
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: '8px', color: '#a0a0c0', fontSize: '14px' }}>
                调整后: {Math.max(0, selectedItem.stock + stockAdjustment)}件
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#2a3a5c',
                  color: 'white',
                  fontWeight: '500'
                }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleStockUpdate}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#533483',
                  color: 'white',
                  fontWeight: '500'
                }}
              >
                确认调整
              </button>
            </div>
          </div>
        </>
      )}

      {showAddModal && (
        <>
          <div
            onClick={() => setShowAddModal(false)}
            className="fade-in"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 2000
            }}
          />
          <div
            className="scale-in"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              color: '#1a1a2e',
              padding: '30px',
              borderRadius: '12px',
              width: isMobile ? '90%' : '450px',
              maxHeight: '90vh',
              overflowY: 'auto',
              zIndex: 2001,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#1a1a2e' }}>
              添加商品
            </h3>
            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>商品名称 *</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  required
                  style={{ width: '100%', backgroundColor: '#f5f5f5', color: '#1a1a2e', border: '1px solid #ddd' }}
                  placeholder="例如：巡演T恤"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>分类 *</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    required
                    style={{ width: '100%', backgroundColor: '#f5f5f5', color: '#1a1a2e', border: '1px solid #ddd' }}
                  >
                    {CATEGORIES.filter(c => c !== '全部').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>单价 (元) *</label>
                  <input
                    type="number"
                    value={newItem.price || ''}
                    onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                    required
                    min="0"
                    step="0.01"
                    style={{ width: '100%', backgroundColor: '#f5f5f5', color: '#1a1a2e', border: '1px solid #ddd' }}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>库存数量 *</label>
                <input
                  type="number"
                  value={newItem.stock || ''}
                  onChange={(e) => setNewItem({ ...newItem, stock: parseInt(e.target.value) || 0 })}
                  required
                  min="0"
                  style={{ width: '100%', backgroundColor: '#f5f5f5', color: '#1a1a2e', border: '1px solid #ddd' }}
                  placeholder="0"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>封面图片URL</label>
                <input
                  type="url"
                  value={newItem.coverUrl}
                  onChange={(e) => setNewItem({ ...newItem, coverUrl: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#f5f5f5', color: '#1a1a2e', border: '1px solid #ddd' }}
                  placeholder="https://..."
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#e0e0e0',
                    color: '#333',
                    fontWeight: '500'
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#533483',
                    color: 'white',
                    fontWeight: '500'
                  }}
                >
                  添加
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default InventoryPage;
