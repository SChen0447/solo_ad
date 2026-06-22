import React, { useState, useEffect, useCallback } from 'react';
import type { RecruitmentStats } from '../types';

const PIE_COLORS = ['#38bdf8', '#fbbf24', '#10b981', '#f472b6', '#a78bfa'];

export default function Dashboard() {
  const [stats, setStats] = useState<RecruitmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const startTime = Date.now();
      const response = await fetch('/api/recruitment/stats');
      const data = await response.json();
      const duration = Date.now() - startTime;
      console.log(`[Performance] /api/recruitment/stats response time: ${duration}ms`);
      setStats(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const renderProgressRing = (percentage: number) => {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 1) * circumference;

    return (
      <div className="progress-ring">
        <svg width="150" height="150">
          <circle
            className="progress-ring-circle progress-ring-bg"
            cx="75"
            cy="75"
            r={radius}
          />
          <circle
            className="progress-ring-circle progress-ring-progress"
            cx="75"
            cy="75"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="progress-ring-text">
          <div className="progress-ring-value">{Math.round(percentage * 100)}%</div>
          <div className="progress-ring-label">完成率</div>
        </div>
      </div>
    );
  };

  const renderPieChart = () => {
    if (!stats || stats.clubStats.length === 0) return null;

    const total = stats.clubStats.reduce((sum, c) => sum + c.applicationCount, 0);
    let currentAngle = 0;
    const paths: JSX.Element[] = [];
    const centerX = 80;
    const centerY = 80;
    const radius = 70;

    stats.clubStats.forEach((club, index) => {
      const percentage = total > 0 ? club.applicationCount / total : 0;
      const angle = percentage * 360;

      if (percentage === 1) {
        paths.push(
          <circle
            key={club.clubId}
            cx={centerX}
            cy={centerY}
            r={radius}
            fill={PIE_COLORS[index % PIE_COLORS.length]}
          />
        );
        return;
      }

      const startAngle = (currentAngle - 90) * (Math.PI / 180);
      const endAngle = (currentAngle + angle - 90) * (Math.PI / 180);

      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const pathData = `
        M ${centerX} ${centerY}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        Z
      `;

      paths.push(
        <path
          key={club.clubId}
          d={pathData}
          fill={PIE_COLORS[index % PIE_COLORS.length]}
          style={{ transition: 'all 0.5s ease' }}
        />
      );

      currentAngle += angle;
    });

    return (
      <div className="pie-chart">
        <svg width="160" height="160">
          {paths}
          <circle cx={centerX} cy={centerY} r="35" fill="#1e293b" />
          <text x={centerX} y={centerY - 5} textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="600">
            {total}
          </text>
          <text x={centerX} y={centerY + 12} textAnchor="middle" fill="#94a3b8" fontSize="11">
            总报名
          </text>
        </svg>
        <div className="pie-legend">
          {stats.clubStats.map((club, index) => (
            <div key={club.clubId} className="legend-item">
              <span
                className="legend-color"
                style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
              />
              <span className="text-secondary">{club.clubName}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--text-primary)' }}>
                {club.applicationCount}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBarChart = () => {
    if (!stats || stats.clubStats.length === 0) return null;

    const maxCount = Math.max(...stats.clubStats.map((c) => c.applicationCount), 1);

    return (
      <div className="bar-chart">
        {stats.clubStats.map((club) => {
          const heightPercentage = maxCount > 0 ? (club.applicationCount / maxCount) * 100 : 0;
          return (
            <div key={club.clubId} className="bar-item">
              <div
                className="bar"
                style={{ height: `${heightPercentage}%` }}
              >
                <span className="bar-value">{club.applicationCount}</span>
              </div>
              <div className="bar-label">{club.clubName}</div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading && !stats) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">招新进度看板</h1>
          <p className="page-subtitle">实时查看招新整体进度和数据统计</p>
        </div>
        <div className="dashboard-stats">
          {[1, 2, 3].map((i) => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ height: '24px', width: '80px', marginBottom: '12px' }} />
              <div className="skeleton" style={{ height: '48px', width: '120px' }} />
            </div>
          ))}
        </div>
        <div className="dashboard-charts">
          <div className="chart-container">
            <div className="skeleton" style={{ height: '20px', width: '120px', marginBottom: '20px' }} />
            <div className="skeleton" style={{ height: '200px' }} />
          </div>
          <div className="chart-container">
            <div className="skeleton" style={{ height: '20px', width: '120px', marginBottom: '20px' }} />
            <div className="skeleton" style={{ height: '200px' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1 className="page-title">招新进度看板</h1>
            <p className="page-subtitle">实时查看招新整体进度和数据统计</p>
          </div>
          {lastUpdate && (
            <div className="text-muted" style={{ fontSize: '12px' }}>
              最后更新：{lastUpdate.toLocaleTimeString('zh-CN')}
              <span style={{ marginLeft: '8px' }}>
                <span className="text-success">●</span> 自动刷新中
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>总报名数</h3>
          <div className="stat-value">{stats?.totalApplications || 0}</div>
          <div className="stat-subtitle">累计收到的报名申请</div>
        </div>
        <div className="stat-card">
          <h3>已面试人数</h3>
          <div className="stat-value" style={{ color: 'var(--accent-secondary)' }}>
            {stats?.totalInterviewed || 0}
          </div>
          <div className="stat-subtitle">完成面试的申请者</div>
        </div>
        <div className="stat-card">
          <h3>通过率</h3>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {stats ? `${Math.round(stats.acceptanceRate * 100)}%` : '0%'}
          </div>
          <div className="stat-subtitle">报名申请的通过比例</div>
        </div>
      </div>

      <div className="dashboard-charts">
        <div className="chart-container">
          <h3 className="chart-title">各社团报名人数</h3>
          {renderBarChart()}
        </div>
        <div className="chart-container">
          <h3 className="chart-title">各社团报名比例</h3>
          {renderPieChart()}
        </div>
      </div>

      <div className="chart-container" style={{ marginTop: '16px' }}>
        <h3 className="chart-title">面试完成率</h3>
        <div className="progress-ring-container">
          {stats && renderProgressRing(stats.interviewCompletionRate)}
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '16px' }}>
              <div className="text-secondary" style={{ fontSize: '13px', marginBottom: '8px' }}>
                面试进度说明
              </div>
              <div className="flex gap-4" style={{ fontSize: '12px' }}>
                <div className="flex gap-2">
                  <span style={{ width: '12px', height: '12px', background: 'var(--success)', borderRadius: '2px' }} />
                  <span className="text-secondary">已完成/已预约</span>
                </div>
                <div className="flex gap-2">
                  <span style={{ width: '12px', height: '12px', background: '#374151', borderRadius: '2px' }} />
                  <span className="text-secondary">未安排</span>
                </div>
              </div>
            </div>
            <div className="card" style={{ background: 'var(--bg-primary)' }}>
              <div className="text-secondary" style={{ fontSize: '13px', marginBottom: '8px' }}>
                面试状态分布
              </div>
              <div className="grid grid-3" style={{ fontSize: '12px' }}>
                <div>
                  <div className="text-accent" style={{ fontSize: '20px', fontWeight: '600' }}>
                    {stats?.totalInterviewed || 0}
                  </div>
                  <div className="text-muted">已完成</div>
                </div>
                <div>
                  <div className="text-warning" style={{ fontSize: '20px', fontWeight: '600' }}>
                    {stats ? stats.totalApplications - stats.totalInterviewed : 0}
                  </div>
                  <div className="text-muted">待面试</div>
                </div>
                <div>
                  <div className="text-success" style={{ fontSize: '20px', fontWeight: '600' }}>
                    {Math.round((stats?.interviewCompletionRate || 0) * 100)}%
                  </div>
                  <div className="text-muted">完成率</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
