import { useState, useEffect, useRef } from 'react';
import type { RentalItem } from '@/types';
import './styles/InventoryBoard.css';

interface InventoryBoardProps {
  items: RentalItem[];
  onItemsUpdated: () => void;
}

function InventoryBoard({ items, onItemsUpdated }: InventoryBoardProps) {
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    pollRef.current = setInterval(() => {
      setLoading(true);
      onItemsUpdated();
      setTimeout(() => setLoading(false), 300);
    }, 10000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [onItemsUpdated]);

  const getStatusColor = (available: number) => {
    if (available === 0) return '#EF4444';
    if (available < 5) return '#FACC15';
    return '#22C55E';
  };

  const getStatusText = (available: number) => {
    if (available === 0) return '缺货';
    if (available < 5) return '低库存';
    return '充足';
  };

  const SkeletonCard = () => (
    <div className="inventory-card skeleton">
      <div className="skeleton-line skeleton-title pulse"></div>
      <div className="skeleton-stats">
        <div className="skeleton-stat">
          <div className="skeleton-line skeleton-stat-num pulse"></div>
          <div className="skeleton-line skeleton-stat-label pulse"></div>
        </div>
        <div className="skeleton-stat">
          <div className="skeleton-line skeleton-stat-num pulse"></div>
          <div className="skeleton-line skeleton-stat-label pulse"></div>
        </div>
        <div className="skeleton-stat">
          <div className="skeleton-line skeleton-stat-num pulse"></div>
          <div className="skeleton-line skeleton-stat-label pulse"></div>
        </div>
      </div>
      <div className="skeleton-line skeleton-bottom pulse"></div>
    </div>
  );

  return (
    <div className="inventory-board-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">库存看板</h1>
          <p className="page-subtitle">实时监控租赁物品库存状态（每10秒自动刷新）</p>
        </div>
        <div className="status-legend">
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#22C55E' }}></span>
            <span>充足</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#FACC15' }}></span>
            <span>低库存</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#EF4444' }}></span>
            <span>缺货</span>
          </div>
        </div>
      </div>

      <div className="inventory-grid">
        {loading && items.length === 0
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : items.map((item) => {
              const available = item.totalStock - item.rentedCount;
              const isOutOfStock = available === 0;

              return (
                <div
                  key={item.id}
                  className={`inventory-card fade-in ${isOutOfStock ? 'out-of-stock' : ''}`}
                  style={isOutOfStock ? { backgroundColor: '#D1D5DB' } : {}}
                >
                  {isOutOfStock && (
                    <div className="out-of-stock-overlay">
                      <span>暂时缺货</span>
                    </div>
                  )}

                  <div className="card-header">
                    <h3 className={`item-name ${isOutOfStock ? 'text-gray' : ''}`}>
                      {item.name}
                    </h3>
                    <span className={`item-price ${isOutOfStock ? 'text-gray' : ''}`}>
                      ¥{item.pricePerDay}/天
                    </span>
                  </div>

                  <div className="card-stats">
                    <div className="stat-item">
                      <div className={`stat-value ${isOutOfStock ? 'text-gray' : ''}`}>
                        {item.totalStock}
                      </div>
                      <div className="stat-label">总库存</div>
                    </div>
                    <div className="stat-item">
                      <div className={`stat-value rented ${isOutOfStock ? 'text-gray' : ''}`}>
                        {item.rentedCount}
                      </div>
                      <div className="stat-label">已租赁</div>
                    </div>
                    <div className="stat-item">
                      <div className={`stat-value available ${isOutOfStock ? 'text-gray' : ''}`}>
                        {available}
                      </div>
                      <div className="stat-label">可用</div>
                    </div>
                  </div>

                  <div className="card-footer">
                    <div className="status-indicator">
                      <span
                        className="status-dot"
                        style={{ backgroundColor: isOutOfStock ? '#9CA3AF' : getStatusColor(available) }}
                      ></span>
                      <span className={`status-text ${isOutOfStock ? 'text-gray' : ''}`}>
                        {isOutOfStock ? '缺货' : getStatusText(available)}
                      </span>
                    </div>
                    {item.status === 'maintenance' && (
                      <span className="maintenance-badge">维修中</span>
                    )}
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}

export default InventoryBoard;
