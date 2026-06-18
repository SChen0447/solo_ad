import { useRef, useEffect, useMemo } from 'react';
import type { LeaderboardItem } from '../types';

interface LeaderboardProps {
  leaderboard: LeaderboardItem[];
  stats: Record<number, number>;
  isLoading: boolean;
  renderStars: (score: number, size?: number) => JSX.Element;
  renderMedal: (rank: number) => JSX.Element | string;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function LeaderboardBarChart({ data }: { data: LeaderboardItem[] }) {
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
    const chartHeight = 300;
    const labelHeight = 48;
    const padding = { top: 32, right: 20, bottom: labelHeight, left: 50 };
    const chartAreaWidth = width - padding.left - padding.right;
    const chartAreaHeight = chartHeight - padding.top - 20;

    ctx.clearRect(0, 0, width, height);

    const barWidth = 40;
    const barGap = 20;
    const totalBarsWidth = data.length * barWidth + (data.length - 1) * barGap;

    let startX: number;
    if (totalBarsWidth > chartAreaWidth) {
      startX = padding.left;
    } else {
      startX = padding.left + (chartAreaWidth - totalBarsWidth) / 2;
    }

    const maxScore = 5;

    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartAreaHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const value = 5 - i;
      const y = padding.top + (chartAreaHeight / 5) * i + 4;
      ctx.fillText(value.toFixed(1), padding.left - 10, y);
    }

    data.forEach((item, index) => {
      const x = startX + index * (barWidth + barGap);
      const barHeight = (item.averageScore / maxScore) * chartAreaHeight;
      const y = padding.top + chartAreaHeight - barHeight;

      const gradient = ctx.createLinearGradient(0, y + barHeight, 0, y);
      gradient.addColorStop(0, '#3b82f6');
      gradient.addColorStop(1, '#1d4ed8');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      const radius = 4;
      if (barHeight >= radius * 2) {
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, y + barHeight);
        ctx.lineTo(x, y + barHeight);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
      } else {
        ctx.roundRect(x, y, barWidth, barHeight, 4);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#1e40af';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.averageScore.toFixed(1), x + barWidth / 2, y - 8);

      const labelY = padding.top + chartAreaHeight + 20;
      ctx.fillStyle = '#374151';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';

      const displayTitle = truncateText(item.title, 10);
      ctx.fillText(displayTitle, x + barWidth / 2, labelY);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(`${item.ratingCount}人评`, x + barWidth / 2, labelY + 16);
    });

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartAreaHeight);
    ctx.lineTo(width - padding.right, padding.top + chartAreaHeight);
    ctx.stroke();
  }, [data]);

  const totalWidth = useMemo(() => {
    const barWidth = 40;
    const barGap = 20;
    return data.length * barWidth + (data.length - 1) * barGap + 100;
  }, [data]);

  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        overflowY: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: `${Math.max(totalWidth, 600)}px`,
          height: '300px',
          minWidth: '100%',
          display: 'block'
        }}
      />
    </div>
  );
}

export default function Leaderboard({ leaderboard, stats, isLoading, renderStars, renderMedal }: LeaderboardProps) {
  const topProposal = leaderboard.length > 0 ? leaderboard[0] : null;
  const totalProposals = leaderboard.length;

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

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>评分排行榜</h1>
        <p style={{ color: '#6b7280', fontSize: 14 }}>所有分享提案的评分排名，按平均分从高到低排序</p>
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: 24
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>平均分排行</h3>
        <LeaderboardBarChart data={leaderboard} />
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: 24
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>详细排名</h3>

        <div>
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
                  marginBottom: index < leaderboard.length - 1 ? 8 : 0,
                  borderRadius: 12,
                  background: getRankBackground(rank),
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
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
                    textOverflow: 'ellipsis',
                    color: '#111827'
                  }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: 13, color: '#6b7280' }}>
                    作者：{item.author}
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 6,
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {renderStars(Math.round(item.averageScore), 14)}
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
                      {item.averageScore.toFixed(1)}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>
                    {item.ratingCount} 人评分
                  </span>
                </div>
              </div>
            );
          })}

          {leaderboard.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <p style={{ color: '#9ca3af', fontSize: 14 }}>暂无评分数据</p>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 24
        }}
      >
        <div style={{ flex: 1, minWidth: 150 }}>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>总提案数</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{totalProposals}</p>
        </div>
        <div style={{ flex: 2, minWidth: 200 }}>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>平均分最高</p>
          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#1e40af',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {topProposal ? (
              <span>
                {topProposal.title}
                <span style={{ fontSize: 13, color: '#3b82f6', marginLeft: 8, fontWeight: 500 }}>
                  {topProposal.averageScore.toFixed(1)} 分
                </span>
              </span>
            ) : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}
