import React, { useState, useEffect } from 'react';
import { api } from './api';
import { Stats } from './types';

const AdminPanel: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDonutChart = (distribution: Stats['courseDistribution']) => {
    const colors = ['#ff7043', '#42a5f5', '#66bb6a', '#ffa726', '#ab47bc'];
    const total = distribution.reduce((sum, item) => sum + item.count, 0);

    if (total === 0) {
      return <div className="chart-empty">暂无数据</div>;
    }

    let cumulativePercent = 0;
    const paths = distribution.map((item, index) => {
      const startPercent = cumulativePercent;
      cumulativePercent += item.percentage;
      const endPercent = cumulativePercent;

      const largeArcFlag = item.percentage > 50 ? 1 : 0;
      const startAngle = (startPercent / 100) * 2 * Math.PI - Math.PI / 2;
      const endAngle = (endPercent / 100) * 2 * Math.PI - Math.PI / 2;

      const x1 = 100 + 70 * Math.cos(startAngle);
      const y1 = 100 + 70 * Math.sin(startAngle);
      const x2 = 100 + 70 * Math.cos(endAngle);
      const y2 = 100 + 70 * Math.sin(endAngle);

      const d = `M 100 100 L ${x1} ${y1} A 70 70 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      return (
        <path
          key={index}
          d={d}
          fill={colors[index % colors.length]}
          className="donut-segment"
        />
      );
    });

    return (
      <div className="donut-chart-container">
        <svg viewBox="0 0 200 200" className="donut-chart">
          <circle cx="100" cy="100" r="70" fill="none" stroke="#e0e0e0" strokeWidth="1" />
          {paths}
          <circle cx="100" cy="100" r="40" fill="white" />
          <text x="100" y="95" textAnchor="middle" className="donut-text-large">
            {total}
          </text>
          <text x="100" y="115" textAnchor="middle" className="donut-text-small">
            总课程
          </text>
        </svg>
        <div className="chart-legend">
          {distribution.map((item, index) => (
            <div key={index} className="legend-item-row">
              <span
                className="legend-color"
                style={{ backgroundColor: colors[index % colors.length] }}
              ></span>
              <span className="legend-label">{item.type}</span>
              <span className="legend-value">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="admin-panel">
      <div className="page-header">
        <h2>📈 数据统计</h2>
        <p className="page-subtitle">健身房运营数据概览</p>
      </div>

      {loading ? (
        <div className="stats-loading">
          <div className="loading-spinner small"></div>
          <p>加载统计数据...</p>
        </div>
      ) : stats ? (
        <div className="stats-grid">
          <div className="stat-card highlight">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-label">本周预约数</div>
              <div className="stat-value">{stats.weeklyBookings}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <div className="stat-label">最受欢迎教练</div>
              <div className="stat-value small">
                {stats.popularTrainers.length > 0
                  ? stats.popularTrainers[0].trainerName
                  : '暂无数据'}
              </div>
              {stats.popularTrainers.length > 0 && (
                <div className="stat-sub">
                  {stats.popularTrainers[0].count} 次预约
                </div>
              )}
            </div>
          </div>

          <div className="stat-card full-width">
            <h3>🏆 教练预约排行榜</h3>
            {stats.popularTrainers.length === 0 ? (
              <p className="empty-text">暂无数据</p>
            ) : (
              <div className="trainer-ranking">
                {stats.popularTrainers.map((trainer, index) => (
                  <div key={trainer.trainerId} className="ranking-item">
                    <div className="ranking-position">
                      <span className={`rank-badge ${index < 3 ? 'top' : ''}`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </span>
                    </div>
                    <div className="ranking-info">
                      <span className="trainer-name">{trainer.trainerName}</span>
                      <div className="ranking-bar-container">
                        <div
                          className="ranking-bar"
                          style={{
                            width: `${stats.popularTrainers.length > 0
                              ? (trainer.count / Math.max(...stats.popularTrainers.map(t => t.count))) * 100
                              : 0}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="ranking-count">
                      <strong>{trainer.count}</strong> 次
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="stat-card full-width">
            <h3>🍩 课程类型分布</h3>
            {renderDonutChart(stats.courseDistribution)}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">📊</span>
          <p>暂无统计数据</p>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
