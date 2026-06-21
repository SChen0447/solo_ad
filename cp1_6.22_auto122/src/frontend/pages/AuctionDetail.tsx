import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, BidData, AuctionDetailData } from '../utils/api';
import { socket } from '../utils/socket';
import './AuctionDetail.css';

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

const formatBidTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
};

export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AuctionDetailData | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [inputError, setInputError] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const timelineRef = useRef<HTMLDivElement>(null);

  const endTime = detail ? new Date(detail.auction.endTime).getTime() : 0;
  const remaining = Math.max(0, endTime - now);
  const minBid = detail ? detail.auction.currentPrice + detail.auction.minIncrement : 0;
  const maxBid = detail ? detail.auction.currentPrice + detail.auction.minIncrement * 5 : 0;

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      const d = await api.getAuctionDetail(id);
      setDetail(d);
      if (!bidAmount && d.auction) {
        setBidAmount(String(d.auction.currentPrice + d.auction.minIncrement));
      }
    } catch (e) {
      console.error(e);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    socket.connect();
    socket.joinRoom(id);
    socket.on('newBid', `AuctionDetail-${id}`, (data: any) => {
      if (data.auctionId !== id) return;
      setDetail((prev) => {
        if (!prev) return prev;
        const newBid: BidData = {
          ...data.bid,
          timestamp: new Date(data.bid.timestamp).toISOString(),
        };
        return {
          ...prev,
          auction: {
            ...prev.auction,
            currentPrice: data.newCurrentPrice,
            bidCount: prev.auction.bidCount + 1,
          },
          bids: [newBid, ...prev.bids],
        };
      });
    });

    fetchDetail();
    const tick = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      clearInterval(tick);
      socket.leaveRoom(id!);
      socket.off('newBid', `AuctionDetail-${id}`);
    };
  }, [id, fetchDetail]);

  const handleBid = async () => {
    if (!id || !detail) return;
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < minBid) {
      setInputError(true);
      setTimeout(() => setInputError(false), 600);
      return;
    }
    setSubmitting(true);
    try {
      await api.sendBid(id, amount);
      setSuccessBanner(true);
      setTimeout(() => setSuccessBanner(false), 3000);
    } catch (e: any) {
      alert(e.message || '出价失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!detail) {
    return (
      <div className="detail-loading">
        <div className="spinner"></div>
        <p>加载商品详情中...</p>
      </div>
    );
  }

  const { auction, bids } = detail;

  return (
    <div className="auction-detail-page">
      {successBanner && (
        <div className="success-banner">
          ✅ 出价成功！您已成为当前最高出价者
        </div>
      )}

      <button className="back-btn" onClick={() => navigate('/')}>
        ← 返回列表
      </button>

      <div className="detail-content">
        <div className="detail-left">
          <div className="product-image-wrap">
            <img src={auction.imageUrl} alt={auction.name} className="product-image" />
          </div>
          <div className="product-info">
            <h1 className="product-name">{auction.name}</h1>
            <p className="product-desc">{auction.description}</p>
          </div>
        </div>

        <div className="detail-right">
          <div className="bid-info-card">
            <div className="info-row">
              <span className="info-label">起拍价</span>
              <span className="info-value start">{formatCurrency(auction.startPrice)}</span>
            </div>
            <div className="info-row main">
              <span className="info-label">当前最高价</span>
              <span className="info-value current">{formatCurrency(auction.currentPrice)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">最小加价</span>
              <span className="info-value increment">+ {formatCurrency(auction.minIncrement)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">参与人数</span>
              <span className="info-value">👥 {auction.bidCount} 人</span>
            </div>
            <div className={`timer-row ${remaining < 300000 ? 'urgent' : ''}`}>
              <span className="timer-icon">⏰</span>
              <span>剩余时间：{formatTime(remaining)}</span>
            </div>
          </div>

          <div className="bid-timeline-card">
            <div className="timeline-header">
              <h3>📜 竞价时间线</h3>
              <span className="timeline-count">{bids.length} 条记录</span>
            </div>
            <div className="timeline" ref={timelineRef}>
              {bids.length === 0 && (
                <p className="timeline-empty">暂无出价记录，快来成为第一个竞价者！</p>
              )}
              {bids.map((bid, idx) => (
                <div key={bid.id} className="timeline-item">
                  <div className={`timeline-dot ${idx === 0 ? 'latest' : ''}`}></div>
                  <div className="timeline-line"></div>
                  <img src={bid.userAvatar} alt={bid.userName} className="timeline-avatar" />
                  <div className="timeline-content">
                    <div className="timeline-top">
                      <span className="timeline-user">{bid.userName}</span>
                      <span className="timeline-time">{formatBidTime(bid.timestamp)}</span>
                    </div>
                    <div className={`timeline-amount ${idx === 0 ? 'latest' : ''}`}>
                      出价 {formatCurrency(bid.amount)}
                      {idx === 0 && <span className="badge-leading">领先</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bid-input-card">
            <div className="recommend-row">
              <span className="recommend-label">💡 推荐出价区间</span>
              <span className="recommend-value">{formatCurrency(minBid)} ~ {formatCurrency(maxBid)}</span>
            </div>
            <div className={`input-row ${inputError ? 'error shake' : ''}`}>
              <span className="currency-symbol">¥</span>
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`最低 ${formatCurrency(minBid)}`}
                min={minBid}
                disabled={remaining <= 0 || submitting}
              />
              <span className="min-label">≥ {formatCurrency(minBid)}</span>
            </div>
            <button
              className="bid-btn"
              onClick={handleBid}
              disabled={remaining <= 0 || submitting}
            >
              {submitting ? '提交中...' : remaining <= 0 ? '拍卖已结束' : '🚀 立即出价'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
