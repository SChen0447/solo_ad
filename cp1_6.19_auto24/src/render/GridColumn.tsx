import React, { useRef } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { ProcessedCell } from '../types'
import { useStore } from '../store'

interface GridColumnProps {
  cell: ProcessedCell
  cellSize: number
}

export const GridColumn: React.FC<GridColumnProps> = ({ cell, cellSize }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const edgesRef = useRef<THREE.LineSegments>(null)
  const selectedCellIndex = useStore((s) => s.selectedCellIndex)
  const setSelectedCell = useStore((s) => s.setSelectedCell)
  const isSelected = selectedCellIndex === cell.index

  const color = `rgb(${cell.color[0]}, ${cell.color[1]}, ${cell.color[2]})`

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (selectedCellIndex === cell.index) {
      setSelectedCell(null)
    } else {
      setSelectedCell(cell.index)
    }
  }

  useFrame(() => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial
      if (mat.color.getStyle() !== color) {
        mat.color.set(color)
      }
      if (meshRef.current.scale.y !== cell.heightScale) {
        meshRef.current.scale.y = cell.heightScale
      }
      if (meshRef.current.position.y !== cell.heightScale / 2) {
        meshRef.current.position.y = cell.heightScale / 2
      }
    }
  })

  const edgeColor = isSelected ? '#ffff00' : '#1a1a2e'
  const edgeOpacity = isSelected ? 1 : 0.3

  return (
    <group position={[cell.x * cellSize, 0, cell.y * cellSize]}>
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
        position={[cellSize / 2, cell.heightScale / 2, cellSize / 2]}
        scale={[cellSize * 0.92, cell.heightScale, cellSize * 0.92]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.9}
          metalness={0.1}
          roughness={0.6}
          emissive={color}
          emissiveIntensity={0.1}
        />
      </mesh>
      {isSelected && (
        <lineSegments
          ref={edgesRef}
          position={[cellSize / 2, cell.heightScale / 2, cellSize / 2]}
          scale={[cellSize * 0.92, cell.heightScale, cellSize * 0.92]}
        >
          <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
          <lineBasicMaterial
            color={edgeColor}
            transparent
            opacity={edgeOpacity}
            linewidth={2}
          />
        </lineSegments>
      )}
    </group>
  )
}

export default GridColumn
