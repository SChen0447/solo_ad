import React, { useState, useCallback, useRef } from 'react'
import { BAND_LABELS } from './AudioEngine'

interface EQPanelProps {
  onGainChange: (bandIndex: number, gainDb: number) => void
  gains: number[]
}

const SLIDER_WIDTH = 40
const SLIDER_HEIGHT = 120
const THUMB_RADIUS = 8
const MIN_GAIN = -12
const MAX_GAIN = 12

export const EQPanel: React.FC<EQPanelProps> = ({ onGainChange, gains }) => {
  const [activeBand, setActiveBand] = useState<number | null>(null)
  const [localGains, setLocalGains] = useState<number[]>(gains)
  const isDraggingRef = useRef(false)

  const handleStart = useCallback((bandIndex: number, clientY: number, trackRect: DOMRect) => {
    isDraggingRef.current = true
    setActiveBand(bandIndex)

    const trackTop = trackRect.top
    const trackHeight = trackRect.height
    const percentage = 1 - (clientY - trackTop) / trackHeight
    const newGain = MIN_GAIN + percentage * (MAX_GAIN - MIN_GAIN)
    const clampedGain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, newGain))

    setLocalGains(prev => {
      const updated = [...prev]
      updated[bandIndex] = clampedGain
      return updated
    })
    onGainChange(bandIndex, clampedGain)
  }, [onGainChange])

  const handleMove = useCallback((e: MouseEvent | TouchEvent, bandIndex: number, trackElement: HTMLElement) => {
    if (!isDraggingRef.current || activeBand !== bandIndex) return

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const trackRect = trackElement.getBoundingClientRect()
    const trackTop = trackRect.top
    const trackHeight = trackRect.height

    const percentage = 1 - Math.max(0, Math.min(1, (clientY - trackTop) / trackHeight))
    const newGain = MIN_GAIN + percentage * (MAX_GAIN - MIN_GAIN)
    const clampedGain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, newGain))

    setLocalGains(prev => {
      const updated = [...prev]
      updated[bandIndex] = clampedGain
      return updated
    })
    onGainChange(bandIndex, clampedGain)
  }, [activeBand, onGainChange])

  const handleEnd = useCallback(() => {
    isDraggingRef.current = false
    setActiveBand(null)
  }, [])

  const handleSliderMouseDown = useCallback((e: React.MouseEvent, bandIndex: number) => {
    e.preventDefault()
    const track = e.currentTarget as HTMLElement
    handleStart(bandIndex, e.clientY, track.getBoundingClientRect())

    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleMove(moveEvent, bandIndex, track)
    }

    const handleMouseUp = () => {
      handleEnd()
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [handleStart, handleMove, handleEnd])

  const handleSliderTouchStart = useCallback((e: React.TouchEvent, bandIndex: number) => {
    e.preventDefault()
    const track = e.currentTarget as HTMLElement
    const touch = e.touches[0]
    handleStart(bandIndex, touch.clientY, track.getBoundingClientRect())

    const handleTouchMove = (moveEvent: TouchEvent) => {
      handleMove(moveEvent, bandIndex, track)
    }

    const handleTouchEnd = () => {
      handleEnd()
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }

    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
  }, [handleStart, handleMove, handleEnd])

  React.useEffect(() => {
    setLocalGains(gains)
  }, [gains])

  return (
    <div style={containerStyle}>
      <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '16px', textAlign: 'center' }}>
        均衡器
      </div>
      <div style={slidersContainerStyle}>
        {BAND_LABELS.map((label, index) => {
          const gain = localGains[index] ?? 0
          const percentage = (gain - MIN_GAIN) / (MAX_GAIN - MIN_GAIN)
          const thumbY = SLIDER_HEIGHT - percentage * SLIDER_HEIGHT
          const isActive = activeBand === index

          return (
            <div key={label} style={sliderColumnStyle}>
              <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px', textAlign: 'center' }}>
                {gain > 0 ? '+' : ''}{gain.toFixed(1)}dB
              </div>
              <div
                style={trackStyle}
                onMouseDown={(e) => handleSliderMouseDown(e, index)}
                onTouchStart={(e) => handleSliderTouchStart(e, index)}
              >
                <div
                  style={{
                    ...activeTrackStyle,
                    height: `${SLIDER_HEIGHT - thumbY}px`,
                    bottom: 0,
                    background: isActive ? '#00e5ff' : '#1a73e8'
                  }}
                />
                <div
                  style={{
                    ...thumbStyle,
                    top: `${thumbY - THUMB_RADIUS}px`,
                    background: isActive ? '#00e5ff' : '#555',
                    boxShadow: isActive ? '0 0 12px rgba(0, 229, 255, 0.6)' : 'none',
                    transform: isActive ? 'scale(1.2)' : 'scale(1)'
                  }}
                />
              </div>
              <div style={{ color: '#aaa', fontSize: '12px', marginTop: '8px', textAlign: 'center', fontWeight: 500 }}>
                {label}
              </div>
            </div>
          )
        })}
      </div>
      <div style={gainLabelsStyle}>
        <span>+12dB</span>
        <span>0dB</span>
        <span>-12dB</span>
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  background: '#1a1a2e',
  borderRadius: '12px',
  border: '1px solid #333',
  padding: '16px',
  transition: 'all 0.2s ease',
  width: '100%'
}

const slidersContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'flex-end',
  gap: '8px',
  padding: '0 8px'
}

const sliderColumnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: `${SLIDER_WIDTH}px`
}

const trackStyle: React.CSSProperties = {
  position: 'relative',
  width: `${SLIDER_WIDTH}px`,
  height: `${SLIDER_HEIGHT}px`,
  background: '#2a2a3e',
  borderRadius: '20px',
  cursor: 'pointer',
  transition: 'background 0.2s ease',
  overflow: 'hidden'
}

const activeTrackStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  borderRadius: '20px',
  transition: 'height 0.05s linear, background 0.2s ease'
}

const thumbStyle: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  width: `${THUMB_RADIUS * 2}px`,
  height: `${THUMB_RADIUS * 2}px`,
  borderRadius: '50%',
  transform: 'translateX(-50%)',
  cursor: 'grab',
  transition: 'background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
  zIndex: 10
}

const gainLabelsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  fontSize: '10px',
  color: '#666',
  marginTop: '8px',
  paddingRight: '4px',
  gap: `${SLIDER_HEIGHT / 2 - 6}px`,
  position: 'absolute',
  right: '8px',
  top: '60px'
}

export default EQPanel
