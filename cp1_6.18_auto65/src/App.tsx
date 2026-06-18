import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './components/Scene'
import { ControlPanel } from './components/ControlPanel'
import { useStore } from './store'

function App() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #08081a 0%, #0a0a1a 40%, #0d0d25 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 80% 60% at 30% 20%, rgba(100, 60, 200, 0.15) 0%, transparent 60%),
            radial-gradient(ellipse 70% 50% at 80% 80%, rgba(200, 80, 120, 0.12) 0%, transparent 55%),
            radial-gradient(ellipse 60% 40% at 50% 50%, rgba(60, 150, 200, 0.08) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
        }}
      />

      <Canvas
        camera={{
          position: [0, 3, 10],
          fov: 55,
          near: 0.1,
          far: 200,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        style={{
          position: 'absolute',
          inset: 0,
          touchAction: 'none',
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      <ControlPanel />
    </div>
  )
}

export default App
