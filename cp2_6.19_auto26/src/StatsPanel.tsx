import { useEffect, useState, useRef } from 'react'
import type { Stats } from './App'

interface StatsPanelProps {
  stats: Stats
}

const StatsPanel = ({ stats }: StatsPanelProps) => {
  const masteryRate = stats.totalCards > 0 ? stats.totalMastered / stats.totalCards : 0
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const [barsAnimated, setBarsAnimated] = useState(false)
  const [lineAnimated, setLineAnimated] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    const duration = 1200
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setAnimatedProgress(masteryRate * eased)
      if (t < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [masteryRate])

  useEffect(() => {
    const timer = setTimeout(() => setBarsAnimated(true), 300)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setLineAnimated(true), 500)
    return () => clearTimeout(timer)
  }, [])

  const radius = 70
  const stroke = 10
  const circumference = 2 * Math.PI * radius
  const offset = circumference - animatedProgress * circumference

  const maxHistory = Math.max(...stats.history.map((h) => h.count), 1)

  const weekData = stats.history.slice(-7)
  const chartWidth = 260
  const chartHeight = 90
  const chartPadding = { top: 10, right: 10, bottom: 20, left: 10 }
  const innerWidth = chartWidth - chartPadding.left - chartPadding.right
  const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom
  const maxWeek = Math.max(...weekData.map((h) => h.count), 1)

  const points = weekData.map((d, i) => ({
    x: chartPadding.left + (i / (weekData.length - 1)) * innerWidth,
    y: chartPadding.top + innerHeight - (d.count / maxWeek) * innerHeight,
    value: d.count,
    label: d.date,
  }))

  const smoothPath = points
    .map((p, i, arr) => {
      if (i === 0) return `M ${p.x} ${p.y}`
      const prev = arr[i - 1]
      const cpx1 = prev.x + (p.x - prev.x) / 2
      const cpy1 = prev.y
      const cpx2 = prev.x + (p.x - prev.x) / 2
      const cpy2 = p.y
      return `C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${p.x} ${p.y}`
    })
    .join(' ')

  const lineLength = 500

  const statCards = [
    {
      label: '今日已复习',
      value: stats.todayReviewed,
      suffix: '张',
      icon: '📝',
      color: '#4f8ef7',
    },
    {
      label: '连续学习',
      value: stats.streak,
      suffix: '天',
      icon: '🔥',
      color: '#ff7a45',
    },
    {
      label: '已掌握',
      value: stats.totalMastered,
      suffix: `/${stats.totalCards}`,
      icon: '✨',
      color: '#52c41a',
    },
  ]

  return (
    <div ref={ref}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 22, fontWeight: 700 }}>学习统计</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
          跟踪你的学习进度，见证每天的成长
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {statCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 2px 12px var(--shadow)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${card.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                {card.icon}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                {card.label}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1,
                }}
              >
                {card.value}
              </span>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{card.suffix}</span>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 360px) 1fr',
          gap: 24,
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 28,
            boxShadow: '0 2px 12px var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, fontWeight: 500 }}>
            掌握率
          </div>
          <svg width={radius * 2 + stroke * 2} height={radius * 2 + stroke * 2} style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx={radius + stroke}
              cy={radius + stroke}
              r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth={stroke}
            />
            <circle
              cx={radius + stroke}
              cy={radius + stroke}
              r={radius}
              fill="none"
              stroke="url(#masteryGradient)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.05s linear' }}
            />
            <defs>
              <linearGradient id="masteryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4f8ef7" />
                <stop offset="100%" stopColor="#6fb1ff" />
              </linearGradient>
            </defs>
          </svg>
          <div
            style={{
              position: 'relative',
              marginTop: -(radius * 2 + stroke * 2) - 10,
              marginBottom: radius + stroke - 10,
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1,
              }}
            >
              {Math.round(animatedProgress * 100)}%
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              总进度
            </div>
          </div>

          <div
            style={{
              width: '100%',
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                fontWeight: 500,
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              本周学习趋势
            </div>
            <svg
              width={chartWidth}
              height={chartHeight}
              style={{ display: 'block', margin: '0 auto' }}
            >
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#79a9ff" />
                  <stop offset="100%" stopColor="#4f8ef7" />
                </linearGradient>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(79,142,247,0.25)" />
                  <stop offset="100%" stopColor="rgba(79,142,247,0)" />
                </linearGradient>
              </defs>

              <path
                d={`${smoothPath} L ${points[points.length - 1].x} ${chartHeight - chartPadding.bottom} L ${points[0].x} ${chartHeight - chartPadding.bottom} Z`}
                fill="url(#areaGradient)"
                opacity={lineAnimated ? 1 : 0}
                style={{ transition: 'opacity 0.8s ease' }}
              />

              <path
                d={smoothPath}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={lineLength}
                strokeDashoffset={lineAnimated ? 0 : lineLength}
                style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />

              {points.map((p, i) => (
                <g key={i}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={4}
                    fill="var(--bg-card)"
                    stroke="url(#lineGradient)"
                    strokeWidth={2}
                    opacity={lineAnimated ? 1 : 0}
                    style={{
                      transition: `opacity 0.3s ease ${0.3 + i * 0.1}s`,
                    }}
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={1.5}
                    fill="url(#lineGradient)"
                    opacity={lineAnimated ? 1 : 0}
                    style={{
                      transition: `opacity 0.3s ease ${0.35 + i * 0.1}s`,
                    }}
                  />
                  <text
                    x={p.x}
                    y={chartHeight - 5}
                    textAnchor="middle"
                    fontSize={9}
                    fill="var(--text-secondary)"
                    opacity={lineAnimated ? 1 : 0}
                    style={{
                      transition: `opacity 0.3s ease ${0.4 + i * 0.1}s`,
                    }}
                  >
                    {p.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 2px 12px var(--shadow)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>
              最近 10 天复习情况
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                padding: '4px 10px',
                borderRadius: 999,
                background: 'var(--bg-primary)',
              }}
            >
              柱状图
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 8,
              height: 180,
              paddingTop: 10,
            }}
          >
            {stats.history.map((item, i) => {
              const heightPct = (item.count / maxHistory) * 100
              const isLast = i === stats.history.length - 1
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--text-secondary)',
                      fontWeight: 500,
                    }}
                  >
                    {item.count}
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: barsAnimated ? `${heightPct}%` : '0%',
                      maxWidth: 36,
                      background: isLast
                        ? 'linear-gradient(180deg, #4f8ef7, #79a9ff)'
                        : 'linear-gradient(180deg, var(--accent-light), var(--accent))',
                      borderRadius: '6px 6px 2px 2px',
                      opacity: isLast ? 1 : 0.65,
                      transition: `height 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)`,
                      transitionDelay: `${i * 60}ms`,
                      boxShadow: isLast ? '0 4px 12px rgba(79,142,247,0.35)' : 'none',
                    }}
                  />
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%',
                    }}
                  >
                    {item.date}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatsPanel
