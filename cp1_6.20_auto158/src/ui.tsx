import { useState, useEffect, useRef, useCallback } from 'react'
import type { RoadSegment, HourlyData } from './trafficData'

interface TooltipProps {
  visible: boolean
  x: number
  y: number
  flow: number | null
  congestionLevel: string
}

export function Tooltip({ visible, x, y, flow, congestionLevel }: TooltipProps) {
  const [displayX, setDisplayX] = useState(x)
  const [displayY, setDisplayY] = useState(y)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayX(x)
      setDisplayY(y)
    }, 100)
    return () => clearTimeout(timer)
  }, [x, y])

  if (!visible || flow === null) return null

  const levelText = {
    low: '低',
    medium: '中',
    high: '高',
  }[congestionLevel] || '未知'

  const levelColor = {
    low: '#22c55e',
    medium: '#eab308',
    high: '#ef4444',
  }[congestionLevel] || '#94a3b8'

  return (
    <div
      style={{
        position: 'absolute',
        left: displayX + 12,
        top: displayY + 12,
        background: 'white',
        borderRadius: 8,
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        pointerEvents: 'none',
        zIndex: 1000,
        fontSize: '0.875rem',
        color: '#1e293b',
        minWidth: 140,
        transition: 'left 0.1s ease-out, top 0.1s ease-out',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, color: '#0f172a' }}>实时流量</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#64748b' }}>流量值</span>
        <span style={{ fontWeight: 500 }}>{Math.round(flow)} 辆/小时</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#64748b' }}>拥堵等级</span>
        <span style={{ fontWeight: 500, color: levelColor }}>{levelText}</span>
      </div>
    </div>
  )
}

interface InfoPanelProps {
  visible: boolean
  road: RoadSegment | null
  hourlyData: HourlyData[]
  onClose: () => void
  onPlayback: (road: RoadSegment) => void
}

export function InfoPanel({ visible, road, hourlyData, onClose, onPlayback }: InfoPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (visible && road) {
      setPulse(true)
      const timer = setTimeout(() => setPulse(false), 500)
      return () => clearTimeout(timer)
    }
  }, [visible, road])

  useEffect(() => {
    if (!canvasRef.current || hourlyData.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const padding = { top: 20, right: 10, bottom: 30, left: 40 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    ctx.clearRect(0, 0, width, height)

    const maxFlow = Math.max(...hourlyData.map(d => d.flow)) * 1.1
    const minFlow = 0

    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()

      ctx.fillStyle = '#64748b'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'right'
      const value = Math.round(maxFlow - ((maxFlow - minFlow) / 4) * i)
      ctx.fillText(value.toString(), padding.left - 5, y + 3)
    }

    const gradients = [
      { start: 7, end: 9, label: '早高峰' },
      { start: 17, end: 19, label: '晚高峰' },
    ]

    gradients.forEach(({ start, end, label }) => {
      const startX = padding.left + (start / 24) * chartWidth
      const endX = padding.left + (end / 24) * chartWidth
      
      const gradient = ctx.createLinearGradient(startX, 0, endX, 0)
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0)')
      gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.15)')
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0)')
      
      ctx.fillStyle = gradient
      ctx.fillRect(startX, padding.top, endX - startX, chartHeight)
    })

    const points = hourlyData.map((d, i) => ({
      x: padding.left + (i / (hourlyData.length - 1)) * chartWidth,
      y: padding.top + chartHeight - ((d.flow - minFlow) / (maxFlow - minFlow)) * chartHeight,
    }))

    const areaGradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight)
    areaGradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)')
    areaGradient.addColorStop(1, 'rgba(59, 130, 246, 0.02)')

    ctx.beginPath()
    ctx.moveTo(points[0].x, padding.top + chartHeight)
    points.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight)
    ctx.closePath()
    ctx.fillStyle = areaGradient
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const cpX = (prev.x + curr.x) / 2
      ctx.quadraticCurveTo(prev.x, prev.y, cpX, (prev.y + curr.y) / 2)
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
    
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#64748b'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    for (let i = 0; i <= 24; i += 6) {
      const x = padding.left + (i / 24) * chartWidth
      ctx.fillText(`${i.toString().padStart(2, '0')}:00`, x, height - padding.bottom + 15)
    }
  }, [hourlyData])

  const currentFlow = hourlyData.length > 0 ? hourlyData[new Date().getHours()]?.flow || 0 : 0

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: visible ? 0 : -360,
        width: 320,
        height: '100%',
        background: '#1e293b',
        borderRadius: '16px 0 0 16px',
        padding: 24,
        transition: 'right 0.3s ease, box-shadow 0.5s ease',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: pulse ? '0 0 20px #3b82f6, -4px 0 20px rgba(0,0,0,0.3)' : '-4px 0 20px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ color: '#e2e8f0', fontSize: '1.125rem', fontWeight: 600 }}>道路详情</h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: 0,
            width: 32,
            height: 32,
            borderRadius: 8,
            transition: 'background 0.2s ease-out',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          ×
        </button>
      </div>

      {road && (
        <>
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: 4 }}>道路名称</div>
            <div style={{ color: '#e2e8f0', fontSize: '1.25rem', fontWeight: 500 }}>{road.name}</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: 4 }}>当前流量</div>
            <div style={{ color: '#e2e8f0', fontSize: '2rem', fontWeight: 700 }}>
              {currentFlow}
              <span style={{ fontSize: '0.875rem', color: '#64748b', marginLeft: 4 }}>辆/小时</span>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: 8 }}>24小时流量趋势</div>
            <div style={{ flex: 1, minHeight: 150 }}>
              <canvas ref={canvasRef} width={280} height={180} style={{ width: '100%', height: '100%' }} />
            </div>
          </div>

          <button
            onClick={() => onPlayback(road)}
            style={{
              marginTop: 20,
              width: '100%',
              padding: '12px 24px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'filter 0.2s ease-out',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            回放24小时数据
          </button>
        </>
      )}
    </div>
  )
}

interface PlaybackTimelineProps {
  visible: boolean
  isPlaying: boolean
  currentHour: number
  speed: number
  onPlay: () => void
  onPause: () => void
  onSeek: (hour: number) => void
  onSpeedChange: (speed: number) => void
  onClose: () => void
}

export function PlaybackTimeline({
  visible,
  isPlaying,
  currentHour,
  speed,
  onPlay,
  onPause,
  onSeek,
  onSpeedChange,
  onClose,
}: PlaybackTimelineProps) {
  const formatTime = (hour: number) => {
    const h = Math.floor(hour)
    const m = Math.floor((hour - h) * 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(parseFloat(e.target.value))
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: 600,
        background: 'rgba(30, 41, 59, 0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: '#e2e8f0', fontSize: '1.5rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(currentHour)}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '1.25rem',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <input
          type="range"
          min="0"
          max="23.99"
          step="0.01"
          value={currentHour}
          onChange={handleSliderChange}
          style={{
            width: '100%',
            height: 6,
            borderRadius: 3,
            background: '#334155',
            outline: 'none',
            appearance: 'none',
            cursor: 'pointer',
          }}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(59, 130, 246, 0.5);
            transition: transform 0.2s ease;
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.1);
          }
        `}</style>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={isPlaying ? onPause : onPlay}
          style={{
            padding: '10px 24px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'filter 0.2s ease-out',
            minWidth: 80,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
        >
          {isPlaying ? '暂停' : '播放'}
        </button>

        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3, 4].map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              style={{
                padding: '6px 12px',
                background: speed === s ? '#3b82f6' : '#334155',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'background 0.2s ease-out',
              }}
              onMouseEnter={(e) => {
                if (speed !== s) e.currentTarget.style.background = '#475569'
              }}
              onMouseLeave={(e) => {
                if (speed !== s) e.currentTarget.style.background = '#334155'
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

interface ControlPanelProps {
  onResetView: () => void
}

export function ControlPanel({ onResetView }: ControlPanelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'rgba(30, 41, 59, 0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        zIndex: 50,
      }}
    >
      <h2 style={{ color: '#e2e8f0', fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>
        城市交通热力图
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={onResetView}
          style={{
            padding: '8px 16px',
            background: '#334155',
            color: '#e2e8f0',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'filter 0.2s ease-out',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
        >
          重置视角
        </button>
      </div>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #334155' }}>
        <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 6 }}>图例</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              background: 'linear-gradient(to right, #3b82f6, #06b6d4, #eab308, #ef4444)',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ color: '#64748b', fontSize: '0.7rem' }}>低</span>
          <span style={{ color: '#64748b', fontSize: '0.7rem' }}>高</span>
        </div>
      </div>
    </div>
  )
}
