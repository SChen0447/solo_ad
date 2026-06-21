import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFairs, createFair } from '../api/client';
import type { FairListItem, Fair } from '../api/client';

const COLORS = {
  primaryBg: '#FAF6F0',
  cardBg: '#FFF8F0',
  woodBrown: '#8B6914',
  terracotta: '#C4613A',
  mossGreen: '#6B8E6B',
  text: '#3D2B1F',
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [fairs, setFairs] = useState<FairListItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    date: '',
    totalStalls: 50,
    price: 100,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getFairs()
      .then((data) => setFairs(data))
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.date) return;
    setSubmitting(true);
    try {
      const newFair = await createFair({
        name: form.name.trim(),
        date: form.date,
        totalStalls: form.totalStalls,
        price: form.price,
      });
      const listItem: FairListItem = {
        id: newFair.id,
        name: newFair.name,
        date: newFair.date,
        totalStalls: newFair.totalStalls,
        price: newFair.price,
        occupiedCount: 0,
        checkedInCount: 0,
        createdAt: newFair.createdAt,
      };
      setFairs((prev) => [listItem, ...prev]);
      setModalOpen(false);
      setForm({ name: '', date: '', totalStalls: 50, price: 100 });
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return { month, day };
  };

  return (
    <div style={{ backgroundColor: COLORS.primaryBg, minHeight: '100vh', padding: '0 0 40px' }}>
      <div
        style={{
          background: `linear-gradient(135deg, ${COLORS.woodBrown} 0%, #A07828 100%)`,
          padding: '28px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 12px rgba(139,105,20,0.18)',
        }}
      >
        <h1 style={{ color: '#FFF8F0', margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: 2 }}>
          手工艺市集 · 摊主管理系统
        </h1>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            backgroundColor: COLORS.terracotta,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 24px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(196,97,58,0.35)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(196,97,58,0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(196,97,58,0.35)';
          }}
        >
          + 创建新市集
        </button>
      </div>

      <div style={{ maxWidth: 960, margin: '32px auto 0', padding: '0 24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 24,
          }}
        >
          {fairs.map((fair) => {
            const { month, day } = formatDate(fair.date);
            const registered = fair.occupiedCount ?? 0;
            const total = fair.totalStalls;
            return (
              <div
                key={fair.id}
                onClick={() => navigate(`/fair/${fair.id}`)}
                style={{
                  backgroundColor: COLORS.cardBg,
                  borderRadius: 14,
                  padding: 24,
                  position: 'relative',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(61,43,31,0.07)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(61,43,31,0.13)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 10px rgba(61,43,31,0.07)';
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    backgroundColor: COLORS.terracotta,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    lineHeight: 1,
                    boxShadow: '0 2px 8px rgba(196,97,58,0.3)',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.9 }}>{month}月</span>
                  <span style={{ fontSize: 18, fontWeight: 700, marginTop: 1 }}>{day}</span>
                </div>

                <div
                  style={{
                    color: COLORS.text,
                    fontSize: 18,
                    fontWeight: 600,
                    marginTop: 8,
                    marginLeft: 68,
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {fair.name}
                </div>

                <div
                  style={{
                    textAlign: 'right',
                    marginTop: 20,
                    fontSize: 14,
                    color: COLORS.mossGreen,
                    fontWeight: 500,
                  }}
                >
                  {registered}/{total}已报名
                </div>
              </div>
            );
          })}
        </div>

        {fairs.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: COLORS.woodBrown,
              opacity: 0.6,
              marginTop: 80,
              fontSize: 16,
            }}
          >
            暂无市集，点击右上角创建第一个市集吧
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(61,43,31,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: COLORS.cardBg,
              borderRadius: 16,
              padding: '32px 36px',
              width: 420,
              maxWidth: '90vw',
              boxShadow: '0 12px 40px rgba(61,43,31,0.2)',
              animation: 'modalIn 0.25s ease-out',
            }}
          >
            <style>{`
              @keyframes modalIn {
                from { opacity: 0; transform: scale(0.92); }
                to { opacity: 1; transform: scale(1); }
              }
            `}</style>
            <h2
              style={{
                color: COLORS.text,
                fontSize: 20,
                fontWeight: 700,
                margin: '0 0 24px',
              }}
            >
              创建新市集
            </h2>

            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block' }}>
                市集名称
              </span>
              <input
                type="text"
                maxLength={50}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="请输入市集名称"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 14px',
                  border: '1.5px solid #D9CFC2',
                  borderRadius: 8,
                  fontSize: 14,
                  color: COLORS.text,
                  backgroundColor: '#fff',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = COLORS.woodBrown)}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#D9CFC2')}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block' }}>
                市集日期
              </span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 14px',
                  border: '1.5px solid #D9CFC2',
                  borderRadius: 8,
                  fontSize: 14,
                  color: COLORS.text,
                  backgroundColor: '#fff',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = COLORS.woodBrown)}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#D9CFC2')}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block' }}>
                摊位总数
              </span>
              <input
                type="number"
                min={1}
                max={200}
                value={form.totalStalls}
                onChange={(e) => {
                  const v = Math.min(200, Math.max(1, Number(e.target.value) || 1));
                  setForm((f) => ({ ...f, totalStalls: v }));
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 14px',
                  border: '1.5px solid #D9CFC2',
                  borderRadius: 8,
                  fontSize: 14,
                  color: COLORS.text,
                  backgroundColor: '#fff',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = COLORS.woodBrown)}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#D9CFC2')}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 24 }}>
              <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block' }}>
                基础价格（元）
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={form.price}
                onChange={(e) => {
                  const v = Math.max(0, Math.floor(Number(e.target.value) || 0));
                  setForm((f) => ({ ...f, price: v }));
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 14px',
                  border: '1.5px solid #D9CFC2',
                  borderRadius: 8,
                  fontSize: 14,
                  color: COLORS.text,
                  backgroundColor: '#fff',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = COLORS.woodBrown)}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#D9CFC2')}
              />
            </label>

            <button
              onClick={handleCreate}
              disabled={submitting || !form.name.trim() || !form.date}
              style={{
                width: '100%',
                padding: '12px 0',
                border: 'none',
                borderRadius: 8,
                backgroundColor:
                  submitting || !form.name.trim() || !form.date ? '#C4B9A8' : COLORS.woodBrown,
                color: '#fff',
                fontSize: 16,
                fontWeight: 600,
                cursor: submitting || !form.name.trim() || !form.date ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              {submitting ? '创建中...' : '确认创建'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
