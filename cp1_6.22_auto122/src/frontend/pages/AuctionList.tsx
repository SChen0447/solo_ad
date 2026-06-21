import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, AuctionCardData } from '../utils/api';
import { socket } from '../utils/socket';
import './AuctionList.css';

const formatCurrency = (n: number) => `¥${n.toLocaleString('zh-CN')}`;

const formatTime = (ms: number) => {
  if (ms <= 0) return '已结束';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}时`);
  if (m > 0 || h > 0) parts.push(`${m}分`);
  parts.push(`${s}秒`);
  return parts.join('');
};

function playBidSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

interface CardState extends AuctionCardData {
  nowEndTime: number;
  flash: boolean;
}

export default function AuctionList() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<CardState[]>([]);
  const [now, setNow] = useState(Date.now());
  const flashTimers = useRef<Map<string, any>>(new Map());

  const fetchList = useCallback(async () => {
    try {
      const list = await api.getAuctionList();
      setCards((prev) => {
        const prevMap = new Map(prev.map((c) => [c.id, c.currentPrice]));
        const next: CardState[] = list.map((a) => ({
          ...a,
          nowEndTime: new Date(a.endTime).getTime(),
          flash: false,
        }));
        next.forEach((c) => {
          const oldPrice = prevMap.get(c.id);
          if (oldPrice !== undefined && oldPrice < c.currentPrice) {
            triggerFlash(c.id);
          }
        });
        next.sort((a, b) => a.nowEndTime - b.nowEndTime);
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const triggerFlash = useCallback((id: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, flash: true } : c))
    );
    if (flashTimers.current.has(id)) {
      clearTimeout(flashTimers.current.get(id));
    }
    playBidSound();
    const t = setTimeout(() => {
      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, flash: false } : c))
      );
      flashTimers.current.delete(id);
    }, 2000);
    flashTimers.current.set(id, t);
  }, []);

  useEffect(() => {
    socket.connect();
    socket.on('newBid', 'AuctionList-listener', (data: any) => {
      triggerFlash(data.auctionId);
    });
    fetchList();

    const interval = setInterval(fetchList, 5000);
    const tickInterval = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      clearInterval(interval);
      clearInterval(tickInterval);
      socket.off('newBid', 'AuctionList-listener');
    };
  }, [fetchList, triggerFlash]);

  return (
    <div className="auction-list-page">
      <div className="list-header">
        <h1 className="list-title">🔥 进行中的拍卖</h1>
        <p className="list-subtitle">实时竞价 · 剩余时间优先排序</p>
      </div>
      <div className="auction-grid">
        {cards.map((card) => {
          const remaining = card.nowEndTime - now;
          const urgent = remaining < 5 * 60 * 1000;
          return (
            <div
              key={card.id}
              className={`auction-card ${card.flash ? 'flash' : ''} ${urgent ? 'urgent' : ''}`}
              onClick={() => navigate(`/auction/${card.id}`)}
            >
              <div className="card-image-wrap">
                <img src={card.imageUrl} alt={card.name} className="card-image" />
                <div className="card-bid-count">
                  <span>👥 {card.bidCount} 人竞价</span>
                </div>
                {card.bidCount === 0 && (
                  <div className="card-new-badge">新上架</div>
                )}
              </div>
              <div className="card-body">
                <h3 className="card-name" title={card.name}>{card.name}</h3>
                <div className="card-price-row">
                  <div className="price-item">
                    <span className="price-label">起拍</span>
                    <span className="price-value start">{formatCurrency(card.startPrice)}</span>
                  </div>
                  <div className="price-item">
                    <span className="price-label">最高</span>
                    <span className="price-value current">{formatCurrency(card.currentPrice)}</span>
                  </div>
                </div>
                <div className={`card-timer ${urgent ? 'urgent' : ''}`}>
                  <span className="timer-icon">⏰</span>
                  <span>{formatTime(remaining)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
