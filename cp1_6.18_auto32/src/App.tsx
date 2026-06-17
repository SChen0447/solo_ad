import { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import ParticleTrail from './components/ParticleTrail'
import OrbitSelector from './components/OrbitSelector'
import { OrbitType } from './utils/trajectoryUtils'

export default function App() {
  const [orbitType, setOrbitType] = useState<OrbitType>('spiral')
  const [particleCount, setParticleCount] = useState(500)

  const handleOrbitChange = useCallback((type: OrbitType) => {
    setOrbitType(type)
  }, [])

  const handleParticleCountChange = useCallback((count: number) => {
    setParticleCount(count)
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a1a' }}>
      <Canvas
        camera={{ position: [0, 4, 14], fov: 55, near: 0.1, far: 200 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: false }}
        style={{ background: '#0a0a1a' }}
      >
        <color attach="background" args={['#0a0a1a']} />
        <fog attach="fog" args={['#0a0a1a', 20, 60]} />
        <ambientLight intensity={0.1} />
        <ParticleTrail orbitType={orbitType} particleCount={particleCount} />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.6}
          zoomSpeed={0.8}
          minDistance={4}
          maxDistance={40}
          enablePan={false}
        />
      </Canvas>
      <OrbitSelector
        orbitType={orbitType}
        onOrbitChange={handleOrbitChange}
        particleCount={particleCount}
        onParticleCountChange={handleParticleCountChange}
      />
    </div>
  )
}
