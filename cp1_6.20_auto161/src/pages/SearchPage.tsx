import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
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

const gradeOptions: { value: Grade | ''; label: string }[] = [
  { value: '', label: '全部评级' },
  { value: 'S', label: 'S级 (90+)' },
  { value: 'A', label: 'A级 (80-89)' },
  { value: 'B', label: 'B级 (70-79)' },
  { value: 'C', label: 'C级 (60-69)' },
  { value: 'D', label: 'D级 (<60)' },
];

const priceRanges = [
  { label: '全部', min: undefined, max: undefined },
  { label: '¥5000以下', min: undefined, max: 5000 },
  { label: '¥5000-10000', min: 5000, max: 10000 },
  { label: '¥10000-20000', min: 10000, max: 20000 },
  { label: '¥20000-50000', min: 20000, max: 50000 },
  { label: '¥50000以上', min: 50000, max: undefined },
];

const SearchPage: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [debouncedKw, setDebouncedKw] = useState('');
  const [filterType, setFilterType] = useState<InstrumentType | ''>('');
  const [filterGrade, setFilterGrade] = useState<Grade | ''>('');
  const [priceIdx, setPriceIdx] = useState(0);
  const [page, setPage] = useState(1);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKw(keyword), 350);
    return () => clearTimeout(t);
  }, [keyword]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const range = priceRanges[priceIdx];
      const res = await api.getInstruments({
        keyword: debouncedKw || undefined,
        type: filterType || undefined,
        grade: filterGrade || undefined,
        min_price: range.min,
        max_price: range.max,
        page,
        per_page: 12,
      });
      setInstruments(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } finally {
      setLoading(false);
    }
  }, [debouncedKw, filterType, filterGrade, priceIdx, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKw, filterType, filterGrade, priceIdx]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#2d2a26', marginBottom: 6 }}>🔍 浏览与搜索乐器</h1>
        <p style={{ fontSize: 13, color: '#8c7b6a' }}>多维度筛选，快速找到心仪的二手乐器</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <div className="label-text">关键词搜索</div>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="输入乐器名称、品牌、型号或描述关键词..."
            className="input-field"
            style={{ fontSize: 15 }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div>
            <div className="label-text">🎵 乐器类型</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {typeOptions.map((opt) => (
                <button
                  key={opt.value || 'all'}
                  onClick={() => setFilterType(opt.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: filterType === opt.value ? 600 : 500,
                    cursor: 'pointer',
                    border: 'none',
                    background: filterType === opt.value ? '#8B5E3C' : 'rgba(139, 94, 60, 0.06)',
                    color: filterType === opt.value ? '#fff' : '#5c554d',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="label-text">⭐ 验机评级</div>
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value as Grade | '')}
              className="input-field"
              style={{ fontSize: 13 }}
            >
              {gradeOptions.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label-text">💰 价格区间</div>
            <select
              value={priceIdx}
              onChange={(e) => setPriceIdx(Number(e.target.value))}
              className="input-field"
              style={{ fontSize: 13 }}
            >
              {priceRanges.map((r, i) => (
                <option key={i} value={i}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: 13, color: '#5c554d' }}>
          找到 <strong style={{ color: '#8B5E3C' }}>{total}</strong> 件符合条件的乐器
        </div>
      </motion.div>

      {loading ? (
        <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
          <div className="loading-spinner" />
        </div>
      ) : instruments.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">🔎</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>没有找到匹配的乐器</div>
          <div style={{ fontSize: 13, color: '#8c7b6a' }}>尝试调整搜索条件或筛选项</div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 20,
              marginBottom: 28,
            }}
          >
            {instruments.map((inst, i) => (
              <InstrumentCard key={inst.id} instrument={inst} index={i} />
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="wood-btn-outline"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ width: 100, height: 38, fontSize: 13 }}
              >
                ← 上一页
              </button>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pg: number;
                  if (totalPages <= 7) {
                    pg = i + 1;
                  } else if (page <= 4) {
                    pg = i + 1;
                  } else if (page >= totalPages - 3) {
                    pg = totalPages - 6 + i;
                  } else {
                    pg = page - 3 + i;
                  }
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: page === pg ? 700 : 500,
                        background: page === pg ? '#8B5E3C' : 'rgba(139, 94, 60, 0.06)',
                        color: page === pg ? '#fff' : '#5c554d',
                        fontSize: 13,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {pg}
                    </button>
                  );
                })}
              </div>
              <button
                className="wood-btn-outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ width: 100, height: 38, fontSize: 13 }}
              >
                下一页 →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SearchPage;
