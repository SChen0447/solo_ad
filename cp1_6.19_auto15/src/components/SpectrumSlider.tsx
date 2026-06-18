import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuroraStore } from '../stores/auroraStore'

const TRACK_WIDTH = 400
const TRACK_HEIGHT = 6
const THUMB_SIZE = 18

export function SpectrumSlider() {
  const spectrumValue = useAuroraStore((s) => s.spectrumValue)
  const setSpectrumValue = useAuroraStore((s) => s.setSpectrumValue)
  const getPrimaryColor = useAuroraStore((s) => s.getPrimaryColor)
  const getColorName = useAuroraStore((s) => s.getColorName)

  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  const updateValueFromClientX = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const x = clientX - rect.left - THUMB_SIZE / 2
      const trackInnerWidth = rect.width - THUMB_SIZE
      const value = Math.max(0, Math.min(1, x / trackInnerWidth))
      setSpectrumValue(value)
    },
    [setSpectrumValue]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      setIsPressed(true)
      updateValueFromClientX(e.clientX)
    },
    [updateValueFromClientX]
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      updateValueFromClientX(e.clientX)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsPressed(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, updateValueFromClientX])

  const thumbPosition = spectrumValue * (TRACK_WIDTH - THUMB_SIZE)
  const primaryColor = getPrimaryColor()
  const colorName = getColorName()

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '48px',
    left: '50%',
    transform: `translateX(-50%) ${isPressed ? 'scale(1.02)' : 'scale(1)'}`,
    transformOrigin: 'center',
    transition: 'transform 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '14px',
    userSelect: 'none',
  }

  const trackStyle: React.CSSProperties = {
    position: 'relative',
    width: `${TRACK_WIDTH}px`,
    height: `${TRACK_HEIGHT}px`,
    borderRadius: '999px',
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: isHovered
      ? '0 0 20px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.12)'
      : '0 0 12px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.06)',
    cursor: 'pointer',
    transition: 'box-shadow 0.25s ease, filter 0.25s ease',
    filter: isHovered ? 'brightness(1.15)' : 'brightness(1)',
  }

  const fillStyle: React.CSSProperties = {
    position: 'absolute',
    top: '0',
    left: '0',
    height: '100%',
    width: `${thumbPosition + THUMB_SIZE / 2}px`,
    borderRadius: '999px',
    background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}cc)`,
    boxShadow: `0 0 14px ${primaryColor}88`,
    pointerEvents: 'none',
    transition: 'background 0.5s ease, box-shadow 0.5s ease',
  }

  const thumbStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${(TRACK_HEIGHT - THUMB_SIZE) / 2}px`,
    left: `${thumbPosition}px`,
    width: `${THUMB_SIZE}px`,
    height: `${THUMB_SIZE}px`,
    borderRadius: '50%',
    background: '#ffffff',
    boxShadow: `0 2px 10px rgba(0,0,0,0.35), 0 0 0 3px ${primaryColor}66, 0 0 18px ${primaryColor}99`,
    pointerEvents: 'none',
    transition: 'box-shadow 0.5s ease',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#ffffff',
    letterSpacing: '0.02em',
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    opacity: isDragging || isHovered ? 1 : 0.78,
    transition: 'opacity 0.25s ease',
    textShadow: '0 2px 8px rgba(0,0,0,0.6)',
  }

  const valueStyle: React.CSSProperties = {
    fontVariantNumeric: 'tabular-nums',
    padding: '4px 10px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,255,255,0.08)',
  }

  const colorBadgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 10px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,255,255,0.08)',
  }

  const dotStyle: React.CSSProperties = {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: primaryColor,
    boxShadow: `0 0 10px ${primaryColor}`,
    transition: 'background 0.5s ease, box-shadow 0.5s ease',
  }

  return (
    <div style={containerStyle}>
      <div
        ref={trackRef}
        style={trackStyle}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => !isDragging && setIsHovered(false)}
      >
        <div style={fillStyle} />
        <div style={thumbStyle} />
      </div>

      <div style={labelStyle}>
        <span style={valueStyle}>{spectrumValue.toFixed(2)}</span>
        <span style={colorBadgeStyle}>
          <span style={dotStyle} />
          {colorName}
        </span>
      </div>
    </div>
  )
}
