import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { api, Bid } from '../services/api';
import { initSocket, joinAuction, leaveAuction } from '../services/socket';
import { BidHistory } from '../components/BidHistory';
import { LazyImage } from '../components/LazyImage';

export const AuctionPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const user = useStore((s) => s.user);
  const setLoginModalOpen = useStore((s) => s.setLoginModalOpen);
  const setRedirectAfterLogin = useStore((s) => s.setRedirectAfterLogin);
  const currentItem = useStore((s) => s.currentItem);
  const setCurrentItem = useStore((s) => s.setCurrentItem);
  const updateItem = useStore((s) => s.updateItem);
  const bids = useStore((s) => s.bids);
  const setBids = useStore((s) => s.setBids);
  const addBid = useStore((s) => s.addBid);

  const [bidAmount, setBidAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [ended, setEnded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const bidThrottleRef = useRef(0);
  const socketReadyRef = useRef(false);

  const loadItem = useCallback(async () => {
    if (!id) return;
    try {
      const item = await api.getItem(id);
      setCurrentItem(item);
      const tl = Math.max(0, item.createdAt + item.duration - Date.now());
      setTimeLeft(tl);
      setEnded(item.ended || tl === 0);
      setBidAmount(String(item.currentPrice + 10));
      setBidError('');
      setImageLoaded(false);
    } catch {
      toast.error('拍品不存在');
      navigate('/');
    }
  }, [id, navigate, setCurrentItem]);

  const loadBids = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getBids(id);
      setBids(data);
    } catch {
      setBids([]);
    }
  }, [id, setBids]);

  useEffect(() => {
    loadItem();
    loadBids();
  }, [loadItem, loadBids]);

  useEffect(() => {
    if (!id) return;
    joinAuction(id);
    const socket = initSocket();

    if (!socketReadyRef.current) {
      socketReadyRef.current = true;

      socket.on('bid:new', (bid: Bid) => {
        const now = Date.now();
        if (now - bidThrottleRef.current < 500) return;
        bidThrottleRef.current = now;
        addBid(bid);
        const prevBidder = useStore.getState().user;
        if (prevBidder && bid.userId !== prevBidder.id) {
          toast(`${bid.username} 出价 ￥${bid.amount.toLocaleString()}`, {
            icon: '💰',
            duration: 3000,
            style: {
              background: 'rgba(22, 33, 62, 0.95)',
              color: '#fff',
              border: '1px solid rgba(240, 165, 0, 0.3)',
              backdropFilter: 'blur(10px)',
            },
          });
        }
      });

      socket.on('auction:ended', ({ itemId, winner, winningBid }: { itemId: string; winner: string | null; winningBid: number }) => {
        if (itemId === id) {
          setEnded(true);
          setTimeLeft(0);
          if (winner) {
            toast.success(`🎉 拍卖结束！${winner} 以 ￥${winningBid.toLocaleString()} 中标！`);
          } else {
            toast('拍卖结束，流拍', { icon: '😢' });
          }
          loadItem();
        }
      });

      socket.on('item:updated', (item) => {
        if (item.id === id) {
          updateItem(item);
          const tl = Math.max(0, item.createdAt + item.duration - Date.now());
          setTimeLeft(tl);
          setEnded(item.ended || tl === 0);
        }
      });
    }

    return () => {
      leaveAuction(id);
    };
  }, [id, addBid, updateItem, loadItem]);

  useEffect(() => {
    if (ended) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1000) {
          setEnded(true);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [ended]);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const validateBid = (val: string): string => {
    if (!currentItem) return '';
    const n = parseInt(val);
    if (!val || isNaN(n)) return '请输入有效数字';
    if (!Number.isInteger(n)) return '必须为整数';
    const min = currentItem.currentPrice + 10;
    if (n < min) return `出价至少为 ￥${min}`;
    return '';
  };

  const handleBidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setBidAmount(val);
    setBidError(validateBid(val));
  };

  const handleSubmitBid = async () => {
    if (!currentItem || !user) {
      setRedirectAfterLogin(location.pathname);
      setLoginModalOpen(true);
      return;
    }
    if (ended) return;

    const err = validateBid(bidAmount);
    if (err) {
      setBidError(err);
      const input = document.getElementById('bid-input');
      input?.classList.remove('shake');
      void input?.offsetWidth;
      input?.classList.add('shake');
      return;
    }

    setSubmitting(true);
    try {
      await api.createBid(currentItem.id, {
        userId: user.id,
        username: user.username,
        amount: parseInt(bidAmount),
      });
      toast.success('出价成功！', { icon: '✅' });
      setBidError('');
    } catch (e: any) {
      toast.error(e.message || '出价失败');
      setBidError(e.message || '出价失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentItem) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#888' }}>
        <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '36px', marginRight: '12px' }}>⏳</div>
        <span>加载中...</span>
      </div>
    );
  }

  const minBid = currentItem.currentPrice + 10;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 32px 80px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '24px',
          padding: '8px 16px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#ccc',
          cursor: 'pointer',
          fontSize: '13px',
          transition: 'background 0.2s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
        onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
      >
        ← 返回
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="auction-layout">
        <div>
          <div
            style={{
              borderRadius: '20px',
              overflow: 'hidden',
              background: '#0f1524',
              aspectRatio: '4/3',
              boxShadow: '0 12px 50px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: imageLoaded ? 0 : 1,
                background: 'linear-gradient(135deg, rgba(240, 165, 0, 0.1), rgba(102, 126, 234, 0.1))',
                transition: 'opacity 0.6s',
              }}
            />
            <LazyImage
              src={currentItem.image}
              alt={currentItem.title}
              style={{ width: '100%', height: '100%' }}
            />
            <img
              src={currentItem.image}
              alt=""
              style={{ display: 'none' }}
              onLoad={() => setImageLoaded(true)}
            />
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                padding: '10px 20px',
                borderRadius: '30px',
                background: ended
                  ? 'rgba(239, 68, 68, 0.95)'
                  : timeLeft < 5 * 60 * 1000
                  ? 'rgba(240, 165, 0, 0.95)'
                  : 'rgba(22, 33, 62, 0.9)',
                color: '#fff',
                fontWeight: 800,
                fontSize: '16px',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              }}
            >
              {ended ? '🏁 拍卖已结束' : `⏱️ ${formatTime(timeLeft)}`}
            </div>
          </div>

          {ended && (
            <div
              style={{
                marginTop: '20px',
                padding: '18px 24px',
                borderRadius: '14px',
                background: currentItem.winnerName
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.15))'
                  : 'rgba(255, 255, 255, 0.04)',
                border: currentItem.winnerName
                  ? '1px solid rgba(16, 185, 129, 0.4)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                animation: 'fadeIn 0.5s ease-out',
              }}
            >
              {currentItem.winnerName ? (
                <>
                  <div style={{ fontSize: '32px' }}>🏆</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#10b981', fontSize: '20px', fontWeight: 800 }}>恭喜中标！</div>
                    <div style={{ color: '#fff', fontSize: '15px', marginTop: '4px' }}>
                      <span style={{ color: '#f0a500', fontWeight: 700 }}>{currentItem.winnerName}</span>
                      {' '}以{' '}
                      <span style={{ color: '#f0a500', fontWeight: 700 }}>
                        ￥{currentItem.currentPrice.toLocaleString()}
                      </span>
                      {' '}拍得此作品
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '28px' }}>😢</div>
                  <div style={{ color: '#ccc', fontSize: '16px', fontWeight: 600 }}>本次拍卖流拍</div>
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              padding: '28px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                {currentItem.artistName[0].toUpperCase()}
              </div>
              <div>
                <div style={{ color: '#888', fontSize: '12px' }}>艺术家</div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{currentItem.artistName}</div>
              </div>
            </div>
            <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 800, margin: 0, marginBottom: '14px', lineHeight: 1.3 }}>
              {currentItem.title}
            </h1>
            <p style={{ color: '#aaa', fontSize: '14px', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
              {currentItem.description}
            </p>
          </div>

          <div
            style={{
              padding: '28px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ marginBottom: '6px', color: '#888', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
              <span>当前出价</span>
              <span>起拍价 ￥{currentItem.startingPrice.toLocaleString()}</span>
            </div>
            <div style={{ color: '#ef4444', fontSize: '44px', fontWeight: 900, marginBottom: '22px', letterSpacing: '-0.5px' }}>
              ￥{currentItem.currentPrice.toLocaleString()}
            </div>

            <div style={{ marginBottom: '12px', color: '#888', fontSize: '13px' }}>
              最低加价：￥10（下一次出价至少 <span style={{ color: '#f0a500', fontWeight: 600 }}>￥{minBid.toLocaleString()}</span>）
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  id="bid-input"
                  type="text"
                  inputMode="numeric"
                  value={bidAmount}
                  onChange={handleBidChange}
                  disabled={ended || submitting}
                  placeholder={`最低 ${minBid}`}
                  style={{
                    width: '100%',
                    padding: '16px 16px 16px 44px',
                    borderRadius: '12px',
                    border: `2px solid ${bidError ? '#ef4444' : ended ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.12)'}`,
                    background: ended ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                    color: ended ? '#666' : '#fff',
                    fontSize: '18px',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: ended ? 'not-allowed' : 'text',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => {
                    if (!ended && !bidError) e.currentTarget.style.borderColor = '#f0a500';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = bidError ? '#ef4444' : ended ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.12)';
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: ended ? '#666' : '#f0a500',
                    fontWeight: 800,
                    fontSize: '18px',
                  }}
                >
                  ￥
                </div>
              </div>
              <button
                onClick={handleSubmitBid}
                disabled={ended || submitting}
                style={{
                  padding: '0 28px',
                  borderRadius: '12px',
                  border: 'none',
                  background: ended
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'linear-gradient(135deg, #f0a500, #e89000)',
                  color: ended ? '#666' : '#1a1a2e',
                  fontSize: '16px',
                  fontWeight: 800,
                  cursor: ended || submitting ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseOver={(e) => {
                  if (!ended && !submitting) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 24px rgba(240, 165, 0, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {ended ? '已结束' : submitting ? '出价中...' : user ? '立即出价' : '登录出价'}
              </button>
            </div>
            {bidError && (
              <div style={{ marginTop: '10px', color: '#ef4444', fontSize: '13px', paddingLeft: '4px' }}>
                ⚠ {bidError}
              </div>
            )}
          </div>

          <div
            style={{
              padding: '24px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#fff', fontSize: '17px', fontWeight: 700, margin: 0 }}>📜 出价历史</h3>
              <span style={{ color: '#888', fontSize: '13px' }}>{bids.length} 次出价</span>
            </div>
            <BidHistory bids={bids} />
          </div>
        </div>
      </div>
    </div>
  );
};
