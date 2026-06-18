import { Bid } from '../services/api';
import { useStore } from '../store/useStore';
import { useEffect, useRef } from 'react';

interface BidHistoryProps {
  bids: Bid[];
}

export const BidHistory = ({ bids }: BidHistoryProps) => {
  const lastToastBidId = useStore((s) => s.lastToastBidId);
  const setLastToastBidId = useStore((s) => s.setLastToastBidId);
  const listRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(bids.length);

  useEffect(() => {
    if (bids.length > prevCountRef.current && listRef.current) {
      listRef.current.scrollTop = 0;
    }
    prevCountRef.current = bids.length;
  }, [bids.length]);

  useEffect(() => {
    if (lastToastBidId) {
      const timer = setTimeout(() => setLastToastBidId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastToastBidId, setLastToastBidId]);

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={listRef}
      style={{
        maxHeight: '360px',
        overflowY: 'auto',
        scrollBehavior: 'smooth',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '4px',
      }}
    >
      {bids.length === 0 && (
        <div style={{ textAlign: 'center', color: '#888', padding: '40px 20px', fontSize: '14px' }}>
          暂无出价记录
        </div>
      )}
      {bids.map((bid, index) => {
        const isNew = bid.id === lastToastBidId;
        return (
          <div
            key={bid.id}
            className="bid-item"
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: isNew
                ? 'linear-gradient(90deg, rgba(240, 165, 0, 0.25), rgba(240, 165, 0, 0.05))'
                : 'rgba(255, 255, 255, 0.05)',
              border: isNew ? '1px solid rgba(240, 165, 0, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              animation: isNew ? 'highlightBid 1.5s ease-out' : `slideInBid 0.4s ease-out ${index * 0.03}s both`,
              transition: 'all 0.3s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f0a500, #e89000)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: '#1a1a2e',
                }}
              >
                {bid.username[0].toUpperCase()}
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{bid.username}</div>
                <div style={{ color: '#888', fontSize: '11px' }}>{formatTime(bid.createdAt)}</div>
              </div>
            </div>
            <div style={{ color: '#f0a500', fontWeight: 700, fontSize: '16px' }}>￥{bid.amount.toLocaleString()}</div>
          </div>
        );
      })}
    </div>
  );
};
