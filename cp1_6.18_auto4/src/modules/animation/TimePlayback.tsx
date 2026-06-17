import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Dataset } from '../../types'
import * as d3 from 'd3'

export interface TimePlaybackProps {
  dataset: Dataset | null
  onTimestampChange: (timestamp: number | null) => void
  playSpeed: number
  setPlaySpeed: (speed: number) => void
}

const SPEED_PRESETS = [0.25, 0.5, 1, 2, 4, 8]

const TimePlayback: React.FC<TimePlaybackProps> = ({
  dataset,
  onTimestampChange,
  playSpeed,
  setPlaySpeed
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentRatio, setCurrentRatio] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const rafRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const progressRef = useRef<HTMLDivElement>(null)
  const animationStartRef = useRef<number>(0)
  const startRatioRef = useRef<number>(0)

  const timeRange = useMemo<[number, number]>(() => {
    return dataset?.timeRange || [Date.now() - 86400000, Date.now()]
  }, [dataset])

  const currentTimestamp = useMemo(() => {
    return timeRange[0] + currentRatio * (timeRange[1] - timeRange[0])
  }, [currentRatio, timeRange])

  const totalDurationMs = useMemo(() => {
    return (timeRange[1] - timeRange[0]) / playSpeed
  }, [timeRange, playSpeed])

  useEffect(() => {
    onTimestampChange(dataset ? currentTimestamp : null)
  }, [currentTimestamp, dataset, onTimestampChange])

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const animate = useCallback((timestamp: number) => {
    if (!lastFrameTimeRef.current) {
      lastFrameTimeRef.current = timestamp
    }

    const elapsed = timestamp - animationStartRef.current
    const progress = elapsed / totalDurationMs
    const newRatio = Math.min(1, startRatioRef.current + progress)

    setCurrentRatio(newRatio)

    if (newRatio >= 1) {
      setIsPlaying(false)
      rafRef.current = null
      return
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [totalDurationMs])

  useEffect(() => {
    if (isPlaying && dataset) {
      animationStartRef.current = performance.now()
      startRatioRef.current = currentRatio
      lastFrameTimeRef.current = 0
      rafRef.current = requestAnimationFrame(animate)
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isPlaying, dataset, animate, currentRatio])

  const togglePlay = () => {
    if (!dataset) return
    if (currentRatio >= 1) {
      setCurrentRatio(0)
      setIsPlaying(true)
    } else {
      setIsPlaying((prev) => !prev)
    }
  }

  const stopPlayback = () => {
    setIsPlaying(false)
    setCurrentRatio(0)
  }

  const handleProgressClick = (e: React.MouseEvent) => {
    if (!progressRef.current || !dataset) return
    const rect = progressRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setCurrentRatio(ratio)
    if (isPlaying) {
      animationStartRef.current = performance.now()
      startRatioRef.current = ratio
    }
  }

  const handleProgressMouseDown = (e: React.MouseEvent) => {
    if (!progressRef.current) return
    setIsDragging(true)
    const rect = progressRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setCurrentRatio(ratio)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!progressRef.current) return
      const rect = progressRef.current.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      setCurrentRatio(ratio)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      if (isPlaying) {
        animationStartRef.current = performance.now()
        startRatioRef.current = currentRatio
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isPlaying, currentRatio])

  const formatTimestamp = (ts: number): string => {
    const d = new Date(ts)
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatTimeRange = (start: number, end: number): string => {
    const duration = end - start
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}天${hours % 24}小时`
    if (hours > 0) return `${hours}小时${minutes % 60}分钟`
    if (minutes > 0) return `${minutes}分${seconds % 60}秒`
    return `${seconds}秒`
  }

  const progressMarks = useMemo(() => {
    const marks: { ratio: number; label: string }[] = []
    const numMarks = 6
    for (let i = 0; i <= numMarks; i++) {
      const r = i / numMarks
      const ts = timeRange[0] + r * (timeRange[1] - timeRange[0])
      const d = new Date(ts)
      marks.push({
        ratio: r,
        label: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      })
    }
    return marks
  }, [timeRange])

  return (
    <div className="time-playback">
      <div className="playback-header">
        <div className="playback-title-row">
          <div className="playback-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="playback-info">
            <div className="playback-label">时间动画回放</div>
            <div className="playback-subtitle">
              数据跨度: {formatTimeRange(timeRange[0], timeRange[1])}
            </div>
          </div>
        </div>
        <div className="current-time-display">
          <span className="time-label">当前时间</span>
          <span className="time-value">{formatTimestamp(currentTimestamp)}</span>
        </div>
      </div>

      <div className="playback-controls">
        <div className="control-buttons">
          <button
            className="control-btn stop-btn"
            onClick={stopPlayback}
            title="停止并重置"
            disabled={!dataset}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="5" width="14" height="14" rx="1" />
            </svg>
          </button>
          <button
            className={`control-btn play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlay}
            disabled={!dataset}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 4v16l13-8z" />
              </svg>
            )}
          </button>
          <button
            className="control-btn skip-btn"
            onClick={() => {
              setCurrentRatio(0)
              if (isPlaying) {
                animationStartRef.current = performance.now()
                startRatioRef.current = 0
              }
            }}
            title="跳到开始"
            disabled={!dataset}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>
          <button
            className="control-btn skip-btn"
            onClick={() => {
              setCurrentRatio(1)
              setIsPlaying(false)
            }}
            title="跳到结束"
            disabled={!dataset}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        <div className="speed-control">
          <span className="speed-label">播放速度</span>
          <div className="speed-presets">
            {SPEED_PRESETS.map((speed) => (
              <button
                key={speed}
                className={`speed-preset ${playSpeed === speed ? 'active' : ''}`}
                onClick={() => setPlaySpeed(speed)}
                disabled={!dataset}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="progress-section">
        <div className="progress-bar-wrapper">
          <div className="progress-ticks">
            {progressMarks.map((mark, i) => (
              <div
                key={i}
                className="tick-mark"
                style={{ left: `${mark.ratio * 100}%` }}
              />
            ))}
          </div>

          <div
            ref={progressRef}
            className="progress-bar"
            onClick={handleProgressClick}
            onMouseDown={handleProgressMouseDown}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${currentRatio * 100}%` }}>
                <div className="progress-glow" />
              </div>
            </div>
            <div
              className="progress-thumb"
              style={{ left: `${currentRatio * 100}%` }}
            >
              <div className="thumb-pulse" />
              <div className="thumb-core" />
              <div className="thumb-halo" />
            </div>
          </div>
        </div>

        <div className="progress-labels">
          {progressMarks.map((mark, i) => (
            <span
              key={i}
              className="progress-label"
              style={{ left: `${mark.ratio * 100}%` }}
            >
              {mark.label}
            </span>
          ))}
        </div>

        <div className="progress-meta">
          <div className="meta-start">
            <span className="meta-label">开始</span>
            <span className="meta-value">{formatTimestamp(timeRange[0])}</span>
          </div>
          <div className="meta-progress">
            <span className="meta-label">进度</span>
            <span className="meta-value highlight">{(currentRatio * 100).toFixed(1)}%</span>
          </div>
          <div className="meta-end">
            <span className="meta-label">结束</span>
            <span className="meta-value">{formatTimestamp(timeRange[1])}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TimePlayback
