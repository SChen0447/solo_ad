import React, { useState, useEffect, useRef, useCallback } from 'react'

interface PlayerControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  playbackRate: number
  onPlayPause: () => void
  onSeek: (time: number) => void
  onRateChange: (rate: number) => void
  getWaveformInRange?: (centerTime: number, rangeSeconds: number, samples: number) => number[]
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
  getWaveformInRange,
}) => {
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showRateTooltip, setShowRateTooltip] = useState(false)
  const [isRateDragging, setIsRateDragging] = useState(false)
  const [rateDisplay, setRateDisplay] = useState(playbackRate)
  const [shiftPressed, setShiftPressed] = useState(false)
  const [previewWaveform, setPreviewWaveform] = useState<number[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [previewX, setPreviewX] = useState(0)
  const [previewCenterTime, setPreviewCenterTime] = useState(0)

  const progressRef = useRef<HTMLDivElement>(null)
  const rateSliderRef = useRef<HTMLInputElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const lastWaveformFetchRef = useRef(0)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  useEffect(() => {
    setRateDisplay(playbackRate)
  }, [playbackRate])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftPressed(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftPressed(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const renderPreviewWaveform = useCallback((waveformData: number[], centerTime: number) => {
    const canvas = previewCanvasRef.current
    if (!canvas || waveformData.length === 0) return
    const dpr = window.devicePixelRatio || 1
    const cssWidth = 180
    const cssHeight = 40
    canvas.width = cssWidth * dpr
    canvas.height = cssHeight * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssWidth, cssHeight)
    ctx.fillStyle = 'rgba(37, 37, 64, 0.95)'
    ctx.beginPath()
    const r = 8
    ctx.moveTo(r, 0)
    ctx.lineTo(cssWidth - r, 0)
    ctx.quadraticCurveTo(cssWidth, 0, cssWidth, r)
    ctx.lineTo(cssWidth, cssHeight - r)
    ctx.quadraticCurveTo(cssWidth, cssHeight, cssWidth - r, cssHeight)
    ctx.lineTo(r, cssHeight)
    ctx.quadraticCurveTo(0, cssHeight, 0, cssHeight - r)
    ctx.lineTo(0, r)
    ctx.quadraticCurveTo(0, 0, r, 0)
    ctx.closePath()
    ctx.fill()
    const padding = 6
    const w = cssWidth - padding * 2
    const h = cssHeight - padding * 2
    const midY = cssHeight / 2
    const step = w / waveformData.length
    const len = waveformData.length
    const centerIndex = Math.floor(len / 2)
    for (let i = 0; i < len - 1; i++) {
      const x1 = padding + i * step
      const x2 = padding + (i + 1) * step
      const amp1 = Math.min(1, waveformData[i] * 3)
      const amp2 = Math.min(1, waveformData[i + 1] * 3)
      const h1 = amp1 * (h / 2)
      const h2 = amp2 * (h / 2)
      const t = Math.abs(i - centerIndex) / centerIndex
      const alpha = 1 - t * 0.5
      const colorT = i / len
      let r1: number, g1: number, b1: number
      if (colorT < 0.5) {
        const lt = colorT * 2
        r1 = Math.round(108 + (255 - 108) * lt)
        g1 = Math.round(99 + (101 - 99) * lt)
        b1 = Math.round(255 + (132 - 255) * lt)
      } else {
        const lt = (colorT - 0.5) * 2
        r1 = Math.round(255 + (255 - 255) * lt)
        g1 = Math.round(101 + (209 - 101) * lt)
        b1 = Math.round(132 + (102 - 132) * lt)
      }
      ctx.strokeStyle = `rgba(${r1}, ${g1}, ${b1}, ${alpha})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x1, midY - h1)
      ctx.lineTo(x2, midY - h2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x1, midY + h1)
      ctx.lineTo(x2, midY + h2)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.9)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([3, 2])
    ctx.beginPath()
    ctx.moveTo(cssWidth / 2, padding)
    ctx.lineTo(cssWidth / 2, cssHeight - padding)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.font = '10px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fontVariantNumeric = 'tabular-nums'
    ctx.fillText(formatTime(centerTime), cssWidth / 2, 4)
  }, [])

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

  const updatePreviewWaveform = useCallback((time: number, x: number) => {
    const now = performance.now()
    if (now - lastWaveformFetchRef.current < 50) return
    lastWaveformFetchRef.current = now
    if (getWaveformInRange) {
      const data = getWaveformInRange(time, 2, 120)
      setPreviewWaveform(data)
      setPreviewCenterTime(time)
    }
    setPreviewX(x)
  }, [getWaveformInRange])

  useEffect(() => {
    if (previewWaveform.length > 0 && showPreview) {
      renderPreviewWaveform(previewWaveform, previewCenterTime)
    }
  }, [previewWaveform, showPreview, previewCenterTime, renderPreviewWaveform])

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const time = getTimeFromX(e.clientX)
    const rect = progressRef.current!.getBoundingClientRect()
    const localX = e.clientX - rect.left
    setHoverTime(time)
    setHoverX(localX)
    setShowPreview(true)
    updatePreviewWaveform(time, localX)
    if (isDragging) {
      onSeek(time)
    }
  }

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
    const time = getTimeFromX(e.clientX)
    const rect = progressRef.current!.getBoundingClientRect()
    const localX = e.clientX - rect.left
    setHoverTime(time)
    setHoverX(localX)
    setShowPreview(true)
    updatePreviewWaveform(time, localX)
    onSeek(time)
  }

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false)
    }
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && progressRef.current) {
        const rect = progressRef.current.getBoundingClientRect()
        if (e.clientX >= rect.left - 10 && e.clientX <= rect.right + 10) {
          const clampedX = Math.max(rect.left, Math.min(rect.right, e.clientX))
          const time = getTimeFromX(clampedX)
          const localX = clampedX - rect.left
          setHoverTime(time)
          setHoverX(localX)
          setShowPreview(true)
          updatePreviewWaveform(time, localX)
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
  }, [isDragging, updatePreviewWaveform])

  const handleRateMouseDown = () => {
    setIsRateDragging(true)
  }

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseFloat(e.target.value)
    if (!isFinite(rawValue)) return
    if (shiftPressed) {
      const fineStep = 0.01
      const rounded = Math.round(rawValue / fineStep) * fineStep
      const clamped = Math.max(0.5, Math.min(2.0, rounded))
      setRateDisplay(clamped)
      onRateChange(parseFloat(clamped.toFixed(2)))
    } else {
      setRateDisplay(rawValue)
      onRateChange(rawValue)
    }
  }

  const handleRateMouseUp = () => {
    setIsRateDragging(false)
  }

  useEffect(() => {
    if (isRateDragging) {
      document.addEventListener('mouseup', handleRateMouseUp)
    }
    return () => {
      document.removeEventListener('mouseup', handleRateMouseUp)
    }
  }, [isRateDragging])

  const formatRate = (rate: number): string => {
    return shiftPressed || rateDisplay !== playbackRate ? rateDisplay.toFixed(2) : rate.toFixed(1)
  }

  const progressPercent = Math.max(0, Math.min(100, progress))
  const handleCssX = progressRef.current
    ? (progressPercent / 100) * progressRef.current.getBoundingClientRect().width
    : 0

  let previewCanvasLeft = previewX - 90
  if (progressRef.current) {
    const rect = progressRef.current.getBoundingClientRect()
    previewCanvasLeft = Math.max(0, Math.min(rect.width - 180, previewX - 90))
  }

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
        onMouseLeave={() => {
          if (!isDragging) {
            setHoverTime(null)
            setShowPreview(false)
          }
        }}
      >
        {showPreview && previewWaveform.length > 0 && (
          <canvas
            ref={previewCanvasRef}
            style={{
              ...styles.previewCanvas,
              left: previewCanvasLeft,
              opacity: 1,
            }}
          />
        )}
        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressFill,
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #6C63FF 0%, #FF6584 100%)',
            }}
          />
        </div>
        <div
          className={isDragging ? 'progress-handle-pulsing' : ''}
          style={{
            ...styles.progressHandle,
            left: `${progressPercent}%`,
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
            step={shiftPressed ? '0.01' : '0.1'}
            value={rateDisplay}
            onChange={handleRateChange}
            onMouseDown={handleRateMouseDown}
            onMouseEnter={() => setShowRateTooltip(true)}
            onMouseLeave={() => {
              if (!isRateDragging) setShowRateTooltip(false)
              setRateDisplay(playbackRate)
            }}
            style={styles.rateSlider}
          />
          <div
            style={{
              ...styles.rateTooltip,
              left: `${((rateDisplay - 0.5) / 1.5) * 100}%`,
              opacity: showRateTooltip || isRateDragging ? 1 : 0,
              transform: `translate(-50%, -120%)`,
            }}
          >
            {formatRate(rateDisplay)}
            {shiftPressed && <span style={styles.rateShiftHint}> (精细)</span>}
          </div>
        </div>
        <span style={styles.rateValue}>{formatRate(playbackRate)}x</span>
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
  previewCanvas: {
    position: 'absolute',
    bottom: 40,
    width: 180,
    height: 40,
    borderRadius: 8,
    pointerEvents: 'none',
    transition: 'opacity 0.15s ease-out',
    zIndex: 20,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
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
    display: 'flex',
    alignItems: 'center',
  },
  rateShiftHint: {
    color: '#FFD166',
    fontSize: 10,
    marginLeft: 4,
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
