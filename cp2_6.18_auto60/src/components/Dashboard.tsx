import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchDashboardSummary,
  DashboardSummary,
  MemberRankingItem,
  TrendDataItem
} from '../api';

const cardStyle: React.CSSProperties = {
  width: 220,
  height: 120,
  borderRadius: 16,
  background: 'linear-gradient(135deg, #e0f2fe 0%, #ede9fe 100%)',
  padding: 16,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#6b7280',
  margin: 0
};

const cardValueStyle: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 'bold',
  color: '#1f2937',
  margin: 0,
  lineHeight: 1.2
};

const cardChangeStyle = (isPositive: boolean, isZero: boolean): React.CSSProperties => ({
  fontSize: 13,
  color: isZero ? '#6b7280' : (isPositive ? '#22c55e' : '#ef4444'),
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 4,
  transition: 'all 0.3s ease-out',
  margin: 0
});

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#1f2937',
  marginBottom: 16
};

const rankingItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 0',
  borderBottom: '1px solid #f3f4f6',
  gap: 12
};

const avatarStyle = (color: string): React.CSSProperties => ({
  width: 36,
  height: 36,
  borderRadius: '50%',
  backgroundColor: color,
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  fontWeight: 600,
  flexShrink: 0
});

const progressContainerStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 4
};

const progressBarBgStyle: React.CSSProperties = {
  height: 8,
  borderRadius: 4,
  backgroundColor: '#e5e7eb',
  overflow: 'hidden'
};

const progressBarFillStyle = (percent: number): React.CSSProperties => ({
  height: '100%',
  background: `linear-gradient(90deg, #86efac 0%, #22c55e 100%)`,
  borderRadius: 4,
  width: `${percent}%`,
  transition: 'width 0.5s ease-out'
});

const trendChartContainerStyle: React.CSSProperties = {
  width: 400,
  height: 250,
  position: 'relative',
  backgroundColor: '#f9fafb',
  borderRadius: 12,
  padding: '20px 16px 12px 16px',
  boxSizing: 'border-box'
};

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await fetchDashboardSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>;
  }

  if (!summary) {
    return <div style={{ padding: 40, textAlign: 'center' }}>加载失败</div>;
  }

  const top5Members = summary.memberRanking.slice(0, 5);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 24 }}>
        工时概览仪表板
      </h1>

      <div style={{ display: 'flex', gap: 20, marginBottom: 32, flexWrap: 'wrap' }}>
        <StatCard
          label="总项目数"
          value={summary.totalProjects}
          change={summary.projectsChange}
        />
        <StatCard
          label="总成员数"
          value={summary.totalMembers}
          change={summary.membersChange}
        />
        <StatCard
          label="最近7天总工时"
          value={summary.last7Hours}
          change={summary.hoursChange}
          suffix="小时"
        />
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 300, maxWidth: 400 }}>
          <h2 style={sectionTitleStyle}>个人工时排名（本周）</h2>
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
            }}
          >
            {top5Members.map((item, index) => (
              <RankingItem
                key={item.member.id}
                item={item}
                rank={index + 1}
              />
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 420 }}>
          <h2 style={sectionTitleStyle}>项目工时趋势（近30天）</h2>
          <TrendChart
            data={summary.trendData}
            hoveredPoint={hoveredPoint}
            onHover={setHoveredPoint}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  change,
  suffix = ''
}: {
  label: string;
  value: number;
  change: number;
  suffix?: string;
}) {
  const isPositive = change > 0;
  const isZero = change === 0;

  return (
    <div style={cardStyle}>
      <p style={cardLabelStyle}>{label}</p>
      <p style={cardValueStyle}>
        {value.toLocaleString()}
        {suffix && <span style={{ fontSize: 16, fontWeight: 'normal', color: '#6b7280' }}> {suffix}</span>}
      </p>
      <p style={cardChangeStyle(isPositive, isZero)}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>
          {isZero ? '→' : (isPositive ? '↑' : '↓')}
        </span>
        {Math.abs(change)}% 较上周
      </p>
    </div>
  );
}

function RankingItem({ item, rank }: { item: MemberRankingItem; rank: number }) {
  const percent = Math.min((item.hours / 60) * 100, 100);
  const initial = item.member.name.charAt(0);

  return (
    <div style={rankingItemStyle}>
      <div style={{ width: 20, fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>
        {rank}
      </div>
      <Link
        to={`/members/${item.member.id}`}
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <div style={avatarStyle(item.member.avatarColor)}>
          {initial}
        </div>
      </Link>
      <div style={progressContainerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link
            to={`/members/${item.member.id}`}
            style={{ fontSize: 14, color: '#1f2937', fontWeight: 500, textDecoration: 'none' }}
          >
            {item.member.name}
          </Link>
          <span style={{ fontSize: 13, color: '#6b7280' }}>{item.hours}h</span>
        </div>
        <div style={progressBarBgStyle}>
          <div style={progressBarFillStyle(percent)} />
        </div>
      </div>
    </div>
  );
}

function TrendChart({
  data,
  hoveredPoint,
  onHover
}: {
  data: TrendDataItem[];
  hoveredPoint: number | null;
  onHover: (index: number | null) => void;
}) {
  const chartWidth = 360;
  const chartHeight = 180;
  const padding = { top: 10, right: 10, bottom: 30, left: 36 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const maxHours = Math.max(...data.map(d => d.hours), 1);
  const yMax = Math.ceil(maxHours / 20) * 20;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * innerWidth;
    const y = padding.top + innerHeight - (d.hours / yMax) * innerHeight;
    return { x, y, hours: d.hours, date: d.date };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const yTicks = [0, yMax / 2, yMax];

  function formatDate(dateStr: string) {
    const parts = dateStr.split('-');
    return `${parts[1]}/${parts[2]}`;
  }

  return (
    <div style={trendChartContainerStyle}>
      <svg width={chartWidth} height={chartHeight} style={{ display: 'block' }}>
        {yTicks.map((tick, i) => {
          const y = padding.top + innerHeight - (tick / yMax) * innerHeight;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke="#e5e7eb"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={11}
                fill="#9ca3af"
              >
                {tick}
              </text>
            </g>
          );
        })}

        <path
          d={pathD}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredPoint === i ? 6 : 4}
              fill="#fff"
              stroke="#3b82f6"
              strokeWidth={2}
              style={{ cursor: 'pointer', transition: 'r 0.2s ease' }}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
            />
            {hoveredPoint === i && (
              <g>
                <rect
                  x={p.x - 35}
                  y={p.y - 28}
                  width={70}
                  height={20}
                  rx={4}
                  fill="#1f2937"
                />
                <text
                  x={p.x}
                  y={p.y - 14}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#fff"
                >
                  {p.hours}h
                </text>
              </g>
            )}
          </g>
        ))}

        {data.filter((_, i) => i % 7 === 0 || i === data.length - 1).map((d, idx) => {
          const i = data.findIndex((item, index) => {
            if (idx === 0) return index === 0;
            if (idx === Math.ceil(data.length / 7)) return index === data.length - 1;
            return index === idx * 7;
          });
          if (i < 0) return null;
          const x = padding.left + (i / (data.length - 1)) * innerWidth;
          return (
            <text
              key={i}
              x={x}
              y={chartHeight - 10}
              textAnchor="middle"
              fontSize={10}
              fill="#9ca3af"
            >
              {formatDate(d.date)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
