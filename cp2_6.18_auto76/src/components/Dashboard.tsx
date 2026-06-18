import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchDashboardStats,
  fetchDashboardRanking,
  fetchDashboardTrend,
  type DashboardStats,
  type MemberRanking,
  type DailyStats,
} from '@/api';

function StatCard({
  title,
  value,
  change,
}: {
  title: string;
  value: string | number;
  change: number;
}) {
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div
      className="flex flex-col justify-between p-4 shadow-lg transition-transform duration-300 hover:scale-105"
      style={{
        width: '220px',
        height: '120px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #e0f2fe 0%, #ede9fe 100%)',
      }}
    >
      <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>
        {title}
      </div>
      <div
        style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#1f2937',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div
        className="self-end flex items-center gap-1"
        style={{
          color: isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#6b7280',
          fontSize: '12px',
          fontWeight: 500,
          transition: 'all 0.3s ease-out',
        }}
      >
        <span
          style={{
            transform: isPositive ? 'rotate(-45deg)' : isNegative ? 'rotate(45deg)' : 'none',
            display: 'inline-block',
            transition: 'transform 0.3s ease-out',
          }}
        >
          {isPositive ? '↗' : isNegative ? '↘' : '→'}
        </span>
        <span>{Math.abs(change)}%</span>
      </div>
    </div>
  );
}

function RankingItem({
  ranking,
  onClick,
}: {
  ranking: MemberRanking;
  onClick: () => void;
}) {
  const percentage = Math.min((ranking.weeklyHours / 60) * 100, 100);
  const initial = ranking.member.name.charAt(0);

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50"
      onClick={onClick}
    >
      <div
        className="flex items-center justify-center text-white font-bold"
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: ranking.member.avatarColor,
          flexShrink: 0,
        }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="font-medium text-gray-800 truncate">
            {ranking.member.name}
          </span>
          <span className="text-sm font-semibold text-gray-600 ml-2">
            {ranking.weeklyHours}h
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: '#e5e7eb' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${percentage}%`,
              background: 'linear-gradient(90deg, #86efac 0%, #22c55e 100%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: DailyStats[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = 400;
  const height = 250;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxHours = Math.max(...data.map((d) => d.hours), 1);
  const xStep = chartWidth / (data.length - 1);

  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + chartHeight - (d.hours / maxHours) * chartHeight,
    hours: d.hours,
    date: d.date,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="relative" style={{ width: '400px', height: '250px' }}>
      <svg width={width} height={height}>
        {[0, 1, 2, 3, 4].map((i) => {
          const y = padding.top + (chartHeight / 4) * i;
          const value = Math.round((maxHours / 4) * (4 - i));
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e5e7eb"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                fill="#9ca3af"
                fontSize="10"
                textAnchor="end"
              >
                {value}
              </text>
            </g>
          );
        })}

        <path
          d={pathD}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <g
            key={i}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? 6 : 4}
              fill="#3b82f6"
              stroke="white"
              strokeWidth="2"
              className="transition-all duration-200"
            />
          </g>
        ))}

        {data.filter((_, i) => i % 5 === 0).map((d, i) => {
          const x = padding.left + i * 5 * xStep;
          return (
            <text
              key={i}
              x={x}
              y={height - 10}
              fill="#9ca3af"
              fontSize="10"
              textAnchor="middle"
            >
              {formatDate(d.date)}
            </text>
          );
        })}
      </svg>

      {hoveredIndex !== null && (
        <div
          className="absolute bg-gray-800 text-white px-2 py-1 rounded text-xs pointer-events-none z-10"
          style={{
            left: points[hoveredIndex].x + 10,
            top: points[hoveredIndex].y - 30,
          }}
        >
          <div>{formatDate(points[hoveredIndex].date)}</div>
          <div className="font-semibold">{points[hoveredIndex].hours} 小时</div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ranking, setRanking] = useState<MemberRanking[]>([]);
  const [trend, setTrend] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, rankingData, trendData] = await Promise.all([
          fetchDashboardStats(),
          fetchDashboardRanking(),
          fetchDashboardTrend(),
        ]);
        setStats(statsData);
        setRanking(rankingData);
        setTrend(trendData);
      } catch (error) {
        console.error('加载仪表板数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">项目工时仪表板</h1>

      <div className="flex flex-wrap gap-6">
        {stats && (
          <>
            <StatCard
              title="总项目数"
              value={stats.totalProjects}
              change={stats.totalProjectsChange}
            />
            <StatCard
              title="总成员数"
              value={stats.totalMembers}
              change={stats.totalMembersChange}
            />
            <StatCard
              title="最近7天总工时"
              value={`${stats.last7DaysHours}h`}
              change={stats.last7DaysHoursChange}
            />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            本周工时排名
          </h2>
          <div className="space-y-2" style={{ width: '320px' }}>
            {ranking.map((r) => (
              <RankingItem
                key={r.member.id}
                ranking={r}
                onClick={() => navigate(`/member/${r.member.id}`)}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            项目工时趋势
          </h2>
          <TrendChart data={trend} />
        </div>
      </div>
    </div>
  );
}
