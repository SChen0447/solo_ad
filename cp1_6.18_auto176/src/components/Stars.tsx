import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Stars() {
  const pointsRef = useRef<THREE.Points>(null)
  const starCount = 200

  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(starCount * 3)
    const sizes = new Float32Array(starCount)

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 50
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      sizes[i] = 0.05 + Math.random() * 0.1
    }

    return { positions, sizes }
  }, [])

  useFrame((state) => {
    if (pointsRef.current) {
      const geometry = pointsRef.current.geometry
      const attributes = geometry.attributes
      const sizeAttr = attributes.size as THREE.BufferAttribute
      const time = state.clock.elapsedTime

      for (let i = 0; i < starCount; i++) {
        const twinkle = 0.5 + Math.sin(time * 2 + i * 0.5) * 0.5
        sizeAttr.setX(i, sizes[i] * (0.5 + twinkle * 0.5))
      }
      sizeAttr.needsUpdate = true
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={starCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={starCount}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color={0xffffff}
        transparent={true}
        opacity={0.8}
        sizeAttenuation={true}
      />
    </points>
  )
}
