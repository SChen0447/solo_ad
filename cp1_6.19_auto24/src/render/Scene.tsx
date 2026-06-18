import React, { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import GridColumn from './GridColumn'
import type { ProcessedCell } from '../types'
import { useStore } from '../store'

interface SceneContentProps {
  cells: ProcessedCell[]
}

const SceneContent: React.FC<SceneContentProps> = ({ cells }) => {
  const groupRef = useRef<THREE.Group>(null)
  const cameraOffset = useStore((s) => s.cameraOffset)

  const cellSize = 1

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.x = cameraOffset.x
      groupRef.current.position.z = cameraOffset.z
    }
  })

  const bounds = useMemo(() => {
    if (cells.length === 0) return { minX: 0, maxX: 20, minZ: 0, maxZ: 20 }
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    cells.forEach((cell) => {
      minX = Math.min(minX, cell.x)
      maxX = Math.max(maxX, cell.x)
      minZ = Math.min(minZ, cell.y)
      maxZ = Math.max(maxZ, cell.y)
    })
    return {
      minX: minX * cellSize,
      maxX: (maxX + 1) * cellSize,
      minZ: minZ * cellSize,
      maxZ: (maxZ + 1) * cellSize
    }
  }, [cells])

  const gridSize = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) + 4
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerZ = (bounds.minZ + bounds.maxZ) / 2
  const divisions = Math.ceil(gridSize)

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[20, 40, 20]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight
        position={[-15, 25, -15]}
        intensity={0.3}
        color={'#6699ff'}
      />
      <pointLight position={[centerX, 15, centerZ]} intensity={0.4} color={'#ffaa66'} />

      <group ref={groupRef}>
        <gridHelper
          args={[gridSize, divisions, '#888888', '#888888']}
          position={[centerX, 0, centerZ]}
        >
          <meshBasicMaterial
            attach="material"
            color="#888888"
            transparent
            opacity={0.1}
          />
        </gridHelper>

        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[centerX, -0.01, centerZ]}
        >
          <planeGeometry args={[gridSize, gridSize]} />
          <meshStandardMaterial
            color="#0d0d15"
            metalness={0.2}
            roughness={0.9}
          />
        </mesh>

        {cells.map((cell) => (
          <GridColumn key={cell.index} cell={cell} cellSize={cellSize} />
        ))}
      </group>

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        minDistance={5}
        maxDistance={50}
        makeDefault
        enablePan={false}
        target={[centerX + cameraOffset.x, 2, centerZ + cameraOffset.z]}
      />
    </>
  )
}

const KeyboardHandler: React.FC = () => {
  const moveCamera = useStore((s) => s.moveCamera)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      switch (key) {
        case 'w':
          moveCamera(0, -2)
          break
        case 's':
          moveCamera(0, 2)
          break
        case 'a':
          moveCamera(-2, 0)
          break
        case 'd':
          moveCamera(2, 0)
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [moveCamera])

  return null
}

interface SceneProps {
  cells: ProcessedCell[]
}

const Scene: React.FC<SceneProps> = ({ cells }) => {
  return (
    <>
      <Canvas
        camera={{ position: [25, 25, 25], fov: 50 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        frameloop="always"
        style={{ background: '#0a0a0f' }}
        onPointerMissed={() => useStore.getState().setSelectedCell(null)}
      >
        <fog attach="fog" args={['#0a0a0f', 40, 80]} />
        <color attach="background" args={['#0a0a0f']} />
        <SceneContent cells={cells} />
        <KeyboardHandler />
        {/* <Stats /> */}
      </Canvas>
    </>
  )
}

export default Scene
