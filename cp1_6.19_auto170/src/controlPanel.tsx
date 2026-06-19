import React, { useState } from 'react'
import { COLOR_THEMES } from './particleEngine'
import type { RecordingStatus } from './recorder'

export interface ControlPanelProps {
  particleCount: number
  onParticleCountChange: (value: number) => void
  particleSize: number
  onParticleSizeChange: (value: number) => void
  speedMultiplier: number
  onSpeedMultiplierChange: (value: number) => void
  colorTheme: string
  onColorThemeChange: (theme: string) => void
  gravityStrength: number
  onGravityStrengthChange: (value: number) => void
  gravityPointColor: string
  onGravityPointColorChange: (color: string) => void
  recordingStatus: RecordingStatus
  recordProgress: number
  playbackProgress: number
  hasRecording: boolean
  onRecord: () => void
  onPlayback: () => void
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 20,
  right: 20,
  width: 280,
  padding: 20,
  background: 'rgba(26, 26, 58, 0.5)',
  backdropFilter: 'blur(12px)',
  borderRadius: 8,
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  zIndex: 100,
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
  border: '1px solid rgba(255, 255, 255, 0.1)'
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(255, 255, 255, 0.7)',
  marginBottom: 4,
  fontWeight: 500,
  letterSpacing: 0.5
}

const sliderContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column'
}

const valueStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255, 255, 255, 0.5)',
  textAlign: 'right'
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 4,
  appearance: 'none',
  background: 'rgba(255, 255, 255, 0.15)',
  borderRadius: 2,
  outline: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
}

const getSliderThumbStyle = (color: string = '#6366f1'): React.CSSProperties => ({
  WebkitAppearance: 'none',
  appearance: 'none',
  width: 14,
  height: 14,
  borderRadius: '50%',
  background: color,
  cursor: 'pointer',
  boxShadow: `0 0 8px ${color}60`,
  transition: 'all 0.2s ease'
})

const themeButtonContainerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 8
}

const getThemeButtonStyle = (isActive: boolean, colors: string[]): React.CSSProperties => ({
  padding: '8px 10px',
  borderRadius: 6,
  border: isActive ? `2px solid ${colors[1]}` : '1px solid rgba(255, 255, 255, 0.1)',
  background: isActive ? `${colors[0]}30` : 'rgba(255, 255, 255, 0.05)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 12,
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  gap: 6
})

const colorDotStyle = (color: string): React.CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: color,
  boxShadow: `0 0 4px ${color}80`
})

const buttonContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8
}

const getButtonStyle = (variant: 'primary' | 'secondary' | 'danger', disabled: boolean): React.CSSProperties => {
  const colors = {
    primary: { bg: '#6366f1', hover: '#818cf8' },
    secondary: { bg: 'rgba(255, 255, 255, 0.1)', hover: 'rgba(255, 255, 255, 0.2)' },
    danger: { bg: '#dc2626', hover: '#ef4444' }
  }
  const c = colors[variant]
  return {
    flex: 1,
    padding: '10px 16px',
    borderRadius: 6,
    border: 'none',
    background: disabled ? 'rgba(255, 255, 255, 0.05)' : c.bg,
    color: disabled ? 'rgba(255, 255, 255, 0.3)' : '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.2s ease',
    letterSpacing: 0.5
  }
}

const timelineStyle: React.CSSProperties = {
  width: '100%',
  height: 6,
  background: 'rgba(255, 255, 255, 0.1)',
  borderRadius: 3,
  overflow: 'hidden',
  position: 'relative'
}

const getTimelineProgressStyle = (progress: number, color: string): React.CSSProperties => ({
  height: '100%',
  width: `${progress * 100}%`,
  background: color,
  borderRadius: 3,
  transition: 'width 0.1s linear',
  boxShadow: `0 0 8px ${color}80`
})

const colorInputContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10
}

const colorInputStyle: React.CSSProperties = {
  width: 40,
  height: 28,
  borderRadius: 4,
  border: '1px solid rgba(255, 255, 255, 0.2)',
  background: 'transparent',
  cursor: 'pointer',
  padding: 0
}

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  marginBottom: 4,
  background: 'linear-gradient(135deg, #818cf8, #c084fc)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  letterSpacing: 1
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255, 255, 255, 0.4)',
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginTop: 4,
  marginBottom: 2
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  particleCount,
  onParticleCountChange,
  particleSize,
  onParticleSizeChange,
  speedMultiplier,
  onSpeedMultiplierChange,
  colorTheme,
  onColorThemeChange,
  gravityStrength,
  onGravityStrengthChange,
  gravityPointColor,
  onGravityPointColorChange,
  recordingStatus,
  recordProgress,
  playbackProgress,
  hasRecording,
  onRecord,
  onPlayback
}) => {
  const [hoveredSlider, setHoveredSlider] = useState<string | null>(null)
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null)

  const sliderProps = (key: string) => ({
    style: {
      ...sliderStyle,
      background: hoveredSlider === key ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.15)'
    } as React.CSSProperties,
    onMouseEnter: () => setHoveredSlider(key),
    onMouseLeave: () => setHoveredSlider(null)
  })

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>星云画布</div>

      <div style={sectionTitleStyle}>粒子参数</div>

      <div style={sliderContainerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <label style={labelStyle}>粒子数量</label>
          <span style={valueStyle}>{particleCount}</span>
        </div>
        <input
          type="range"
          min={100}
          max={600}
          step={50}
          value={particleCount}
          onChange={(e) => onParticleCountChange(Number(e.target.value))}
          {...sliderProps('count')}
        />
      </div>

      <div style={sliderContainerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <label style={labelStyle}>粒子大小</label>
          <span style={valueStyle}>{particleSize.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.1}
          value={particleSize}
          onChange={(e) => onParticleSizeChange(Number(e.target.value))}
          {...sliderProps('size')}
        />
      </div>

      <div style={sliderContainerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <label style={labelStyle}>轨道速度</label>
          <span style={valueStyle}>{speedMultiplier.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.1}
          value={speedMultiplier}
          onChange={(e) => onSpeedMultiplierChange(Number(e.target.value))}
          {...sliderProps('speed')}
        />
      </div>

      <div style={sectionTitleStyle}>颜色主题</div>
      <div style={themeButtonContainerStyle}>
        {Object.entries(COLOR_THEMES).map(([key, theme]) => (
          <button
            key={key}
            onClick={() => onColorThemeChange(key)}
            onMouseEnter={() => setHoveredTheme(key)}
            onMouseLeave={() => setHoveredTheme(null)}
            style={{
              ...getThemeButtonStyle(colorTheme === key, theme.primaryColors),
              transform: hoveredTheme === key ? 'scale(1.03)' : 'scale(1)',
              boxShadow: hoveredTheme === key ? `0 2px 12px ${theme.primaryColors[1]}40` : 'none'
            }}
          >
            <div style={{ display: 'flex', gap: 2 }}>
              <div style={colorDotStyle(theme.primaryColors[0])} />
              <div style={colorDotStyle(theme.primaryColors[1])} />
              <div style={colorDotStyle(theme.primaryColors[2])} />
            </div>
            <span style={{ fontSize: 11 }}>{theme.name}</span>
          </button>
        ))}
      </div>

      <div style={sectionTitleStyle}>重力场</div>

      <div style={sliderContainerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <label style={labelStyle}>引力强度</label>
          <span style={valueStyle}>{gravityStrength.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={5}
          step={0.1}
          value={gravityStrength}
          onChange={(e) => onGravityStrengthChange(Number(e.target.value))}
          {...sliderProps('gravity')}
        />
      </div>

      <div style={colorInputContainerStyle}>
        <label style={{ ...labelStyle, marginBottom: 0, flex: 1 }}>控制点颜色</label>
        <input
          type="color"
          value={gravityPointColor}
          onChange={(e) => onGravityPointColorChange(e.target.value)}
          style={colorInputStyle}
        />
      </div>

      <div style={sectionTitleStyle}>时间轴录像</div>

      <div style={timelineStyle}>
        {recordingStatus === 'recording' && (
          <div style={getTimelineProgressStyle(recordProgress, '#ef4444')} />
        )}
        {recordingStatus === 'playing' && (
          <div style={getTimelineProgressStyle(playbackProgress, '#22d3ee')} />
        )}
        {recordingStatus === 'idle' && hasRecording && (
          <div style={getTimelineProgressStyle(1, 'rgba(255, 255, 255, 0.3)')} />
        )}
      </div>

      <div style={buttonContainerStyle}>
        <button
          onClick={onRecord}
          onMouseEnter={() => setHoveredButton('record')}
          onMouseLeave={() => setHoveredButton(null)}
          disabled={recordingStatus !== 'idle'}
          style={{
            ...getButtonStyle(recordingStatus === 'recording' ? 'danger' : 'secondary', recordingStatus !== 'idle'),
            transform: hoveredButton === 'record' && recordingStatus === 'idle' ? 'scale(1.03)' : 'scale(1)'
          }}
        >
          {recordingStatus === 'recording' ? '● 录制中' : '● 录制'}
        </button>
        <button
          onClick={onPlayback}
          onMouseEnter={() => setHoveredButton('playback')}
          onMouseLeave={() => setHoveredButton(null)}
          disabled={!hasRecording || recordingStatus !== 'idle'}
          style={{
            ...getButtonStyle('primary', !hasRecording || recordingStatus !== 'idle'),
            transform: hoveredButton === 'playback' && hasRecording && recordingStatus === 'idle' ? 'scale(1.03)' : 'scale(1)'
          }}
        >
          {recordingStatus === 'playing' ? '▶ 播放中' : '▶ 回放'}
        </button>
      </div>
    </div>
  )
}
