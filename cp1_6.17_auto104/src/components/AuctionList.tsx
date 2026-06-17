import type { AuctionItem } from '../App';

interface AuctionListProps {
  items: AuctionItem[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}分${secs.toString().padStart(2, '0')}秒`;
  }
  return `${secs}秒`;
}

function formatPrice(price: number): string {
  return `¥${price.toLocaleString('zh-CN')}`;
}

function AuctionList({ items, selectedItemId, onSelectItem }: AuctionListProps) {
  return (
    <div>
      <div className="section-title">
        <span>拍卖品列表</span>
        <span style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-secondary)' }}>
          共 {items.length} 件商品
        </span>
      </div>
      <div className="auction-list">
        {items.map((item) => {
          const isActive = selectedItemId === item.id;
          const isUrgent = item.remainingTime > 0 && item.remainingTime <= 60;
          const isEnded = item.remainingTime <= 0;

          return (
            <div
              key={item.id}
              className={`glass-card auction-card ${isActive ? 'active' : ''}`}
              onClick={() => onSelectItem(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectItem(item.id);
                }
              }}
            >
              <div className="auction-thumb">
                <span>{item.thumbnail}</span>
              </div>
              <div className="auction-info">
                <h3>{item.name}</h3>
                <div className="auction-meta">
                  <div className="auction-meta-item price-current">
                    <strong>{formatPrice(item.currentPrice)}</strong>
                  </div>
                  <div className="auction-meta-item">
                    <span>出价:</span>
                    <strong>{item.bidCount}</strong>
                    <span>次</span>
                  </div>
                  <div
                    className={`auction-meta-item ${isUrgent ? 'countdown-urgent' : ''}`}
                  >
                    <span>剩余:</span>
                    <strong>
                      {isEnded ? '已结束' : formatTime(item.remainingTime)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AuctionList;
