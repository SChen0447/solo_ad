import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useActivity } from '../App'
import { ActivitySummary } from '../types'
import html2canvas from 'html2canvas'

const Summary = () => {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { currentActivity, setCurrentActivity } = useActivity()
  const [summary, setSummary] = useState<ActivitySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (code) {
      loadSummary()
    }
  }, [code])

  const loadSummary = async () => {
    try {
      const response = await fetch(`/api/activities/${code}/summary`)
      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      }
    } catch (error) {
      console.error('Failed to load summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    if (!summaryRef.current) return

    setExporting(true)
    try {
      const canvas = await html2canvas(summaryRef.current, {
        backgroundColor: '#F5F7FA',
        scale: 2,
        useCORS: true
      })

      const link = document.createElement('a')
      link.download = `活动摘要_${code}_${new Date().toLocaleDateString('zh-CN')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Failed to export:', error)
      alert('导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    if (hours === 0) return `${mins}分钟`
    if (mins === 0) return `${hours}小时`
    return `${hours}小时${mins}分钟`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '简单'
      case 'medium': return '中等'
      case 'hard': return '困难'
      default: return difficulty
    }
  }

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⏳</div>
        <div className="empty-state-text">加载中...</div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❓</div>
        <div className="empty-state-text">活动摘要不存在</div>
        <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="back-btn" onClick={() => navigate('/')}>
        ← 返回活动列表
      </div>

      <div ref={summaryRef}>
        <div className="summary-banner">
          <span className="icon">✅</span>
          <span className="text">活动已结束 - {summary.activity.name}</span>
        </div>

        <div className="summary-stats">
          <div className="stat-card">
            <div className="stat-value">{summary.memberStats.length}</div>
            <div className="stat-label">参与人数</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatDuration(summary.activity.actualDuration)}</div>
            <div className="stat-label">实际总用时</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{getDifficultyText(summary.activity.difficulty)}</div>
            <div className="stat-label">难度等级</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summary.activity.actualRoute.length}</div>
            <div className="stat-label">途经标记点</div>
          </div>
        </div>

        <div className="summary-section">
          <div className="summary-section-title">📅 活动时间</div>
          <div style={{ display: 'flex', gap: 40 }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>开始时间</div>
              <div style={{ fontSize: 16, fontWeight: 500, marginTop: 4 }}>
                {formatDate(summary.activity.startTime)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>结束时间</div>
              <div style={{ fontSize: 16, fontWeight: 500, marginTop: 4 }}>
                {formatDate(summary.activity.endTime)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>集合地点</div>
              <div style={{ fontSize: 16, fontWeight: 500, marginTop: 4 }}>
                {summary.activity.meetingPoint}
              </div>
            </div>
          </div>
        </div>

        <div className="summary-section">
          <div className="summary-section-title">🗺️ 实际路线</div>
          <div style={{ overflowX: 'auto' }}>
            <svg
              viewBox="0 0 800 200"
              style={{ width: '100%', maxWidth: 800 }}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="summaryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#52B788" />
                  <stop offset="100%" stopColor="#2D6A4F" />
                </linearGradient>
              </defs>
              
              {summary.activity.actualRoute.length > 1 && (
                <path
                  d={summary.activity.actualRoute.map((cp, i) => {
                    const x = 50 + (i / (summary.activity.actualRoute.length - 1)) * 700
                    const maxElev = Math.max(...summary.activity.actualRoute.map(c => c.elevation))
                    const y = 150 - (cp.elevation / maxElev) * 100
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                  }).join(' ')}
                  fill="none"
                  stroke="url(#summaryGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              )}

              {summary.activity.actualRoute.map((cp, i) => {
                const x = 50 + (i / (summary.activity.actualRoute.length - 1 || 1)) * 700
                const maxElev = Math.max(...summary.activity.actualRoute.map(c => c.elevation))
                const y = summary.activity.actualRoute.length > 1
                  ? 150 - (cp.elevation / maxElev) * 100
                  : 100
                return (
                  <g key={cp.id}>
                    <circle cx={x} cy={y} r="10" fill="#2D6A4F" stroke="white" strokeWidth="3" />
                    <text x={x} y={y - 20} textAnchor="middle" fontSize="11" fill="#6B7280">
                      {cp.distance}m
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        <div className="summary-section">
          <div className="summary-section-title">📊 成员上报频率</div>
          <div style={{ marginTop: 16 }}>
            {summary.memberStats.map((stat) => {
              const percentage = stat.totalCheckpoints > 0
                ? (stat.reportCount / stat.totalCheckpoints) * 100
                : 0
              return (
                <div key={stat.memberId} className="member-chart-item">
                  <div className="member-chart-header">
                    <span style={{ fontWeight: 500 }}>{stat.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {stat.reportCount}/{stat.totalCheckpoints} 个标记点
                    </span>
                  </div>
                  <div className="member-chart-bar">
                    <div
                      className="member-chart-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="summary-section">
          <div className="summary-section-title">👥 成员详情</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 14, color: 'var(--text-secondary)' }}>成员</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 14, color: 'var(--text-secondary)' }}>最后上报</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 14, color: 'var(--text-secondary)' }}>上报次数</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 14, color: 'var(--text-secondary)' }}>完成度</th>
                </tr>
              </thead>
              <tbody>
                {summary.memberStats.map((stat) => (
                  <tr key={stat.memberId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 500 }}>{stat.name}</td>
                    <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>
                      {stat.lastReportTime ? formatDate(stat.lastReportTime) : '-'}
                    </td>
                    <td style={{ padding: '12px 8px' }}>{stat.reportCount}次</td>
                    <td style={{ padding: '12px 8px' }}>
                      {stat.totalCheckpoints > 0
                        ? Math.round((stat.reportCount / stat.totalCheckpoints) * 100)
                        : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="export-section">
        <button
          className="btn btn-export"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <>
              <div className="spinner"></div>
              导出中...
            </>
          ) : (
            <>
              📸 导出为截图
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default Summary
