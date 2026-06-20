import React, { useState, useEffect, useCallback } from 'react';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  initialStock: number;
  coverUrl: string;
}

const CATEGORIES = ['全部', '服装', '音乐', '配饰', '周边'];

const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filterCategory, setFilterCategory] = useState('全部');
  const [showDetail, setShowDetail] = useState<InventoryItem | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);
  const [stockAdjust, setStockAdjust] = useState(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      setInventory(data);
      setFadeKey(prev => prev + 1);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const filteredInventory = inventory.filter(item => {
    if (filterCategory === '全部') return true;
    return item.category === filterCategory;
  });

  const handleCategoryChange = (cat: string) => {
    setFilterCategory(cat);
    setFadeKey(prev => prev + 1);
  };

  const handleCardClick = (item: InventoryItem) => {
    setShowDetail(item);
    setStockAdjust(0);
  };

  const handleStockUpdate = async () => {
    if (!showDetail) return;
    const newStock = Math.max(0, showDetail.stock + stockAdjust);
    try {
      const res = await fetch(`/api/inventory/${showDetail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock })
      });
      await res.json();
      setShowDetail(null);
      fetchInventory();
    } catch (err) {
      console.error('Failed to update stock:', err);
    }
  };

  const getStockPercentage = (item: InventoryItem) => {
    if (item.initialStock === 0) return 0;
    return Math.round((item.stock / item.initialStock) * 100);
  };

  const isLowStock = (item: InventoryItem) => {
    return getStockPercentage(item) < 10;
  };

  const ProgressRing: React.FC<{ percentage: number; isLow: boolean; size?: number }> = ({
    percentage,
    isLow,
    size = 50
  }) => {
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <svg width={size} height={size} className={`progress-ring ${isLow ? 'low-stock blink' : ''}`}>
        <circle
          stroke="#e0e0e0"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={isLow ? '#FF6B6B' : '#4ECDC4'}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="12"
          fontWeight="600"
          fill={isLow ? '#FF6B6B' : '#333'}
        >
          {percentage}%
        </text>
      </svg>
    );
  };

  return (
    <div className="inventory-page">
      <div className="page-header">
        <h2 className="page-title">周边商品库存</h2>
      </div>

      <div className="filter-bar">
        <div className="filter-categories">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`filter-btn ${filterCategory === cat ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="inventory-masonry" key={fadeKey}>
        {filteredInventory.map((item, index) => {
          const percentage = getStockPercentage(item);
          const lowStock = isLowStock(item);
          return (
            <div
              key={item.id}
              className={`inventory-card fade-in ${lowStock ? 'low-stock-card' : ''}`}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => handleCardClick(item)}
            >
              <div className="card-cover">
                {item.coverUrl ? (
                  <img src={item.coverUrl} alt={item.name} />
                ) : (
                  <div className="cover-placeholder">
                    {item.category === '服装' && '👕'}
                    {item.category === '音乐' && '💿'}
                    {item.category === '配饰' && '✨'}
                    {item.category === '周边' && '🎁'}
                  </div>
                )}
              </div>
              <div className="card-body">
                <h3 className="item-name">{item.name}</h3>
                <p className="item-category">{item.category}</p>
                <div className="item-price">¥{item.price}</div>
              </div>
              <div className="card-stock">
                <div className="stock-info">
                  <span className="stock-label">库存</span>
                  <span className="stock-count">{item.stock}</span>
                </div>
                <ProgressRing percentage={percentage} isLow={lowStock} />
              </div>
            </div>
          );
        })}
      </div>

      {filteredInventory.length === 0 && (
        <div className="empty-state">
          <p>暂无商品数据</p>
        </div>
      )}

      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal-content detail-modal scale-in" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <h3 className="modal-title">{showDetail.name}</h3>
              <button className="close-btn" onClick={() => setShowDetail(null)}>×</button>
            </div>
            <div className="detail-content">
              <div className="detail-cover">
                {showDetail.coverUrl ? (
                  <img src={showDetail.coverUrl} alt={showDetail.name} />
                ) : (
                  <div className="cover-placeholder-large">
                    {showDetail.category === '服装' && '👕'}
                    {showDetail.category === '音乐' && '💿'}
                    {showDetail.category === '配饰' && '✨'}
                    {showDetail.category === '周边' && '🎁'}
                  </div>
                )}
              </div>
              <div className="detail-info">
                <div className="detail-row">
                  <span className="detail-label">分类</span>
                  <span className="detail-value">{showDetail.category}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">单价</span>
                  <span className="detail-value price">¥{showDetail.price}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">当前库存</span>
                  <span className="detail-value">{showDetail.stock} 件</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">初始库存</span>
                  <span className="detail-value">{showDetail.initialStock} 件</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">库存占比</span>
                  <span className={`detail-value ${isLowStock(showDetail) ? 'low' : ''}`}>
                    {getStockPercentage(showDetail)}%
                  </span>
                </div>

                <div className="stock-adjust-section">
                  <label className="adjust-label">调整库存</label>
                  <div className="adjust-controls">
                    <button
                      className="adjust-btn"
                      onClick={() => setStockAdjust(prev => prev - 1)}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={stockAdjust}
                      onChange={e => setStockAdjust(Number(e.target.value))}
                      className="adjust-input"
                    />
                    <button
                      className="adjust-btn"
                      onClick={() => setStockAdjust(prev => prev + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="adjust-preview">
                    调整后: {Math.max(0, showDetail.stock + stockAdjust)} 件
                  </div>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDetail(null)}>
                关闭
              </button>
              <button type="button" className="btn btn-primary" onClick={handleStockUpdate}>
                保存更改
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .inventory-page {
          background-color: #16213e;
          border-radius: 12px;
          padding: 24px;
        }

        .page-header {
          margin-bottom: 20px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: #e0e0e0;
        }

        .filter-bar {
          margin-bottom: 24px;
        }

        .filter-categories {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          background-color: #0f3460;
          color: #e0e0e0;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-btn:hover {
          filter: brightness(1.2);
        }

        .filter-btn.active {
          background-color: #4ECDC4;
          color: #fff;
        }

        .inventory-masonry {
          column-count: 4;
          column-gap: 16px;
        }

        @media (max-width: 1200px) {
          .inventory-masonry {
            column-count: 3;
          }
        }

        @media (max-width: 900px) {
          .inventory-masonry {
            column-count: 2;
          }
        }

        .inventory-card {
          width: 200px;
          background-color: #fff;
          border-radius: 8px;
          box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 16px;
          break-inside: avoid;
          opacity: 0;
          animation: fadeInUp 0.4s ease forwards;
          display: inline-block;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .inventory-card:hover {
          transform: translateY(-3px);
          box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.1), 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        .inventory-card.low-stock-card {
          border: 1px solid rgba(255, 107, 107, 0.3);
        }

        .card-cover {
          height: 150px;
          background-color: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .card-cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cover-placeholder {
          font-size: 48px;
        }

        .cover-placeholder-large {
          font-size: 80px;
        }

        .card-body {
          padding: 12px;
        }

        .item-name {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }

        .item-category {
          font-size: 12px;
          color: #888;
          margin-bottom: 8px;
        }

        .item-price {
          font-size: 18px;
          font-weight: 700;
          color: #FF6B6B;
        }

        .card-stock {
          padding: 12px;
          border-top: 1px solid #f0f0f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stock-info {
          display: flex;
          flex-direction: column;
        }

        .stock-label {
          font-size: 11px;
          color: #888;
        }

        .stock-count {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .progress-ring {
          transform: rotate(-90deg);
        }

        .progress-ring .blink {
          animation: ringBlink 1s ease-in-out infinite;
        }

        @keyframes ringBlink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .empty-state {
          text-align: center;
          padding: 60px;
          color: #888;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        .modal-content {
          background-color: #fff;
          border-radius: 12px;
          padding: 28px;
          width: 90%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .scale-in {
          animation: scaleIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .detail-modal .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 600;
          color: #1a1a2e;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #888;
          padding: 0 8px;
        }

        .close-btn:hover {
          color: #333;
        }

        .detail-content {
          display: flex;
          gap: 20px;
        }

        .detail-cover {
          width: 160px;
          height: 160px;
          background-color: #f5f5f5;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .detail-cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .detail-info {
          flex: 1;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .detail-label {
          font-size: 14px;
          color: #888;
        }

        .detail-value {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }

        .detail-value.price {
          color: #FF6B6B;
          font-weight: 700;
          font-size: 16px;
        }

        .detail-value.low {
          color: #FF6B6B;
          font-weight: 700;
        }

        .stock-adjust-section {
          margin-top: 20px;
          padding: 16px;
          background-color: #f9f9f9;
          border-radius: 8px;
        }

        .adjust-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #333;
          margin-bottom: 10px;
        }

        .adjust-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .adjust-btn {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          border: none;
          background-color: #4ECDC4;
          color: #fff;
          font-size: 18px;
          cursor: pointer;
          transition: filter 0.2s ease;
        }

        .adjust-btn:hover {
          filter: brightness(1.1);
        }

        .adjust-input {
          width: 80px;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          text-align: center;
        }

        .adjust-preview {
          margin-top: 10px;
          font-size: 13px;
          color: #666;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 20px;
        }

        .btn {
          padding: 10px 24px;
          border-radius: 6px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: filter 0.2s ease;
        }

        .btn:hover {
          filter: brightness(1.2);
        }

        .btn-primary {
          background-color: #4ECDC4;
          color: #fff;
        }

        .btn-secondary {
          background-color: #e0e0e0;
          color: #333;
        }

        @media (max-width: 768px) {
          .inventory-page {
            padding: 16px;
          }

          .page-title {
            font-size: 20px;
          }

          .inventory-masonry {
            column-count: 1;
          }

          .inventory-card {
            width: 100%;
          }

          .detail-content {
            flex-direction: column;
          }

          .detail-cover {
            width: 100%;
            height: 180px;
          }
        }
      `}</style>
    </div>
  );
};

export default InventoryPage;
