import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Line } from '@react-three/drei'
import * as THREE from 'three'
import Terrain from './terrain'
import ParticleSystems from './particles'
import Controls from './controls'
import { useWeatherStore } from './store'

function LightningBolt({
  start,
  end,
  segments = 5,
}: {
  start: [number, number, number]
  end: [number, number, number]
  segments?: number
}) {
  const ref = useRef<THREE.Line>(null)
  const startTimeRef = useRef(performance.now())

  const points = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = []
    const startVec = new THREE.Vector3(...start)
    const endVec = new THREE.Vector3(...end)
    const direction = endVec.clone().sub(startVec)
    const length = direction.length()

    pts.push([startVec.x, startVec.y, startVec.z])

    for (let i = 1; i < segments; i++) {
      const t = i / segments
      const basePoint = startVec.clone().add(direction.clone().multiplyScalar(t))
      const offsetDir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(length * 0.08 * (1 - Math.abs(t - 0.5) * 1.5))
      basePoint.add(offsetDir)
      pts.push([basePoint.x, basePoint.y, basePoint.z])
    }

    pts.push([endVec.x, endVec.y, endVec.z])
    return pts
  }, [start, end, segments])

  useFrame(() => {
    if (!ref.current) return
    const elapsed = performance.now() - startTimeRef.current
    const material = ref.current.material as THREE.LineBasicMaterial
    material.opacity = Math.max(0, 1 - elapsed / 300)
  })

  return (
    <Line
      ref={ref as any}
      points={points}
      color="#ffffff"
      lineWidth={2}
      transparent
      opacity={1}
      blending={THREE.AdditiveBlending}
    />
  )
}

function LightningEffect({
  position,
  timestamp,
}: {
  position: [number, number, number]
  timestamp: number
}) {
  const cloudTop: [number, number, number] = [
    position[0] + (Math.random() - 0.5) * 5,
    position[1] + 30 + Math.random() * 10,
    position[2] + (Math.random() - 0.5) * 5,
  ]

  const branches = useMemo(() => {
    const result: { start: [number, number, number]; end: [number, number, number] }[] = []
    const mid1: [number, number, number] = [
      position[0] + (Math.random() - 0.5) * 4,
      position[1] + 20,
      position[2] + (Math.random() - 0.5) * 4,
    ]
    const mid2: [number, number, number] = [
      position[0] + (Math.random() - 0.5) * 3,
      position[1] + 12,
      position[2] + (Math.random() - 0.5) * 3,
    ]
    result.push({ start: cloudTop, end: mid1 })
    result.push({ start: mid1, end: mid2 })
    result.push({ start: mid2, end: position })

    if (Math.random() > 0.4) {
      const branchEnd: [number, number, number] = [
        mid1[0] + (Math.random() - 0.5) * 8,
        mid1[1] - 3 + Math.random() * 3,
        mid1[2] + (Math.random() - 0.5) * 8,
      ]
      result.push({ start: mid1, end: branchEnd })
    }

    return result
  }, [position, cloudTop])

  const lightRef = useRef<THREE.PointLight>(null)

  useFrame(() => {
    if (!lightRef.current) return
    const elapsed = performance.now() - timestamp
    const t = elapsed / 300
    lightRef.current.intensity = Math.max(0, (1 - t) * 8) * (Math.random() > 0.3 ? 1 : 0.4)
  })

  return (
    <group>
      <pointLight
        ref={lightRef}
        position={[position[0], position[1] + 15, position[2]]}
        color="#ccddff"
        intensity={8}
        distance={80}
        decay={2}
      />
      {branches.map((b, i) => (
        <LightningBolt key={i} start={b.start} end={b.end} segments={5} />
      ))}
    </group>
  )
}

function Shockwave({
  position,
  timestamp,
}: {
  position: [number, number, number]
  timestamp: number
}) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (!ref.current) return
    const elapsed = performance.now() - timestamp
    const t = elapsed / 1000
    const scale = 1 + t * 20
    ref.current.scale.set(scale, scale, scale)
    const material = ref.current.material as THREE.MeshBasicMaterial
    material.opacity = Math.max(0, 0.8 * (1 - t))
  })

  return (
    <mesh ref={ref} position={[position[0], position[1] + 0.1, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.8, 1, 64]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

function EffectsLayer() {
  const lightningEffects = useWeatherStore((s) => s.lightningEffects)
  const shockwaveEffects = useWeatherStore((s) => s.shockwaveEffects)
  const cleanupEffects = useWeatherStore((s) => s.cleanupEffects)

  useFrame(() => {
    cleanupEffects()
  })

  return (
    <group>
      {lightningEffects.map((e) => (
        <LightningEffect key={e.id} position={e.position} timestamp={e.timestamp} />
      ))}
      {shockwaveEffects.map((e) => (
        <Shockwave key={e.id} position={e.position} timestamp={e.timestamp} />
      ))}
    </group>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.35} color="#aaccff" />
      <directionalLight
        position={[40, 60, 30]}
        intensity={0.8}
        color="#ffeedd"
        castShadow
      />
      <hemisphereLight args={['#88aadd', '#223344', 0.4]} />
      <fog attach="fog" args={['#0f1a2a', 40, 150]} />
      <Stars radius={300} depth={60} count={3000} factor={4} fade speed={0.5} />
      <Terrain />
      <ParticleSystems />
      <EffectsLayer />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={15}
        maxDistance={120}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.05}
        enablePan={false}
        target={[0, 2, 0]}
      />
    </>
  )
}

export default function App() {
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    let rafId: number

    const measure = () => {
      frameCount++
      const now = performance.now()
      if (now - lastTime >= 2000) {
        const fps = (frameCount * 1000) / (now - lastTime)
        if (fps < 55) {
          console.warn(`帧率较低: ${fps.toFixed(1)} FPS`)
        }
        frameCount = 0
        lastTime = now
      }
      rafId = requestAnimationFrame(measure)
    }
    rafId = requestAnimationFrame(measure)

    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(180deg, #0a0a1a 0%, #1a2a3a 100%)',
        overflow: 'hidden',
      }}
    >
      <div
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
        }}
      >
        <Canvas
          camera={{ position: [50, 40, 50], fov: 55, near: 0.1, far: 500 }}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <color attach="background" args={['#0a1120']} />
          <Scene />
        </Canvas>
      </div>
      <Controls />
    </div>
  )
}
