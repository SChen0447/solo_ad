import React, { useState, useEffect, useCallback } from 'react';

interface LowStockItem {
  id: string;
  name: string;
  stock: number;
  initialStock: number;
  percentage: number;
}

interface StatsData {
  eventsThisYear: number;
  totalEvents: number;
  totalEquipment: number;
  equipmentCount: number;
  lowStockItems: LowStockItem[];
}

const StatsPanel: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const DonutChart: React.FC<{ value: number; max: number; label: string }> = ({ value, max, label }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    const size = 120;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="donut-chart-container">
        <svg width={size} height={size} className="donut-chart">
          <circle
            stroke="rgba(255,255,255,0.1)"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            stroke="#4ECDC4"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            r={radius}
            cx={size / 2}
            cy={size / 2}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
          <text
            x="50%"
            y="45%"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="28"
            fontWeight="700"
            fill="#e0e0e0"
          >
            {value}
          </text>
          <text
            x="50%"
            y="62%"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="11"
            fill="#888"
          >
            / {max} 场
          </text>
        </svg>
        <div className="donut-label">{label}</div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="stats-panel">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="stats-page">
      <div className="stats-panel-glass">
        <h2 className="panel-title">数据统计</h2>
        <div className="stats-cards">
          <div className="stats-card">
            <div className="card-header">
              <span className="card-icon">🎤</span>
              <span className="card-title">本年度演出</span>
            </div>
            <div className="card-content chart-content">
              <DonutChart
                value={stats?.eventsThisYear || 0}
                max={stats?.totalEvents || 0}
                label="已演出场次"
              />
            </div>
          </div>

          <div className="stats-card">
            <div className="card-header">
              <span className="card-icon">🎸</span>
              <span className="card-title">设备总数</span>
            </div>
            <div className="card-content number-content">
              <div className="number-display">
                <span className="big-number">{stats?.totalEquipment || 0}</span>
                <span className="number-unit">件</span>
              </div>
              <div className="number-subtitle">共 {stats?.equipmentCount || 0} 种设备</div>
            </div>
          </div>

          <div className="stats-card">
            <div className="card-header">
              <span className="card-icon">⚠️</span>
              <span className="card-title">库存预警</span>
            </div>
            <div className="card-content list-content">
              <ul className="low-stock-list">
                {stats?.lowStockItems?.map((item, index) => (
                  <li key={item.id} className="low-stock-item">
                    <span className="red-dot" />
                    <span className="item-name">{item.name}</span>
                    <span className={`item-percentage ${item.percentage < 10 ? 'critical' : ''}`}>
                      {item.percentage}%
                    </span>
                  </li>
                ))}
                {(!stats?.lowStockItems || stats.lowStockItems.length === 0) && (
                  <li className="no-warning">暂无库存预警</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="refresh-info">
          <span className="refresh-dot" />
          每 5 秒自动刷新
        </div>
      </div>

      <style>{`
        .stats-page {
          display: flex;
          justify-content: center;
          padding: 20px;
        }

        .stats-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
        }

        .loading {
          color: #888;
          font-size: 14px;
        }

        .stats-panel-glass {
          width: 320px;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .panel-title {
          font-size: 18px;
          font-weight: 600;
          color: #e0e0e0;
          margin-bottom: 20px;
          text-align: center;
        }

        .stats-cards {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .stats-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .card-icon {
          font-size: 20px;
        }

        .card-title {
          font-size: 14px;
          font-weight: 500;
          color: #e0e0e0;
        }

        .card-content {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .chart-content {
          padding: 8px 0;
        }

        .donut-chart-container {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .donut-chart {
          transform: rotate(-90deg);
        }

        .donut-label {
          margin-top: 8px;
          font-size: 12px;
          color: #888;
        }

        .number-content {
          flex-direction: column;
          gap: 8px;
          padding: 12px 0;
        }

        .number-display {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .big-number {
          font-size: 42px;
          font-weight: 700;
          color: #4ECDC4;
          line-height: 1;
        }

        .number-unit {
          font-size: 16px;
          color: #888;
        }

        .number-subtitle {
          font-size: 12px;
          color: #888;
        }

        .list-content {
          justify-content: flex-start;
        }

        .low-stock-list {
          list-style: none;
          width: 100%;
        }

        .low-stock-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .low-stock-item:last-child {
          border-bottom: none;
        }

        .red-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #FF6B6B;
          flex-shrink: 0;
          box-shadow: 0 0 6px rgba(255, 107, 107, 0.6);
        }

        .item-name {
          flex: 1;
          font-size: 13px;
          color: #e0e0e0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-percentage {
          font-size: 12px;
          font-weight: 600;
          color: #FFEAA7;
        }

        .item-percentage.critical {
          color: #FF6B6B;
        }

        .no-warning {
          text-align: center;
          padding: 16px 0;
          color: #666;
          font-size: 13px;
        }

        .refresh-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 16px;
          font-size: 11px;
          color: #666;
        }

        .refresh-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #4ECDC4;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }

        @media (max-width: 768px) {
          .stats-page {
            padding: 0;
          }

          .stats-panel-glass {
            width: 100%;
            max-width: 320px;
          }
        }
      `}</style>
    </div>
  );
};

export default StatsPanel;
