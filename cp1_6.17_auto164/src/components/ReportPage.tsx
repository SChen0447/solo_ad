import { useState, useEffect } from 'react';
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
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { EMOTION_CONFIG, EMOTION_ORDER, type ReportData } from '../types';
import { getReport } from '../services';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ReportPageProps {
  activityId: string;
}

export default function ReportPage({ activityId }: ReportPageProps) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await getReport(activityId);
        if (mounted) {
          setReport(data);
          setLoading(false);
        }
      } catch (e) {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [activityId]);

  const handlePrint = () => window.print();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="report-page" style={{ color: '#fff', textAlign: 'center' }}>加载中...</div>;
  }

  if (!report) {
    return <div className="report-page" style={{ color: '#fff', textAlign: 'center' }}>报告不存在</div>;
  }

  const barData = {
    labels: EMOTION_ORDER.map((e) => EMOTION_CONFIG[e].label),
    datasets: [{
      data: EMOTION_ORDER.map((e) => report.votes[e]),
      backgroundColor: EMOTION_ORDER.map((e) => EMOTION_CONFIG[e].color),
      borderRadius: 8,
    }],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: '#F0F0F0' } },
    },
  };

  const lineDatasets = EMOTION_ORDER.map((emotion) => ({
    label: EMOTION_CONFIG[emotion].label,
    data: report.trend.data[emotion],
    borderColor: EMOTION_CONFIG[emotion].color,
    backgroundColor: EMOTION_CONFIG[emotion].color + '20',
    pointBackgroundColor: EMOTION_CONFIG[emotion].color,
    pointBorderColor: '#fff',
    pointBorderWidth: 2,
    pointRadius: 4,
    tension: 0.3,
    fill: false,
  }));

  const lineData = {
    labels: report.trend.times,
    datasets: lineDatasets,
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { position: 'bottom' as const } },
    scales: {
      x: { grid: { color: '#F0F0F0' } },
      y: { beginAtZero: true, grid: { color: '#F0F0F0' } },
    },
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN');
  };

  return (
    <div className="report-page">
      <div className="report-header">
        <h1>{report.activity_name}</h1>
        <div className="date">{formatDate(report.date)}</div>
      </div>
      <div className="report-body">
        <div className="report-section">
          <h3>总体概览</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="score-display">
              <div className="score">{report.total_votes}</div>
              <div className="score-label">投票总人数</div>
            </div>
            <div className="score-display">
              <div className="score">{report.average_score}</div>
              <div className="score-label">平均情绪得分（满分5.0）</div>
            </div>
          </div>
        </div>

        <div className="report-section">
          <h3>各等级投票分布</h3>
          <ul className="ratio-list">
            {EMOTION_ORDER.map((e) => (
              <li key={e}>
                <span className="emoji">{EMOTION_CONFIG[e].emoji}</span>
                <span className="label">{EMOTION_CONFIG[e].label}</span>
                <span className="count">{report.votes[e]} 人</span>
                <span className="percentage">{(report.ratios[e] * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
          <div style={{ position: 'relative', height: 250, marginTop: 20 }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>

        <div className="report-section">
          <h3>分时段趋势</h3>
          {report.trend.times.length > 0 ? (
            <div style={{ position: 'relative', height: 300 }}>
              <Line data={lineData} options={lineOptions} />
            </div>
          ) : (
            <p style={{ color: '#888' }}>暂无趋势数据</p>
          )}
        </div>
      </div>

      <div className="report-actions">
        <button className="btn btn-primary" onClick={handlePrint}>打印报告</button>
        <button className="btn btn-secondary" onClick={handleCopyLink}>
          {copied ? '已复制!' : '复制链接'}
        </button>
      </div>
    </div>
  );
}
