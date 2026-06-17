import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ColorTheme, THEMES } from './types'

interface ParticleHaloProps {
  highEnergy: number
  theme: ColorTheme
  sensitivity: number
  particleCount: number
}

export const ParticleHalo: React.FC<ParticleHaloProps> = ({
  highEnergy, theme, sensitivity, particleCount
}) => {
  const pointsRef = useRef<THREE.Points>(null)
  const colors = THEMES[theme]

  const { positions, baseRadii, phases } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const baseRadii = new Float32Array(particleCount)
    const phases = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const tilt = (Math.random() - 0.5) * Math.PI * 0.4
      const radius = 5 + Math.random() * 3

      baseRadii[i] = radius
      phases[i] = Math.random() * Math.PI * 2

      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = Math.sin(tilt) * radius * 0.5
      positions[i * 3 + 2] = Math.sin(angle) * radius
    }
    return { positions, baseRadii, phases }
  }, [particleCount])

  const particleColor = useMemo(() => new THREE.Color(colors.accent), [colors.accent])

  useFrame((state) => {
    if (!pointsRef.current) return
    const geometry = pointsRef.current.geometry
    const posArray = geometry.attributes.position.array as Float32Array
    const time = state.clock.elapsedTime

    const dynamicRadius = highEnergy * 2.5 * sensitivity
    const opacity = 0.3 + highEnergy * 0.7 * sensitivity

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      const baseR = baseRadii[i]
      const phase = phases[i]
      const pulse = Math.sin(time * 1.5 + phase) * 0.3
      const newRadius = baseR + dynamicRadius * (0.5 + pulse)

      const angle = (i / particleCount) * Math.PI * 2 + time * 0.15 + phase * 0.5
      const tiltAngle = Math.sin(time * 0.4 + phase) * 0.3

      posArray[i3] = Math.cos(angle) * newRadius
      posArray[i3 + 1] = Math.sin(tiltAngle) * newRadius * 0.6 + Math.sin(time * 0.7 + phase) * 0.3
      posArray[i3 + 2] = Math.sin(angle) * newRadius
    }
    geometry.attributes.position.needsUpdate = true

    const material = pointsRef.current.material as THREE.PointsMaterial
    material.opacity = Math.min(1, opacity)
    material.size = 0.06 + highEnergy * 0.08 * sensitivity
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color={particleColor}
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
