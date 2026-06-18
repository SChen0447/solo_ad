import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchDashboard, DashboardData, TopMember } from '../api'
import './Dashboard.css'

const softColors = [
  '#a78bfa',
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#f87171',
]

function StatCard({
  title,
  value,
  change,
}: {
  title: string
  value: string | number
  change: number
}) {
  const isPositive = change >= 0

  return (
    <div className="stat-card">
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-change ${isPositive ? 'positive' : 'negative'}`}>
        <span className="change-arrow">{isPositive ? '↑' : '↓'}</span>
        <span className="change-percent">{Math.abs(change)}%</span>
      </div>
    </div>
  )
}

function RankingItem({
  rank,
  member,
  hours,
  onClick,
}: {
  rank: number
  member: { id: string; name: string }
  hours: number
  onClick: () => void
}) {
  const maxHours = 60
  const percentage = Math.min((hours / maxHours) * 100, 100)
  const initial = member.name.charAt(0)
  const colorIndex = rank % softColors.length

  return (
    <div className="ranking-item" onClick={onClick}>
      <div className="ranking-avatar" style={{ backgroundColor: softColors[colorIndex] }}>
        {initial}
      </div>
      <div className="ranking-info">
        <div className="ranking-name">
          {rank}. {member.name}
        </div>
        <div className="ranking-bar-container">
          <div
            className="ranking-bar"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <div className="ranking-hours">{hours.toFixed(1)}h</div>
    </div>
  )
}

function TrendChart({ data }: { data: { date: string; total: number }[] }) {
  const width = 400
  const height = 250
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const maxTotal = Math.max(...data.map((d) => d.total), 1)

  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth

  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + chartHeight - (d.total / maxTotal) * chartHeight,
    total: d.total,
    date: d.date,
  }))

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ')

  const yTicks = [0, maxTotal * 0.25, maxTotal * 0.5, maxTotal * 0.75, maxTotal]

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const xLabels = data.filter((_, i) => i % 5 === 0 || i === data.length - 1)

  return (
    <svg width={width} height={height} className="trend-chart">
      {yTicks.map((tick, i) => {
        const y = padding.top + chartHeight - (tick / maxTotal) * chartHeight
        return (
          <g key={i}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="#e5e7eb"
              strokeDasharray="3,3"
            />
            <text
              x={padding.left - 10}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fill="#9ca3af"
            >
              {Math.round(tick)}
            </text>
          </g>
        )
      })}

      <path
        d={pathD}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
      />

      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#3b82f6"
            stroke="white"
            strokeWidth="2"
          />
          <title>{`${p.date}: ${p.total.toFixed(1)}小时`}</title>
        </g>
      ))}

      {xLabels.map((d, i) => {
        const idx = data.indexOf(d)
        const x = padding.left + idx * xStep
        return (
          <text
            key={i}
            x={x}
            y={height - padding.bottom + 20}
            textAnchor="middle"
            fontSize="10"
            fill="#9ca3af"
          >
            {formatDate(d.date)}
          </text>
        )
      })}
    </svg>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const result = await fetchDashboard()
      setData(result)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMemberClick = (memberId: string) => {
    navigate(`/member/${memberId}`)
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (!data) {
    return <div className="loading">加载失败</div>
  }

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">概览仪表板</h2>

      <div className="stat-cards">
        <StatCard
          title="总项目数"
          value={data.stats.totalProjects}
          change={data.stats.projectChange}
        />
        <StatCard
          title="总成员数"
          value={data.stats.totalMembers}
          change={data.stats.memberChange}
        />
        <StatCard
          title="最近7天总工时"
          value={`${data.stats.last7DaysHours}h`}
          change={data.stats.weekChange}
        />
      </div>

      <div className="dashboard-content">
        <div className="ranking-section">
          <h3 className="section-title">个人工时排名榜（本周）</h3>
          <div className="ranking-list">
            {data.topMembers.map((item: TopMember, index: number) => (
              <RankingItem
                key={item.member.id}
                rank={index + 1}
                member={item.member}
                hours={item.hours}
                onClick={() => handleMemberClick(item.member.id)}
              />
            ))}
          </div>
        </div>

        <div className="trend-section">
          <h3 className="section-title">项目工时趋势（近30天）</h3>
          <TrendChart data={data.dailyTrend} />
        </div>
      </div>
    </div>
  )
}
