import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../utils/api';
import { useApp } from '../App';
import type { Transaction } from '../types';
import { GradeBadge, StarRating } from '../components/InstrumentCard';

const statusInfo: Record<string, { label: string; color: string; icon: string; desc: string }> = {
  escrow: { label: '待发货', color: '#3B82F6', icon: '📦', desc: '卖家已确认订单，正在准备发货' },
  inspection_period: { label: '验货期', color: '#F97316', icon: '🔍', desc: '您已确认收货，请在48小时内完成验货' },
  completed: { label: '已完成', color: '#22C55E', icon: '✅', desc: '交易完成，欢迎互相评价' },
  disputed: { label: '争议处理中', color: '#EF4444', icon: '⚖️', desc: '平台客服已介入，将在24小时内处理' },
  cancelled: { label: '已取消', color: '#8c7b6a', icon: '❌', desc: '交易已取消' },
};

const disputeReasons = [
  '与验机报告描述不符',
  '乐器有未标注的损坏',
  '配件缺失或不符',
  '音色/手感问题',
  '其他原因',
];

const TransactionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshUser, setError } = useApp();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState(disputeReasons[0]);
  const [disputeDesc, setDisputeDesc] = useState('');
  const [processing, setProcessing] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!id) return;
    loadTx();
  }, [id]);

  useEffect(() => {
    if (tx?.inspection_deadline && tx.status === 'inspection_period') {
      const tick = () => {
        const diff = new Date(tx.inspection_deadline).getTime() - Date.now();
        if (diff <= 0) {
          setTimeLeft('已超时');
          return;
        }
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${h}小时${m}分钟`);
      };
      tick();
      const t = setInterval(tick, 60000);
      return () => clearInterval(t);
    }
  }, [tx]);

  const loadTx = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await api.getTransaction(id);
      setTx(d);
    } finally {
      setLoading(false);
    }
  };

  const confirmReceipt = async () => {
    if (!tx) return;
    setProcessing('confirm');
    try {
      const d = await api.confirmReceipt(tx.id);
      setTx(d);
    } finally {
      setProcessing('');
    }
  };

  const completeTx = async () => {
    if (!tx) return;
    setProcessing('complete');
    try {
      const d = await api.completeTransaction(tx.id);
      setTx(d);
    } finally {
      setProcessing('');
    }
  };

  const fileDispute = async () => {
    if (!tx) return;
    setProcessing('dispute');
    try {
      const d = await api.fileDispute(tx.id, disputeReason, disputeDesc);
      setTx(d);
      setShowDisputeModal(false);
    } finally {
      setProcessing('');
    }
  };

  const submitReview = async () => {
    if (!tx) return;
    setProcessing('review');
    try {
      await api.submitReview(tx.id, 'buyer', reviewRating, reviewComment);
      await refreshUser();
      await loadTx();
      setShowReviewModal(false);
      setReviewRating(5);
      setReviewComment('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交评价失败');
    } finally {
      setProcessing('');
    }
  };

  if (loading) {
    return <div style={{ padding: 80, display: 'flex', justifyContent: 'center' }}><div className="loading-spinner" /></div>;
  }
  if (!tx) {
    return <div className="empty-state card"><div className="empty-icon">📦</div>订单不存在</div>;
  }

  const si = statusInfo[tx.status];
  const isBuyer = tx.buyer_id === 'user_demo';
  const myReview = isBuyer ? tx.review_by_buyer : tx.review_by_seller;
  const needReview = tx.status === 'completed' && !myReview;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 18 }}>
        <div onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#8c7b6a', fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>
          ← 返回上一页
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#2d2a26' }}>📦 交易订单详情</h1>
        <div style={{ fontSize: 12, color: '#8c7b6a', marginTop: 4 }}>订单号：{tx.id} · 创建于 {new Date(tx.created_at).toLocaleString('zh-CN')}</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 }}
        className="card"
        style={{ padding: 24, marginBottom: 20, background: `linear-gradient(135deg, ${si.color}12, #ffffff)` }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: si.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: `0 6px 20px ${si.color}30` }}>
            {si.icon}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: si.color, marginBottom: 4 }}>{si.label}</div>
            <div style={{ fontSize: 13, color: '#5c554d', lineHeight: 1.6 }}>
              {si.desc}
              {tx.status === 'inspection_period' && (
                <span style={{ color: '#F97316', fontWeight: 600, marginLeft: 6 }}>（剩余 {timeLeft}）</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tx.status === 'escrow' && isBuyer && (
              <button className="wood-btn-outline" onClick={confirmReceipt} disabled={processing === 'confirm'} style={{ width: 140 }}>
                {processing === 'confirm' ? '处理中...' : '✓ 确认收货'}
              </button>
            )}
            {tx.status === 'inspection_period' && isBuyer && (
              <>
                <button className="wood-btn" onClick={completeTx} disabled={processing === 'complete'}>
                  {processing === 'complete' ? '处理中...' : '✓ 验货无误'}
                </button>
                <button className="wood-btn-outline" onClick={() => setShowDisputeModal(true)} style={{ width: 140 }}>
                  ⚠️ 发起争议
                </button>
              </>
            )}
            {needReview && isBuyer && (
              <button className="wood-btn" onClick={() => setShowReviewModal(true)}>
                ⭐ 评价卖家
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div className="section-title" style={{ fontSize: 16, marginBottom: 16 }}>
              <span>🎵</span><span>商品信息</span>
            </div>
            <Link to={`/instrument/${tx.instrument_id}`} style={{ display: 'flex', gap: 16, alignItems: 'center', color: 'inherit' }}>
              <img src={tx.instrument_thumbnail} alt={tx.instrument_name} style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 12 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#2d2a26', marginBottom: 4 }}>{tx.instrument_name}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#8B5E3C' }}>¥{tx.price.toLocaleString()}</div>
              </div>
            </Link>
          </motion.div>

          {tx.dispute && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.07 }}
              className="card"
              style={{ padding: 20, marginBottom: 20, borderLeft: '4px solid #EF4444' }}
            >
              <div className="section-title" style={{ fontSize: 16, marginBottom: 14 }}>
                <span>⚖️</span><span>争议信息</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span className="tag" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>{tx.dispute.reason}</span>
                <span className="tag" style={{ background: 'rgba(139, 94, 60, 0.1)', color: '#8B5E3C' }}>
                  状态：{tx.dispute.status === 'platform_reviewing' ? '平台审核中' : tx.dispute.status}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#5c554d', lineHeight: 1.7 }}>{tx.dispute.description || '（无详细描述）'}</div>
              <div style={{ fontSize: 11, color: '#8c7b6a', marginTop: 10 }}>提交时间：{new Date(tx.dispute.filed_at).toLocaleString('zh-CN')}</div>
            </motion.div>
          )}

          {(tx.review_by_buyer || tx.review_by_seller) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.09 }}
              className="card"
              style={{ padding: 20, marginBottom: 20 }}
            >
              <div className="section-title" style={{ fontSize: 16, marginBottom: 16 }}>
                <span>💬</span><span>交易评价</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {tx.review_by_buyer && (
                  <div style={{ padding: 14, background: '#faf8f5', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#2d2a26' }}>买家 → 卖家：{tx.review_by_buyer.from}</span>
                      <StarRating value={tx.review_by_buyer.rating} />
                    </div>
                    <div style={{ fontSize: 13, color: '#5c554d', lineHeight: 1.7 }}>{tx.review_by_buyer.comment || '（无文字评价）'}</div>
                  </div>
                )}
                {tx.review_by_seller && (
                  <div style={{ padding: 14, background: '#faf8f5', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#2d2a26' }}>卖家 → 买家：{tx.review_by_seller.from}</span>
                      <StarRating value={tx.review_by_seller.rating} />
                    </div>
                    <div style={{ fontSize: 13, color: '#5c554d', lineHeight: 1.7 }}>{tx.review_by_seller.comment || '（无文字评价）'}</div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        <div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div className="section-title" style={{ fontSize: 16, marginBottom: 16 }}>
              <span>💰</span><span>交易金额</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: '#8c7b6a' }}>商品金额</span>
              <span style={{ fontSize: 13, color: '#2d2a26' }}>¥{tx.price.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: '#8c7b6a' }}>服务费</span>
              <span style={{ fontSize: 13, color: '#22C55E' }}>免</span>
            </div>
            <div style={{ height: 1, background: '#e8e0d6', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#2d2a26' }}>实付金额</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#8B5E3C' }}>¥{tx.price.toLocaleString()}</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card" style={{ padding: 20 }}>
            <div className="section-title" style={{ fontSize: 16, marginBottom: 16 }}>
              <span>👥</span><span>交易双方</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(139, 94, 60, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🧑‍💼</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#8c7b6a', marginBottom: 2 }}>卖家</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2d2a26' }}>{tx.seller_name}</div>
                </div>
                <span className="tag">★ 4.7</span>
              </div>
              <div style={{ textAlign: 'center', color: '#c4b4a2' }}>─── 🔒 担保交易 ───</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛒</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#8c7b6a', marginBottom: 2 }}>买家</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2d2a26' }}>{tx.buyer_name}</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showDisputeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !processing && setShowDisputeModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}
              className="card" style={{ padding: 26, maxWidth: 480, width: '100%' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#EF4444', marginBottom: 4 }}>⚠️ 发起交易争议</div>
              <div style={{ fontSize: 12, color: '#8c7b6a', marginBottom: 18 }}>提交后平台人工将在24小时内介入仲裁</div>
              <div style={{ marginBottom: 14 }}>
                <span className="label-text">争议原因</span>
                <select className="input-field" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}>
                  {disputeReasons.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <span className="label-text">详细描述（请说明问题细节）</span>
                <textarea className="input-field" rows={4} value={disputeDesc} onChange={(e) => setDisputeDesc(e.target.value)}
                  placeholder="请详细描述与验机报告不符之处，可配合证据照片说明..." style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="wood-btn-outline" onClick={() => setShowDisputeModal(false)} disabled={processing === 'dispute'}>取消</button>
                <button className="wood-btn" onClick={fileDispute} disabled={processing === 'dispute'} style={{ flex: 1, width: 'auto', background: '#EF4444' }}>
                  {processing === 'dispute' ? '提交中...' : '确认提交争议'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReviewModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !processing && setShowReviewModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}
              className="card" style={{ padding: 26, maxWidth: 460, width: '100%' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#2d2a26', marginBottom: 14 }}>⭐ 评价卖家</div>
              <div style={{ marginBottom: 18, textAlign: 'center', padding: 20, background: '#faf8f5', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: '#8c7b6a', marginBottom: 10 }}>请为本次交易打分</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setReviewRating(s)}
                      style={{ fontSize: 42, cursor: 'pointer', background: 'none', border: 'none', padding: 0, transition: 'transform 0.15s ease' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.15)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'none')}>
                      <span style={{ color: s <= reviewRating ? '#fbbf24' : '#e8e0d6' }}>★</span>
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#8c7b6a', marginTop: 8 }}>
                  {reviewRating === 5 ? '非常满意！' : reviewRating === 4 ? '比较满意' : reviewRating === 3 ? '一般' : reviewRating === 2 ? '不太满意' : '非常不满'}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <span className="label-text">评价内容（可选）</span>
                <textarea className="input-field" rows={3} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="说说你的真实感受，帮助其他买家..." style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="wood-btn-outline" onClick={() => setShowReviewModal(false)} disabled={processing === 'review'}>取消</button>
                <button className="wood-btn" onClick={submitReview} disabled={processing === 'review'} style={{ flex: 1, width: 'auto' }}>
                  {processing === 'review' ? '提交中...' : '提交评价'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransactionDetailPage;
