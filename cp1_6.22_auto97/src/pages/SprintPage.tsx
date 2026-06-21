import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  apiService,
  BurndownPoint,
  SprintData,
  Task,
  Workload,
} from '../api/apiService';

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getInitials(name: string): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (/^[\u4e00-\u9fa5]/.test(trimmed)) {
    return trimmed.slice(trimmed.length - 1);
  }
  const parts = trimmed.split(/\s+/);
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
}

function getWorkloadColor(ratio: number): string {
  if (ratio < 0.5) return '#48bb78';
  if (ratio < 0.8) return '#ecc94b';
  return '#d53f8c';
}

const BurndownTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        background: '#2d3748',
        border: '1px solid #4a5568',
        borderRadius: 10,
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: 12, color: '#a0aec0', marginBottom: 6, fontWeight: 600 }}>
        {label}
      </div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: p.color,
              display: 'inline-block',
              ...(p.dataKey === 'ideal' ? { borderTop: '2px dashed' } : {}),
            }}
          />
          <span style={{ fontSize: 13, color: '#cbd5e0' }}>{p.dataKey === 'ideal' ? '理想剩余' : '实际剩余'}</span>
          <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#f7fafc' }}>{p.value} SP</span>
        </div>
      ))}
    </div>
  );
};

const WorkloadBar: React.FC<{ item: Workload }> = ({ item }) => {
  const ratio = Math.min(1, item.capacity > 0 ? item.remainingPoints / item.capacity : 0);
  const percent = Math.round(ratio * 100);
  const color = getWorkloadColor(ratio);

  return (
    <div className="workload-item">
      <div className="workload-avatar" style={{ background: item.avatarColor }}>
        {getInitials(item.memberName)}
      </div>
      <div className="workload-name">{item.memberName}</div>
      <div className="workload-bar-wrap">
        <div
          className="workload-bar-fill"
          style={{
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${color}dd, ${color})`,
          }}
        />
      </div>
      <div className="workload-count">
        <span className="num">{item.remainingPoints}</span> / {item.capacity} SP
        <span style={{ color, marginLeft: 6, fontSize: 11 }}>({item.assignedCount}个任务)</span>
      </div>
    </div>
  );
};

const SprintPage: React.FC = () => {
  const [sprintData, setSprintData] = useState<SprintData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [sd, ts] = await Promise.all([
        apiService.getSprintData(),
        apiService.getTasks(),
      ]);
      setSprintData(sd);
      setTasks(ts);
    } catch (e: any) {
      showError(e.message || '加载冲刺数据失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const chartData = useMemo<BurndownPoint[]>(() => {
    if (!sprintData) return [];
    return sprintData.burndown.map((b) => ({ ...b, date: formatShortDate(b.date) }));
  }, [sprintData]);

  const quickStats = useMemo(() => {
    if (!sprintData) {
      return { done: 0, total: 0, points: 0, completedPoints: 0, daysLeft: 0, totalDays: 0 };
    }
    const { sprint, stats } = sprintData;
    const totalPoints = sprint.totalStoryPoints;
    const completedPoints = tasks
      .filter((t) => t.status === 'done')
      .reduce((s, t) => s + t.storyPoints, 0);
    const today = new Date();
    const end = new Date(sprint.endDate);
    const start = new Date(sprint.startDate);
    const msPerDay = 86400000;
    const daysLeft = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / msPerDay));
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerDay));
    return {
      done: stats.doneCount,
      total: stats.totalCount,
      points: totalPoints,
      completedPoints,
      daysLeft,
      totalDays,
    };
  }, [sprintData, tasks]);

  if (loading) {
    return (
      <div className="loading-wrap">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">冲刺详情</h1>
          <div className="page-subtitle">
            {sprintData
              ? `${sprintData.sprint.name} · ${sprintData.sprint.startDate} 至 ${sprintData.sprint.endDate}`
              : '加载中...'}
          </div>
        </div>
        <div className="header-actions">
          <button
            className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => loadData(true)}
            title="刷新数据"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="stats-section">
        <div className="stat-card">
          <div className="stat-label">已完成任务</div>
          <div className="stat-value accent-green">
            {quickStats.done}<span style={{ fontSize: 16, color: '#a0aec0', fontWeight: 600 }}> / {quickStats.total}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">已完成故事点</div>
          <div className="stat-value accent-blue">
            {quickStats.completedPoints}<span style={{ fontSize: 16, color: '#a0aec0', fontWeight: 600 }}> / {quickStats.points} SP</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">进度完成率</div>
          <div className="stat-value accent-orange">
            {quickStats.total > 0 ? Math.round((quickStats.done / quickStats.total) * 100) : 0}%
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">剩余天数</div>
          <div className="stat-value accent-pink">
            {quickStats.daysLeft}<span style={{ fontSize: 14, color: '#a0aec0', fontWeight: 500 }}> 天</span>
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#63b3ed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          冲刺燃尽图
        </div>

        <div style={{ width: '100%', height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#718096"
                tick={{ fontSize: 12, fill: '#a0aec0' }}
                tickLine={{ stroke: '#4a5568' }}
                axisLine={{ stroke: '#4a5568' }}
                interval={Math.max(0, Math.floor(chartData.length / 10))}
              />
              <YAxis
                stroke="#718096"
                tick={{ fontSize: 12, fill: '#a0aec0' }}
                tickLine={{ stroke: '#4a5568' }}
                axisLine={{ stroke: '#4a5568' }}
                label={{
                  value: '剩余故事点',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: '#a0aec0', fontSize: 12, fontWeight: 600 },
                }}
              />
              <Tooltip content={<BurndownTooltip />} cursor={{ stroke: '#4a5568', strokeDasharray: '4 4' }} />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="line"
                formatter={(value: string) => (
                  <span style={{ color: '#a0aec0', fontSize: 12 }}>
                    {value === 'ideal' ? '理想燃尽线' : '实际燃尽线'}
                  </span>
                )}
                wrapperStyle={{ paddingBottom: 12 }}
              />
              <Line
                type="monotone"
                dataKey="ideal"
                stroke="#a0aec0"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 4, stroke: '#a0aec0', strokeWidth: 2, fill: '#1e2533' }}
                name="ideal"
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#3182ce"
                strokeWidth={3}
                dot={{ r: 4, stroke: '#3182ce', strokeWidth: 2, fill: '#1e2533' }}
                activeDot={{ r: 6, stroke: '#63b3ed', strokeWidth: 2, fill: '#3182ce' }}
                name="actual"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="burndown-summary">
          本冲刺共完成 <strong>{quickStats.done}</strong> 个任务，总计 <strong>{quickStats.total}</strong> 个任务 ·
          故事点进度：<strong>{quickStats.completedPoints}</strong> / {quickStats.points} SP
          <span style={{ color: '#a0aec0', marginLeft: 8 }}>
            ({quickStats.points > 0 ? Math.round((quickStats.completedPoints / quickStats.points) * 100) : 0}%)
          </span>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f687b3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          团队成员负荷视图
        </div>

        <div className="workload-list">
          {sprintData?.workload.map((w) => (
            <WorkloadBar key={w.memberId} item={w} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 24, marginTop: 24, paddingTop: 16, borderTop: '1px solid #2d3748', flexWrap: 'wrap' }}>
          <div className="legend-item">
            <span style={{ width: 14, height: 14, borderRadius: 4, background: '#48bb78', display: 'inline-block' }} />
            <span>低负荷（&lt; 50%）</span>
          </div>
          <div className="legend-item">
            <span style={{ width: 14, height: 14, borderRadius: 4, background: '#ecc94b', display: 'inline-block' }} />
            <span>中负荷（50% ~ 80%）</span>
          </div>
          <div className="legend-item">
            <span style={{ width: 14, height: 14, borderRadius: 4, background: '#d53f8c', display: 'inline-block' }} />
            <span>高负荷（≥ 80%）</span>
          </div>
        </div>
      </div>

      {error && <div className="error-toast">{error}</div>}
    </>
  );
};

export default SprintPage;
