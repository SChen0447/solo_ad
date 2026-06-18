import React, { useRef, useState, useCallback, useEffect } from 'react'
import { useAnnotationStore } from '../store/annotationStore'

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

export const TimelineSlider: React.FC = () => {
  const { history, currentHistoryIndex, restoreSnapshot, setIsDraggingSlider } = useAnnotationStore()
  const sliderRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [localIndex, setLocalIndex] = useState<number | null>(null)

  const maxIndex = Math.max(0, history.length - 1)
  const displayIndex = localIndex ?? currentHistoryIndex

  const getIndexFromPosition = useCallback((clientX: number): number => {
    if (!sliderRef.current) return 0
    const rect = sliderRef.current.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(percentage * maxIndex)
  }, [maxIndex])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (history.length === 0) return
    setIsDragging(true)
    setIsDraggingSlider(true)
    const newIndex = getIndexFromPosition(e.clientX)
    setLocalIndex(newIndex)
    restoreSnapshot(newIndex)
  }, [history.length, getIndexFromPosition, setIsDraggingSlider, restoreSnapshot])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    const startTime = performance.now()
    const newIndex = getIndexFromPosition(e.clientX)
    if (newIndex !== displayIndex) {
      restoreSnapshot(newIndex)
    }
    const duration = performance.now() - startTime
    if (duration > 100) {
      console.warn(`Snapshot restore took ${duration.toFixed(2)}ms, exceeds 100ms limit`)
    }
  }, [isDragging, getIndexFromPosition, displayIndex, restoreSnapshot])

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    setIsDraggingSlider(false)
    setLocalIndex(null)
  }, [isDragging, setIsDraggingSlider])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const percentage = history.length > 1 ? (displayIndex / maxIndex) * 100 : 100

  return (
    <div className="timeline-container">
      <div className="timeline-info">
        <span className="timeline-label">历史版本</span>
        <span className="timeline-count">
          {history.length > 0 ? `${displayIndex + 1} / ${history.length}` : '暂无历史'}
        </span>
      </div>

      <div
        ref={sliderRef}
        className={`timeline-slider ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div className="timeline-track">
          <div
            className="timeline-track-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="timeline-markers">
          {history.map((snapshot, index) => (
            <div
              key={snapshot.id}
              className="timeline-marker"
              style={{ left: `${(index / maxIndex) * 100}%` }}
              title={formatTime(snapshot.timestamp)}
            />
          ))}
        </div>

        <div
          className="timeline-thumb"
          style={{ left: `calc(${percentage}% - 10px)` }}
        >
          <div className="timeline-thumb-inner" />
        </div>
      </div>

      <div className="timeline-timestamps">
        {history.map((snapshot, index) => {
          const isFirst = index === 0
          const isLast = index === history.length - 1
          const isMiddle = history.length > 4 && index === Math.floor(history.length / 2)
          
          if (isFirst || isLast || isMiddle) {
            return (
              <span
                key={snapshot.id}
                className="timeline-timestamp"
                style={{ left: `${(index / maxIndex) * 100}%` }}
              >
                {formatTime(snapshot.timestamp)}
              </span>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}
