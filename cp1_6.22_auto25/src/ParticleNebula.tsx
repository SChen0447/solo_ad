import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleNebulaProps {
  gestureValue: number
  particleCount?: number
}

export default function ParticleNebula({ 
  gestureValue, 
  particleCount = 6500 
}: ParticleNebulaProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const sizesRef = useRef<Float32Array | null>(null)
  const basePositionsRef = useRef<Float32Array | null>(null)
  const timeRef = useRef(0)
  const currentRadiusRef = useRef(8)
  const currentRotationSpeedRef = useRef(0.03)
  const currentSizeRef = useRef(0.2)

  const { positions, colors, baseSizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const baseSizes = new Float32Array(particleCount)

    const innerColor = new THREE.Color('#0a1a3a')
    const outerColor = new THREE.Color('#8a2be2')

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3

      const radius = 8 * Math.cbrt(Math.random())
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta)
      const z = radius * Math.cos(phi)

      positions[i3] = x
      positions[i3 + 1] = y
      positions[i3 + 2] = z

      const distanceRatio = radius / 8
      const color = new THREE.Color().lerpColors(innerColor, outerColor, distanceRatio)
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b

      baseSizes[i] = 0.8 + Math.random() * 0.4
    }

    return { positions, colors, baseSizes }
  }, [particleCount])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [positions, colors])

  useFrame((_, delta) => {
    if (!pointsRef.current) return

    timeRef.current += delta

    const targetRadius = 4 + gestureValue * 8
    const targetRotationSpeed = 0.01 + gestureValue * 0.04
    const targetSize = 0.1 + gestureValue * 0.2

    currentRadiusRef.current += (targetRadius - currentRadiusRef.current) * 0.05
    currentRotationSpeedRef.current += (targetRotationSpeed - currentRotationSpeedRef.current) * 0.05
    currentSizeRef.current += (targetSize - currentSizeRef.current) * 0.05

    const positionsAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const posArray = positionsAttr.array as Float32Array

    if (!basePositionsRef.current) {
      basePositionsRef.current = new Float32Array(posArray)
    }

    const basePos = basePositionsRef.current
    const rotationAngle = currentRotationSpeedRef.current * delta

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      
      const bx = basePos[i3]
      const by = basePos[i3 + 1]
      const bz = basePos[i3 + 2]

      const scale = currentRadiusRef.current / 8

      const cosR = Math.cos(rotationAngle)
      const sinR = Math.sin(rotationAngle)

      const rx = bx * cosR - bz * sinR
      const rz = bx * sinR + bz * cosR

      const wobble = Math.sin(timeRef.current * 2 + i * 0.01) * 0.02
      
      posArray[i3] = rx * scale + rx * wobble
      posArray[i3 + 1] = by * scale + by * wobble
      posArray[i3 + 2] = rz * scale + rz * wobble
    }

    positionsAttr.needsUpdate = true

    const material = pointsRef.current.material as THREE.PointsMaterial
    if (sizesRef.current === null) {
      sizesRef.current = new Float32Array(particleCount)
    }
    
    const flickerSpeed = 2 + gestureValue * 3
    for (let i = 0; i < particleCount; i++) {
      const flicker = 1 + Math.sin(timeRef.current * flickerSpeed + i * 0.5) * 0.2
      sizesRef.current[i] = currentSizeRef.current * baseSizes[i] * flicker
    }
    
    material.size = currentSizeRef.current
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.2}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
