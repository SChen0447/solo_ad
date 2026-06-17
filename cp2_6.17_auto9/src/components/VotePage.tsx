import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import type { Project } from '../types';

interface VoteStats {
  optionId: string;
  name: string;
  support: number;
  oppose: number;
  abstain: number;
  total: number;
  supportRate: number;
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#818cf8', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#ec4899', '#06b6d4'];
const GRAY = '#94a3b8';

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

const interpolateColor = (color1: string, color2: string, t: number) => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r},${g},${b})`;
};

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export default function VotePage({ project }: { project: Project }) {
  const pieCanvasRef = useRef<HTMLCanvasElement>(null);
  const barCanvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationRef = useRef<number>(0);

  const stats = useMemo<VoteStats[]>(() => {
    return project.options.map((opt) => {
      const optionVotes = project.votes.filter((v) => v.optionId === opt.id);
      const support = optionVotes.filter((v) => v.vote === 'support').length;
      const oppose = optionVotes.filter((v) => v.vote === 'oppose').length;
      const abstain = optionVotes.filter((v) => v.vote === 'abstain').length;
      const total = optionVotes.length;
      return {
        optionId: opt.id,
        name: opt.name || '未命名',
        support,
        oppose,
        abstain,
        total,
        supportRate: support > 0 ? support / Math.max(total, 1) : 0,
      };
    });
  }, [project]);

  const sortedStats = useMemo(() => {
    return [...stats].sort((a, b) => b.support - a.support);
  }, [stats]);

  const pieData = useMemo(() => {
    return stats.map((s, i) => ({
      label: s.name,
      value: Math.max(s.support, 0.001),
      color: PIE_COLORS[i % PIE_COLORS.length],
      support: s.support,
    }));
  }, [stats]);

  useEffect(() => {
    const startTime = performance.now();
    const duration = 500;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setAnimationProgress(easeInOutCubic(progress));
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [stats.length]);

  useEffect(() => {
    const canvas = pieCanvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 30;

    ctx.clearRect(0, 0, width, height);

    const total = pieData.reduce((sum, d) => sum + d.value, 0);
    let startAngle = -Math.PI / 2;

    pieData.forEach((segment, idx) => {
      const angle = (segment.value / total) * Math.PI * 2 * animationProgress;
      const isHovered = hoveredPieIndex === idx;
      const offset = isHovered ? 10 : 0;
      const sliceAngle = startAngle + angle / 2;
      const offsetX = Math.cos(sliceAngle) * offset;
      const offsetY = Math.sin(sliceAngle) * offset;

      ctx.beginPath();
      ctx.moveTo(centerX + offsetX, centerY + offsetY);
      ctx.arc(
        centerX + offsetX,
        centerY + offsetY,
        radius,
        startAngle,
        startAngle + angle
      );
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();

      if (isHovered) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      if (animationProgress >= 0.9 && angle > 0.15) {
        const percentage = ((segment.value / total) * 100).toFixed(1);
        const labelAngle = startAngle + angle / 2;
        const labelRadius = radius * 0.65;
        const labelX = centerX + Math.cos(labelAngle) * labelRadius + offsetX;
        const labelY = centerY + Math.sin(labelAngle) * labelRadius + offsetY;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${percentage}%`, labelX, labelY);
      }

      startAngle += angle;
    });

    if (total === 0 || stats.reduce((s, d) => s + d.support, 0) === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('暂无投票数据', centerX, centerY);
    }
  }, [pieData, hoveredPieIndex, animationProgress, stats]);

  useEffect(() => {
    const canvas = barCanvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 60, bottom: 40, left: 20 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const maxSupport = Math.max(...sortedStats.map((s) => s.support), 1);
    const barHeight = Math.min(36, (chartHeight - (sortedStats.length - 1) * 12) / sortedStats.length);

    sortedStats.forEach((stat, idx) => {
      const y = padding.top + idx * (barHeight + 12);
      const barWidth = (stat.support / maxSupport) * chartWidth * animationProgress;

      const colorT = sortedStats.length > 1 ? idx / (sortedStats.length - 1) : 0;
      const color = interpolateColor('#10b981', '#f59e0b', colorT);

      const radius = 6;
      ctx.beginPath();
      ctx.moveTo(padding.left + radius, y);
      ctx.lineTo(padding.left + barWidth - radius, y);
      ctx.quadraticCurveTo(padding.left + barWidth, y, padding.left + barWidth, y + radius);
      ctx.lineTo(padding.left + barWidth, y + barHeight - radius);
      ctx.quadraticCurveTo(
        padding.left + barWidth,
        y + barHeight,
        padding.left + barWidth - radius,
        y + barHeight
      );
      ctx.lineTo(padding.left + radius, y + barHeight);
      ctx.quadraticCurveTo(padding.left, y + barHeight, padding.left, y + barHeight - radius);
      ctx.lineTo(padding.left, y + radius);
      ctx.quadraticCurveTo(padding.left, y, padding.left + radius, y);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.font = '13px system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const label = stat.name.length > 8 ? stat.name.substring(0, 8) + '...' : stat.name;
      ctx.fillText(label, padding.left + 10, y + barHeight / 2);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'right';
      const valueText = `${stat.support} 票`;
      if (barWidth > 60) {
        ctx.fillText(valueText, padding.left + barWidth - 10, y + barHeight / 2);
      } else {
        ctx.fillStyle = '#64748b';
        ctx.fillText(valueText, padding.left + barWidth + 45, y + barHeight / 2);
      }

      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'right';
      const rankText = `#${idx + 1}`;
      ctx.fillText(rankText, width - 10, y + barHeight / 2);
    });
  }, [sortedStats, animationProgress]);

  const handlePieMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = pieCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const distance = Math.sqrt(x * x + y * y);
      const radius = Math.min(rect.width, rect.height) / 2 - 30;

      if (distance > radius || distance < 0) {
        setHoveredPieIndex(null);
        return;
      }

      const total = pieData.reduce((sum, d) => sum + d.value, 0);
      let angle = Math.atan2(y, x) + Math.PI / 2;
      if (angle < 0) angle += Math.PI * 2;

      let accumulated = 0;
      for (let i = 0; i < pieData.length; i++) {
        const sliceAngle = (pieData[i].value / total) * Math.PI * 2;
        if (angle >= accumulated && angle < accumulated + sliceAngle) {
          setHoveredPieIndex(i);
          return;
        }
        accumulated += sliceAngle;
      }
      setHoveredPieIndex(null);
    },
    [pieData]
  );

  const hoveredData = hoveredPieIndex !== null ? pieData[hoveredPieIndex] : null;

  return (
    <div className="vote-page">
      <div className="vote-header">
        <h2>投票结果统计</h2>
        <p className="vote-subtitle">{project.name}</p>
      </div>

      <div className="charts-container">
        <div className="chart-card">
          <h3 className="chart-title">投票分布（支持率）</h3>
          <div className="pie-chart-wrapper">
            <canvas
              ref={pieCanvasRef}
              className="pie-canvas"
              onMouseMove={handlePieMouseMove}
              onMouseLeave={() => setHoveredPieIndex(null)}
            />
            {hoveredData && (
              <div className="pie-tooltip">
                <div className="pie-tooltip-color" style={{ background: hoveredData.color }} />
                <div className="pie-tooltip-content">
                  <strong>{hoveredData.label}</strong>
                  <span>
                    {hoveredData.support} 票 (
                    {((hoveredData.value / pieData.reduce((s, d) => s + d.value, 0)) * 100).toFixed(1)}
                    %)
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="pie-legend">
            {pieData.map((d, i) => (
              <div key={i} className="legend-item">
                <span className="legend-color" style={{ background: d.color }} />
                <span className="legend-label">{d.label}</span>
                <span className="legend-value">{d.support} 票</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">排行榜（按支持票数）</h3>
          <canvas ref={barCanvasRef} className="bar-canvas" />
        </div>
      </div>

      <div className="stats-table-card">
        <h3 className="chart-title">详细统计</h3>
        <table className="stats-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>方案</th>
              <th>👍 支持</th>
              <th>👎 反对</th>
              <th>➖ 弃权</th>
              <th>总计</th>
              <th>支持率</th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.map((stat, idx) => (
              <tr key={stat.optionId}>
                <td>
                  <span className={`rank-badge rank-${idx + 1}`}>#{idx + 1}</span>
                </td>
                <td>
                  <strong>{stat.name}</strong>
                </td>
                <td className="support-cell">{stat.support}</td>
                <td className="oppose-cell">{stat.oppose}</td>
                <td>{stat.abstain}</td>
                <td>{stat.total}</td>
                <td>
                  <div className="support-rate">
                    <div
                      className="support-rate-bar"
                      style={{
                        width: `${(stat.supportRate * 100).toFixed(0)}%`,
                        background: interpolateColor('#f59e0b', '#10b981', stat.supportRate),
                      }}
                    />
                    <span>{(stat.supportRate * 100).toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
