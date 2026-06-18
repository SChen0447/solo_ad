import React from 'react'
import { useAppStore, ColorTheme } from '../App'

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: 20,
  left: 20,
  width: 260,
  padding: 20,
  background: 'rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  borderRadius: 12,
  zIndex: 10,
  color: '#fff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 8,
  color: 'rgba(255, 255, 255, 0.85)',
  letterSpacing: 0.3,
}

const sliderContainerStyle: React.CSSProperties = {
  marginBottom: 20,
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 4,
  borderRadius: 8,
  background: 'rgba(255, 255, 255, 0.1)',
  outline: 'none',
  WebkitAppearance: 'none',
  appearance: 'none',
  cursor: 'pointer',
  border: '1px solid rgba(255, 255, 255, 0.2)',
}

const valueDisplayStyle: React.CSSProperties = {
  display: 'inline-block',
  marginLeft: 8,
  fontSize: 12,
  color: 'rgba(255, 255, 255, 0.6)',
  fontVariantNumeric: 'tabular-nums',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  color: '#fff',
  fontSize: 13,
  cursor: 'pointer',
  outline: 'none',
  transition: 'background 0.2s ease, border-color 0.2s ease',
}

const buttonBaseStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 8,
  border: '1px solid rgba(255, 255, 255, 0.2)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  background: 'rgba(255, 255, 255, 0.05)',
  outline: 'none',
}

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  marginBottom: 20,
  color: '#fff',
  letterSpacing: 0.5,
}

const themeOptions: { value: ColorTheme; label: string }[] = [
  { value: 'deepBlue', label: '深蓝湖蓝' },
  { value: 'purpleRed', label: '紫红橙' },
  { value: 'greenYellow', label: '翠绿明黄' },
]

export default function ControlPanel() {
  const breathFrequency = useAppStore((s) => s.breathFrequency)
  const colorTheme = useAppStore((s) => s.colorTheme)
  const isPlaying = useAppStore((s) => s.isPlaying)
  const setBreathFrequency = useAppStore((s) => s.setBreathFrequency)
  const setColorTheme = useAppStore((s) => s.setColorTheme)
  const togglePlaying = useAppStore((s) => s.togglePlaying)
  const triggerManualBreath = useAppStore((s) => s.triggerManualBreath)

  const [hovered, setHovered] = React.useState<Record<string, boolean>>({})

  const handleMouseEnter = (key: string) => setHovered((h) => ({ ...h, [key]: true }))
  const handleMouseLeave = (key: string) => setHovered((h) => ({ ...h, [key]: false }))

  const getButtonStyle = (key: string, active?: boolean): React.CSSProperties => ({
    ...buttonBaseStyle,
    background: hovered[key]
      ? 'rgba(255, 255, 255, 0.3)'
      : active
      ? 'rgba(52, 152, 219, 0.5)'
      : 'rgba(255, 255, 255, 0.05)',
    borderColor: hovered[key]
      ? 'rgba(255, 255, 255, 0.4)'
      : active
      ? 'rgba(52, 152, 219, 0.8)'
      : 'rgba(255, 255, 255, 0.2)',
  })

  const sliderHoverStyle: React.CSSProperties = {
    ...sliderStyle,
    background: hovered['slider'] ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)',
    borderColor: hovered['slider'] ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)',
  }

  const selectHoverStyle: React.CSSProperties = {
    ...selectStyle,
    background: hovered['select'] ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
    borderColor: hovered['select'] ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)',
  }

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>形态呼吸</div>

      <div style={sliderContainerStyle}>
        <label style={labelStyle}>
          呼吸频率
          <span style={valueDisplayStyle}>{breathFrequency.toFixed(1)} Hz</span>
        </label>
        <input
          type="range"
          min={0.1}
          max={2}
          step={0.1}
          value={breathFrequency}
          onChange={(e) => setBreathFrequency(parseFloat(e.target.value))}
          style={sliderHoverStyle}
          onMouseEnter={() => handleMouseEnter('slider')}
          onMouseLeave={() => handleMouseLeave('slider')}
        />
      </div>

      <div style={sliderContainerStyle}>
        <label style={labelStyle}>颜色主题</label>
        <select
          value={colorTheme}
          onChange={(e) => setColorTheme(e.target.value as ColorTheme)}
          style={selectHoverStyle}
          onMouseEnter={() => handleMouseEnter('select')}
          onMouseLeave={() => handleMouseLeave('select')}
        >
          {themeOptions.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ background: '#1a1a2e' }}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div style={sliderContainerStyle}>
        <button
          onClick={togglePlaying}
          style={getButtonStyle('toggle', isPlaying)}
          onMouseEnter={() => handleMouseEnter('toggle')}
          onMouseLeave={() => handleMouseLeave('toggle')}
        >
          {isPlaying ? '⏸ 暂停呼吸' : '▶ 启动呼吸'}
        </button>
      </div>

      <div style={{ ...sliderContainerStyle, marginBottom: 0 }}>
        <button
          onClick={triggerManualBreath}
          style={getButtonStyle('manual')}
          onMouseEnter={() => handleMouseEnter('manual')}
          onMouseLeave={() => handleMouseLeave('manual')}
        >
          ◉ 手动呼吸
        </button>
      </div>
    </div>
  )
}
