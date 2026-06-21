import React, { useState, useEffect, useRef } from 'react'

interface PlayerControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  playbackRate: number
  onPlayPause: () => void
  onSeek: (time: number) => void
  onRateChange: (rate: number) => void
}

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) seconds = 0
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  onPlayPause,
  onSeek,
  onRateChange,
}) => {
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showRateTooltip, setShowRateTooltip] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)
  const rateSliderRef = useRef<HTMLInputElement>(null)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const getTimeFromX = (clientX: number): number => {
    if (!progressRef.current || duration <= 0) return 0
    const rect = progressRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return ratio * duration
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const time = getTimeFromX(e.clientX)
    onSeek(time)
  }

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const time = getTimeFromX(e.clientX)
    const rect = progressRef.current!.getBoundingClientRect()
    setHoverTime(time)
    setHoverX(e.clientX - rect.left)
    if (isDragging) {
      onSeek(time)
    }
  }

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    const time = getTimeFromX(e.clientX)
    onSeek(time)
  }

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false)
    }
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && progressRef.current) {
        const rect = progressRef.current.getBoundingClientRect()
        if (e.clientX >= rect.left && e.clientX <= rect.right) {
          const time = getTimeFromX(e.clientX)
          setHoverTime(time)
          setHoverX(e.clientX - rect.left)
          onSeek(time)
        }
      }
    }
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('mousemove', handleMouseMove)
    }
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [isDragging])

  return (
    <div style={styles.container}>
      <button
        onClick={onPlayPause}
        style={{
          ...styles.playButton,
          background: isPlaying ? '#8B82FF' : '#6C63FF',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = '#8B82FF'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = isPlaying ? '#8B82FF' : '#6C63FF'
        }}
      >
        {isPlaying ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="white">
            <rect x="3" y="2" width="4" height="14" rx="1" />
            <rect x="11" y="2" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="white">
            <polygon points="5,2 16,9 5,16" />
          </svg>
        )}
      </button>

      <div style={styles.timeDisplay}>{formatTime(currentTime)}</div>

      <div
        ref={progressRef}
        style={styles.progressContainer}
        onClick={handleProgressClick}
        onMouseMove={handleProgressMouseMove}
        onMouseDown={handleProgressMouseDown}
        onMouseEnter={() => setHoverTime(null)}
        onMouseLeave={() => {
          setHoverTime(null)
          if (!isDragging) setIsDragging(false)
        }}
      >
        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressFill,
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #6C63FF 0%, #FF6584 100%)',
            }}
          />
        </div>
        <div
          style={{
            ...styles.progressHandle,
            left: `${progress}%`,
            transform: `translate(-50%, -50%) scale(${isDragging ? 1.2 : 1})`,
          }}
        />
        {hoverTime !== null && (
          <div
            style={{
              ...styles.timeTooltip,
              left: hoverX,
              transform: 'translate(-50%, -100%)',
              opacity: 1,
            }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      <div style={styles.timeDisplay}>{formatTime(duration)}</div>

      <div style={styles.rateContainer}>
        <span style={styles.rateLabel}>速率</span>
        <div style={styles.rateSliderWrapper}>
          <input
            ref={rateSliderRef}
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={playbackRate}
            onChange={(e) => onRateChange(parseFloat(e.target.value))}
            onMouseEnter={() => setShowRateTooltip(true)}
            onMouseLeave={() => setShowRateTooltip(false)}
            style={styles.rateSlider}
          />
          <div
            style={{
              ...styles.rateTooltip,
              left: `${((playbackRate - 0.5) / 1.5) * 100}%`,
              opacity: showRateTooltip ? 1 : 0,
              transform: `translate(-50%, -120%)`,
            }}
          >
            {playbackRate.toFixed(1)}x
          </div>
        </div>
        <span style={styles.rateValue}>{playbackRate.toFixed(1)}x</span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '16px 24px',
    background: '#252540',
    borderRadius: 12,
    border: '1px solid #3D3D5C',
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 0.2s ease-out, transform 0.2s ease-out',
  },
  timeDisplay: {
    color: '#A0A0B8',
    fontSize: 13,
    fontVariantNumeric: 'tabular-nums',
    minWidth: 48,
    textAlign: 'center',
  },
  progressContainer: {
    flex: 1,
    height: 24,
    position: 'relative',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    background: '#2D2D44',
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.05s linear',
  },
  progressHandle: {
    position: 'absolute',
    top: '50%',
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    transition: 'transform 0.2s ease-out',
    pointerEvents: 'none',
  },
  timeTooltip: {
    position: 'absolute',
    bottom: 28,
    background: '#3D3D55',
    color: '#FFFFFF',
    padding: '4px 10px',
    borderRadius: 4,
    fontSize: 12,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    transition: 'opacity 0.2s ease-out',
    zIndex: 10,
  },
  rateContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  rateLabel: {
    color: '#A0A0B8',
    fontSize: 13,
  },
  rateSliderWrapper: {
    position: 'relative',
    width: 100,
    height: 24,
    display: 'flex',
    alignItems: 'center',
  },
  rateSlider: {
    width: '100%',
    height: 6,
  },
  rateTooltip: {
    position: 'absolute',
    top: 0,
    background: '#3D3D55',
    color: '#FFFFFF',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
    fontVariantNumeric: 'tabular-nums',
    zIndex: 10,
  },
  rateValue: {
    color: '#FFFFFF',
    fontSize: 13,
    minWidth: 36,
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums',
  },
}

export default PlayerControls
