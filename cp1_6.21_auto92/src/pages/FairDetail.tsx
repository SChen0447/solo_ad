import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFairById, registerStall, checkInStall, getStallQRCode } from '../api/client';
import type { Fair, Stall } from '../api/client';

interface ToastItem {
  id: number;
  message: string;
}

const CATEGORIES = [
  '手工艺品', '复古服饰', '美食饮料', '艺术画作', '手工饰品',
  '陶瓷器皿', '花艺植物', '文创周边', '古董收藏', '手工皮具',
];

const FairDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [fair, setFair] = useState<Fair | null>(null);
  const [loading, setLoading] = useState(true);
  const [regModal, setRegModal] = useState<{ open: boolean; stallId: string | null }>({ open: false, stallId: null });
  const [vendorName, setVendorName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorCategory, setVendorCategory] = useState('手工艺品');
  const [submitting, setSubmitting] = useState(false);

  const [qrModal, setQrModal] = useState<{ open: boolean; stallId: string | null; qrUrl: string | null }>({ open: false, stallId: null, qrUrl: null });
  const [qrLoading, setQrLoading] = useState(false);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const addToast = (message: string) => {
    const newId = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id: newId, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newId));
    }, 4000);
  };

  const fetchFairData = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getFairById(id);
      setFair(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFairData();
    const interval = setInterval(fetchFairData, 5000);
    return () => clearInterval(interval);
  }, [fetchFairData]);

  const getStallColor = (status: Stall['status']): string => {
    switch (status) {
      case 'available': return '#6B8E6B';
      case 'occupied': return '#D4A843';
      case 'checked-in': return '#C4613A';
      case 'blocked': return '#BFBFBF';
      default: return '#6B8E6B';
    }
  };

  const handleStallClick = (stall: Stall) => {
    if (stall.status === 'blocked' || stall.status === 'checked-in') return;
    if (stall.status === 'occupied') {
      setQrModal({ open: true, stallId: stall.id, qrUrl: null });
      return;
    }
    setRegModal({ open: true, stallId: stall.id });
  };

  const handleRegister = async () => {
    if (!id || !regModal.stallId || !vendorName.trim() || !vendorPhone.trim()) return;
    setSubmitting(true);
    try {
      await registerStall(id, {
        stallId: regModal.stallId,
        vendorName: vendorName.trim(),
        vendorPhone: vendorPhone.trim(),
        vendorCategory,
      });
      setRegModal({ open: false, stallId: null });
      setVendorName('');
      setVendorPhone('');
      setVendorCategory('手工艺品');
      await fetchFairData();
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateQR = async () => {
    if (!id || !qrModal.stallId) return;
    setQrLoading(true);
    try {
      const result = await getStallQRCode(id, qrModal.stallId);
      setQrModal((prev) => ({ ...prev, qrUrl: result.qrDataUrl }));
    } catch {
    } finally {
      setQrLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!id || !qrModal.stallId) return;
    try {
      const result = await checkInStall(id, qrModal.stallId);
      const stall = result.stall;
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      addToast(`新签到：${stall.vendorName || '未知'}，摊位${stall.label}，时间${timeStr}`);
      setQrModal({ open: false, stallId: null, qrUrl: null });
      await fetchFairData();
    } catch {
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#FAF6F0', color: '#3D2B1F', fontSize: 18 }}>
        加载中...
      </div>
    );
  }

  if (!fair) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#FAF6F0', color: '#C4613A', fontSize: 18 }}>
        未找到该市集
      </div>
    );
  }

  const stalls = fair.stalls;
  const totalStalls = stalls.length;
  const occupiedStalls = stalls.filter((s) => s.status === 'occupied').length;
  const checkedInStalls = stalls.filter((s) => s.status === 'checked-in').length;
  const blockedStalls = stalls.filter((s) => s.status === 'blocked').length;
  const registeredTotal = occupiedStalls + checkedInStalls;
  const checkInRate = totalStalls > 0 ? Math.round((checkedInStalls / totalStalls) * 100) : 0;

  const ringRadius = 40;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (ringCircumference * checkInRate) / 100;

  return (
    <div style={{ backgroundColor: '#FAF6F0', minHeight: '100vh', fontFamily: '"Noto Sans SC", sans-serif', color: '#3D2B1F' }}>
      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <div
        style={{
          background: 'linear-gradient(135deg, #8B6914 0%, #A07828 100%)',
          padding: '20px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: '#FFF8F0',
            fontSize: 14,
            cursor: 'pointer',
            padding: '8px 16px',
            borderRadius: 6,
            fontWeight: 500,
          }}
        >
          ← 返回首页
        </button>
        <h1 style={{ color: '#FFF8F0', margin: 0, fontSize: 22, fontWeight: 700 }}>
          {fair.name}
        </h1>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, color: '#8B6914', fontWeight: 500 }}>日期：{fair.date}</div>
            <div style={{ fontSize: 13, color: '#8B7355', marginTop: 4 }}>基础价格：¥{fair.price}/摊位</div>
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #2E4057 0%, #A8D5BA 100%)',
            borderRadius: 16,
            padding: '24px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#fff',
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{totalStalls}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>总摊位</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{registeredTotal}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>已报名</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{checkedInStalls}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>已签到</div>
            </div>
          </div>
          <div style={{ position: 'relative', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={ringRadius} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r={ringRadius}
                fill="none"
                stroke="#fff"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', fontSize: 20, fontWeight: 700 }}>{checkInRate}%</div>
          </div>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#3D2B1F' }}>摊位平面图</h2>
        <div
          style={{
            background: '#FFF8F0',
            borderRadius: 12,
            padding: 20,
            border: '1px solid #E8DFD0',
          }}
        >
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#6B8E6B' }} />
              <span>空闲</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#D4A843' }} />
              <span>已占</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#C4613A' }} />
              <span>已签到</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#BFBFBF' }} />
              <span>不可选</span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 80px)',
              gap: 6,
              justifyContent: 'center',
            }}
          >
            {stalls.map((stall) => (
              <div
                key={stall.id}
                onClick={() => handleStallClick(stall)}
                style={{
                  width: 80,
                  height: 80,
                  backgroundColor: getStallColor(stall.status),
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: stall.status === 'available' || stall.status === 'occupied' ? 'pointer' : 'default',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 14,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  position: 'relative',
                  opacity: stall.status === 'blocked' ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (stall.status === 'available' || stall.status === 'occupied') {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
              >
                <span>{stall.label}</span>
                {stall.status === 'occupied' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setQrModal({ open: true, stallId: stall.id, qrUrl: null });
                    }}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: 'rgba(255,255,255,0.3)',
                      border: 'none',
                      borderRadius: 4,
                      color: '#fff',
                      fontSize: 10,
                      cursor: 'pointer',
                      padding: '2px 5px',
                      lineHeight: 1,
                    }}
                    title="签到二维码"
                  >
                    QR
                  </button>
                )}
                {stall.vendorName && (stall.status === 'occupied' || stall.status === 'checked-in') && (
                  <span style={{ fontSize: 10, fontWeight: 400, marginTop: 2, maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {stall.vendorName}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, fontSize: 13, color: '#8B7355', textAlign: 'center' }}>
            空闲 {totalStalls - registeredTotal - blockedStalls} · 已报名 {registeredTotal} · 已签到 {checkedInStalls} · 不可选 {blockedStalls}
          </div>
        </div>
      </div>

      {regModal.open && (
        <div
          onClick={() => { setRegModal({ open: false, stallId: null }); setVendorName(''); setVendorPhone(''); setVendorCategory('手工艺品'); }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(61,43,31,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFF8F0',
              borderRadius: 16,
              padding: '32px',
              width: 400,
              maxWidth: '90vw',
              boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
              animation: 'scaleIn 0.25s ease',
            }}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: 20, color: '#3D2B1F', fontWeight: 700 }}>摊主报名</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#8B6914', fontWeight: 600 }}>摊主姓名</label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="请输入摊主姓名"
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8DFD0', fontSize: 14, outline: 'none', backgroundColor: '#FAF6F0', color: '#3D2B1F' }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#8B6914', fontWeight: 600 }}>联系电话</label>
              <input
                type="tel"
                value={vendorPhone}
                onChange={(e) => setVendorPhone(e.target.value)}
                placeholder="请输入联系电话"
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8DFD0', fontSize: 14, outline: 'none', backgroundColor: '#FAF6F0', color: '#3D2B1F' }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#8B6914', fontWeight: 600 }}>商品类别</label>
              <select
                value={vendorCategory}
                onChange={(e) => setVendorCategory(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8DFD0', fontSize: 14, outline: 'none', backgroundColor: '#FAF6F0', color: '#3D2B1F', cursor: 'pointer' }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setRegModal({ open: false, stallId: null }); setVendorName(''); setVendorPhone(''); setVendorCategory('手工艺品'); }}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #E8DFD0', backgroundColor: '#FAF6F0', color: '#3D2B1F', cursor: 'pointer', fontSize: 14 }}
              >
                取消
              </button>
              <button
                onClick={handleRegister}
                disabled={submitting || !vendorName.trim() || !vendorPhone.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: submitting ? '#BFBFBF' : '#6B8E6B',
                  color: '#fff',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {submitting ? '提交中...' : '确认报名'}
              </button>
            </div>
          </div>
        </div>
      )}

      {qrModal.open && (
        <div
          onClick={() => setQrModal({ open: false, stallId: null, qrUrl: null })}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(61,43,31,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFF8F0',
              borderRadius: 16,
              padding: '32px',
              width: 360,
              maxWidth: '90vw',
              boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
              textAlign: 'center',
              animation: 'scaleIn 0.25s ease',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 20, color: '#3D2B1F', fontWeight: 700 }}>签到二维码</h3>
            {!qrModal.qrUrl && (
              <button
                onClick={handleGenerateQR}
                disabled={qrLoading}
                style={{
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: qrLoading ? '#BFBFBF' : '#8B6914',
                  color: '#fff',
                  cursor: qrLoading ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                {qrLoading ? '生成中...' : '生成二维码'}
              </button>
            )}
            {qrModal.qrUrl && (
              <div style={{ marginBottom: 16 }}>
                <img
                  src={qrModal.qrUrl}
                  alt="签到二维码"
                  style={{ width: 200, height: 200, borderRadius: 8, border: '2px solid #E8DFD0' }}
                />
              </div>
            )}
            {qrModal.qrUrl && (
              <button
                onClick={handleCheckIn}
                style={{
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#C4613A',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                确认签到
              </button>
            )}
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => setQrModal({ open: false, stallId: null, qrUrl: null })}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E8DFD0', backgroundColor: '#FAF6F0', color: '#3D2B1F', cursor: 'pointer', fontSize: 13 }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              background: '#3D2B1F',
              color: '#FFF8F0',
              padding: '12px 20px',
              borderRadius: 8,
              fontSize: 14,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              animation: 'slideIn 0.3s ease',
              maxWidth: 360,
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FairDetail;
