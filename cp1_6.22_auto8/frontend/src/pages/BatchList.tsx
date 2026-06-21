import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CircularProgress from '../components/CircularProgress';
import { BEAN_TYPES, FLAVOR_DIMENSIONS } from '../types';
import type { RoastBatch } from '../types';
import { batchApi } from '../utils/api';

const BatchList: React.FC = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<RoastBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBeanId, setSelectedBeanId] = useState<string>('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [flavorFilters, setFlavorFilters] = useState<Record<string, number>>({});

  const sentinelRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);

  const loadBatches = useCallback(async (reset = false) => {
    if (loadingRef.current) return;
    if (!reset && !hasMore) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const offset = reset ? 0 : offsetRef.current;
      const result = await batchApi.list(offset, 20, selectedBeanId ? { beanId: selectedBeanId } : undefined);

      if (result.success) {
        const newBatches = result.data;

        const filteredBatches = newBatches.filter(batch => {
          if (dateStart && batch.date < dateStart) return false;
          if (dateEnd && batch.date > dateEnd) return false;

          for (const [flavor, minScore] of Object.entries(flavorFilters)) {
            if (minScore > 0) {
              const flavorScore = batch.flavors.find(f => f.name === flavor);
              if (!flavorScore || flavorScore.score < minScore) return false;
            }
          }

          return true;
        });

        if (reset) {
          setBatches(filteredBatches);
        } else {
          setBatches(prev => [...prev, ...filteredBatches]);
        }

        offsetRef.current = offset + newBatches.length;
        setHasMore(newBatches.length === 20);
      }
    } catch (error) {
      console.error('Failed to load batches:', error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [selectedBeanId, dateStart, dateEnd, flavorFilters, hasMore]);

  useEffect(() => {
    offsetRef.current = 0;
    setBatches([]);
    setHasMore(true);
    loadBatches(true);
  }, [selectedBeanId, dateStart, dateEnd, flavorFilters]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingRef.current && hasMore) {
          loadBatches(false);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadBatches]);

  const getBeanInfo = (beanId: string) => {
    return BEAN_TYPES.find(b => b.id === beanId) || { name: beanId, gradient: '#8B4513', colorStart: '#8B4513', colorEnd: '#654321' };
  };

  const getAvgScore = (batch: RoastBatch) => {
    return batch.flavors.reduce((sum, f) => sum + f.score, 0) / batch.flavors.length;
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      } else if (prev.length < 3) {
        return [...prev, id];
      }
      return prev;
    });
  };

  const handleCompare = () => {
    if (selectedIds.length > 0) {
      navigate(`/compare?ids=${selectedIds.join(',')}`);
    }
  };

  const handleFlavorFilterChange = (flavor: string, value: number) => {
    setFlavorFilters(prev => ({
      ...prev,
      [flavor]: value,
    }));
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', animation: 'fadeInUp 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ color: '#4A2C1A', fontSize: '28px', margin: 0 }}>
          烘焙历史
        </h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {selectedIds.length > 0 && (
            <button
              onClick={handleCompare}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #4682B4, #2E5984)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(70, 130, 180, 0.3)',
              }}
            >
              对比选中 ({selectedIds.length}/3)
            </button>
          )}
          <button
            onClick={() => navigate('/new')}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #8B4513, #654321)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(139, 69, 19, 0.3)',
            }}
          >
            + 新建批次
          </button>
        </div>
      </div>

      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 4px 20px rgba(74, 44, 26, 0.08)',
        marginBottom: '24px',
      }}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: '#8B4513',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '0',
          }}
        >
          <span>{showFilters ? '▼' : '▶'}</span>
          筛选条件
        </button>

        {showFilters && (
          <div style={{ marginTop: '20px', animation: 'fadeInUp 0.3s ease-out' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#6B4423', fontSize: '14px', marginBottom: '10px', fontWeight: 600 }}>
                豆种
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  onClick={() => setSelectedBeanId('')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '16px',
                    border: selectedBeanId === '' ? '2px solid #8B4513' : '1px solid #D4C4B0',
                    background: selectedBeanId === '' ? '#8B4513' : '#fff',
                    color: selectedBeanId === '' ? '#fff' : '#6B4423',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  全部
                </button>
                {BEAN_TYPES.map(bean => (
                  <button
                    key={bean.id}
                    onClick={() => setSelectedBeanId(bean.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '16px',
                      border: selectedBeanId === bean.id ? '2px solid #4A2C1A' : '1px solid transparent',
                      background: bean.gradient,
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      opacity: selectedBeanId === bean.id ? 1 : 0.85,
                    }}
                  >
                    {bean.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', color: '#6B4423', fontSize: '13px', marginBottom: '6px' }}>
                  开始日期
                </label>
                <input
                  type="date"
                  value={dateStart}
                  onChange={e => setDateStart(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D4C4B0',
                    fontSize: '13px',
                    color: '#4A2C1A',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#6B4423', fontSize: '13px', marginBottom: '6px' }}>
                  结束日期
                </label>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={e => setDateEnd(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D4C4B0',
                    fontSize: '13px',
                    color: '#4A2C1A',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: '#6B4423', fontSize: '14px', marginBottom: '10px', fontWeight: 600 }}>
                风味维度最低分
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {FLAVOR_DIMENSIONS.map(flavor => (
                  <div key={flavor}>
                    <label style={{ display: 'block', color: '#6B4423', fontSize: '12px', marginBottom: '4px' }}>
                      {flavor}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={flavorFilters[flavor] || 0}
                      onChange={e => handleFlavorFilterChange(flavor, Number(e.target.value))}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #D4C4B0',
                        fontSize: '13px',
                        color: '#4A2C1A',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {batches.length === 0 && !loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9C8B7A' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>☕</div>
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>还没有烘焙记录</p>
          <button
            onClick={() => navigate('/new')}
            style={{
              padding: '12px 28px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #8B4513, #654321)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(139, 69, 19, 0.3)',
            }}
          >
            创建第一条记录
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
        }}>
          {batches.map(batch => {
            const bean = getBeanInfo(batch.beanId);
            const avgScore = getAvgScore(batch);
            const isSelected = selectedIds.includes(batch.id);

            return (
              <div
                key={batch.id}
                onClick={() => toggleSelect(batch.id)}
                style={{
                  background: '#fff',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: isSelected
                    ? '0 4px 20px rgba(139, 69, 19, 0.25)'
                    : '0 4px 20px rgba(74, 44, 26, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: isSelected ? 'translateY(-4px)' : 'translateY(0)',
                  border: isSelected ? '2px solid #8B4513' : '2px solid transparent',
                  position: 'relative',
                }}
              >
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#8B4513',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    zIndex: 10,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}>
                    ✓
                  </div>
                )}

                <div style={{
                  padding: '16px 20px 12px',
                  background: bean.gradient,
                  color: '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                    {bean.name}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>
                    {batch.date}
                  </div>
                </div>

                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#9C8B7A', marginBottom: '2px' }}>烘焙时长</div>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: '#4A2C1A' }}>{batch.duration}分钟</div>
                    </div>
                    <CircularProgress value={avgScore} max={10} size={56} strokeWidth={5} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div style={{ color: '#6B4423' }}>
                      入豆: <span style={{ fontWeight: 600, color: '#4A2C1A' }}>{batch.inTemp}°C</span>
                    </div>
                    <div style={{ color: '#6B4423' }}>
                      出豆: <span style={{ fontWeight: 600, color: '#4A2C1A' }}>{batch.outTemp}°C</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div ref={sentinelRef} style={{ height: '40px', margin: '20px 0', textAlign: 'center' }}>
        {loading && <span style={{ color: '#9C8B7A', fontSize: '14px' }}>加载中...</span>}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default BatchList;
