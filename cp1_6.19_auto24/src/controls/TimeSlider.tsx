import React, { useRef, useCallback, useState, useEffect } from 'react'
import { useStore } from '../store'

const TimeSlider: React.FC = () => {
  const currentTimeIndex = useStore((s) => s.currentTimeIndex)
  const totalTimePoints = useStore((s) => s.totalTimePoints)
  const isPlaying = useStore((s) => s.isPlaying)
  const isLooping = useStore((s) => s.isLooping)
  const setTimeIndex = useStore((s) => s.setTimeIndex)
  const setIsPlaying = useStore((s) => s.setIsPlaying)
  const setIsLooping = useStore((s) => s.setIsLooping)
  const isTransitioning = useStore((s) => s.isTransitioning)

  const sliderRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleSliderChange = useCallback(
    (clientX: number) => {
      if (!sliderRef.current || isTransitioning) return
      const rect = sliderRef.current.getBoundingClientRect()
      const trackWidth = rect.width - 40
      let percent = (clientX - rect.left - 20) / trackWidth
      percent = Math.max(0, Math.min(1, percent))
      const newIndex = Math.round(percent * (totalTimePoints - 1))
      if (newIndex !== currentTimeIndex) {
        setTimeIndex(newIndex)
      }
    },
    [currentTimeIndex, totalTimePoints, setTimeIndex, isTransitioning]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true)
      handleSliderChange(e.clientX)
    },
    [handleSliderChange]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleSliderChange(e.clientX)
      }
    }
    const handleMouseUp = () => {
      setIsDragging(false)
    }
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleSliderChange])

  const progress = totalTimePoints > 1 ? (currentTimeIndex / (totalTimePoints - 1)) * 100 : 0
  const thumbSize = hovered ? 24 : 20

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 30,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        maxWidth: '1000px',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 20px',
        background: 'rgba(20, 20, 30, 0.85)',
        borderRadius: 12,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0, 170, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
      }}
    >
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: 'none',
          background: isPlaying
            ? 'linear-gradient(135deg, #ff6b6b, #ee5a5a)'
            : 'linear-gradient(135deg, #00aaff, #0088cc)',
          color: '#fff',
          cursor: isTransitioning ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 'bold',
          opacity: isTransitioning ? 0.5 : 1,
          transition: 'all 0.2s ease',
          boxShadow: isPlaying
            ? '0 4px 15px rgba(255, 107, 107, 0.4)'
            : '0 4px 15px rgba(0, 170, 255, 0.4)',
          flexShrink: 0
        }}
        disabled={isTransitioning}
        title={isPlaying ? '暂停' : '播放'}
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="3" y="2" width="4" height="12" rx="1" />
            <rect x="9" y="2" width="4" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2 L14 8 L4 14 Z" />
          </svg>
        )}
      </button>

      <button
        onClick={() => setIsLooping(!isLooping)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: isLooping ? '2px solid #00aaff' : '2px solid rgba(255,255,255,0.2)',
          background: isLooping ? 'rgba(0, 170, 255, 0.15)' : 'rgba(255,255,255,0.05)',
          color: isLooping ? '#00aaff' : '#888',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          flexShrink: 0
        }}
        title={isLooping ? '关闭循环' : '开启循环'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9"></polyline>
          <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
          <polyline points="7 23 3 19 7 15"></polyline>
          <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
        </svg>
      </button>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            color: '#00aaff',
            fontSize: 12,
            fontWeight: 'bold',
            minWidth: 50,
            textAlign: 'center',
            fontFamily: 'monospace'
          }}
        >
          T{currentTimeIndex + 1}
        </span>

        <div
          ref={sliderRef}
          style={{
            position: 'relative',
            flex: 1,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            cursor: isTransitioning ? 'not-allowed' : 'pointer',
            opacity: isTransitioning ? 0.6 : 1
          }}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div
            style={{
              position: 'absolute',
              left: 20,
              right: 20,
              height: 6,
              borderRadius: 3,
              background: '#444444',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #0066aa, #00aaff, #66ccff)',
                borderRadius: 3,
                transition: isDragging ? 'none' : 'width 0.3s ease',
                boxShadow: '0 0 10px rgba(0, 170, 255, 0.5)'
              }}
            />
          </div>

          {Array.from({ length: totalTimePoints }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${20 + (i / (totalTimePoints - 1)) * (sliderRef.current ? sliderRef.current.offsetWidth - 40 : 0)}px`,
                width: i === currentTimeIndex ? 8 : 4,
                height: i === currentTimeIndex ? 8 : 4,
                borderRadius: '50%',
                background: i <= currentTimeIndex ? '#00aaff' : '#555',
                transform: 'translateX(-50%)',
                transition: 'all 0.2s ease',
                zIndex: 1,
                boxShadow: i === currentTimeIndex ? '0 0 8px rgba(0, 170, 255, 0.8)' : 'none'
              }}
            />
          ))}

          <div
            style={{
              position: 'absolute',
              left: `${20 + (currentTimeIndex / (totalTimePoints - 1)) * (sliderRef.current ? sliderRef.current.offsetWidth - 40 : 0)}px`,
              width: thumbSize,
              height: thumbSize,
              borderRadius: '50%',
              background: '#ffffff',
              transform: 'translate(-50%, -50%)',
              top: '50%',
              boxShadow: hovered
                ? '0 4px 12px rgba(0,0,0,0.4), 0 0 20px rgba(255,255,255,0.3)'
                : '0 2px 8px rgba(0,0,0,0.3)',
              zIndex: 2,
              transition: 'all 0.15s ease',
              border: '2px solid #00aaff'
            }}
          />
        </div>

        <span
          style={{
            color: '#888',
            fontSize: 12,
            minWidth: 40,
            textAlign: 'center',
            fontFamily: 'monospace'
          }}
        >
          / {totalTimePoints}
        </span>
      </div>
    </div>
  )
}

export default TimeSlider
