import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../utils/api';
import type { Instrument, Transaction } from '../types';
import { GradeBadge, StarRating } from '../components/InstrumentCard';
import InspectionReport from '../components/InspectionReport';

const DetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inst, setInst] = useState<Instrument | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [processingBuy, setProcessingBuy] = useState(false);
  const [txResult, setTxResult] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getInstrument(id!);
      setInst(data);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!inst) return;
    setProcessingBuy(true);
    try {
      const tx = await api.createTransaction(inst.id);
      setTxResult(tx);
      setShowBuyModal(false);
    } finally {
      setProcessingBuy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 80, display: 'flex', justifyContent: 'center' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!inst) {
    return (
      <div className="empty-state card">
        <div className="empty-icon">❓</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>乐器不存在或已下架</div>
      </div>
    );
  }

  const daysAgo = Math.floor((Date.now() - new Date(inst.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const hoursAgo = Math.floor((Date.now() - new Date(inst.created_at).getTime()) / (1000 * 60 * 60));

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {txResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
          style={{ padding: 20, marginBottom: 20, background: 'linear-gradient(135deg, rgba(34,197,94,0.1), #ffffff)', borderLeft: '4px solid #22C55E' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#22C55E', marginBottom: 4 }}>✅ 下单成功！担保交易已创建</div>
              <div style={{ fontSize: 13, color: '#5c554d' }}>订单号：{txResult.id} · 款项已由平台托管，等待卖家发货</div>
            </div>
            <button className="wood-btn" onClick={() => navigate(`/transaction/${txResult.id}`)} style={{ width: 160 }}>
              查看订单详情 →
            </button>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{ padding: 28, marginBottom: 24 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1fr', gap: 32 }}>
          <div>
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
              <img src={inst.thumbnail} alt={inst.name} style={{ width: '100%', height: 380, objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', top: 14, left: 14 }}>
                <GradeBadge grade={inst.grade} size="lg" />
              </div>
              <div style={{ position: 'absolute', bottom: 14, right: 14, background: 'rgba(139, 94, 60, 0.92)', color: '#fff', padding: '8px 14px', borderRadius: 10, fontWeight: 700, fontSize: 15 }}>
                验机 {inst.overall_score} 分
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <span className="tag">{inst.type_name}</span>
              <span className="tag" style={{ background: `${inst.grade_color}20`, color: inst.grade_color }}>
                {inst.grade}级验机
              </span>
              <span className="tag">{inst.year}年购入</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#2d2a26', marginBottom: 10, lineHeight: 1.25 }}>
              {inst.name}
            </h1>
            <div style={{ fontSize: 14, color: '#8c7b6a', marginBottom: 16 }}>
              品牌：{inst.brand} · 发布于 {daysAgo === 0 ? `${hoursAgo}小时前` : `${daysAgo}天前`} · {inst.location}
            </div>
            <div style={{ background: 'rgba(139, 94, 60, 0.06)', padding: 18, borderRadius: 14, marginBottom: 18 }}>
              <div style={{ fontSize: 13, color: '#8c7b6a', marginBottom: 4 }}>担保交易价</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: '#8B5E3C', letterSpacing: -1, lineHeight: 1 }}>
                ¥{inst.price.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: '#a89684', marginTop: 6 }}>
                🔒 平台资金托管 · 48小时验货期 · 满意后放款
              </div>
            </div>
            <div style={{ fontSize: 14, color: '#5c554d', lineHeight: 1.8, marginBottom: 20, flex: 1 }}>
              {inst.description}
            </div>

            <motion.div
              className="card"
              style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'none', background: '#faf8f5' }}
            >
              <div style={{ fontSize: 40 }}>🎸</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#2d2a26', marginBottom: 2 }}>{inst.seller_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StarRating value={4.7} />
                  <span style={{ fontSize: 12, color: '#8c7b6a' }}>4.7 · 128笔评价</span>
                </div>
              </div>
            </motion.div>

            <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
              <button className="wood-btn" onClick={() => setShowBuyModal(true)} disabled={inst.status !== 'available'}>
                {inst.status === 'available' ? '🛒 担保购买' : '已售出'}
              </button>
              <button className="wood-btn-outline" onClick={() => navigate('/search')} style={{ width: 140 }}>
                继续浏览
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {showBuyModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !processingBuy && setShowBuyModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ padding: 28, maxWidth: 460, width: '100%' }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: '#2d2a26', marginBottom: 6 }}>确认购买</div>
            <div style={{ fontSize: 13, color: '#8c7b6a', marginBottom: 20 }}>请确认以下担保交易条款</div>

            <div style={{ background: '#faf8f5', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#8c7b6a' }}>商品</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2d2a26' }}>{inst.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#8c7b6a' }}>验机保障</span>
                <span className="tag" style={{ fontSize: 11 }}>{inst.grade}级 / {inst.overall_score}分</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#8c7b6a' }}>交易方式</span>
                <span style={{ fontSize: 13, color: '#22C55E', fontWeight: 600 }}>🔒 平台担保</span>
              </div>
              <div style={{ height: 1, background: '#e8e0d6', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#2d2a26' }}>实付金额</span>
                <span style={{ fontSize: 26, fontWeight: 900, color: '#8B5E3C' }}>¥{inst.price.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ fontSize: 12, color: '#5c554d', lineHeight: 1.8, marginBottom: 20, padding: 12, background: 'rgba(34,197,94,0.06)', borderRadius: 10 }}>
              <div>✔️ 款项由乐验通平台代管，卖家暂不可提现</div>
              <div>✔️ 您确认收货后有48小时验货期</div>
              <div>✔️ 如有不符，可提交证据平台介入仲裁</div>
              <div>✔️ 验货无误后放款，买卖双方互评</div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="wood-btn-outline" onClick={() => setShowBuyModal(false)} disabled={processingBuy}>
                取消
              </button>
              <button className="wood-btn" onClick={handleBuy} disabled={processingBuy} style={{ flex: 1, width: 'auto' }}>
                {processingBuy ? '处理中...' : '确认付款 ¥' + inst.price.toLocaleString()}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <InspectionReport reportId={inst.report_id} canRegenerate={false} />
    </div>
  );
};

export default DetailPage;
