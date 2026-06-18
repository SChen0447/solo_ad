import React, { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { Star, useSimulationStore } from './store'
import { getStarRadius, getVelocityMagnitude } from '../module1/star-manager'
import {
  verletIntegration,
  calculateEnergyDataPoint,
} from '../module1/physics-engine'

interface StarMeshProps {
  star: Star
  onHover: (id: string | null) => void
}

const StarMesh: React.FC<StarMeshProps> = ({ star, onHover }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const radius = getStarRadius(star.mass)

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onHover(star.id)
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onHover(null)
    document.body.style.cursor = 'default'
  }

  return (
    <group position={[star.position.x, star.position.y, star.position.z]}>
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial color={star.color} emissive={star.color} emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

interface TrailLineProps {
  star: Star
}

const TrailLine: React.FC<TrailLineProps> = ({ star }) => {
  const points = useMemo(() => {
    if (star.trail.length === 0) return [[0, 0, 0], [0, 0, 0]] as [number, number, number][]
    return star.trail.map((t) => [t.x, t.y, t.z]) as [number, number, number][]
  }, [star.trail])

  return (
    <Line
      points={points}
      color={star.color}
      transparent
      opacity={0.6}
      lineWidth={1}
    />
  )
}

interface BackgroundStarsProps {
  count?: number
}

const BackgroundStars: React.FC<BackgroundStarsProps> = ({ count = 300 }) => {
  const pointsRef = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const radius = 80 + Math.random() * 20
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      pos[i3] = radius * Math.sin(phi) * Math.cos(theta)
      pos[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      pos[i3 + 2] = radius * Math.cos(phi)
    }
    return pos
  }, [count])

  const sizes = useMemo(() => {
    const s = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      s[i] = 1 + Math.random() * 1
    }
    return s
  }, [count])

  const opacities = useMemo(() => {
    const o = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      o[i] = 0.3 + Math.random() * 0.4
    }
    return o
  }, [count])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [positions])

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={1.5}
        color="#ffffff"
        transparent
        opacity={0.7}
        sizeAttenuation={false}
      />
    </points>
  )
}

interface HoverInfoProps {
  star: Star
}

const HoverInfo: React.FC<HoverInfoProps> = ({ star }) => {
  const speed = getVelocityMagnitude(star.velocity)

  return (
    <Html
      position={[star.position.x, star.position.y + getStarRadius(star.mass) + 1, star.position.z]}
      center
      zIndexRange={[100, 0]}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '8px',
          padding: '8px 12px',
          color: '#333',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{star.name}</div>
        <div>质量: {star.mass.toFixed(2)} M☉</div>
        <div>速度: {speed.toFixed(2)} 单位/秒</div>
      </div>
    </Html>
  )
}

interface SceneContentProps {
  stars: Star[]
  hoveredStarId: string | null
  onHoverStar: (id: string | null) => void
}

const SceneContent: React.FC<SceneContentProps> = ({
  stars,
  hoveredStarId,
  onHoverStar,
}) => {
  const isSimulating = useSimulationStore((state) => state.isSimulating)
  const time = useSimulationStore((state) => state.time)
  const updatePhysics = useSimulationStore((state) => state.updatePhysics)

  useFrame(() => {
    if (!isSimulating) return

    const currentStars = useSimulationStore.getState().stars
    if (currentStars.length < 2) return

    const updatedStars = verletIntegration(currentStars)
    const energyData = calculateEnergyDataPoint(
      updatedStars,
      useSimulationStore.getState().time + 0.01
    )
    updatePhysics(updatedStars, energyData)
  })

  const hoveredStar = stars.find((s) => s.id === hoveredStarId)

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#6666ff" />

      <BackgroundStars count={300} />

      {stars.map((star) => (
        <StarMesh key={star.id} star={star} onHover={onHoverStar} />
      ))}

      {stars.map((star) => (
        <TrailLine key={`trail-${star.id}`} star={star} />
      ))}

      {hoveredStar && <HoverInfo star={hoveredStar} />}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={100}
        enablePan
        panSpeed={1}
        rotateSpeed={0.5}
      />
    </>
  )
}

interface SceneRendererProps {}

export const SceneRenderer: React.FC<SceneRendererProps> = () => {
  const stars = useSimulationStore((state) => state.stars)
  const hoveredStarId = useSimulationStore((state) => state.hoveredStarId)
  const setHoveredStarId = useSimulationStore((state) => state.setHoveredStarId)

  return (
    <Canvas
      camera={{ position: [0, 0, 50], fov: 60 }}
      style={{ background: 'transparent' }}
      gl={{ antialias: true }}
    >
      <SceneContent
        stars={stars}
        hoveredStarId={hoveredStarId}
        onHoverStar={setHoveredStarId}
      />
    </Canvas>
  )
}
