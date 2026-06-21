import { useState, useEffect, useRef } from 'react'
import type { Stats, Card } from './types'
import { getStats, getAllCards } from './api'

export default function StatsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const barCanvasRef = useRef<HTMLCanvasElement>(null)
  const pieCanvasRef = useRef<HTMLCanvasElement>(null)
  const usageCanvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  const fetchData = async () => {
    try {
      const [statsData, cardsData] = await Promise.all([
        getStats(),
        getAllCards()
      ])
      setStats(statsData)
      setCards(cardsData.cards)
    } catch (e) {
      console.error('Failed to fetch stats:', e)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (stats && cards.length > 0) {
      drawCharts()
    }
  }, [stats, cards])

  const drawCharts = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    
    let progress = 0
    const duration = 500
    let startTime: number | null = null
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      progress = Math.min(elapsed / duration, 1)
      
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      
      drawBarChart(easeProgress)
      drawPieChart(easeProgress)
      drawUsageChart(easeProgress)
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }
    
    animationRef.current = requestAnimationFrame(animate)
  }

  const drawBarChart = (progress: number) => {
    const canvas = barCanvasRef.current
    if (!canvas || !stats) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    
    const w = rect.width
    const h = rect.height
    const padding = { top: 30, right: 20, bottom: 40, left: 50 }
    const chartW = w - padding.left - padding.right
    const chartH = h - padding.top - padding.bottom
    
    ctx.clearRect(0, 0, w, h)
    
    const data = [
      { label: '胜利', value: stats.player1Wins + stats.player2Wins, color: '#10B981' },
      { label: '失败', value: stats.player2Wins + stats.player1Wins, color: '#EF4444' },
      { label: '平局', value: stats.draws, color: '#F59E0B' }
    ]
    
    const maxValue = Math.max(...data.map(d => d.value), 1)
    const barWidth = chartW / data.length * 0.5
    const barGap = chartW / data.length
    
    data.forEach((item, i) => {
      const barHeight = (item.value / maxValue) * chartH * progress
      const x = padding.left + barGap * i + (barGap - barWidth) / 2
      const y = padding.top + chartH - barHeight
      
      const gradient = ctx.createLinearGradient(0, y, 0, padding.top + chartH)
      gradient.addColorStop(0, '#6366F1')
      gradient.addColorStop(1, '#A855F7')
      
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barHeight, [6, 6, 0, 0])
      ctx.fill()
      
      ctx.fillStyle = '#E5E7EB'
      ctx.font = '12px -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(item.label, x + barWidth / 2, padding.top + chartH + 20)
      
      ctx.fillStyle = '#F9FAFB'
      ctx.font = 'bold 14px -apple-system, sans-serif'
      ctx.fillText(String(item.value), x + barWidth / 2, y - 8)
    })
    
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top)
    ctx.lineTo(padding.left, padding.top + chartH)
    ctx.lineTo(padding.left + chartW, padding.top + chartH)
    ctx.stroke()
  }

  const drawPieChart = (progress: number) => {
    const canvas = pieCanvasRef.current
    if (!canvas || !stats) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    
    const w = rect.width
    const h = rect.height
    
    ctx.clearRect(0, 0, w, h)
    
    const total = stats.player1Wins + stats.player2Wins + stats.draws
    const data = [
      { label: '玩家1胜', value: stats.player1Wins, color: '#3B82F6' },
      { label: '玩家2胜', value: stats.player2Wins, color: '#EF4444' },
      { label: '平局', value: stats.draws, color: '#F59E0B' }
    ]
    
    const centerX = w / 2
    const centerY = h / 2
    const radius = Math.min(w, h) / 2 - 30
    
    let startAngle = -Math.PI / 2
    
    data.forEach((item) => {
      const sliceAngle = (item.value / total) * Math.PI * 2 * progress
      
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle)
      ctx.closePath()
      ctx.fillStyle = item.color
      ctx.fill()
      
      ctx.strokeStyle = '#1E293B'
      ctx.lineWidth = 3
      ctx.stroke()
      
      startAngle += sliceAngle
    })
    
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2)
    ctx.fillStyle = '#1E293B'
    ctx.fill()
    
    ctx.fillStyle = '#F9FAFB'
    ctx.font = 'bold 20px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${total}`, centerX, centerY - 8)
    ctx.font = '12px -apple-system, sans-serif'
    ctx.fillStyle = '#9CA3AF'
    ctx.fillText('总场次', centerX, centerY + 12)
    
    const legendY = h - 20
    const legendItemWidth = w / 3
    data.forEach((item, i) => {
      const lx = legendItemWidth * i + legendItemWidth / 2
      ctx.fillStyle = item.color
      ctx.beginPath()
      ctx.arc(lx - 40, legendY, 6, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.fillStyle = '#E5E7EB'
      ctx.font = '12px -apple-system, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${item.label}: ${item.value}`, lx - 30, legendY)
    })
  }

  const drawUsageChart = (progress: number) => {
    const canvas = usageCanvasRef.current
    if (!canvas || !stats || cards.length === 0) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    
    const w = rect.width
    const h = rect.height
    
    ctx.clearRect(0, 0, w, h)
    
    const usageData = cards
      .map(card => ({
        card,
        usage: stats.cardUsage[card.id] || 0
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 8)
    
    const maxUsage = Math.max(...usageData.map(d => d.usage), 1)
    const barHeight = 28
    const barGap = 12
    const labelWidth = 100
    const valueWidth = 50
    const barMaxWidth = w - labelWidth - valueWidth - 20
    
    usageData.forEach((item, i) => {
      const y = 10 + i * (barHeight + barGap)
      const barWidth = (item.usage / maxUsage) * barMaxWidth * progress
      
      const gradient = ctx.createLinearGradient(labelWidth, 0, labelWidth + barWidth, 0)
      gradient.addColorStop(0, '#10B981')
      gradient.addColorStop(1, '#34D399')
      
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.roundRect(labelWidth, y, barWidth, barHeight, [0, 4, 4, 0])
      ctx.fill()
      
      ctx.fillStyle = '#E5E7EB'
      ctx.font = '13px -apple-system, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      
      const displayName = item.card.name.length > 8 
        ? item.card.name.slice(0, 8) + '…' 
        : item.card.name
      ctx.fillText(displayName, 5, y + barHeight / 2)
      
      if (barWidth > 50) {
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 12px -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`${item.card.name} ${item.usage}次`, labelWidth + barWidth / 2, y + barHeight / 2)
      } else {
        ctx.fillStyle = '#9CA3AF'
        ctx.font = '12px -apple-system, sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(`${item.usage}次`, labelWidth + barWidth + 8, y + barHeight / 2)
      }
    })
  }

  const totalBattles = stats ? stats.player1Wins + stats.player2Wins + stats.draws : 0
  const winRateP1 = totalBattles > 0 && stats ? ((stats.player1Wins / totalBattles) * 100).toFixed(1) : '0'
  const winRateP2 = totalBattles > 0 && stats ? ((stats.player2Wins / totalBattles) * 100).toFixed(1) : '0'

  return (
    <div className="stats-dashboard">
      <h2 className="section-title">战绩统计</h2>
      
      <div className="stats-summary">
        <div className="stat-card">
          <div className="stat-value">{totalBattles}</div>
          <div className="stat-label">总场次</div>
        </div>
        <div className="stat-card">
          <div className="stat-value win">{winRateP1}%</div>
          <div className="stat-label">玩家1胜率</div>
        </div>
        <div className="stat-card">
          <div className="stat-value lose">{winRateP2}%</div>
          <div className="stat-label">玩家2胜率</div>
        </div>
        <div className="stat-card">
          <div className="stat-value draw">{stats?.draws || 0}</div>
          <div className="stat-label">平局次数</div>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h3 className="chart-title">场次分布</h3>
          <canvas ref={barCanvasRef} className="chart-canvas bar-chart" />
        </div>
        <div className="chart-card">
          <h3 className="chart-title">胜负比例</h3>
          <canvas ref={pieCanvasRef} className="chart-canvas pie-chart" />
        </div>
      </div>

      <div className="chart-card full-width">
        <h3 className="chart-title">卡牌使用频率排名</h3>
        <canvas ref={usageCanvasRef} className="chart-canvas usage-chart" />
      </div>

      <style>{`
        .stats-dashboard {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .section-title {
          font-size: 40px;
          font-weight: bold;
          color: #F59E0B;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
          text-align: center;
          margin-bottom: 30px;
        }
        .stats-summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          border: 1px solid #334155;
        }
        .stat-value {
          font-size: 32px;
          font-weight: bold;
          color: #F9FAFB;
          margin-bottom: 4px;
        }
        .stat-value.win { color: #10B981; }
        .stat-value.lose { color: #EF4444; }
        .stat-value.draw { color: #F59E0B; }
        .stat-label {
          font-size: 13px;
          color: #9CA3AF;
        }
        .charts-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        .chart-card {
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #334155;
        }
        .chart-card.full-width {
          grid-column: 1 / -1;
        }
        .chart-title {
          font-size: 18px;
          font-weight: 600;
          color: #E5E7EB;
          margin-bottom: 16px;
        }
        .chart-canvas {
          width: 100%;
        }
        .bar-chart {
          height: 220px;
        }
        .pie-chart {
          height: 250px;
        }
        .usage-chart {
          height: 340px;
        }
        @media (max-width: 768px) {
          .stats-summary {
            grid-template-columns: repeat(2, 1fr);
          }
          .charts-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
