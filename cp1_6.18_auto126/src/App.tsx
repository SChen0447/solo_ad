import { useRef, useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { ControlPanel } from './components/ControlPanel'
import { ParticleScene } from './components/ParticleScene'
import { GravitySphere } from './components/GravitySphere'
import { ParticleSystem } from './effects/ParticleSystem'
import { useParticleStore } from './store'

function CameraController() {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && controlsRef.current) {
        e.preventDefault()
        camera.position.set(0, 0, 15)
        controlsRef.current.target.set(0, 0, 0)
        controlsRef.current.update()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [camera])

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={1}
      maxDistance={50}
    />
  )
}

function SceneContent({ particleSystemRef }: { particleSystemRef: React.MutableRefObject<ParticleSystem | null> }) {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <Stars radius={100} depth={50} count={500} factor={4} saturation={0} fade speed={1} />
      <ParticleScene particleSystemRef={particleSystemRef} />
      <GravitySphere />
      <CameraController />
    </>
  )
}

export default function App() {
  const particleSystemRef = useRef<ParticleSystem | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="app-container">
      <div className="canvas-container">
        <Canvas
          camera={{ position: [0, 0, 15], fov: 60 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: '#000' }}
        >
          <color attach="background" args={['#000']} />
          <fog attach="fog" args={['#000', 20, 50]} />
          <SceneContent particleSystemRef={particleSystemRef} />
        </Canvas>
      </div>
      <ControlPanel />
    </div>
  )
}
