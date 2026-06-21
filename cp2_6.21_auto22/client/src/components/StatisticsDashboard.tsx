import React, { useRef, useEffect, useState } from 'react';
import type { Stats, Volunteer } from '../types';

interface StatisticsDashboardProps {
  stats: Stats;
  volunteers: Volunteer[];
}

const GoldCrown: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M5 16L3 8L8 11L12 5L16 11L21 8L19 16H5Z"
      fill="url(#goldGrad)"
      stroke="#DAA520"
      strokeWidth="1"
    />
    <rect x="4" y="17" width="16" height="3" rx="1" fill="url(#goldGrad)" stroke="#DAA520" strokeWidth="1" />
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFE55C" />
        <stop offset="50%" stopColor="#FFD700" />
        <stop offset="100%" stopColor="#DAA520" />
      </linearGradient>
    </defs>
  </svg>
);

const BarChart: React.FC<{ data: { month: string; count: number }[] }> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 700, height: 300 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSize({ width: rect.width, height: 300 });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = size;
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 40, right: 30, bottom: 50, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const barWidth = 40;
    const barGap = 20;
    const totalBarsWidth = data.length * barWidth + (data.length - 1) * barGap;
    const startX = padding.left + (chartWidth - totalBarsWidth) / 2;

    const maxCount = Math.max(...data.map(d => d.count), 1);

    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, '#4CAF50');
    gradient.addColorStop(1, '#FF9800');

    data.forEach((d, i) => {
      const x = startX + i * (barWidth + barGap);
      const barHeight = (d.count / maxCount) * chartHeight;
      const y = height - padding.bottom - barHeight;

      const barGradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      barGradient.addColorStop(0, '#4CAF50');
      barGradient.addColorStop(1, '#FF9800');

      ctx.fillStyle = barGradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 4);
      ctx.fill();

      ctx.fillStyle = '#333';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(d.count), x + barWidth / 2, y - 8);

      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      ctx.fillText(d.month.slice(5), x + barWidth / 2, height - padding.bottom + 20);
    });

    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
  }, [data, size]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: 300 }}>
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        style={{ display: 'block' }}
      />
    </div>
  );
};

const SpeciesTreemap: React.FC<{ data: { species: string; color: string; count: number }[] }> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 700, height: 300 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSize({ width: rect.width, height: 300 });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = size;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const total = data.reduce((sum, d) => sum + d.count, 0);

    if (total === 0) return;

    const minRadius = 60;
    const maxRadius = Math.min(width, height) / 2 - 40;

    const centerRadius = Math.min(60, maxRadius * 0.25);
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerRadius, 0, Math.PI * 2);
    const centerGradient = ctx.createRadialGradient(
      centerX - centerRadius * 0.3, centerY - centerRadius * 0.3, 0,
      centerX, centerY, centerRadius
    );
    centerGradient.addColorStop(0, '#81C784');
    centerGradient.addColorStop(1, '#388E3C');
    ctx.fillStyle = centerGradient;
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('树种', centerX, centerY - 8);
    ctx.fillText(`${total}棵`, centerX, centerY + 10);

    let startAngle = -Math.PI / 2;

    data.forEach(d => {
      const angle = (d.count / total) * Math.PI * 2;
      const endAngle = startAngle + angle;
      const midAngle = startAngle + angle / 2;

      const innerRadius = centerRadius + 10;
      const outerRadius = maxRadius;

      const grad = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, outerRadius);
      grad.addColorStop(0, d.color + '99');
      grad.addColorStop(1, d.color);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      const labelRadius = (innerRadius + outerRadius) / 2;
      const labelX = centerX + Math.cos(midAngle) * labelRadius;
      const labelY = centerY + Math.sin(midAngle) * labelRadius;

      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.save();
      let labelAngle = midAngle;
      if (labelAngle > Math.PI / 2 && labelAngle < Math.PI * 1.5) {
        labelAngle += Math.PI;
      }
      ctx.translate(labelX, labelY);
      ctx.rotate(labelAngle);
      ctx.fillText(`${d.species}`, 0, -8);
      ctx.fillText(`${d.count}棵`, 0, 8);
      ctx.restore();

      startAngle = endAngle;
    });
  }, [data, size]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: 300 }}>
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        style={{ display: 'block' }}
      />
    </div>
  );
};

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ stats, volunteers }) => {
  const topVolunteers = [...volunteers]
    .sort((a, b) => b.serviceHours - a.serviceHours)
    .slice(0, 5);

  return (
    <div className="page">
      <h1 className="page-title">数据统计看板</h1>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-card-value">{stats.totalEvents}</div>
          <div className="stat-card-label">总活动数</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{stats.totalTrees}</div>
          <div className="stat-card-label">总认养树木</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{stats.totalVolunteers}</div>
          <div className="stat-card-label">志愿者人数</div>
        </div>
      </div>

      <div className="stats-chart-section">
        <h3>近6个月活动数量</h3>
        <BarChart data={stats.monthlyEvents} />
      </div>

      <div className="stats-chart-section">
        <h3>树种分布</h3>
        <SpeciesTreemap data={stats.speciesDistribution} />
      </div>

      <div className="stats-chart-section">
        <h3>🏆 志愿者服务时长排行榜</h3>
        <div className="stats-leaderboard">
          {topVolunteers.map((v, index) => (
            <div key={v.id} className={`leaderboard-item ${index === 0 ? 'rank-1-item' : ''}`}>
              <span className={`leaderboard-rank rank-${index + 1}`}>
                {index === 0 ? (
                  <span className="leaderboard-crown"><GoldCrown size={22} /></span>
                ) : (
                  index + 1
                )}
              </span>
              <div className="leaderboard-avatar">{v.name.charAt(0)}</div>
              <div className="leaderboard-info">
                <div className="leaderboard-name">{v.name}</div>
                <div className="leaderboard-hours">{v.serviceHours} 小时</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatisticsDashboard;
