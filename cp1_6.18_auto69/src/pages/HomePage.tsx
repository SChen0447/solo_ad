import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { api, Item } from '../services/api';
import { LazyImage } from '../components/LazyImage';
import { initSocket } from '../services/socket';

interface AuctionTimer {
  timeLeft: number;
  ended: boolean;
}

const useCountdown = (item: Item): AuctionTimer => {
  const [state, setState] = useState<AuctionTimer>(() => {
    const timeLeft = Math.max(0, item.createdAt + item.duration - Date.now());
    return { timeLeft, ended: item.ended || timeLeft === 0 };
  });

  useEffect(() => {
    if (state.ended) return;
    const timer = setInterval(() => {
      setState((prev) => {
        const timeLeft = Math.max(0, item.createdAt + item.duration - Date.now());
        if (timeLeft === 0 && !prev.ended) {
          return { timeLeft: 0, ended: true };
        }
        return { ...prev, timeLeft };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [item.createdAt, item.duration, state.ended]);

  return state;
};

const formatTime = (ms: number) => {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const ItemCard = ({ item }: { item: Item }) => {
  const { timeLeft, ended } = useCountdown(item);
  const isUrgent = timeLeft < 5 * 60 * 1000 && !ended;

  return (
    <Link
      to={`/auction/${item.id}`}
      style={{ textDecoration: 'none', display: 'block' }}
      className="item-card"
    >
      <div
        style={{
          borderRadius: '16px',
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.04)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          height: '100%',
        }}
      >
        <div style={{ position: 'relative', aspectRatio: '4/3', background: '#0f1524' }}>
          <LazyImage src={item.image} alt={item.title} style={{ width: '100%', height: '100%' }} />
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: ended
                ? 'rgba(239, 68, 68, 0.9)'
                : isUrgent
                ? 'rgba(240, 165, 0, 0.95)'
                : 'rgba(22, 33, 62, 0.85)',
              color: ended || isUrgent ? '#fff' : '#f0a500',
              fontSize: '12px',
              fontWeight: 700,
              backdropFilter: 'blur(6px)',
            }}
          >
            {ended ? '已结束' : formatTime(timeLeft)}
          </div>
          {item.ended && item.winnerName && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '10px 14px',
                background: 'linear-gradient(transparent, rgba(16, 185, 129, 0.9))',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              🏆 {item.winnerName} 中标
            </div>
          )}
        </div>
        <div style={{ padding: '16px 18px 18px' }}>
          <h3
            style={{
              color: '#fff',
              fontSize: '16px',
              fontWeight: 700,
              margin: 0,
              marginBottom: '8px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.title}
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ color: '#888', fontSize: '11px', marginBottom: '3px' }}>当前最高价</div>
              <div style={{ color: '#f0a500', fontSize: '20px', fontWeight: 800 }}>
                ￥{item.currentPrice.toLocaleString()}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                {item.artistName[0].toUpperCase()}
              </div>
              <span style={{ color: '#aaa', fontSize: '12px' }}>{item.artistName}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export const HomePage = () => {
  const items = useStore((s) => s.items);
  const setItems = useStore((s) => s.setItems);
  const totalItems = useStore((s) => s.totalItems);
  const setTotalItems = useStore((s) => s.setTotalItems);
  const updateItem = useStore((s) => s.updateItem);
  const addItem = useStore((s) => s.addItem);

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);
  const socketInitialized = useRef(false);

  const loadItems = useCallback(async (p: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.getItems(p, 20);
      if (p === 1) {
        setItems(res.items);
      } else {
        setItems([...useStore.getState().items, ...res.items]);
      }
      setTotalItems(res.total);
      setHasMore(p * res.limit < res.total);
      setPage(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [loading, setItems, setTotalItems]);

  useEffect(() => {
    loadItems(1);
  }, []);

  useEffect(() => {
    const socket = initSocket();
    if (socketInitialized.current) return;
    socketInitialized.current = true;

    socket.on('item:created', (item: Item) => {
      addItem(item);
    });

    socket.on('item:updated', (item: Item) => {
      updateItem(item);
    });

    return () => {
      socket.off('item:created');
      socket.off('item:updated');
    };
  }, [addItem, updateItem]);

  useEffect(() => {
    if (!loaderRef.current || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadItems(page + 1);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, page, loadItems]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 32px 80px' }}>
      <div style={{ marginBottom: '36px', textAlign: 'center' }}>
        <h1
          style={{
            color: '#fff',
            fontSize: '42px',
            fontWeight: 800,
            margin: 0,
            marginBottom: '10px',
            letterSpacing: '1px',
          }}
        >
          发现独特的 <span style={{ color: '#f0a500' }}>数字艺术</span>
        </h1>
        <p style={{ color: '#888', fontSize: '16px', margin: 0, maxWidth: '600px', marginInline: 'auto' }}>
          来自全球艺术家的精选作品，实时竞拍，开启你的收藏之旅
        </p>
      </div>

      {items.length === 0 && !loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: '#888',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎨</div>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>暂无拍品</div>
          <div style={{ fontSize: '14px' }}>点击右上角"发布拍品"创建第一个拍卖</div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
          }}
          className="items-grid"
        >
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {loading && (
        <div ref={loaderRef} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
          <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '24px' }}>⏳</div>
          <div style={{ marginTop: '8px', fontSize: '14px' }}>加载中...</div>
        </div>
      )}
      {!hasMore && items.length > 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666', fontSize: '13px' }}>
          — 已加载全部 {totalItems} 件拍品 —
        </div>
      )}
    </div>
  );
};
