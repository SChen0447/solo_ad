import React, { useRef, useEffect, useState, useCallback } from 'react'
import { SentenceEmotion } from './emotionAnalyzer'

interface LineChartProps {
  emotions: SentenceEmotion[]
}

export const LineChart: React.FC<LineChartProps> = ({ emotions }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = { top: 20, right: 20, bottom: 30, left: 40 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = '#333'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()

      const value = 1 - i * 0.5
      ctx.fillStyle = '#666'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(value.toFixed(1), padding.left - 5, y + 3)
    }

    ctx.strokeStyle = '#555'
    ctx.lineWidth = 1
    const zeroY = padding.top + chartHeight * 0.5
    ctx.beginPath()
    ctx.moveTo(padding.left, zeroY)
    ctx.lineTo(width - padding.right, zeroY)
    ctx.stroke()

    if (emotions.length === 0) return

    const data = emotions.map(e => e.score)
    const xStep = chartWidth / (data.length > 1 ? data.length - 1 : 1)

    const getColor = (value: number) => {
      const t = (value + 1) / 2
      const r = Math.round(255 * (1 - t) + 0 * t)
      const g = Math.round(51 * (1 - t) + 255 * t)
      const b = Math.round(102 * (1 - t) + 136 * t)
      return `rgb(${r}, ${g}, ${b})`
    }

    if (data.length > 1) {
      for (let i = 0; i < data.length - 1; i++) {
        const x1 = padding.left + xStep * i
        const y1 = padding.top + chartHeight * (1 - (data[i] + 1) / 2)
        const x2 = padding.left + xStep * (i + 1)
        const y2 = padding.top + chartHeight * (1 - (data[i + 1] + 1) / 2)

        const gradient = ctx.createLinearGradient(x1, y1, x2, y2)
        gradient.addColorStop(0, getColor(data[i]))
        gradient.addColorStop(1, getColor(data[i + 1]))

        ctx.strokeStyle = gradient
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
    }

    data.forEach((value, i) => {
      const x = padding.left + xStep * i
      const y = padding.top + chartHeight * (1 - (value + 1) / 2)

      ctx.beginPath()
      ctx.arc(x, y, hoveredIndex === i ? 8 : 6, 0, Math.PI * 2)
      ctx.fillStyle = getColor(value)
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
    })

    ctx.fillStyle = '#666'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    data.forEach((_, i) => {
      const x = padding.left + xStep * i
      ctx.fillText(`${i + 1}`, x, height - padding.bottom + 15)
    })
  }, [emotions, hoveredIndex])

  useEffect(() => {
    draw()
    window.addEventListener('resize', draw)
    return () => window.removeEventListener('resize', draw)
  }, [draw])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || emotions.length === 0) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const padding = { top: 20, right: 20, bottom: 30, left: 40 }
    const chartWidth = rect.width - padding.left - padding.right
    const xStep = chartWidth / (emotions.length > 1 ? emotions.length - 1 : 1)

    let closestIndex = -1
    let closestDist = Infinity

    emotions.forEach((_, i) => {
      const pointX = padding.left + xStep * i
      const dist = Math.abs(x - pointX)
      if (dist < closestDist && dist < 15) {
        closestDist = dist
        closestIndex = i
      }
    })

    if (closestIndex >= 0) {
      setHoveredIndex(closestIndex)
      setTooltipPos({ x: padding.left + xStep * closestIndex, y: rect.height - padding.bottom + 30 })
    } else {
      setHoveredIndex(null)
    }
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
  }

  return (
    <div className="line-chart-container">
      <canvas
        ref={canvasRef}
        className="line-chart"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {hoveredIndex !== null && emotions[hoveredIndex] && (
        <div
          className="tooltip"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y - 50
          }}
        >
          {emotions[hoveredIndex].sentence}
        </div>
      )}
    </div>
  )
}

interface PieChartProps {
  positive: number
  negative: number
  surprise: number
  anger: number
}

export const PieChart: React.FC<PieChartProps> = ({ positive, negative, surprise, anger }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prevValuesRef = useRef({ positive: 0, negative: 0, surprise: 0, anger: 0 })
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 120
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    const colors = ['#ff6b6b', '#6c5ce7', '#ffeaa7', '#ff4757']
    const radius = 60
    const cx = size / 2
    const cy = size / 2

    const animate = () => {
      const prev = prevValuesRef.current
      const target = { positive, negative, surprise, anger }
      const eased = {
        positive: prev.positive + (target.positive - prev.positive) * 0.1,
        negative: prev.negative + (target.negative - prev.negative) * 0.1,
        surprise: prev.surprise + (target.surprise - prev.surprise) * 0.1,
        anger: prev.anger + (target.anger - prev.anger) * 0.1
      }

      prevValuesRef.current = eased

      const values = [eased.positive, eased.negative, eased.surprise, eased.anger]
      const total = values.reduce((a, b) => a + b, 0) || 1

      ctx.clearRect(0, 0, size, size)

      let startAngle = -Math.PI / 2

      values.forEach((value, i) => {
        const sliceAngle = (value / total) * Math.PI * 2
        if (sliceAngle < 0.01) return

        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle)
        ctx.closePath()
        ctx.fillStyle = colors[i]
        ctx.fill()

        startAngle += sliceAngle
      })

      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      const diff =
        Math.abs(target.positive - eased.positive) +
        Math.abs(target.negative - eased.negative) +
        Math.abs(target.surprise - eased.surprise) +
        Math.abs(target.anger - eased.anger)

      if (diff > 0.001) {
        animFrameRef.current = requestAnimationFrame(animate)
      }
    }

    animate()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [positive, negative, surprise, anger])

  return (
    <div className="pie-chart-container">
      <canvas ref={canvasRef} className="pie-chart" />
      <div className="pie-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#ff6b6b' }}></span>
          <span>积极 ({(positive * 100).toFixed(0)}%)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#6c5ce7' }}></span>
          <span>消极 ({(negative * 100).toFixed(0)}%)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#ffeaa7' }}></span>
          <span>惊讶 ({(surprise * 100).toFixed(0)}%)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#ff4757' }}></span>
          <span>愤怒 ({(anger * 100).toFixed(0)}%)</span>
        </div>
      </div>
    </div>
  )
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (value: number) => void
}

export const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, unit, onChange }) => {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="slider-group">
      <div className="slider-label">
        <span>{label}</span>
        <span>{value.toFixed(1)} {unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ '--value': `${percentage}%` } as React.CSSProperties}
      />
    </div>
  )
}

interface TextInputProps {
  value: string
  onChange: (value: string) => void
  onAnalyze: () => void
}

export const TextInput: React.FC<TextInputProps> = ({ value, onChange, onAnalyze }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <textarea
        className="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="输入一段文字或一首诗，系统将分析其中的情感变化..."
      />
      <button className="analyze-btn" onClick={onAnalyze}>
        分析情感
      </button>
    </div>
  )
}
