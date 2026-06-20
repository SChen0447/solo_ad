import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchItemById, requestExchange, type Item } from '../api';

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 300,
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
};

const sheetStyle: React.CSSProperties = {
  background: '#FFF9F0', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520,
  maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp 0.3s ease forwards',
};

const btnStyle: React.CSSProperties = {
  padding: '14px 0', borderRadius: 8, border: 'none',
  background: 'linear-gradient(135deg, #FF9F43, #FF6B35)',
  color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer',
  width: '100%', transition: 'transform 0.15s, box-shadow 0.15s',
};

const confirmOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
  backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400,
};

const confirmBox: React.CSSProperties = {
  background: 'rgba(255,255,255,0.85)', borderRadius: 16, padding: 28, width: 340, textAlign: 'center',
  backdropFilter: 'blur(8px)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
};

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [exchangeMsg, setExchangeMsg] = useState('我想交换这个物品');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchItemById(id)
      .then(setItem)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 80 }}>加载中...</div>;
  if (!item) return <div style={{ textAlign: 'center', paddingTop: 80 }}>物品不存在</div>;

  const handleExchange = async () => {
    try {
      await requestExchange(item.id, {
        requesterId: 'user1',
        requesterName: '小王',
        message: exchangeMsg,
      });
      setSent(true);
      setShowConfirm(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      <div style={overlayStyle} onClick={() => navigate(-1)}>
        <div style={sheetStyle} onClick={e => e.stopPropagation()}>
          <img src={item.imageUrl} alt={item.title} style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: '20px 20px 0 0' }} />

          <div style={{ padding: '20px 20px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 12, background: '#FFF0E5', color: '#FF6B35' }}>{item.condition}</span>
              <span style={{ fontSize: 12, color: '#999' }}>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</span>
            </div>

            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#333' }}>{item.title}</h2>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#666', lineHeight: 1.6 }}>{item.description}</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <img src={item.ownerAvatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
              <span style={{ fontSize: 14, color: '#555' }}>{item.ownerName}</span>
            </div>

            {sent ? (
              <div style={{ textAlign: 'center', padding: 14, borderRadius: 8, background: '#E8F5E9', color: '#2E7D32', fontWeight: 600 }}>
                ✓ 交换请求已发送！
              </div>
            ) : (
              <button
                style={btnStyle}
                onClick={() => setShowConfirm(true)}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(255,159,67,0.4), 0 0 40px rgba(255,107,53,0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                申请交换
              </button>
            )}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div style={confirmOverlay} onClick={() => setShowConfirm(false)}>
          <div style={confirmBox} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 12px', color: '#FF6B35', fontSize: 18 }}>确认交换请求</h4>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#666' }}>确定要向 {item.ownerName} 申请交换「{item.title}」吗？</p>
            <textarea
              value={exchangeMsg}
              onChange={e => setExchangeMsg(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #E0D5C5', fontSize: 14, resize: 'vertical', marginBottom: 16, fontFamily: 'inherit' }}
              rows={2}
              placeholder="给物主留言..."
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 14 }}>取消</button>
              <button onClick={handleExchange} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #FF9F43, #FF6B35)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>确认</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
