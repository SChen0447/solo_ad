import { useRef, useEffect, useMemo } from 'react';
import type { LeaderboardItem } from '../types';

interface LeaderboardProps {
  leaderboard: LeaderboardItem[];
  stats: Record<number, number>;
  isLoading: boolean;
  renderStars: (score: number, size?: number) => JSX.Element;
  renderMedal: (rank: number) => JSX.Element | string;
}

function RatingDistributionChart({ ratings }: { ratings: number[] }) {
  const distribution = useMemo(() => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(r => {
      if (r >= 1 && r <= 5) {
        dist[r]++;
      }
    });
    return dist;
  }, [ratings]);

  const maxCount = Math.max(...Object.values(distribution), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const count = distribution[star];
        const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
        return (
          <div
            key={star}
            title={`${star}星: ${count}人`}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'flex-end',
              height: '100%'
            }}
          >
            <div
              style={{
                width: '100%',
                height: `${Math.max(heightPercent, count > 0 ? 12 : 4)}%`,
                minHeight: count > 0 ? 6 : 2,
                borderRadius: 4,
                background: `linear-gradient(to top, #60a5fa, #a78bfa)`,
                transition: 'height 0.3s ease',
                position: 'relative'
              }}
            >
              {count > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 10,
                    color: '#6b7280',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {count}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GlobalDistributionChart({ stats }: { stats: Record<number, number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const maxCount = Math.max(...Object.values(stats), 1);
    const barWidth = (chartWidth / 5) * 0.6;
    const barGap = (chartWidth / 5) * 0.4;

    for (let i = 0; i < 5; i++) {
      const score = i + 1;
      const count = stats[score] || 0;
      const barHeight = (count / maxCount) * chartHeight;
      const x = padding.left + i * (barWidth + barGap) + barGap / 2;
      const y = padding.top + chartHeight - barHeight;

      const barGradient = ctx.createLinearGradient(0, y + barHeight, 0, y);
      barGradient.addColorStop(0, '#60a5fa');
      barGradient.addColorStop(1, '#a78bfa');

      ctx.fillStyle = barGradient;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, barHeight, 4);
      } else {
        const r = 4;
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + barWidth - r, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
        ctx.lineTo(x + barWidth, y + barHeight);
        ctx.lineTo(x, y + barHeight);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      }
      ctx.fill();

      ctx.fillStyle = '#374151';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${score}星`, x + barWidth / 2, height - 10);

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(String(count), x + barWidth / 2, y - 8);
    }

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(width - padding.right, padding.top + chartHeight);
    ctx.stroke();

    ctx.strokeStyle = '#f3f4f6';
    for (let i = 1; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#6b7280';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const value = Math.round(maxCount - (maxCount / 4) * i);
      const y = padding.top + (chartHeight / 4) * i;
      ctx.fillText(String(value), padding.left - 8, y + 4);
    }
  }, [stats]);

  return (
    <canvas
      ref={canvasRef}
      className="chart-canvas"
      style={{ width: '100%', height: 250 }}
    />
  );
}

export default function Leaderboard({ leaderboard, stats, isLoading, renderStars, renderMedal }: LeaderboardProps) {
  const getRankBackground = (rank: number) => {
    if (rank === 1) return 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
    if (rank === 2) return 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
    if (rank === 3) return 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)';
    return '#ffffff';
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', textAlign: 'center', paddingTop: 40 }}>
        <p style={{ color: '#6b7280', fontSize: 16 }}>加载中...</p>
      </div>
    );
  }

  const totalRatings = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>评分排行榜</h1>
        <p style={{ color: '#6b7280', fontSize: 14 }}>共收到 {totalRatings} 次评分，按平均分排序</p>
      </div>

      <div style={{ marginBottom: 32 }}>
        {leaderboard.map((item, index) => {
          const rank = index + 1;
          return (
            <div
              key={item.id}
              className="fade-in"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                marginBottom: 12,
                borderRadius: 12,
                background: getRankBackground(rank),
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  flexShrink: 0
                }}
              >
                {renderMedal(rank)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 4,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                  作者：{item.author}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>评分分布:</span>
                  <div style={{ flex: 1, minWidth: 80, maxWidth: 160, paddingTop: 16 }}>
                    <RatingDistributionChart ratings={item.ratings} />
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 4,
                flexShrink: 0
              }}>
                {renderStars(Math.round(item.averageScore))}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
                    {item.averageScore.toFixed(1)}
                  </span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>
                    {item.ratingCount} 人
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {leaderboard.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, backgroundColor: '#ffffff', borderRadius: 12 }}>
            <p style={{ color: '#6b7280', fontSize: 16 }}>暂无评分数据</p>
          </div>
        )}
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>全部评分分布</h3>
        <GlobalDistributionChart stats={stats} />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .chart-canvas {
            height: 200px !important;
          }
        }
      `}</style>
    </div>
  );
}
