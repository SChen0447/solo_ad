import React, { useState, useCallback, useEffect } from 'react'
import { QualityMode } from '../optimizer/PerformanceOptimizer'

interface ControlPanelProps {
  ws: WebSocket | null
  latitude: number
  time: number
  date: string
  nightMode: boolean
  qualityMode: QualityMode
  onLatitudeChange: (lat: number) => void
  onTimeChange: (time: number) => void
  onDateChange: (date: string) => void
  onNightModeToggle: () => void
  onQualityModeChange: (mode: QualityMode) => void
  onResetView: () => void
  fps?: number
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  ws,
  latitude,
  time,
  date,
  nightMode,
  qualityMode,
  onLatitudeChange,
  onTimeChange,
  onDateChange,
  onNightModeToggle,
  onQualityModeChange,
  onResetView,
  fps,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const formatTime = (t: number): string => {
    const hours = Math.floor(t)
    const minutes = Math.round((t - hours) * 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours + minutes / 60
  }

  const handleLatitudeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value)
      onLatitudeChange(value)
    },
    [onLatitudeChange]
  )

  const handleTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value)
      onTimeChange(value)
    },
    [onTimeChange]
  )

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onDateChange(e.target.value)
    },
    [onDateChange]
  )

  const toggleCollapse = useCallback(() => {
    setIsAnimating(true)
    setIsCollapsed(!isCollapsed)
    setTimeout(() => setIsAnimating(false), 300)
  }, [isCollapsed])

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    bottom: 0,
    width: isCollapsed ? 40 : 260,
    height: 'auto',
    maxHeight: '100%',
    background: 'rgba(15, 15, 35, 0.85)',
    border: '1px solid #2a2a4a',
    borderLeft: 'none',
    borderBottom: 'none',
    borderTop: 'none',
    backdropFilter: 'blur(12px)',
    color: '#f0f0ff',
    fontFamily: 'sans-serif',
    fontSize: 14,
    transition: 'width 0.3s ease-out',
    overflow: 'hidden',
    zIndex: 1000,
    paddingTop: 60,
    paddingBottom: 20,
  }

  const glassStyle: React.CSSProperties = {
    background: 'rgba(20, 20, 40, 0.5)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    marginLeft: 10,
    marginRight: 10,
    transition: 'all 0.2s ease',
  }

  const toggleButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: 10,
    right: -1,
    width: 28,
    height: 28,
    background: 'rgba(20, 20, 40, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '0 6px 6px 0',
    color: '#f0f0ff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    transition: 'all 0.2s ease',
  }

  const sliderContainerStyle: React.CSSProperties = {
    marginBottom: 12,
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 6,
    fontSize: 13,
    color: 'rgba(240, 240, 255, 0.9)',
  }

  const valueStyle: React.CSSProperties = {
    float: 'right',
    color: 'rgba(224, 224, 255, 0.8)',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 4,
    borderRadius: 2,
    background: 'rgba(255, 255, 255, 0.1)',
    outline: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer',
  }

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(20, 20, 40, 0.5)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#f0f0ff',
    cursor: 'pointer',
    fontSize: 13,
    transition: 'all 0.2s ease',
    marginBottom: 8,
  }

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'rgba(80, 80, 150, 0.5)',
    borderColor: 'rgba(150, 150, 255, 0.3)',
  }

  const collapsedContent = () => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 20,
          gap: 16,
        }}
      >
        <div style={{ writingMode: 'vertical-rl', fontSize: 14, color: 'rgba(240, 240, 255, 0.7)' }}>
          控制面板
        </div>
        {fps !== undefined && (
          <div style={{ writingMode: 'vertical-rl', fontSize: 12, color: 'rgba(150, 255, 150, 0.8)' }}>
            {Math.round(fps)} FPS
          </div>
        )}
      </div>
    )
  }

  if (isCollapsed) {
    return (
      <div style={panelStyle}>
        <button style={toggleButtonStyle} onClick={toggleCollapse} title="展开面板">
          ▶
        </button>
        {collapsedContent()}
      </div>
    )
  }

  return (
    <div style={panelStyle}>
      <button style={toggleButtonStyle} onClick={toggleCollapse} title="折叠面板">
        ◀
      </button>

      <div style={{ ...glassStyle, marginTop: 30 }}>
        <div style={{ ...labelStyle, fontWeight: 'bold', marginBottom: 10 }}>
          画质模式
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={qualityMode === 'quality' ? activeButtonStyle : buttonStyle}
            onClick={() => onQualityModeChange('quality')}
          >
            品质模式
          </button>
          <button
            style={qualityMode === 'performance' ? activeButtonStyle : buttonStyle}
            onClick={() => onQualityModeChange('performance')}
          >
            高性能
          </button>
        </div>
        {fps !== undefined && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(150, 255, 150, 0.8)' }}>
            当前帧率: {Math.round(fps)} FPS
          </div>
        )}
      </div>

      <div style={glassStyle}>
        <div style={sliderContainerStyle}>
          <label style={labelStyle}>
          纬度
            <span style={valueStyle}>{latitude}°N</span>
          </label>
          <input
            type="range"
            min="0"
            max="60"
            step="5"
            value={latitude}
            onChange={handleLatitudeChange}
            style={inputStyle}
          />
        </div>

        <div style={sliderContainerStyle}>
          <label style={labelStyle}>
          日期
          </label>
          <input
            type="date"
            value={date}
            onChange={handleDateChange}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 6,
              color: '#f0f0ff',
              fontSize: 13,
            }}
          />
        </div>

        <div style={sliderContainerStyle}>
          <label style={labelStyle}>
          时间
            <span style={valueStyle}>{formatTime(time)}</span>
          </label>
          <input
            type="range"
            min="18"
            max="30"
            step="0.25"
            value={time}
            onChange={handleTimeChange}
            style={inputStyle}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(240, 240, 255, 0.5)', marginTop: 4 }}>
            <span>18:00</span>
            <span>00:00</span>
            <span>06:00</span>
          </div>
        </div>
      </div>

      <div style={glassStyle}>
        <button
          style={buttonStyle}
          onClick={onResetView}
        >
          重置视角
        </button>
        <button
          style={{ ...buttonStyle, marginBottom: 0 }}
          onClick={onNightModeToggle}
        >
          {nightMode ? '夜间模式：开' : '夜间模式：关'}
        </button>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #e0e0ff;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(224, 224, 255, 0.5);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #e0e0ff;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 6px rgba(224, 224, 255, 0.5);
        }
        button:hover {
          filter: brightness(1.2);
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
        }
      `}</style>
    </div>
  )
}

export default ControlPanel
