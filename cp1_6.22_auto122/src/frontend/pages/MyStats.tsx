import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { api, UserStatsData } from '../utils/api';
import './MyStats.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const formatCurrency = (n: number) => `¥${n.toLocaleString('zh-CN')}`;

export default function MyStats() {
  const [stats, setStats] = useState<UserStatsData | null>(null);

  useEffect(() => {
    api.fetchUserStats().then(setStats).catch(console.error);
  }, []);

  if (!stats) {
    return (
      <div className="stats-loading">
        <div className="spinner"></div>
        <p>加载战绩数据中...</p>
      </div>
    );
  }

  const labels = stats.bidHistory.map((h) => h.date.slice(5));
  const amounts = stats.bidHistory.map((h) => h.amount);
  const winRate = stats.totalBids > 0 ? (stats.wins / (stats.wins + stats.losses) * 100) : 0;

  const chartData = {
    labels,
    datasets: [
      {
        label: '出价金额 (平均值)',
        data: amounts,
        borderColor: '#3b82f6',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#0f172a',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#fbbf24',
        borderWidth: 2.5,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: '#38bdf8',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 13, weight: 700 as const },
        bodyFont: { size: 12 },
        callbacks: {
          label: (ctx: any) => `出价金额: ${formatCurrency(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(148, 163, 184, 0.08)',
          drawBorder: false,
        },
        ticks: {
          color: '#64748b',
          font: { size: 10 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10,
        },
      },
      y: {
        grid: {
          color: 'rgba(148, 163, 184, 0.08)',
          drawBorder: false,
        },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: (val: any) => `¥${(val / 1000).toFixed(0)}k`,
        },
      },
    },
  };

  return (
    <div className="stats-page">
      <div className="stats-header">
        <h1 className="stats-title">🏆 我的战绩</h1>
        <p className="stats-subtitle">追踪你的竞价表现与成长数据</p>
      </div>

      <div className="stats-summary-row">
        <div className="summary-box win">
          <div className="summary-icon">🏅</div>
          <div>
            <div className="summary-num">{stats.wins}</div>
            <div className="summary-label">胜场</div>
          </div>
        </div>
        <div className="summary-box lose">
          <div className="summary-icon">💔</div>
          <div>
            <div className="summary-num">{stats.losses}</div>
            <div className="summary-label">负场</div>
          </div>
        </div>
        <div className="summary-box abandon">
          <div className="summary-icon">🚪</div>
          <div>
            <div className="summary-num">{stats.abandoned}</div>
            <div className="summary-label">弃标</div>
          </div>
        </div>
        <div className="summary-box rate">
          <div className="summary-icon">📊</div>
          <div>
            <div className="summary-num">{winRate.toFixed(1)}%</div>
            <div className="summary-label">胜率</div>
          </div>
        </div>
      </div>

      <div className="stats-metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap markup">
            <span className="metric-icon">📈</span>
          </div>
          <div className="metric-label">平均加价率</div>
          <div className="metric-value">{stats.averageMarkup.toFixed(1)}%</div>
          <div className="metric-trend up">较上月 +0.4%</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon-wrap highest">
            <span className="metric-icon">💰</span>
          </div>
          <div className="metric-label">最高出价金额</div>
          <div className="metric-value">{formatCurrency(stats.highestBid)}</div>
          <div className="metric-trend">累计出价 {stats.totalBids} 次</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon-wrap response">
            <span className="metric-icon">⚡</span>
          </div>
          <div className="metric-label">平均响应时间</div>
          <div className="metric-value">{Math.floor(stats.averageResponseTime)}秒</div>
          <div className="metric-trend down">比平均快 12秒</div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h2 className="chart-title">📉 近30天出价金额走势</h2>
            <p className="chart-sub">平均每日出价金额趋势分析</p>
          </div>
          <div className="chart-legend">
            <span className="legend-dot"></span>
            <span>日均出价金额</span>
          </div>
        </div>
        <div className="chart-container">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="insights-card">
        <h3 className="insights-title">💡 数据洞察</h3>
        <div className="insights-grid">
          <div className="insight-item">
            <div className="insight-emoji">🎯</div>
            <div className="insight-text">
              <strong>胜率分析：</strong>
              您的胜率为 {winRate.toFixed(1)}%，{winRate > 40 ? '表现优秀！继续保持稳健加价策略。' : winRate > 25 ? '处于中等水平，建议小幅提升加价幅度。' : '偏低，建议在前30秒内果断出价抢占心理优势。'}
            </div>
          </div>
          <div className="insight-item">
            <div className="insight-emoji">⏱️</div>
            <div className="insight-text">
              <strong>响应速度：</strong>
              您平均在起拍后 {Math.floor(stats.averageResponseTime)} 秒首次出价，{stats.averageResponseTime < 45 ? '非常敏锐！快速响应是您的优势。' : stats.averageResponseTime < 90 ? '节奏适中，可尝试更早介入。' : '反应较慢，建议提前关注心仪拍品。'}
            </div>
          </div>
          <div className="insight-item">
            <div className="insight-emoji">🔥</div>
            <div className="insight-text">
              <strong>加价习惯：</strong>
              平均加价率 {stats.averageMarkup.toFixed(1)}%，{stats.averageMarkup > 5 ? '加价较激进，适合竞争激烈的拍品。' : stats.averageMarkup > 3 ? '策略稳健，性价比优先。' : '加价偏保守，容易被频繁反超。'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
