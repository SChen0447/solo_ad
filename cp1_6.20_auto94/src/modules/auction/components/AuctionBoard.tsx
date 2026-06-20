import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { wsService } from '@/api/websocket';
import { auctionApi } from '../api/auctionApi';
import BookCard from '@/components/common/BookCard';
import type { Bid } from '@/types';

interface AuctionBoardProps {
  bookId?: string;
}

function formatTimeLeft(endTime: string): { text: string; warning: boolean } {
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return { text: '已结束', warning: true };
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const warning = diff < 3600000;
  if (hours > 0) {
    return { text: `剩余 ${hours}小时${minutes}分`, warning };
  }
  return { text: `剩余 ${minutes}分${seconds}秒`, warning };
}

export default function AuctionBoard({ bookId }: AuctionBoardProps) {
  const navigate = useNavigate();
  const {
    books,
    auctions,
    bidsByBook,
    addBid,
    currentUser,
    addToast,
    addOperationLog,
    updateBook,
    setHasUnreadNotification
  } = useAppStore();

  const [bidAmount, setBidAmount] = useState<string>('');
  const [bidError, setBidError] = useState<string>('');
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [timeLeftMap, setTimeLeftMap] = useState<Record<string, { text: string; warning: boolean }>>({});
  const [, forceTick] = useState(0);

  const openAuctionBooks = useMemo(() => {
    return books.filter(b => b.status === '竞标中');
  }, [books]);

  const currentBook = bookId ? books.find(b => b.id === bookId) : null;
  const currentAuction = bookId ? auctions.find(a => a.bookId === bookId) : null;
  const currentBids = bookId ? (bidsByBook[bookId] || []) : [];

  useEffect(() => {
    wsService.connect();
    return () => wsService.disconnect();
  }, []);

  useEffect(() => {
    if (bookId) {
      wsService.joinAuctionRoom(bookId);
      return () => wsService.leaveAuctionRoom(bookId);
    }
  }, [bookId]);

  useEffect(() => {
    const unsubscribe = wsService.on('new_bid', (data: Bid) => {
      addBid(data.bookId, data);
      setHasUnreadNotification(true);
      const book = books.find(b => b.id === data.bookId);
      if (book) {
        addToast('info', `《${book.title}》收到新出价：¥${data.amount.toFixed(2)} by ${data.recyclerName}`);
      }
    });

    const unsubClose = wsService.on('auction_closed', (data: { bookId: string; winner: Bid }) => {
      addToast('success', `竞标结束！中标者：${data.winner.recyclerName}，金额：¥${data.winner.amount.toFixed(2)}`);
      updateBook(data.bookId, {
        status: '已分配',
        finalPrice: data.winner.amount,
        recyclerId: data.winner.recyclerId,
        recyclerName: data.winner.recyclerName
      });
      setHasUnreadNotification(true);
    });

    return () => {
      unsubscribe();
      unsubClose();
    };
  }, [books, addBid, addToast, updateBook, addOperationLog, setHasUnreadNotification]);

  useEffect(() => {
    const timer = setInterval(() => {
      const newMap: Record<string, { text: string; warning: boolean }> = {};
      auctions.forEach(a => {
        newMap[a.bookId] = formatTimeLeft(a.endTime);
      });
      setTimeLeftMap(newMap);
      forceTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [auctions]);

  const minNextBid = useMemo(() => {
    if (currentBids.length === 0) {
      return currentBook?.valuationMin ? currentBook.valuationMin * 0.9 : 10;
    }
    return currentBids[0].amount * 1.02;
  }, [currentBids, currentBook]);

  const handleSubmitBid = async () => {
    if (!currentUser || currentUser.role !== 'recycler') {
      addToast('error', '请切换到回收商角色参与竞标');
      return;
    }
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      setBidError('请输入有效金额');
      return;
    }
    if (amount < minNextBid) {
      setBidError(`出价必须不低于 ¥${minNextBid.toFixed(2)}`);
      return;
    }

    setIsSubmittingBid(true);
    setBidError('');

    try {
      let bid: Bid;
      try {
        bid = await auctionApi.submitBid({
          bookId: bookId!,
          recyclerId: currentUser.id,
          recyclerName: currentUser.name,
          amount
        });
      } catch {
        bid = {
          id: `bid-${Date.now()}`,
          bookId: bookId!,
          recyclerId: currentUser.id,
          recyclerName: currentUser.name,
          amount,
          timestamp: new Date().toISOString()
        };
      }

      addBid(bookId!, bid);
      wsService.emit('new_bid', bid);

      addToast('success', `出价成功！¥${amount.toFixed(2)}`);
      setBidAmount('');
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || '出价失败，请重试');
    } finally {
      setIsSubmittingBid(false);
    }
  };

  const handleCloseAuction = async () => {
    if (!bookId || !currentBook) return;
    try {
      await auctionApi.closeAuction(bookId);
      if (currentBids.length > 0) {
        const winner = currentBids[0];
        updateBook(bookId, {
          status: '已分配',
          finalPrice: winner.amount,
          recyclerId: winner.recyclerId,
          recyclerName: winner.recyclerName
        });
        wsService.emit('auction_closed', { bookId, winner });
        addToast('success', `竞标已关闭，中标：${winner.recyclerName} ¥${winner.amount.toFixed(2)}`);
        addOperationLog({
          id: `log-${Date.now()}`,
          action: '关闭了竞标并分配回收商',
          targetType: 'book',
          targetId: bookId,
          targetName: currentBook.title,
          operatorName: currentUser?.name || '管理员',
          timestamp: new Date().toISOString()
        });
      }
    } catch {
      if (currentBids.length > 0) {
        const winner = currentBids[0];
        updateBook(bookId, {
          status: '已分配',
          finalPrice: winner.amount,
          recyclerId: winner.recyclerId,
          recyclerName: winner.recyclerName
        });
        wsService.emit('auction_closed', { bookId, winner });
        addToast('success', `竞标已关闭，中标：${winner.recyclerName} ¥${winner.amount.toFixed(2)}`);
      }
    }
  };

  if (bookId && currentBook) {
    const timeLeft = timeLeftMap[bookId] || formatTimeLeft(currentAuction?.endTime || new Date(Date.now() + 86400000).toISOString());
    const isOpen = currentBook.status === '竞标中' && timeLeft.text !== '已结束';

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1 className="page-title">竞标看板 - 《{currentBook.title}》</h1>
            <p className="page-subtitle">实时出价信息，最高出价者将获得回收权</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className={`auction-timer ${timeLeft.warning ? 'warning' : ''}`}>
              ⏱ {timeLeft.text}
            </div>
            {currentUser?.role === 'admin' && isOpen && (
              <button className="btn btn-danger" onClick={handleCloseAuction}>
                提前结束竞标
              </button>
            )}
          </div>
        </div>

        {currentBook.valuationMin && (
          <div className="valuation-range" style={{ marginBottom: 20 }}>
            <div className="valuation-label">📊 系统估值范围</div>
            <div className="valuation-value">
              ¥{currentBook.valuationMin.toFixed(2)} ~ ¥{currentBook.valuationMax!.toFixed(2)}
              {currentBids.length > 0 && (
                <span style={{ marginLeft: 24, fontSize: 14 }}>
                  当前最高：<span style={{ color: '#27ae60' }}>¥{currentBids[0].amount.toFixed(2)}</span>
                </span>
              )}
            </div>
          </div>
        )}

        <div className="bid-list">
          <div className="bid-list-header">
            <span>排名</span>
            <span>回收商</span>
            <span>出价金额</span>
            <span>出价时间</span>
          </div>

          <AnimatePresence>
            {currentBids.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-icon">💰</div>
                <div className="empty-text">暂无出价，成为第一个出价者吧！</div>
              </div>
            ) : (
              currentBids.map((bid, idx) => (
                <motion.div
                  key={bid.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`bid-row ${bid.isWinning ? 'winning' : ''}`}
                >
                  <span>
                    {idx === 0 ? '🏆 第1名' : `第${idx + 1}名`}
                  </span>
                  <span style={{ fontWeight: idx === 0 ? 600 : 400 }}>
                    {bid.recyclerName}
                    {bid.recyclerId === currentUser?.id && (
                      <span style={{
                        marginLeft: 8,
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor: '#4a90d9',
                        color: '#fff'
                      }}>我</span>
                    )}
                  </span>
                  <span className="bid-amount" style={{ fontSize: 16 }}>
                    ¥{bid.amount.toFixed(2)}
                  </span>
                  <span style={{ color: '#888', fontSize: 13 }}>
                    {new Date(bid.timestamp).toLocaleString('zh-CN', {
                      month: '2-digit', day: '2-digit',
                      hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })}
                  </span>
                </motion.div>
              ))
            )}
          </AnimatePresence>

          {isOpen && currentUser?.role === 'recycler' && (
            <div className="bid-input-row">
              <span style={{ fontSize: 14, color: '#888' }}>我的出价：</span>
              <input
                type="number"
                className="form-input"
                style={{ flex: 1, maxWidth: 240 }}
                placeholder={`最低 ¥${minNextBid.toFixed(2)}`}
                value={bidAmount}
                onChange={(e) => {
                  setBidAmount(e.target.value);
                  setBidError('');
                }}
                min={minNextBid}
                step="1"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitBid()}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 12 }}
                onClick={() => setBidAmount(minNextBid.toFixed(2))}
              >
                最低价
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 12 }}
                onClick={() => setBidAmount((minNextBid * 1.05).toFixed(2))}
              >
                +5%
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitBid}
                disabled={isSubmittingBid}
              >
                {isSubmittingBid ? <span className="loading-spinner" /> : '提交出价'}
              </button>
            </div>
          )}
          {bidError && (
            <div style={{ padding: '8px 20px', color: '#e74c3c', fontSize: 12 }}>{bidError}</div>
          )}

          {!isOpen && (
            <div style={{
              padding: 20,
              textAlign: 'center',
              backgroundColor: '#e6f7e6',
              fontSize: 14,
              color: '#155724'
            }}>
              {currentBids.length > 0
                ? `🏆 竞标结束！中标者：${currentBids[0].recyclerName}，金额：¥${currentBids[0].amount.toFixed(2)}`
                : '竞标结束，无人出价'}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">竞标大厅</h1>
        <p className="page-subtitle">正在进行竞标的书籍列表，点击卡片进入详情出价</p>
      </div>

      {openAuctionBooks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <div className="empty-text">暂无正在进行的竞标</div>
        </div>
      ) : (
        <div className="grid-container">
          {openAuctionBooks.map(book => {
            const auction = auctions.find(a => a.bookId === book.id);
            const tl = auction ? (timeLeftMap[book.id] || formatTimeLeft(auction.endTime)) : null;
            return (
              <div key={book.id} style={{ position: 'relative' }}>
                {tl && (
                  <div
                    className={`auction-timer ${tl.warning ? 'warning' : ''}`}
                    style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}
                  >
                    ⏱ {tl.text}
                  </div>
                )}
                <BookCard book={book} showBid />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
