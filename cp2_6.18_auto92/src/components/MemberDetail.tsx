import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchMemberDetail, MemberDetail as MemberDetailType, DailyRecord, AbnormalRecord } from '../api'
import './MemberDetail.css'

function BarChart({ data }: { data: DailyRecord[] }) {
  const width = 800
  const height = 300
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const barWidth = 20

  const maxHours = Math.max(...data.map((d) => d.hours), 24)

  const getBarColor = (hours: number) => {
    if (hours === 0) return '#e5e7eb'
    if (hours < 4) return '#93c5fd'
    if (hours <= 8) return '#6ee7b7'
    if (hours <= 12) return '#fcd34d'
    return '#fca5a5'
  }

  const xStep = data.length > 0 ? chartWidth / data.length : chartWidth

  const yTicks = [0, 6, 12, 18, 24]

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const xLabelIndices = data
    .map((_, i) => i)
    .filter((i) => i % 3 === 0 || i === data.length - 1)

  return (
    <svg width={width} height={height} className="bar-chart">
      {yTicks.map((tick, i) => {
        const y = padding.top + chartHeight - (tick / maxHours) * chartHeight
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
              {tick}h
            </text>
          </g>
        )
      })}

      {data.map((d, i) => {
        const barHeight = (d.hours / maxHours) * chartHeight
        const x = padding.left + i * xStep + (xStep - barWidth) / 2
        const y = padding.top + chartHeight - barHeight
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight || 1}
              fill={getBarColor(d.hours)}
              rx={4}
              ry={4}
            />
            <title>{`${d.date}: ${d.hours.toFixed(1)}小时`}</title>
          </g>
        )
      })}

      {xLabelIndices.map((idx, i) => {
        const x = padding.left + idx * xStep + xStep / 2
        return (
          <text
            key={i}
            x={x}
            y={height - padding.bottom + 20}
            textAnchor="middle"
            fontSize="10"
            fill="#9ca3af"
          >
            {formatDate(data[idx].date)}
          </text>
        )
      })}
    </svg>
  )
}

function AbnormalItem({ record }: { record: AbnormalRecord }) {
  return (
    <div className="abnormal-item">
      <div className="abnormal-left-border" />
      <div className="abnormal-content">
        <div className="abnormal-header">
          <span className="abnormal-date">{record.date}</span>
          <span className="abnormal-hours">{record.hours.toFixed(1)}h</span>
        </div>
        <div className="abnormal-reason">{record.reason}</div>
      </div>
    </div>
  )
}

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<MemberDetailType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadDetail(id)
    }
  }, [id])

  const loadDetail = async (memberId: string) => {
    try {
      setLoading(true)
      const result = await fetchMemberDetail(memberId)
      setData(result)
    } catch (error) {
      console.error('Failed to load member detail:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (!data) {
    return <div className="loading">加载失败</div>
  }

  return (
    <div className="member-detail">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← 返回
      </button>

      <h2 className="page-title">{data.member.name} - 个人详情</h2>

      <div className="detail-section">
        <h3 className="section-title">近30天工时分布</h3>
        <div className="chart-container">
          <BarChart data={data.dailyRecords} />
        </div>
        <div className="legend">
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#93c5fd' }} />
            <span>低于4小时</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#6ee7b7' }} />
            <span>4-8小时</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#fcd34d' }} />
            <span>8-12小时</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#fca5a5' }} />
            <span>超过12小时</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h3 className="section-title">
          异常记录 ({data.abnormalRecords.length}条)
        </h3>
        {data.abnormalRecords.length > 0 ? (
          <div className="abnormal-list">
            {data.abnormalRecords.map((record, index) => (
              <AbnormalItem key={index} record={record} />
            ))}
          </div>
        ) : (
          <div className="no-abnormal">暂无异常记录</div>
        )}
      </div>

      <div className="detail-section">
        <h3 className="section-title">参与项目</h3>
        <div className="project-tags">
          {data.projects.map((project) => (
            <span key={project.id} className="project-tag">
              {project.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
