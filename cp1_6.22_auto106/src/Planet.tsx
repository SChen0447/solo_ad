import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PlanetData } from './data/planets'

interface PlanetProps {
  data: PlanetData
  position: [number, number, number]
  onClick: (data: PlanetData) => void
  speedMultiplier: number
}

export default function Planet({ data, position, onClick, speedMultiplier }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [pulsing, setPulsing] = useState(false)
  const pulseRef = useRef(0)

  const glowTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    gradient.addColorStop(0, data.color + 'aa')
    gradient.addColorStop(0.3, data.color + '44')
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)
    const texture = new THREE.CanvasTexture(canvas)
    return texture
  }, [data.color])

  const ringGeometry = useMemo(() => {
    if (!data.hasRings) return null
    const innerRadius = data.size * 1.4
    const outerRadius = data.size * 2.2
    const segments = 64
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, segments)
    return geometry
  }, [data.hasRings, data.size])

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5
    }

    if (pulsing) {
      pulseRef.current += delta * 4
      const t = pulseRef.current
      const scale = 1 + Math.sin(t) * 0.2 * Math.exp(-t * 2)
      if (meshRef.current) {
        meshRef.current.scale.setScalar(scale)
      }
      if (t > Math.PI) {
        setPulsing(false)
        pulseRef.current = 0
        if (meshRef.current) {
          meshRef.current.scale.setScalar(1)
        }
      }
    }
  })

  const handleClick = (e: any) => {
    e.stopPropagation()
    setPulsing(true)
    pulseRef.current = 0
    onClick(data)
  }

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default'
        }}
      >
        <sphereGeometry args={[data.size, 32, 32]} />
        <meshStandardMaterial
          color={data.color}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      <sprite scale={[data.size * 4, data.size * 4, 1]}>
        <spriteMaterial
          map={glowTexture}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {ringGeometry && (
        <mesh rotation={[Math.PI / 2.5, 0, 0]}>
          <primitive object={ringGeometry} attach="geometry" />
          <meshBasicMaterial
            color={data.color}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  )
}
