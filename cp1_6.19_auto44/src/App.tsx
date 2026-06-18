import { useState, useEffect, useRef } from 'react'
import Scene from './scene'
import FurniturePanel from './furniturePanel'
import { useAppStore } from './state'
import { STATS_UPDATE_DELAY, VALUE_ANIMATION_DURATION } from './types'

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(value)
  const prevValue = useRef(value)

  useEffect(() => {
    const startValue = prevValue.current
    const endValue = value
    const startTime = performance.now()
    const duration = VALUE_ANIMATION_DURATION * 1000

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + (endValue - startValue) * easeProgress

      setDisplayValue(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        prevValue.current = value
      }
    }

    requestAnimationFrame(animate)
  }, [value])

  return <span>{displayValue.toFixed(2)}{suffix}</span>
}

function StatsPanel() {
  const stats = useAppStore((state) => state.stats)
  const [displayStats, setDisplayStats] = useState(stats)
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }

    updateTimeoutRef.current = setTimeout(() => {
      setDisplayStats(stats)
    }, STATS_UPDATE_DELAY)

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [stats])

  return (
    <div className="stats-panel">
      <div className="stats-item">
        <div className="stats-icon">📐</div>
        <div className="stats-info">
          <span className="stats-label">总面积</span>
          <span className="stats-value">
            <AnimatedNumber value={displayStats.totalArea} suffix=" m²" />
          </span>
        </div>
      </div>
      <div className="stats-item">
        <div className="stats-icon">🪑</div>
        <div className="stats-info">
          <span className="stats-label">已占用</span>
          <span className="stats-value">
            <AnimatedNumber value={displayStats.occupiedArea} suffix=" m²" />
          </span>
        </div>
      </div>
      <div className="stats-item">
        <div className="stats-icon">📦</div>
        <div className="stats-info">
          <span className="stats-label">家具数量</span>
          <span className="stats-value">
            <AnimatedNumber value={displayStats.furnitureCount} />
          </span>
        </div>
      </div>
      <div className="stats-item">
        <div className="stats-icon">👁️</div>
        <div className="stats-info">
          <span className="stats-label">遮挡率</span>
          <span className="stats-value">
            <AnimatedNumber value={displayStats.occlusionRate} suffix="%" />
          </span>
        </div>
      </div>
    </div>
  )
}

function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">🏠</span>
        <span className="logo-text">空间规划</span>
      </div>
      <div className="sidebar-divider" />
      <div className="sidebar-item active" title="家具模式">
        <span>🛋️</span>
      </div>
      <div className="sidebar-item" title="墙体编辑">
        <span>🧱</span>
      </div>
      <div className="sidebar-item" title="门窗">
        <span>🚪</span>
      </div>
      <div className="sidebar-item" title="测量">
        <span>📏</span>
      </div>
      <div className="sidebar-divider" />
      <div className="sidebar-item" title="设置">
        <span>⚙️</span>
      </div>
    </div>
  )
}

function FileUpload() {
  const loadRoomFromJSON = useAppStore((state) => state.loadRoomFromJSON)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        loadRoomFromJSON(json)
      } catch (err) {
        console.error('Failed to parse room JSON:', err)
      }
    }
    reader.readAsText(file)
  }

  return (
    <label className="file-upload-btn">
      <span>📂</span>
      <input type="file" accept=".json" onChange={handleFileChange} hidden />
    </label>
  )
}

export default function App() {
  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-content">
        <div className="scene-container">
          <Scene />

          <div className="top-toolbar">
            <FileUpload />
          </div>

          <StatsPanel />
        </div>

        <FurniturePanel />
      </div>
    </div>
  )
}
