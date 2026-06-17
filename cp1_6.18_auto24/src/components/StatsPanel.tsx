import React from 'react'
import './StatsPanel.css'

interface StatsPanelProps {
  isOpen: boolean
  onToggle: () => void
  total: number
  avgRating: number
  thisMonthAdded: number
  last7Days: { date: string; count: number }[]
  wishlistCount: number
  readingCount: number
  finishedCount: number
}

export function StatsPanel({
  isOpen,
  onToggle,
  total,
  avgRating,
  thisMonthAdded,
  last7Days,
  wishlistCount,
  readingCount,
  finishedCount,
}: StatsPanelProps) {
  const totalStatus = wishlistCount + readingCount + finishedCount
  const wishlistPercent = totalStatus > 0 ? (wishlistCount / totalStatus) * 100 : 0
  const readingPercent = totalStatus > 0 ? (readingCount / totalStatus) * 100 : 0
  const finishedPercent = totalStatus > 0 ? (finishedCount / totalStatus) * 100 : 0

  const circumference = 2 * Math.PI * 40
  const wishlistOffset = 0
  const readingOffset = (wishlistPercent / 100) * circumference
  const finishedOffset = ((wishlistPercent + readingPercent) / 100) * circumference

  const maxCount = Math.max(...last7Days.map(d => d.count), 1)

  return (
    <div className={`stats-panel ${isOpen ? 'open' : ''}`}>
      <button className="stats-toggle" onClick={onToggle}>
        <span className="toggle-icon">{isOpen ? '▼' : '▲'}</span>
        <span>{isOpen ? '收起统计' : '展开统计'}</span>
      </button>
      <div className="stats-content">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-value">{total}</span>
            <span className="stat-label">总阅读数</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{avgRating.toFixed(1)}</span>
            <span className="stat-label">平均评分</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{thisMonthAdded}</span>
            <span className="stat-label">本月新增</span>
          </div>
        </div>
        <div className="stats-charts">
          <div className="chart-section">
            <h4>阅读状态分布</h4>
            <div className="pie-chart-container">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="40"
                  fill="none"
                  stroke="#e8e5e0"
                  strokeWidth="12"
                />
                {wishlistPercent > 0 && (
                  <circle
                    cx="60"
                    cy="60"
                    r="40"
                    fill="none"
                    stroke="#9c27b0"
                    strokeWidth="12"
                    strokeDasharray={`${(wishlistPercent / 100) * circumference} ${circumference}`}
                    strokeDashoffset={-wishlistOffset}
                    transform="rotate(-90 60 60)"
                  />
                )}
                {readingPercent > 0 && (
                  <circle
                    cx="60"
                    cy="60"
                    r="40"
                    fill="none"
                    stroke="#03a9f4"
                    strokeWidth="12"
                    strokeDasharray={`${(readingPercent / 100) * circumference} ${circumference}`}
                    strokeDashoffset={-readingOffset}
                    transform="rotate(-90 60 60)"
                  />
                )}
                {finishedPercent > 0 && (
                  <circle
                    cx="60"
                    cy="60"
                    r="40"
                    fill="none"
                    stroke="#ff9800"
                    strokeWidth="12"
                    strokeDasharray={`${(finishedPercent / 100) * circumference} ${circumference}`}
                    strokeDashoffset={-finishedOffset}
                    transform="rotate(-90 60 60)"
                  />
                )}
              </svg>
              <div className="pie-legend">
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#9c27b0' }}></span>
                  <span>想读 ({wishlistCount})</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#03a9f4' }}></span>
                  <span>在读 ({readingCount})</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#ff9800' }}></span>
                  <span>读完 ({finishedCount})</span>
                </div>
              </div>
            </div>
          </div>
          <div className="chart-section">
            <h4>最近7天新增</h4>
            <div className="bar-chart-container">
              {last7Days.map((day, index) => (
                <div key={index} className="bar-item">
                  <div className="bar-wrapper">
                    <div
                      className="bar"
                      style={{
                        height: `${(day.count / maxCount) * 100}%`,
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      {day.count > 0 && (
                        <span className="bar-value">{day.count}</span>
                      )}
                    </div>
                  </div>
                  <span className="bar-label">{day.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
