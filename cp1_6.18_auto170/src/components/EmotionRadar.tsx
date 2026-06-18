import { useEffect, useRef, useState } from 'react'
import { useEmotionStore } from '../store/emotionStore'
import type { EmotionDimensions } from '../store/emotionStore'
import { getEmotionColorScale } from '../utils/particleEngine'

interface DimensionInfo {
  key: keyof EmotionDimensions
  label: string
  angle: number
}

const dimensions: DimensionInfo[] = [
  { key: 'joy', label: '快乐', angle: -Math.PI / 2 },
  { key: 'anger', label: '愤怒', angle: -Math.PI / 2 + (2 * Math.PI / 5) },
  { key: 'anxiety', label: '焦虑', angle: -Math.PI / 2 + (4 * Math.PI / 5) },
  { key: 'sadness', label: '悲伤', angle: -Math.PI / 2 + (6 * Math.PI / 5) },
  { key: 'calm', label: '平静', angle: -Math.PI / 2 + (8 * Math.PI / 5) }
]

export default function EmotionRadar() {
  const { emotions } = useEmotionStore()
  const [displayValues, setDisplayValues] = useState<EmotionDimensions>(emotions)
  const animationRef = useRef<number>()
  const lastUpdateRef = useRef<number>(0)

  useEffect(() => {
    const startValues = { ...displayValues }
    const startTime = performance.now()
    const duration = 500

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      const newValues: Partial<EmotionDimensions> = {}
      dimensions.forEach(dim => {
        const start = startValues[dim.key]
        const end = emotions[dim.key]
        newValues[dim.key] = start + (end - start) * eased
      })

      setDisplayValues(prev => ({ ...prev, ...newValues }))

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    if (performance.now() - lastUpdateRef.current > 50) {
      animationRef.current = requestAnimationFrame(animate)
      lastUpdateRef.current = performance.now()
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [emotions])

  const size = 200
  const center = size / 2
  const radius = size * 0.35
  const levels = 5

  const getPoint = (angle: number, value: number) => {
    const r = radius * value
    return {
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r
    }
  }

  const polygonPoints = dimensions
    .map(dim => {
      const point = getPoint(dim.angle, displayValues[dim.key])
      return `${point.x},${point.y}`
    })
    .join(' ')

  return (
    <div style={styles.container}>
      <div style={styles.title}>情绪维度</div>
      <svg width={size} height={size} style={styles.svg}>
        <defs>
          <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(102, 126, 234, 0.3)" />
            <stop offset="100%" stopColor="rgba(118, 75, 162, 0.1)" />
          </radialGradient>
        </defs>

        {Array.from({ length: levels }).map((_, i) => {
          const r = radius * ((i + 1) / levels)
          const points = dimensions
            .map(dim => {
              const x = center + Math.cos(dim.angle) * r
              const y = center + Math.sin(dim.angle) * r
              return `${x},${y}`
            })
            .join(' ')
          return (
            <polygon
              key={i}
              points={points}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1"
            />
          )
        })}

        {dimensions.map((dim, i) => {
          const point = getPoint(dim.angle, 1)
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1"
            />
          )
        })}

        <polygon
          points={polygonPoints}
          fill="url(#radarGradient)"
          stroke="rgba(102, 126, 234, 0.8)"
          strokeWidth="2"
          style={{ transition: 'all 0.5s ease-out' }}
        />

        {dimensions.map((dim, i) => {
          const point = getPoint(dim.angle, displayValues[dim.key])
          const colorScale = getEmotionColorScale(dim.key)
          return (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={colorScale(displayValues[dim.key])}
              style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.5))' }}
            />
          )
        })}

        {dimensions.map((dim, i) => {
          const point = getPoint(dim.angle, 1.18)
          const colorScale = getEmotionColorScale(dim.key)
          return (
            <text
              key={i}
              x={point.x}
              y={point.y}
              fill={colorScale(displayValues[dim.key])}
              fontSize="12"
              fontWeight="500"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {dim.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    padding: '16px',
    background: 'rgba(26, 26, 46, 0.85)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
  },
  title: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '8px',
    textAlign: 'center'
  },
  svg: {
    display: 'block'
  }
}
