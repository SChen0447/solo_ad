import { useMemo } from 'react'
import * as THREE from 'three'

interface BuildingGridProps {
  density: number
  heightVariation: number
}

interface BuildingData {
  position: [number, number, number]
  size: [number, number, number]
  color: THREE.Color
}

export default function BuildingGrid({ density, heightVariation }: BuildingGridProps) {
  const buildings = useMemo((): BuildingData[] => {
    const gridSize = Math.min(10, Math.max(1, Math.round(density)))
    const spacing = 10 / gridSize
    const halfGrid = (gridSize - 1) * spacing / 2
    const baseHeight = 0.5
    const maxHeight = 4.0
    const buildingSize = spacing * 0.7

    const result: BuildingData[] = []
    const baseColor = new THREE.Color('#D3D3D3')
    const targetColor = new THREE.Color('#A9A9A9')

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const randomFactor = Math.random()
        const height = baseHeight + randomFactor * (maxHeight - baseHeight) * heightVariation
        const x = i * spacing - halfGrid
        const z = j * spacing - halfGrid
        const colorMix = Math.random()
        const color = baseColor.clone().lerp(targetColor, colorMix)

        result.push({
          position: [x, height / 2, z],
          size: [buildingSize, height, buildingSize],
          color
        })
      }
    }

    return result
  }, [density, heightVariation])

  return (
    <group>
      {buildings.map((building, index) => (
        <mesh
          key={index}
          position={building.position}
          castShadow
          receiveShadow
        >
          <boxGeometry args={building.size} />
          <meshStandardMaterial color={building.color} roughness={0.7} metalness={0.3} />
        </mesh>
      ))}
    </group>
  )
}
