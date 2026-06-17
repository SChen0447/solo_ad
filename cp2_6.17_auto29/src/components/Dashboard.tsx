import { useArchiveStore } from '@/store'
import type { FileStats } from '@/api'
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

export default function Dashboard() {
  const stats = useArchiveStore((s) => s.stats)

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
          height: 200px;
          border-radius: 12px;
          background: linear-gradient(to right, #f5f0e1, #e8d9c8);
          padding: 20px 28px;
          margin-bottom: 20px;
        }
        .dashboard-inner {
          display: flex;
          gap: 32px;
          height: 100%;
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
          flex: 1;
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
          border-radius: 4px 4px 0 0;
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
            height: auto;
            min-height: 160px;
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
