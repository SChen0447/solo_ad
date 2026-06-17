import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ColorTheme, THEMES } from './types'

interface CentralSphereProps {
  lowEnergy: number
  theme: ColorTheme
  sensitivity: number
}

export const CentralSphere: React.FC<CentralSphereProps> = ({ lowEnergy, theme, sensitivity }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const colors = THEMES[theme]

  useFrame((_, delta) => {
    if (!meshRef.current || !glowRef.current) return
    const scale = 1 + lowEnergy * 1.8 * sensitivity
    meshRef.current.scale.setScalar(scale)
    glowRef.current.scale.setScalar(scale * 1.3)

    const material = meshRef.current.material as THREE.MeshStandardMaterial
    material.emissiveIntensity = 0.4 + lowEnergy * 3 * sensitivity

    const glowMaterial = glowRef.current.material as THREE.MeshBasicMaterial
    glowMaterial.opacity = 0.08 + lowEnergy * 0.4 * sensitivity

    meshRef.current.rotation.y += delta * 0.15
    meshRef.current.rotation.x += delta * 0.08
  })

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.2, 3]} />
        <meshStandardMaterial
          color={colors.primary}
          emissive={colors.glow}
          emissiveIntensity={0.4}
          metalness={0.8}
          roughness={0.15}
          wireframe={false}
          flatShading
        />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.4, 32, 32]} />
        <meshBasicMaterial
          color={colors.accent}
          transparent
          opacity={0.1}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
