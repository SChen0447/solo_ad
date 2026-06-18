import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  fetchDashboardStats,
  fetchDashboardRanking,
  fetchDashboardTrend,
  type DashboardStats,
  type RankingItem,
  type TrendPoint,
} from '@/api';

const SOFT_COLORS = [
  '#fca5a5', '#fdba74', '#fcd34d', '#86efac', '#67e8f9',
  '#a5b4fc', '#c4b5fd', '#f9a8d4', '#fda4af', '#bef264',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SOFT_COLORS[Math.abs(hash) % SOFT_COLORS.length];
}

function StatCard({
  label,
  value,
  changePercent,
}: {
  label: string;
  value: string | number;
  changePercent: number;
}) {
  const isPositive = changePercent > 0;
  const isNegative = changePercent < 0;

  return (
    <div
      style={{
        width: 220,
        height: 120,
        borderRadius: 16,
        background: 'linear-gradient(135deg, #e0f2fe 0%, #ede9fe 100%)',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <span style={{ fontSize: 14, color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: 32, fontWeight: 700, color: '#1f2937' }}>
        {value}
      </span>
      <div
        style={{
          position: 'absolute',
          right: 20,
          bottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 13,
          fontWeight: 500,
          color: isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#9ca3af',
          transition: 'all 0.3s ease-out',
        }}
      >
        {isPositive && <TrendingUp size={14} />}
        {isNegative && <TrendingDown size={14} />}
        {!isPositive && !isNegative && <Minus size={14} />}
        <span>
          {isPositive ? '+' : ''}
          {changePercent}%
        </span>
      </div>
    </div>
  );
}

function RankingList({ ranking }: { ranking: RankingItem[] }) {
  const MAX_HOURS = 60;

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: '#1f2937',
          marginBottom: 16,
        }}
      >
        个人工时排名榜（本周）
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ranking.map((item, idx) => {
          const pct = Math.min((item.weeklyHours / MAX_HOURS) * 100, 100);
          const color = getAvatarColor(item.name);
          return (
            <Link
              key={item.memberId}
              to={`/members/${item.memberId}`}
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: '#fff',
                  transition: 'box-shadow 0.2s ease-out',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    '0 2px 8px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {item.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#1f2937',
                      }}
                    >
                      {idx + 1}. {item.name}
                    </span>
                    <span
                      style={{ fontSize: 13, color: '#6b7280', flexShrink: 0 }}
                    >
                      {item.weeklyHours}h
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 4,
                      background: '#e5e7eb',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        borderRadius: 4,
                        background: 'linear-gradient(90deg, #86efac 0%, #22c55e 100%)',
                        transition: 'width 0.6s ease-out',
                      }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: TrendPoint[] }) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    value: number;
    date: string;
  } | null>(null);

  const WIDTH = 400;
  const HEIGHT = 250;
  const PAD_L = 40;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 36;
  const CHART_W = WIDTH - PAD_L - PAD_R;
  const CHART_H = HEIGHT - PAD_T - PAD_B;

  const maxVal = Math.max(...data.map((d) => d.totalHours), 1);

  const points = data.map((d, i) => ({
    x: PAD_L + (i / Math.max(data.length - 1, 1)) * CHART_W,
    y: PAD_T + CHART_H - (d.totalHours / maxVal) * CHART_H,
    ...d,
  }));

  const linePath = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
    .join(' ');

  const areaPath =
    linePath +
    ` L${points[points.length - 1].x},${PAD_T + CHART_H} L${points[0].x},${PAD_T + CHART_H} Z`;

  const yTicks = 5;
  const yStep = Math.ceil(maxVal / yTicks);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;

      let closest = points[0];
      let minDist = Infinity;
      for (const p of points) {
        const dist = Math.abs(p.x - mx);
        if (dist < minDist) {
          minDist = dist;
          closest = p;
        }
      }

      setTooltip({
        x: closest.x,
        y: closest.y,
        value: closest.totalHours,
        date: closest.date,
      });
    },
    [points]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: '#1f2937',
          marginBottom: 16,
        }}
      >
        项目工时趋势（近30天）
      </h3>
      <div style={{ position: 'relative', width: WIDTH, height: HEIGHT }}>
        <svg
          width={WIDTH}
          height={HEIGHT}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ display: 'block' }}
        >
          {Array.from({ length: yTicks + 1 }, (_, i) => {
            const val = i * yStep;
            const y = PAD_T + CHART_H - (val / maxVal) * CHART_H;
            return (
              <g key={i}>
                <line
                  x1={PAD_L}
                  y1={y}
                  x2={WIDTH - PAD_R}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="4,3"
                />
                <text
                  x={PAD_L - 6}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="#9ca3af"
                >
                  {val}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#areaGrad)" opacity={0.18} />
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>

          <path
            d={linePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={tooltip && tooltip.date === p.date ? 5 : 3}
              fill="#3b82f6"
              stroke="#fff"
              strokeWidth={2}
              style={{ transition: 'r 0.15s ease-out' }}
            />
          ))}

          {tooltip && (
            <line
              x1={tooltip.x}
              y1={PAD_T}
              x2={tooltip.x}
              y2={PAD_T + CHART_H}
              stroke="#3b82f6"
              strokeDasharray="3,3"
              opacity={0.3}
            />
          )}
        </svg>

        {tooltip && (
          <div
            style={{
              position: 'absolute',
              left: tooltip.x,
              top: tooltip.y - 40,
              transform: 'translateX(-50%)',
              background: '#1f2937',
              color: '#fff',
              fontSize: 12,
              padding: '6px 10px',
              borderRadius: 6,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 600 }}>{tooltip.value}h</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>{tooltip.date}</div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingLeft: PAD_L,
            paddingRight: PAD_R,
            marginTop: 4,
          }}
        >
          {data
            .filter((_, i) => i % 7 === 0 || i === data.length - 1)
            .map((d) => (
              <span key={d.date} style={{ fontSize: 10, color: '#9ca3af' }}>
                {d.date.slice(5)}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, r, t] = await Promise.all([
          fetchDashboardStats(),
          fetchDashboardRanking(),
          fetchDashboardTrend(),
        ]);
        setStats(s);
        setRanking(r);
        setTrend(t);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 400,
          color: '#9ca3af',
          fontSize: 16,
        }}
      >
        加载中...
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 20,
          marginBottom: 32,
          flexWrap: 'wrap',
        }}
      >
        <StatCard
          label="总项目数"
          value={stats.totalProjects}
          changePercent={stats.changePercent}
        />
        <StatCard
          label="总成员数"
          value={stats.totalMembers}
          changePercent={stats.changePercent}
        />
        <StatCard
          label="最近7天总工时"
          value={`${stats.last7DaysHours}h`}
          changePercent={stats.changePercent}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <RankingList ranking={ranking} />
        <TrendChart data={trend} />
      </div>
    </div>
  );
}
