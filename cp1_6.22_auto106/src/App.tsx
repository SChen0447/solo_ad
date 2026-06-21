import { useState, useRef, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import SolarSystem from './SolarSystem'
import InfoPanel from './InfoPanel'
import { planetsData, sunData, type PlanetData } from './data/planets'

function CameraController({
  selectedPlanet,
  autoRotate,
  controlsRef
}: {
  selectedPlanet: PlanetData | null
  autoRotate: boolean
  controlsRef: React.RefObject<any>
}) {
  const { camera } = useThree()
  const animatingRef = useRef(false)
  const targetPosRef = useRef(new THREE.Vector3())
  const startPosRef = useRef(new THREE.Vector3())
  const targetLookAtRef = useRef(new THREE.Vector3())
  const startLookAtRef = useRef(new THREE.Vector3())
  const animTimeRef = useRef(0)
  const animDurationRef = useRef(1)

  const startAnimation = useCallback((planet: PlanetData) => {
    const planetInfo = planetsData.find(p => p.id === planet.id)
    let targetPosition: THREE.Vector3
    let lookAtPosition: THREE.Vector3

    if (planet.id === 'sun' || !planetInfo) {
      lookAtPosition = new THREE.Vector3(0, 0, 0)
      targetPosition = new THREE.Vector3(15, 10, 15)
    } else {
      const angle = Date.now() * 0.001 * planetInfo.orbitSpeed * 0.2
      const x = Math.cos(angle) * planetInfo.orbitRadius
      const z = Math.sin(angle) * planetInfo.orbitRadius
      lookAtPosition = new THREE.Vector3(x, 0, z)
      const distance = planetInfo.size * 8 + 3
      const dir = new THREE.Vector3(x, 0, z).normalize()
      targetPosition = new THREE.Vector3(
        x + dir.x * distance,
        distance * 0.6,
        z + dir.z * distance
      )
    }

    startPosRef.current.copy(camera.position)
    startLookAtRef.current.copy(controlsRef.current?.target || new THREE.Vector3())
    targetPosRef.current.copy(targetPosition)
    targetLookAtRef.current.copy(lookAtPosition)
    animTimeRef.current = 0
    animDurationRef.current = 1
    animatingRef.current = true
  }, [camera, controlsRef])

  useEffect(() => {
    if (selectedPlanet && controlsRef.current) {
      startAnimation(selectedPlanet)
    }
  }, [selectedPlanet, startAnimation, controlsRef])

  useFrame((_, delta) => {
    if (animatingRef.current) {
      animTimeRef.current += delta
      const t = Math.min(animTimeRef.current / animDurationRef.current, 1)
      const easeOut = 1 - Math.pow(1 - t, 3)

      camera.position.lerpVectors(
        startPosRef.current,
        targetPosRef.current,
        easeOut
      )

      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(
          startLookAtRef.current,
          targetLookAtRef.current,
          easeOut
        )
        controlsRef.current.update()
      }

      if (t >= 1) {
        animatingRef.current = false
      }
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      autoRotate={autoRotate && !animatingRef.current}
      autoRotateSpeed={0.5}
      minDistance={2}
      maxDistance={80}
      enableDamping={true}
      dampingFactor={0.05}
    />
  )
}

export default function App() {
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null)
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const [autoRotate, setAutoRotate] = useState(false)
  const controlsRef = useRef<any>(null)

  const speedOptions = [1, 2, 5]

  const handleSpeedToggle = () => {
    const currentIndex = speedOptions.indexOf(speedMultiplier)
    const nextIndex = (currentIndex + 1) % speedOptions.length
    setSpeedMultiplier(speedOptions[nextIndex])
  }

  const handleResetView = () => {
    setSelectedPlanet(null)
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }

  const handlePlanetClick = (data: PlanetData) => {
    setSelectedPlanet(data)
  }

  const handleClosePanel = () => {
    setSelectedPlanet(null)
  }

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '999px',
    background: '#2d3748',
    color: '#e2e8f0',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background 0.2s ease, transform 0.2s ease',
    fontFamily: 'inherit'
  }

  const controlBarStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '12px',
    padding: '12px 16px',
    background: 'rgba(20, 30, 50, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px',
    zIndex: 100,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  }

  const titleStyle: React.CSSProperties = {
    position: 'fixed',
    top: '24px',
    left: '24px',
    zIndex: 100,
    color: 'white',
    fontSize: '20px',
    fontWeight: 700,
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
  }

  const subtitleStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: '4px',
    fontWeight: 400
  }

  const speedLabelStyle: React.CSSProperties = {
    marginLeft: '6px',
    fontWeight: 600,
    color: '#ffaa00'
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={titleStyle}>
        太阳系 3D 模拟器
        <div style={subtitleStyle}>拖拽旋转 · 滚轮缩放 · 点击行星查看详情</div>
      </div>

      <Canvas
        camera={{ position: [15, 10, 15], fov: 60, near: 0.1, far: 1000 }}
        style={{
          width: '100%',
          height: '100%',
          background: 'radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)'
        }}
        gl={{ antialias: true, alpha: false }}
      >
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
        <SolarSystem onPlanetClick={handlePlanetClick} speedMultiplier={speedMultiplier} />
        <CameraController
          selectedPlanet={selectedPlanet}
          autoRotate={autoRotate}
          controlsRef={controlsRef}
        />
      </Canvas>

      <InfoPanel planet={selectedPlanet} onClose={handleClosePanel} />

      <div style={controlBarStyle}>
        <button
          style={buttonStyle}
          onClick={handleResetView}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#4a5568'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#2d3748'
          }}
        >
          🔄 重置视角
        </button>
        <button
          style={buttonStyle}
          onClick={() => setAutoRotate(!autoRotate)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#4a5568'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#2d3748'
          }}
        >
          {autoRotate ? '⏸️ 停止旋转' : '▶️ 自动旋转'}
        </button>
        <button
          style={buttonStyle}
          onClick={handleSpeedToggle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#4a5568'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#2d3748'
          }}
        >
          ⏱️ 时间速度<span style={speedLabelStyle}>{speedMultiplier}x</span>
        </button>
      </div>
    </div>
  )
}
