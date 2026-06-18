import React from 'react'
import { Scene } from './scene/Scene'
import { ControlPanel } from './ui/ControlPanel'
import { PerformanceWarning } from './ui/PerformanceWarning'

const App: React.FC = () => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Scene />
      <ControlPanel />
      <PerformanceWarning />
      
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          color: 'rgba(255, 255, 255, 0.8)',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 300,
            letterSpacing: '2px',
            marginBottom: '8px',
            background: 'linear-gradient(135deg, #9b59b6, #3498db)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          星轨画廊
        </h1>
        <p style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 300 }}>
          拖拽旋转视角 · 滚轮缩放
        </p>
      </div>
    </div>
  )
}

export default App
