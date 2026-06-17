import { useEffect } from 'react'
import { useArchiveStore } from '@/store'
import { FileText, TrendingUp } from 'lucide-react'

const TYPE_COLORS: Record<string, string> = {
  pdf: '#e74c3c',
  svg: '#e67e22',
  png: '#3498db',
  txt: '#27ae60',
  jpg: '#9b59b6',
}

const TYPE_LABELS: Record<string, string> = {
  pdf: 'PDF',
  svg: 'SVG',
  png: 'PNG',
  txt: 'TXT',
  jpg: 'JPG',
}

function formatDateMMDD(dateStr: string): string {
  const parts = dateStr.split('-')
  return `${parts[1]}-${parts[2]}`
}

function TrendChart({ trend }: { trend: { date: string; count: number }[] }) {
  const hasData = trend.some((d) => d.count > 0)

  if (!hasData) {
    return (
      <div className="trend-chart">
        <div className="trend-empty">暂无数据</div>
        <style>{`
          .trend-chart {
            height: 150px;
            background: #ffffff80;
            border-radius: 8px;
            padding: 12px;
            margin-top: 12px;
          }
          .trend-empty {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #999;
            font-size: 14px;
          }
        `}</style>
      </div>
    )
  }

  const maxCount = Math.max(...trend.map((d) => d.count), 1)
  const chartW = 500
  const chartH = 100
  const padLeft = 30
  const padBottom = 24
  const padTop = 8
  const plotW = chartW - padLeft - 8
  const plotH = chartH - padTop - padBottom
  const stepX = plotW / (trend.length - 1 || 1)

  const points = trend.map((d, i) => ({
    x: padLeft + i * stepX,
    y: padTop + plotH - (d.count / maxCount) * plotH,
    label: formatDateMMDD(d.date),
    count: d.count,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  const yTicks = maxCount <= 5
    ? Array.from({ length: maxCount + 1 }, (_, i) => i)
    : [0, Math.round(maxCount / 2), maxCount]

  return (
    <div className="trend-chart">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%' }}
      >
        {yTicks.map((tick) => {
          const y = padTop + plotH - (tick / maxCount) * plotH
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                y1={y}
                x2={chartW - 8}
                y2={y}
                stroke="#d4c9b3"
                strokeWidth={0.5}
                strokeDasharray="3,3"
              />
              <text
                x={padLeft - 4}
                y={y + 3}
                textAnchor="end"
                fill="#8b7a6a"
                fontSize={9}
              >
                {tick}
              </text>
            </g>
          )
        })}
        <path
          d={linePath}
          fill="none"
          stroke="#8b7a6a"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill="#8b7a6a" />
            <text
              x={p.x}
              y={chartH - 4}
              textAnchor="middle"
              fill="#8b7a6a"
              fontSize={9}
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      <style>{`
        .trend-chart {
          height: 150px;
          background: #ffffff80;
          border-radius: 8px;
          padding: 12px;
          margin-top: 12px;
        }
        .trend-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #999;
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}

export default function Dashboard() {
  const stats = useArchiveStore((s) => s.stats)
  const trend = useArchiveStore((s) => s.trend)
  const loadTrend = useArchiveStore((s) => s.loadTrend)

  useEffect(() => {
    loadTrend()
  }, [loadTrend])

  return (
    <div className="dashboard-container">
      <div className="dashboard-inner">
        <div className="dashboard-chart">
          <div className="chart-title">
            <FileText size={18} />
            <span>档案类型分布</span>
          </div>
          <div className="chart-bars">
            {Object.entries(TYPE_COLORS).map(([type, color]) => {
              const count = stats.typeDistribution[type] || 0
              const maxCount = Math.max(
                ...Object.values(stats.typeDistribution),
                1
              )
              const heightPct = (count / maxCount) * 100
              return (
                <div key={type} className="chart-bar-group">
                  <div className="chart-bar-wrapper">
                    <div
                      className="chart-bar"
                      style={{
                        height: `${Math.max(heightPct, 4)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="chart-bar-count" style={{ color }}>
                    {count}
                  </span>
                  <span className="chart-bar-label">
                    {TYPE_LABELS[type]}
                  </span>
                </div>
              )
            })}
          </div>
          <TrendChart trend={trend} />
        </div>
        <div className="dashboard-summary">
          <div className="summary-total">
            <span className="summary-total-number">{stats.total}</span>
            <span className="summary-total-label">总档案数</span>
          </div>
          <div className="summary-today">
            <TrendingUp size={20} className="summary-today-icon" />
            <span className="summary-today-number">{stats.todayCount}</span>
            <span className="summary-today-label">今日上传</span>
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-container {
          border-radius: 12px;
          background: linear-gradient(to right, #f5f0e1, #e8d9c8);
          padding: 20px 28px;
          margin-bottom: 20px;
        }
        .dashboard-inner {
          display: flex;
          gap: 32px;
        }
        .dashboard-chart {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .chart-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #5a4a3a;
          margin-bottom: 8px;
        }
        .chart-bars {
          display: flex;
          align-items: flex-end;
          gap: 20px;
          padding-bottom: 4px;
        }
        .chart-bar-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          width: 40px;
        }
        .chart-bar-wrapper {
          height: 90px;
          display: flex;
          align-items: flex-end;
          width: 100%;
        }
        .chart-bar {
          width: 40px;
          min-height: 4px;
          border-radius: 0 0 4px 4px;
          transition: height 0.5s ease;
        }
        .chart-bar-count {
          font-size: 13px;
          font-weight: 700;
        }
        .chart-bar-label {
          font-size: 11px;
          color: #8b7a6a;
          font-weight: 500;
        }
        .dashboard-summary {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 16px;
          min-width: 160px;
        }
        .summary-total {
          display: flex;
          flex-direction: column;
        }
        .summary-total-number {
          font-size: 42px;
          font-weight: 800;
          color: #5a4a3a;
          line-height: 1;
        }
        .summary-total-label {
          font-size: 13px;
          color: #8b7a6a;
          margin-top: 4px;
        }
        .summary-today {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .summary-today-icon {
          color: #5cb85c;
        }
        .summary-today-number {
          font-size: 22px;
          font-weight: 700;
          color: #5cb85c;
        }
        .summary-today-label {
          font-size: 13px;
          color: #8b7a6a;
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 16px;
          }
          .dashboard-inner {
            flex-direction: column;
            gap: 16px;
          }
          .chart-bar-wrapper {
            height: 60px;
          }
          .summary-total-number {
            font-size: 32px;
          }
        }
      `}</style>
    </div>
  )
}
