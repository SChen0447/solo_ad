import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';

interface StatsPanelProps {
  fullPage: boolean;
}

interface StatsData {
  totalShowsThisYear: number;
  totalEquipment: number;
  lowStockItems: InventoryItem[];
  showsByMonth: { month: string; count: number }[];
}

const StatsPanel: React.FC<StatsPanelProps> = ({ fullPage }) => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const DonutChart: React.FC<{ value: number; maxValue: number; size?: number }> = ({
    value,
    maxValue,
    size = 140
  }) => {
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2a3a5c"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#4ECDC4"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text
          x={size / 2}
          y={size / 2 - 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#e0e0e0"
          fontSize="28"
          fontWeight="bold"
        >
          {value}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 15}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#a0a0c0"
          fontSize="12"
        >
          场演出
        </text>
      </svg>
    );
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'rgba(22, 33, 62, 0.9)',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid rgba(255,255,255,0.1)'
  };

  const fullPageStyle: React.CSSProperties = fullPage ? {
    maxWidth: '800px',
    margin: '0 auto'
  } : {};

  if (loading && !stats) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#a0a0c0' }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={fullPageStyle}>
      {fullPage && (
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
          📊 数据统计
        </h2>
      )}

      <div style={cardStyle}>
        <h3 style={{
          fontSize: '14px',
          color: '#a0a0c0',
          marginBottom: '16px',
          fontWeight: '500'
        }}>
          本年度已演出
        </h3>
        <DonutChart
          value={stats?.totalShowsThisYear || 0}
          maxValue={Math.max(20, (stats?.totalShowsThisYear || 0) * 2)}
          size={fullPage ? 180 : 140}
        />
        
        {fullPage && stats?.showsByMonth && stats.showsByMonth.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ fontSize: '14px', color: '#a0a0c0', marginBottom: '12px' }}>月度分布</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.showsByMonth.map((item) => (
                <div key={item.month} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '40px', fontSize: '12px', color: '#a0a0c0' }}>{item.month}</span>
                  <div style={{
                    flex: 1,
                    height: '8px',
                    backgroundColor: '#2a3a5c',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(item.count / Math.max(...stats.showsByMonth.map(s => s.count))) * 100}%`,
                      height: '100%',
                      backgroundColor: '#4ECDC4',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <span style={{ width: '30px', fontSize: '12px', textAlign: 'right' }}>{item.count}场</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{
          fontSize: '14px',
          color: '#a0a0c0',
          marginBottom: '16px',
          fontWeight: '500'
        }}>
          设备总数
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div style={{
            fontSize: fullPage ? '60px' : '48px',
            lineHeight: 1
          }}>
            🎸
          </div>
          <div style={{
            fontSize: fullPage ? '48px' : '36px',
            fontWeight: 'bold',
            color: '#FFEAA7'
          }}>
            {stats?.totalEquipment || 0}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '8px', color: '#a0a0c0', fontSize: '13px' }}>
          件设备在库
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{
          fontSize: '14px',
          color: '#a0a0c0',
          marginBottom: '16px',
          fontWeight: '500'
        }}>
          库存预警
        </h3>
        {stats?.lowStockItems && stats.lowStockItems.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stats.lowStockItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px',
                  backgroundColor: 'rgba(255, 107, 107, 0.1)',
                  borderRadius: '6px'
                }}
              >
                <span style={{
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#FF6B6B',
                  borderRadius: '50%',
                  flexShrink: 0,
                  boxShadow: '0 0 8px rgba(255, 107, 107, 0.6)'
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px',
                    color: '#e0e0e0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#FF6B6B' }}>
                    仅剩 {item.stock} 件
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: '#4ECDC4',
            fontSize: '13px'
          }}>
            ✓ 库存状态良好
          </div>
        )}
      </div>

      <div style={{
        textAlign: 'center',
        fontSize: '11px',
        color: '#666',
        marginTop: '10px'
      }}>
        每 5 秒自动刷新
      </div>
    </div>
  );
};

export default StatsPanel;
