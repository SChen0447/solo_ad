import React from 'react'
import { ColorTheme } from '../modules/visual/types'

export interface ControlPanelState {
  sensitivity: number
  particleCount: number
  theme: ColorTheme
  autoRotate: boolean
  showPanel: boolean
}

interface ControlPanelProps {
  state: ControlPanelState
  onChange: (state: Partial<ControlPanelState>) => void
}

const THEME_OPTIONS: ColorTheme[] = ['Ocean', 'Fire', 'Aurora']

export const ControlPanel: React.FC<ControlPanelProps> = ({ state, onChange }) => {
  const { sensitivity, particleCount, theme, autoRotate, showPanel } = state

  return (
    <div style={containerStyle(showPanel)}>
      <div
        style={toggleButtonStyle}
        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 0 20px rgba(100, 200, 255, 0.6)')}
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 0 10px rgba(100, 200, 255, 0.3)')}
      >
        <button
          onClick={() => onChange({ showPanel: !showPanel })}
          style={{
            ...iconButtonStyle,
            transform: showPanel ? 'rotate(0deg)' : 'rotate(180deg)',
          }}
        >
          ⚙
        </button>
      </div>

      {showPanel && (
        <div style={panelStyle} onMouseLeave={() => { }}>
          <div style={headerStyle}>
            <span style={titleStyle}>⚡ Visual Controls</span>
          </div>

          <div style={sectionStyle}>
            <div style={labelRowStyle}>
              <span style={labelStyle}>🎚 Sensitivity</span>
              <span style={valueStyle}>{sensitivity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="2.5"
              step="0.1"
              value={sensitivity}
              onChange={(e) => onChange({ sensitivity: parseFloat(e.target.value) })}
              style={sliderStyle}
            />
          </div>

          <div style={sectionStyle}>
            <div style={labelRowStyle}>
              <span style={labelStyle}>✨ Particles</span>
              <span style={valueStyle}>{particleCount}</span>
            </div>
            <input
              type="range"
              min="100"
              max="500"
              step="10"
              value={particleCount}
              onChange={(e) => onChange({ particleCount: parseInt(e.target.value) })}
              style={sliderStyle}
            />
          </div>

          <div style={sectionStyle}>
            <span style={labelStyle}>🎨 Color Theme</span>
            <div style={themeRowStyle}>
              {THEME_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => onChange({ theme: t })}
                  style={{
                    ...themeButtonStyle,
                    ...(theme === t ? activeThemeButtonStyle(t) : {}),
                    ...getThemePreview(t),
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.3)')}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = theme === t ? '0 0 12px rgba(100, 200, 255, 0.5)' : 'none')}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={toggleSectionStyle}>
            <span style={labelStyle}>🔄 Auto Rotate</span>
            <button
              onClick={() => onChange({ autoRotate: !autoRotate })}
              style={{
                ...switchStyle,
                ...(autoRotate ? switchActiveStyle : {}),
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = autoRotate ? '0 0 15px rgba(100, 255, 150, 0.5)' : '0 0 10px rgba(255, 100, 100, 0.3)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{
                ...toggleDotStyle,
                ...(autoRotate ? toggleDotActiveStyle : {}),
              }} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const containerStyle = (showPanel: boolean): React.CSSProperties => ({
  position: 'fixed',
  top: showPanel ? '80px' : '80px',
  right: '24px',
  zIndex: 98,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '8px',
})

const toggleButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.3s ease',
  boxShadow: '0 0 10px rgba(100, 200, 255, 0.3)',
  borderRadius: '50%',
}

const iconButtonStyle: React.CSSProperties = {
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  background: 'rgba(20, 20, 35, 0.7)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(100, 200, 255, 0.35)',
  color: '#aaddff',
  fontSize: '20px',
  cursor: 'pointer',
  transition: 'all 0.4s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const panelStyle: React.CSSProperties = {
  background: 'rgba(15, 15, 28, 0.55)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(100, 200, 255, 0.25)',
  borderRadius: '16px',
  padding: '20px',
  width: '280px',
  maxWidth: 'calc(92vw - 60px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(100, 200, 255, 0.08)',
}

const headerStyle: React.CSSProperties = {
  marginBottom: '18px',
}

const titleStyle: React.CSSProperties = {
  color: '#cceeFF',
  fontSize: '16px',
  fontWeight: 600,
  textShadow: '0 0 10px rgba(100, 200, 255, 0.4)',
}

const sectionStyle: React.CSSProperties = {
  marginBottom: '18px',
}

const labelRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
}

const labelStyle: React.CSSProperties = {
  color: '#aaddFF',
  fontSize: '13px',
}

const valueStyle: React.CSSProperties = {
  color: '#88bbdd',
  fontSize: '12px',
  fontWeight: 500,
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  accentColor: '#66ccff',
  height: '4px',
  cursor: 'pointer',
}

const themeRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginTop: '10px',
}

const themeButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 10px',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  background: 'rgba(255, 255, 255, 0.05)',
  color: '#cceeFF',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
}

const activeThemeButtonStyle = (theme: ColorTheme): React.CSSProperties => {
  const borders: Record<ColorTheme, string> = {
    Ocean: 'rgba(0, 200, 255, 0.7)',
    Fire: 'rgba(255, 100, 0, 0.7)',
    Aurora: 'rgba(170, 0, 255, 0.7)',
  }
  return {
    borderColor: borders[theme],
    boxShadow: `0 0 12px ${borders[theme]}`,
  }
}

const getThemePreview = (theme: ColorTheme): React.CSSProperties => {
  const bgs: Record<ColorTheme, string> = {
    Ocean: 'linear-gradient(135deg, rgba(0,100,200,0.2), rgba(0,200,255,0.2))',
    Fire: 'linear-gradient(135deg, rgba(255,80,0,0.2), rgba(255,200,0,0.2))',
    Aurora: 'linear-gradient(135deg, rgba(170,0,255,0.2), rgba(0,255,150,0.2))',
  }
  return { background: bgs[theme] }
}

const toggleSectionStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '4px',
}

const switchStyle: React.CSSProperties = {
  width: '48px',
  height: '26px',
  borderRadius: '13px',
  background: 'rgba(255, 100, 100, 0.25)',
  border: '1px solid rgba(255, 100, 100, 0.4)',
  cursor: 'pointer',
  position: 'relative',
  padding: 0,
  transition: 'all 0.3s ease',
}

const switchActiveStyle: React.CSSProperties = {
  background: 'rgba(100, 255, 150, 0.25)',
  borderColor: 'rgba(100, 255, 150, 0.5)',
}

const toggleDotStyle: React.CSSProperties = {
  position: 'absolute',
  top: '3px',
  left: '3px',
  width: '18px',
  height: '18px',
  borderRadius: '50%',
  background: '#ff8888',
  transition: 'all 0.3s ease',
  boxShadow: '0 0 6px rgba(255, 100, 100, 0.5)',
}

const toggleDotActiveStyle: React.CSSProperties = {
  left: '25px',
  background: '#88ffaa',
  boxShadow: '0 0 6px rgba(100, 255, 150, 0.6)',
}
