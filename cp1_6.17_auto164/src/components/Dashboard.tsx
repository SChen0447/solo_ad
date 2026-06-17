import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { QRCodeSVG } from 'qrcode.react';
import { EMOTION_CONFIG, EMOTION_ORDER, type ActivityStats, type HistoryData, type EmotionLevel } from '../types';
import { getStats, getHistory, endActivity, wsClient } from '../services';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardProps {
  activityId: string;
  onEndActivity: () => void;
}

export default function Dashboard({ activityId, onEndActivity }: DashboardProps) {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'trend'>('dashboard');
  const [loading, setLoading] = useState(true);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [statsData, historyData] = await Promise.all([
          getStats(activityId),
          getHistory(activityId),
        ]);
        if (mounted) {
          setStats(statsData);
          setHistory(historyData);
          setLoading(false);
        }
      } catch (e) {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    wsClient.connect();
    const unsubscribe = wsClient.onStatsUpdate((newStats) => {
      if (mounted && newStats.activity_id === activityId) {
        setStats(newStats);
      }
    });

    const historyInterval = setInterval(async () => {
      try {
        const data = await getHistory(activityId);
        if (mounted) setHistory(data);
      } catch (e) {
        // ignore
      }
    }, 5000);

    return () => {
      mounted = false;
      unsubscribe();
      clearInterval(historyInterval);
    };
  }, [activityId]);

  const handleEndActivity = async () => {
    if (window.confirm('确定要结束活动吗？结束后将生成报告。')) {
      await endActivity(activityId);
      onEndActivity();
    }
  };

  const getTrendSummary = (): string => {
    if (!history || history.times.length < 2) return '暂无足够趋势数据';
    const summaries: string[] = [];
    EMOTION_ORDER.forEach((emotion) => {
      const data = history.data[emotion];
      if (data.length < 2) return;
      const first = data[0] || 0;
      const last = data[data.length - 1] || 0;
      const mid = Math.floor(data.length / 2);
      const midVal = data[mid] || 0;
      if (last > first && last >= midVal) {
        summaries.push(`${EMOTION_CONFIG[emotion].label}持续上升`);
      } else if (last < first && last <= midVal) {
        summaries.push(`${EMOTION_CONFIG[emotion].label}持续下降`);
      } else if (Math.abs(last - first) <= Math.max(1, Math.floor(first * 0.2))) {
        summaries.push(`${EMOTION_CONFIG[emotion].label}平稳`);
      } else {
        summaries.push(`${EMOTION_CONFIG[emotion].label}波动`);
      }
    });
    return summaries.join('，');
  };

  if (loading || !stats) {
    return (
      <div className="card dashboard">
        <p>加载中...</p>
      </div>
    );
  }

  const completionRate = stats.expected_voters > 0
    ? Math.min(100, (stats.total_votes / stats.expected_voters) * 100)
    : 0;

  const ringSize = 200;
  const strokeWidth = 16;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (completionRate / 100) * circumference;

  const gradientColor = (t: number) => {
    const r1 = 46, g1 = 204, b1 = 113;
    const r2 = 231, g2 = 76, b2 = 60;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const barData = {
    labels: EMOTION_ORDER.map((e) => EMOTION_CONFIG[e].label),
    datasets: [{
      data: EMOTION_ORDER.map((e) => stats.votes[e]),
      backgroundColor: EMOTION_ORDER.map((e) => EMOTION_CONFIG[e].color),
      borderRadius: 8,
    }],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500,
      easing: 'easeOutElastic' as const,
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
        grid: { color: '#F0F0F0' },
      },
    },
  };

  const lineDatasets = history ? EMOTION_ORDER.map((emotion) => ({
    label: EMOTION_CONFIG[emotion].label,
    data: history.data[emotion],
    borderColor: EMOTION_CONFIG[emotion].color,
    backgroundColor: EMOTION_CONFIG[emotion].color + '20',
    pointBackgroundColor: EMOTION_CONFIG[emotion].color,
    pointBorderColor: '#fff',
    pointBorderWidth: 2,
    pointRadius: 4,
    tension: 0.3,
    fill: false,
  })) : [];

  const lineData = {
    labels: history?.times || [],
    datasets: lineDatasets,
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'bottom' as const },
      tooltip: { enabled: true },
    },
    scales: {
      x: { grid: { color: '#F0F0F0' } },
      y: {
        beginAtZero: true,
        grid: { color: '#F0F0F0' },
      },
    },
  };

  const votingUrl = `${window.location.origin}/#/vote/${activityId}`;

  return (
    <div className="card dashboard" ref={historyRef}>
      <div className="dashboard-header">
        <div>
          <h2>{stats.activity_name}</h2>
          <p style={{ margin: 0, color: '#666' }}>话题：{stats.topic}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleEndActivity}>
            结束活动
          </button>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.total_votes}</div>
          <div className="stat-label">总投票人数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{completionRate.toFixed(1)}%</div>
          <div className="stat-label">投票完成率</div>
        </div>
      </div>

      <div className="view-toggle">
        <button
          className={`btn ${viewMode === 'dashboard' ? 'active' : 'btn-secondary'}`}
          onClick={() => setViewMode('dashboard')}
        >
          实时仪表盘
        </button>
        <button
          className={`btn ${viewMode === 'trend' ? 'active' : 'btn-secondary'}`}
          onClick={() => setViewMode('trend')}
        >
          历史趋势
        </button>
      </div>

      {viewMode === 'dashboard' && (
        <>
          <div className="chart-container">
            <h3>投票完成率</h3>
            <div className="progress-ring-container">
              <svg className="progress-ring" width={ringSize} height={ringSize}>
                <defs>
                  <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2ECC71" />
                    <stop offset="50%" stopColor="#F1C40F" />
                    <stop offset="100%" stopColor="#E74C3C" />
                  </linearGradient>
                </defs>
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  stroke="#E0E0E0"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  stroke="url(#ringGradient)"
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                />
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: '#2C3E50' }}>
                  {completionRate.toFixed(0)}%
                </div>
                <div style={{ fontSize: 13, color: '#888' }}>
                  {stats.total_votes} / {stats.expected_voters}
                </div>
              </div>
            </div>
          </div>

          <div className="chart-container">
            <h3>各情绪等级投票分布</h3>
            <div style={{ position: 'relative', height: 300 }}>
              <Bar data={barData} options={barOptions} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 12 }}>
              {EMOTION_ORDER.map((e) => (
                <div key={e} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#666' }}>{EMOTION_CONFIG[e].label}</div>
                  <div style={{ fontWeight: 700, color: EMOTION_CONFIG[e].color }}>
                    {stats.votes[e]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="invite-info">
            <h3 style={{ margin: 0, color: '#2C3E50' }}>邀请观众参与</h3>
            <div className="invite-code">{stats.invite_code}</div>
            <p style={{ margin: '8px 0', color: '#666' }}>邀请码</p>
            <div className="qr-code">
              <QRCodeSVG value={votingUrl} size={160} level="M" />
            </div>
            <p style={{ margin: '8px 0 0 0', color: '#888', fontSize: 13 }}>
              或访问链接：<a href={votingUrl} target="_blank" rel="noreferrer">{votingUrl}</a>
            </p>
          </div>
        </>
      )}

      {viewMode === 'trend' && (
        <div className="chart-container">
          <h3>最近30分钟投票趋势</h3>
          <div style={{ position: 'relative', height: 350 }}>
            <Line data={lineData} options={lineOptions} />
          </div>
          <div className="trend-summary">
            📊 {getTrendSummary()}
          </div>
        </div>
      )}
    </div>
  );
}
