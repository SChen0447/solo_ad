import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { BuildingModel } from './BuildingModel'
import { ClippingPlane } from './ClippingPlane'
import { UIPanel } from './UIPanel'
import { generateBuildingData } from './buildingData'
import type { BuildingData } from './types'

const INITIAL_CAMERA_POS = new THREE.Vector3(25, 22, 25)
const INITIAL_CAMERA_TARGET = new THREE.Vector3(0, 9, 0)

function CameraController({
  isAutoAnimating,
  clippingY,
}: {
  isAutoAnimating: boolean
  clippingY: number
}) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const animStartTimeRef = useRef(0)
  const initialPosRef = useRef(new THREE.Vector3())
  const initialTargetRef = useRef(new THREE.Vector3())

  useEffect(() => {
    if (isAutoAnimating) {
      animStartTimeRef.current = performance.now()
      initialPosRef.current.copy(camera.position)
      if (controlsRef.current) {
        initialTargetRef.current.copy(controlsRef.current.target)
      }
    } else {
      if (controlsRef.current) {
        controlsRef.current.target.copy(INITIAL_CAMERA_TARGET)
        controlsRef.current.update()
      }
    }
  }, [isAutoAnimating, camera])

  useFrame(() => {
    if (!controlsRef.current) return

    if (isAutoAnimating) {
      const elapsed = (performance.now() - animStartTimeRef.current) / 4000
      const t = Math.min(elapsed, 1)
      void t

      const targetY = clippingY + 6

      const radius = 28
      const angle = -Math.PI / 4
      const desiredPos = new THREE.Vector3(
        Math.cos(angle) * radius,
        targetY + radius * Math.sin(Math.PI / 4),
        Math.sin(angle) * radius
      )

      camera.position.lerp(desiredPos, 0.08)

      const desiredTarget = new THREE.Vector3(0, clippingY, 0)
      controlsRef.current.target.lerp(desiredTarget, 0.08)
      controlsRef.current.update()
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={8}
      maxDistance={60}
      maxPolarAngle={Math.PI / 2 - 0.05}
      target={[0, 9, 0]}
      makeDefault
    />
  )
}

function Scene({
  buildingData,
  clippingY,
  isAutoAnimating,
}: {
  buildingData: BuildingData
  clippingY: number
  isAutoAnimating: boolean
}) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[20, 30, 15]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
      />
      <directionalLight position={[-15, 10, -10]} intensity={0.4} />

      <gridHelper
        args={[60, 60, '#555555', '#3a3a3a']}
        position={[0, -0.01, 0]}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
      </mesh>

      <BuildingModel buildingData={buildingData} clippingY={clippingY} />
      <ClippingPlane clippingY={clippingY} buildingData={buildingData} />
      <CameraController isAutoAnimating={isAutoAnimating} clippingY={clippingY} />
    </>
  )
}

export default function App() {
  const buildingData = useMemo(() => generateBuildingData(), [])
  const [clippingY, setClippingY] = useState(0)
  const [isAutoAnimating, setIsAutoAnimating] = useState(false)
  const animationFrameRef = useRef<number | null>(null)
  const animStartTimeRef = useRef(0)

  const maxHeight = buildingData.totalHeight

  const runAutoAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    animStartTimeRef.current = performance.now()
    const startY = maxHeight
    const endY = 0
    const duration = 4000

    const animate = () => {
      const elapsed = performance.now() - animStartTimeRef.current
      const t = Math.min(elapsed / duration, 1)

      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      const currentY = startY + (endY - startY) * easeT
      const roundedY = Math.round(currentY * 2) / 2
      setClippingY(roundedY)

      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        setIsAutoAnimating(false)
        animationFrameRef.current = null
      }
    }

    setClippingY(Math.round(startY * 2) / 2)
    setIsAutoAnimating(true)
    animationFrameRef.current = requestAnimationFrame(animate)
  }, [maxHeight])

  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    setIsAutoAnimating(false)
  }, [])

  const handleToggleAutoAnimation = useCallback(() => {
    if (isAutoAnimating) {
      stopAnimation()
    } else {
      runAutoAnimation()
    }
  }, [isAutoAnimating, runAutoAnimation, stopAnimation])

  const handleClippingYChange = useCallback((y: number) => {
    setClippingY(y)
  }, [])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#1a1a1a' }}>
      <Canvas
        shadows
        camera={{
          position: [INITIAL_CAMERA_POS.x, INITIAL_CAMERA_POS.y, INITIAL_CAMERA_POS.z],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#1a1a1a']} />
        <fog attach="fog" args={['#1a1a1a', 40, 100]} />
        <Scene buildingData={buildingData} clippingY={clippingY} isAutoAnimating={isAutoAnimating} />
      </Canvas>

      <UIPanel
        clippingY={clippingY}
        maxHeight={maxHeight}
        buildingData={buildingData}
        onClippingYChange={handleClippingYChange}
        isAutoAnimating={isAutoAnimating}
        onToggleAutoAnimation={handleToggleAutoAnimation}
      />
    </div>
  )
}
