import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ColorTheme, THEMES } from './types'

interface WaveColumnsProps {
  midEnergy: number
  rawFrequencyData: Uint8Array
  theme: ColorTheme
  sensitivity: number
  columnCount?: number
}

export const WaveColumns: React.FC<WaveColumnsProps> = ({
  midEnergy, rawFrequencyData, theme, sensitivity, columnCount = 50
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const meshRefs = useRef<THREE.Mesh[]>([])
  const colors = THEMES[theme]

  const columnPositions = useMemo(() => {
    const positions: THREE.Vector3[] = []
    const radius = 3.2
    for (let i = 0; i < columnCount; i++) {
      const angle = (i / columnCount) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      positions.push(new THREE.Vector3(x, 0, z))
    }
    return positions
  }, [columnCount])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += delta * 0.08

    const dataLength = rawFrequencyData.length
    for (let i = 0; i < columnCount; i++) {
      const mesh = meshRefs.current[i]
      if (!mesh) continue

      const dataIndex = Math.floor((i / columnCount) * dataLength * 0.5) + Math.floor(dataLength * 0.1)
      const freqValue = rawFrequencyData[dataIndex] / 255
      const baseHeight = 0.15
      const dynamicHeight = freqValue * 2.5 * sensitivity + midEnergy * 1.2 * sensitivity
      const height = baseHeight + dynamicHeight

      mesh.scale.y = Math.max(0.1, height)
      mesh.position.y = height / 2

      const material = mesh.material as THREE.MeshStandardMaterial
      const brightness = 0.2 + freqValue * 0.8
      material.emissiveIntensity = 0.3 + freqValue * 2.5 * sensitivity
      material.color.setHSL(
        new THREE.Color(colors.primary).getHSL({ h: 0, s: 0, l: 0 }).h,
        new THREE.Color(colors.primary).getHSL({ h: 0, s: 0, l: 0 }).s,
        Math.min(1, 0.3 + brightness * 0.7)
      )
    }
  })

  return (
    <group ref={groupRef}>
      {columnPositions.map((pos, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) meshRefs.current[i] = el }}
          position={[pos.x, pos.y, pos.z]}
          rotation={[0, -Math.atan2(pos.x, pos.z) + Math.PI / 2, 0]}
        >
          <boxGeometry args={[0.12, 1, 0.12]} />
          <meshStandardMaterial
            color={colors.secondary}
            emissive={colors.accent}
            emissiveIntensity={0.3}
            metalness={0.6}
            roughness={0.3}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  )
}
