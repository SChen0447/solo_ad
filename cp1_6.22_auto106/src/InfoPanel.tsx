import { useEffect, useState } from 'react'
import type { PlanetData } from './data/planets'

interface InfoPanelProps {
  planet: PlanetData | null
  onClose: () => void
}

export default function InfoPanel({ planet, onClose }: InfoPanelProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (planet) {
      setVisible(true)
    } else {
      const timer = setTimeout(() => setVisible(false), 200)
      return () => clearTimeout(timer)
    }
  }, [planet])

  if (!planet && !visible) return null

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: '24px',
    right: '24px',
    width: '320px',
    maxHeight: 'calc(100vh - 48px)',
    overflowY: 'auto',
    background: 'rgba(20, 30, 50, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px',
    padding: '24px',
    color: 'white',
    zIndex: 100,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    opacity: planet ? 1 : 0,
    transform: planet ? 'translateX(0)' : 'translateX(40px)',
    transition: 'opacity 0.3s ease, transform 0.3s ease'
  }

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '32px',
    height: '32px',
    border: 'none',
    background: 'transparent',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'background 0.2s ease'
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    marginBottom: '4px',
    paddingRight: '32px'
  }

  const englishNameStyle: React.CSSProperties = {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: '20px',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  }

  const colorIndicatorStyle: React.CSSProperties = {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: planet?.color || '#fff',
    display: 'inline-block',
    marginRight: '8px',
    verticalAlign: 'middle',
    boxShadow: `0 0 12px ${planet?.color || '#fff'}`
  }

  const infoItemStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    fontSize: '14px'
  }

  const infoLabelStyle: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.6)'
  }

  const infoValueStyle: React.CSSProperties = {
    fontWeight: 600,
    textAlign: 'right'
  }

  const descriptionStyle: React.CSSProperties = {
    marginTop: '20px',
    fontSize: '14px',
    lineHeight: 1.7,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'justify'
  }

  const mobileStyle: React.CSSProperties = typeof window !== 'undefined' && window.innerWidth < 768 ? {
    top: 'auto',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    maxHeight: '50vh',
    borderRadius: '16px 16px 0 0',
    transform: planet ? 'translateY(0)' : 'translateY(100%)'
  } : {}

  return (
    <div style={{ ...panelStyle, ...mobileStyle }}>
      <button
        style={closeButtonStyle}
        onClick={onClose}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        ✕
      </button>

      <div style={titleStyle}>
        <span style={colorIndicatorStyle}></span>
        {planet?.name}
      </div>
      <div style={englishNameStyle}>{planet?.englishName}</div>

      {planet?.id !== 'sun' && (
        <>
          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>直径</span>
            <span style={infoValueStyle}>{planet?.diameter.toLocaleString()} km</span>
          </div>
          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>距太阳距离</span>
            <span style={infoValueStyle}>{planet?.distanceFromSun.toLocaleString()} 百万 km</span>
          </div>
          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>公转周期</span>
            <span style={infoValueStyle}>{planet?.orbitalPeriod.toLocaleString()} 地球日</span>
          </div>
        </>
      )}

      {planet?.id === 'sun' && (
        <div style={infoItemStyle}>
          <span style={infoLabelStyle}>直径</span>
          <span style={infoValueStyle}>{planet?.diameter.toLocaleString()} km</span>
        </div>
      )}

      <p style={descriptionStyle}>{planet?.description}</p>
    </div>
  )
}
