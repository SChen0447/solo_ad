import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MultiTemperatureCurve from '../components/MultiTemperatureCurve';
import MultiRadarChart from '../components/MultiRadarChart';
import { BEAN_TYPES, FLAVOR_DIMENSIONS } from '../types';
import type { RoastBatch } from '../types';
import { batchApi } from '../utils/api';

const COMPARE_COLORS = ['#8B4513', '#4682B4', '#2E8B57'];

const Compare: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [batches, setBatches] = useState<RoastBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const queryParams = new URLSearchParams(location.search);
  const idsParam = queryParams.get('ids');
  const initialIds = idsParam ? idsParam.split(',').map(Number) : [];

  useEffect(() => {
    const fetchBatches = async () => {
      if (initialIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await batchApi.compare(initialIds);
        if (result.success) {
          setBatches(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch batches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, [idsParam]);

  const getBeanInfo = (beanId: string) => {
    return BEAN_TYPES.find(b => b.id === beanId) || { name: beanId, colorStart: '#8B4513', colorEnd: '#654321' };
  };

  const calculateStats = () => {
    if (batches.length === 0) return null;

    const stats = FLAVOR_DIMENSIONS.map(dim => {
      const scores = batches.map(b => {
        const flavor = b.flavors.find(f => f.name === dim);
        return flavor?.score || 0;
      });
      const max = Math.max(...scores);
      const min = Math.min(...scores);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      return { dimension: dim, max, min, avg, scores };
    });

    return stats;
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#6B4423' }}>
        加载中...
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <h2 style={{ color: '#4A2C1A', marginBottom: '16px' }}>还没有选择对比批次</h2>
        <p style={{ color: '#6B4423', marginBottom: '24px' }}>
          请先从历史记录中选择最多 3 条记录进行对比
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '12px 32px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #8B4513, #654321)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(139, 69, 19, 0.3)',
          }}
        >
          返回历史记录
        </button>
      </div>
    );
  }

  const radarData = batches.map((batch, index) => ({
    flavors: batch.flavors,
    color: COMPARE_COLORS[index % COMPARE_COLORS.length],
    label: getBeanInfo(batch.beanId).name,
  }));

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px', animation: 'fadeInUp 0.3s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: '#6B4423',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '8px 12px',
            marginRight: '16px',
          }}
        >
          ← 返回
        </button>
        <h1 style={{ color: '#4A2C1A', fontSize: '26px', margin: 0, flex: 1 }}>
          批次对比
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {batches.map((batch, index) => {
          const bean = getBeanInfo(batch.beanId);
          return (
            <div
              key={batch.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                borderRadius: '12px',
                background: '#fff',
                boxShadow: '0 2px 10px rgba(74, 44, 26, 0.08)',
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: COMPARE_COLORS[index % COMPARE_COLORS.length],
                }}
              />
              <span style={{ color: '#4A2C1A', fontSize: '14px', fontWeight: 600 }}>
                {bean.name}
              </span>
              <span style={{ color: '#9C8B7A', fontSize: '13px' }}>
                {batch.date}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(74, 44, 26, 0.08)',
        marginBottom: '24px',
      }}>
        <h2 style={{ color: '#4A2C1A', fontSize: '18px', marginBottom: '16px' }}>
          温度曲线对比
        </h2>
        <MultiTemperatureCurve batches={batches} colors={COMPARE_COLORS} />
      </div>

      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(74, 44, 26, 0.08)',
        marginBottom: '24px',
      }}>
        <h2 style={{ color: '#4A2C1A', fontSize: '18px', marginBottom: '16px' }}>
          风味雷达图对比
        </h2>
        <MultiRadarChart dataSets={radarData} size={400} />
      </div>

      {stats && (
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(74, 44, 26, 0.08)',
        }}>
          <h2 style={{ color: '#4A2C1A', fontSize: '18px', marginBottom: '20px' }}>
            差异摘要
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E8DFD5' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#6B4423', fontWeight: 600, fontSize: '14px' }}>
                    风味维度
                  </th>
                  {batches.map((batch, index) => (
                    <th key={batch.id} style={{ textAlign: 'center', padding: '12px 8px', color: COMPARE_COLORS[index], fontWeight: 600, fontSize: '14px' }}>
                      {getBeanInfo(batch.beanId).name}
                    </th>
                  ))}
                  <th style={{ textAlign: 'center', padding: '12px 8px', color: '#6B4423', fontWeight: 600, fontSize: '14px' }}>
                    最大值
                  </th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', color: '#6B4423', fontWeight: 600, fontSize: '14px' }}>
                    最小值
                  </th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', color: '#6B4423', fontWeight: 600, fontSize: '14px' }}>
                    平均值
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat, rowIndex) => (
                  <tr key={stat.dimension} style={{
                    borderBottom: '1px solid #F0E6D8',
                    background: rowIndex % 2 === 0 ? '#FFFAF0' : '#fff',
                  }}>
                    <td style={{ padding: '12px 8px', color: '#4A2C1A', fontWeight: 500, fontSize: '14px' }}>
                      {stat.dimension}
                    </td>
                    {batches.map((batch, batchIndex) => {
                      const score = stat.scores[batchIndex];
                      const diff = score - stat.avg;
                      return (
                        <td key={batch.id} style={{ textAlign: 'center', padding: '12px 8px', fontSize: '14px' }}>
                          <span style={{ fontWeight: 600, color: COMPARE_COLORS[batchIndex] }}>
                            {score}
                          </span>
                          {diff !== 0 && (
                            <span style={{
                              marginLeft: '6px',
                              fontSize: '12px',
                              color: diff > 0 ? '#2E8B57' : '#DC143C',
                            }}>
                              {diff > 0 ? '↑' : '↓'}
                              {Math.abs(diff).toFixed(1)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center', padding: '12px 8px', fontSize: '14px', color: '#2E8B57', fontWeight: 600 }}>
                      {stat.max}
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 8px', fontSize: '14px', color: '#DC143C', fontWeight: 600 }}>
                      {stat.min}
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 8px', fontSize: '14px', color: '#6B4423', fontWeight: 600 }}>
                      {stat.avg.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

export default Compare;
