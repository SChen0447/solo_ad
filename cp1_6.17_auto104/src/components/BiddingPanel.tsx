import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import type { AuctionItem } from '../App';
import websocketService, { type BidUpdate } from '../services/websocket';

interface BiddingPanelProps {
  item: AuctionItem;
  onBidUpdate: (updatedItem: Partial<AuctionItem> & { id: string }) => void;
}

export interface BidRecord {
  id: string;
  bidder: string;
  amount: number;
  timestamp: number;
  isNew?: boolean;
}

const BIDDER_NAMES = [
  '神秘买家', '收藏者A', '藏家老王', '艺术爱好者', '潮人小李',
  '资深藏家', '鉴赏家', '古董迷',
];

function formatTimeFromTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit');
}

function formatPrice(price: number): string {
  return `¥${price.toLocaleString('zh-CN')}`;
}

function BiddingPanel({ item, onBidUpdate }: BiddingPanelProps) {
  const [bidAmount, setBidAmount] = useState<string>('');
  const [bidHistory, setBidHistory] = useState<BidRecord[]>([]);
  const [localBidder] = useState<string>(
    () => BIDDER_NAMES[Math.floor(Math.random() * BIDDER_NAMES.length)] + Math.floor(Math.random() * 1000)
  );
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const highlightedId = useRef<string | null>(null);

  useEffect(() => {
    setBidAmount('');
    setError('');
    setSuccess('');
  }, [item.id]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get<BidRecord[]>(`/api/items/${item.id}/history`);
        const history = response.data.slice(-30).reverse();
        setBidHistory(history);
      } catch (e) {
        console.error('Failed to fetch bid history:', e);
      }
    };
    fetchHistory();
  }, [item.id]);

  useEffect(() => {
    websocketService.connect();
    websocketService.joinRoom(item.id);

    const unsubscribe = websocketService.onBidUpdate((update: BidUpdate) => {
      if (update.id !== item.id) return;

      onBidUpdate(update);

      const newBid: BidRecord = {
        id: `bid_${Date.now()}`,
        bidder: update.currentBidder,
        amount: update.currentPrice,
        timestamp: update.timestamp,
        isNew: true,
      };
      highlightedId.current = newBid.id;
      setBidHistory((prev) => [newBid, ...prev].slice(0, 50));

      setTimeout(() => {
        setBidHistory((prev) =>
          prev.map((b) => (b.id === newBid.id ? { ...b, isNew: false } : b))
        );
      }, 600);
    };

    return () => {
      unsubscribe();
    };
  }, [item.id, onBidUpdate]);

  const minBid = item.currentPrice + 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amount = parseFloat(bidAmount);

    if (isNaN(amount)) {
      setError('请输入有效的金额');
      return;
    }

    if (amount < minBid) {
      setError(`出价必须高于当前价至少1元，最低出价 ${formatPrice(minBid)}`);
      return;
    }

    if (item.remainingTime <= 0) {
      setError('该拍卖已结束');
      return;
    }

    setIsSubmitting(true);

    websocketService.sendBid(
      {
        itemId: item.id,
        bidder: localBidder,
        amount,
      },
      (response) => {
        setIsSubmitting(false);
        if (response.success) {
          setSuccess('出价成功！');
          setBidAmount('');
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(response.message);
        }
      }
    );
  };

  const handleQuickBid = (increment: number) => {
    setBidAmount(String(Math.ceil(item.currentPrice + increment));
  };

  return (
    <div className="glass-card bidding-section">
      <div className="section-title">竞价面板</div>

      <div className="current-bid-display">
        <div className="current-bid-label">当前最高出价</div>
        <div className="current-bid-price">{formatPrice(item.currentPrice)}</div>
        <div className="current-bidder">
          出价人: {item.currentBidder}
        </div>
        <div className="starting-price">起拍价: {formatPrice(item.startingPrice)} · 已出价 {item.bidCount} 次</div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[10, 50, 100, 500].map((inc) => (
          <button
            key={inc}
            type="button"
            className="bid-button"
        style={{ minHeight: '36px', padding: '0 14px', fontSize: '13px' }}
        onClick={() => handleQuickBid(inc)}
        disabled={isSubmitting || item.remainingTime <= 0}
      >
        +¥{inc}
      </button>
    ))}
      </div>

      <form className="bid-form" onSubmit={handleSubmit}>
        <div className="bid-input-group">
          <input
            type="number"
            className="bid-input"
            placeholder={`最低出价 ${formatPrice(minBid)}`}
            value={bidAmount}
            onChange={(e) => {
              setBidAmount(e.target.value);
              setError('');
            }}
            min={minBid}
            step={1}
            disabled={isSubmitting || item.remainingTime <= 0}
          />
          <button
            type="submit"
            className="bid-button"
            disabled={isSubmitting || item.remainingTime <= 0}
          >
            {isSubmitting ? '提交中...' : '确认出价'}
          </button>
        </div>

        {error && <div className="bid-error">{error}</div>}
        {success && <div className="bid-success">{success}</div>}
      </form>

      <div style={{ marginTop: '24px' }}>
        <div className="section-title" style={{ marginBottom: '16px' }}>
          <span>出价历史</span>
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
            共 {bidHistory.length} 条
          </span>
        </div>

        {bidHistory.length === 0 ? (
          <div className="empty-history">暂无出价记录，快来成为第一个出价者！</div>
        ) : (
          <div className="bid-history">
            {bidHistory.map((record) => (
              <div
                key={record.id}
                className={`bid-history-item ${record.isNew ? 'highlight' : ''}`}
              >
                <div className="bid-history-info">
                  <div className="bid-history-bidder">{record.bidder}</div>
                  <div className="bid-history-time">
                    {formatTimeFromTimestamp(record.timestamp)}
                  </div>
                </div>
                <div className="bid-history-amount">{formatPrice(record.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BiddingPanel;
