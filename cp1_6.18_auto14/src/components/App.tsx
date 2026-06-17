import React, { useState, useEffect, useRef, useCallback } from 'react'
import { AudioAnalyzer, BandEnergy } from '../modules/audio/audioAnalyzer'
import { AudioControls } from '../modules/audio/audioControls'
import { SceneManager } from '../modules/visual/sceneManager'
import { ControlPanel, ControlPanelState } from './ControlPanel'
import { ColorTheme } from '../modules/visual/types'

const App: React.FC = () => {
  const [analyzer] = useState(() => new AudioAnalyzer())
  const [energy, setEnergy] = useState<BandEnergy>({ low: 0, mid: 0, high: 0 })
  const [rawFrequencyData, setRawFrequencyData] = useState<Uint8Array>(new Uint8Array(256))
  const [controlState, setControlState] = useState<ControlPanelState>({
    sensitivity: 1.2,
    particleCount: 300,
    theme: 'Ocean' as ColorTheme,
    autoRotate: true,
    showPanel: true,
  })

  const rafRef = useRef<number>(0)
  const demoTimeRef = useRef<number>(0)
  const [isDemoMode, setIsDemoMode] = useState(true)

  useEffect(() => {
    const animate = () => {
      if (isDemoMode) {
        demoTimeRef.current += 0.016
        const t = demoTimeRef.current
        setEnergy({
          low: 0.3 + Math.sin(t * 0.8) * 0.2 + Math.sin(t * 2.1) * 0.15,
          mid: 0.35 + Math.sin(t * 1.5) * 0.2 + Math.cos(t * 3.2) * 0.15,
          high: 0.25 + Math.cos(t * 2.3) * 0.2 + Math.sin(t * 5.0) * 0.15,
        })
        const demoData = new Uint8Array(256)
        for (let i = 0; i < 256; i++) {
          const freq = i / 256
          demoData[i] = Math.floor(
            (0.4 + 0.3 * Math.sin(t * 3 + i * 0.15) + 0.2 * Math.sin(t * 8 + i * 0.08)
              + 0.15 * Math.cos(t * 5 + i * 0.2)) * 255 * Math.exp(-freq * 1.5)
          )
        }
        setRawFrequencyData(demoData)
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(rafRef.current)
  }, [isDemoMode])

  const handleEnergyUpdate = useCallback((newEnergy: BandEnergy) => {
    setIsDemoMode(false)
    setEnergy(newEnergy)
    if (analyzer) {
      setRawFrequencyData(new Uint8Array(analyzer.getRawFrequencyData()))
    }
  }, [analyzer])

  const handleControlChange = useCallback((changes: Partial<ControlPanelState>) => {
    setControlState(prev => ({ ...prev, ...changes }))
  }, [])

  return (
    <div style={rootStyle}>
      <SceneManager
        energy={energy}
        rawFrequencyData={rawFrequencyData}
        sensitivity={controlState.sensitivity}
        particleCount={controlState.particleCount}
        theme={controlState.theme}
        autoRotate={controlState.autoRotate}
      />

      <AudioControls
        analyzer={analyzer}
        onEnergyUpdate={handleEnergyUpdate}
      />

      <ControlPanel
        state={controlState}
        onChange={handleControlChange}
      />

      <div style={energyBarsStyle}>
        <EnergyBar label="LOW" value={energy.low} color="#00ccff" />
        <EnergyBar label="MID" value={energy.mid} color="#ffaa00" />
        <EnergyBar label="HIGH" value={energy.high} color="#ff44aa" />
      </div>

      <div style={footerStyle}>
        <span>🎧 3D Music Visualizer</span>
        {isDemoMode && <span style={demoTagStyle}>Demo Mode</span>}
      </div>
    </div>
  )
}

const EnergyBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div style={energyBarContainerStyle}>
    <span style={{ ...energyBarLabelStyle, color }}>{label}</span>
    <div style={energyBarBgStyle}>
      <div
        style={{
          ...energyBarFillStyle,
          width: `${Math.min(100, value * 100)}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 10px ${color}`,
        }}
      />
    </div>
  </div>
)

const rootStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'relative',
  background: '#000',
  overflow: 'hidden',
}

const energyBarsStyle: React.CSSProperties = {
  position: 'fixed',
  left: '24px',
  bottom: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  zIndex: 90,
}

const energyBarContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
}

const energyBarLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  width: '38px',
  letterSpacing: '1px',
}

const energyBarBgStyle: React.CSSProperties = {
  width: '120px',
  height: '6px',
  background: 'rgba(255, 255, 255, 0.08)',
  borderRadius: '3px',
  overflow: 'hidden',
  backdropFilter: 'blur(4px)',
}

const energyBarFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: '3px',
  transition: 'width 0.08s ease-out',
}

const footerStyle: React.CSSProperties = {
  position: 'fixed',
  right: '24px',
  bottom: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  color: '#6699bb',
  fontSize: '12px',
  zIndex: 90,
  textShadow: '0 0 8px rgba(0, 150, 255, 0.3)',
}

const demoTagStyle: React.CSSProperties = {
  background: 'rgba(255, 150, 50, 0.2)',
  color: '#ffaa66',
  padding: '3px 10px',
  borderRadius: '20px',
  fontSize: '11px',
  fontWeight: 600,
  border: '1px solid rgba(255, 150, 50, 0.35)',
}

export default App
