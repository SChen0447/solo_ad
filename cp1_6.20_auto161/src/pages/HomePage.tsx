import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import InstrumentCard from '../components/InstrumentCard';
import type { Instrument, InstrumentType, Grade } from '../types';

const typeOptions: { value: InstrumentType | ''; label: string; icon: string }[] = [
  { value: '', label: '全部', icon: '🎵' },
  { value: 'guitar', label: '吉他', icon: '🎸' },
  { value: 'violin', label: '小提琴', icon: '🎻' },
  { value: 'saxophone', label: '萨克斯', icon: '🎷' },
  { value: 'keyboard', label: '电子琴', icon: '🎹' },
];

const gradeOptions: { value: Grade | ''; label: string; color: string }[] = [
  { value: '', label: '全部', color: '#8c7b6a' },
  { value: 'S', label: 'S级', color: '#FFD700' },
  { value: 'A', label: 'A级', color: '#22C55E' },
  { value: 'B', label: 'B级', color: '#3B82F6' },
  { value: 'C', label: 'C级', color: '#F97316' },
  { value: 'D', label: 'D级', color: '#EF4444' },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState<InstrumentType | ''>('');
  const [filterGrade, setFilterGrade] = useState<Grade | ''>('');

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await api.getInstruments({
        type: filterType || undefined,
        grade: filterGrade || undefined,
        per_page: 12,
      });
      setInstruments(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, [filterType, filterGrade]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{
          padding: '36px 40px',
          marginBottom: 28,
          background: 'linear-gradient(135deg, #8B5E3C 0%, #a67c52 100%)',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', right: -30, top: -30, fontSize: 220, opacity: 0.12, lineHeight: 1 }}>🎸</div>
        <div style={{ position: 'relative', maxWidth: 600 }}>
          <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 10, letterSpacing: 1 }}>
            乐验通 · 二手乐器验机与交易保障
          </div>
          <div style={{ fontSize: 15, opacity: 0.92, lineHeight: 1.7, marginBottom: 20 }}>
            标准化5步验机流程，AI自动生成权威检测报告，担保交易+48小时验货期，
            让每一次二手乐器交易都安心透明。
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/listing')}
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                background: '#ffffff',
                color: '#8B5E3C',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'none')}
            >
              📸 发布验机申请
            </button>
            <button
              onClick={() => navigate('/search')}
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.18)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                border: '1.5px solid rgba(255,255,255,0.4)',
                backdropFilter: 'blur(4px)',
                transition: 'all 0.15s ease',
              }}
            >
              🔍 浏览二手乐器
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, flexWrap: 'wrap', gap: 16 }}
      >
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#2d2a26', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔥</span>
            <span>最新上架 · 已验机</span>
          </h2>
          <div style={{ fontSize: 13, color: '#8c7b6a', marginTop: 4 }}>
            共 {total} 件待售乐器 · 全部经平台标准化验机
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="card"
        style={{ padding: 14, marginBottom: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#5c554d', marginRight: 4 }}>🎵 类型：</span>
          {typeOptions.map((opt) => (
            <button
              key={`t-${opt.value}`}
              onClick={() => setFilterType(opt.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: filterType === opt.value ? 600 : 500,
                cursor: 'pointer',
                border: 'none',
                background: filterType === opt.value ? '#8B5E3C' : 'rgba(139, 94, 60, 0.06)',
                color: filterType === opt.value ? '#fff' : '#5c554d',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
          <span style={{ fontSize: 13, fontWeight: 600, color: '#5c554d', margin: '0 4px 0 12px' }}>⭐ 评级：</span>
          {gradeOptions.map((opt) => (
            <button
              key={`g-${opt.value}`}
              onClick={() => setFilterGrade(opt.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: filterGrade === opt.value ? 700 : 500,
                cursor: 'pointer',
                border: filterGrade === opt.value ? `2px solid ${opt.color}` : '2px solid transparent',
                background: filterGrade === opt.value ? `${opt.color}20` : 'rgba(139, 94, 60, 0.06)',
                color: filterGrade === opt.value ? opt.color : '#5c554d',
                transition: 'all 0.15s ease',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
          <div className="loading-spinner" />
        </div>
      ) : instruments.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">🎵</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>暂无符合条件的乐器</div>
          <div style={{ fontSize: 13, color: '#8c7b6a' }}>试试调整筛选条件</div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 20,
          }}
        >
          {instruments.map((inst, i) => (
            <InstrumentCard key={inst.id} instrument={inst} index={i} />
          ))}
        </div>
      )}

      {total > 12 && (
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <button className="wood-btn-outline" onClick={() => navigate('/search')} style={{ width: 200 }}>
            查看全部 {total} 件 →
          </button>
        </div>
      )}
    </div>
  );
};

export default HomePage;
