import React from 'react'
import { useNeuronStore } from './store'

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: '20px',
  right: '20px',
  width: '240px',
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
  padding: '16px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  zIndex: 1000,
  fontFamily: 'Arial, sans-serif',
}

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#333',
  marginBottom: '6px',
  display: 'block',
  fontWeight: 500,
}

const valueStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#666',
  float: 'right',
  fontWeight: 'normal',
}

const sliderContainerStyle: React.CSSProperties = {
  marginBottom: '20px',
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  borderRadius: '3px',
  background: '#e0e0e0',
  outline: 'none',
  WebkitAppearance: 'none',
  appearance: 'none',
  cursor: 'pointer',
}

const buttonBaseStyle: React.CSSProperties = {
  width: '100%',
  height: '36px',
  borderRadius: '4px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
  color: '#fff',
  transition: 'all 0.2s ease',
}

const randomButtonStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  background: 'linear-gradient(135deg, #4da6ff 0%, #1a73e8 100%)',
  marginBottom: '8px',
}

const resetButtonStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  backgroundColor: '#ff5252',
}

export const UIPanel: React.FC = () => {
  const {
    signalStrength,
    synapseCount,
    transmissionDelay,
    setSignalStrength,
    setSynapseCount,
    setTransmissionDelay,
    resetParams,
    randomizePositions,
  } = useNeuronStore()

  const [randomHover, setRandomHover] = React.useState(false)
  const [resetHover, setResetHover] = React.useState(false)

  return (
    <div style={panelStyle}>
      <div style={{ ...sliderContainerStyle }}>
        <label style={labelStyle}>
          信号强度
          <span style={valueStyle}>{signalStrength}</span>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={signalStrength}
          onChange={(e) => setSignalStrength(Number(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div style={{ ...sliderContainerStyle }}>
        <label style={labelStyle}>
          突触数量
          <span style={valueStyle}>{synapseCount}</span>
        </label>
        <input
          type="range"
          min={5}
          max={50}
          value={synapseCount}
          onChange={(e) => setSynapseCount(Number(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div style={{ ...sliderContainerStyle }}>
        <label style={labelStyle}>
          传递延迟
          <span style={valueStyle}>{transmissionDelay}ms</span>
        </label>
        <input
          type="range"
          min={0}
          max={1000}
          value={transmissionDelay}
          onChange={(e) => setTransmissionDelay(Number(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <button
        style={{
          ...randomButtonStyle,
          background: randomHover
            ? 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)'
            : 'linear-gradient(135deg, #4da6ff 0%, #1a73e8 100%)',
          boxShadow: randomHover ? '0 2px 8px rgba(26, 115, 232, 0.4)' : 'none',
        }}
        onClick={() => randomizePositions()}
        onMouseEnter={() => setRandomHover(true)}
        onMouseLeave={() => setRandomHover(false)}
      >
        随机重组
      </button>

      <button
        style={{
          ...resetButtonStyle,
          backgroundColor: resetHover ? '#d32f2f' : '#ff5252',
          boxShadow: resetHover ? '0 2px 8px rgba(255, 82, 82, 0.4)' : 'none',
        }}
        onClick={() => resetParams()}
        onMouseEnter={() => setResetHover(true)}
        onMouseLeave={() => setResetHover(false)}
      >
        重置
      </button>
    </div>
  )
}
