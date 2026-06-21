import { useRef, useEffect, useMemo } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { Building, ViewPreset } from '@/types'
import { SunLight } from './SunLight'
import { BuildingMesh } from './BuildingMesh'
import { snapToGrid } from '@/utils/sunPosition'

interface GroundProps {
  onGroundClick: (point: THREE.Vector3) => void
  onBackgroundClick: () => void
}

function Ground({ onGroundClick, onBackgroundClick }: GroundProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const handleClick = (e: any) => {
    e.stopPropagation()
    onGroundClick(e.point)
  }

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      onClick={handleClick}
    >
      <planeGeometry args={[100, 100]} />
      <shadowMaterial transparent opacity={0.4} />
    </mesh>
  )
}

interface CameraControllerProps {
  viewPreset: ViewPreset
  controlsRef: React.MutableRefObject<any>
}

function CameraController({ viewPreset, controlsRef }: CameraControllerProps) {
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3())
  const targetTarget = useRef(new THREE.Vector3())

  useEffect(() => {
    switch (viewPreset) {
      case 'top':
        targetPos.current.set(0, 40, 0.01)
        targetTarget.current.set(0, 0, 0)
        break
      case 'side':
        targetPos.current.set(25, 25, 25)
        targetTarget.current.set(0, 0, 0)
        break
      case 'orbit':
        targetPos.current.set(30, 15, 30)
        targetTarget.current.set(0, 0, 0)
        break
    }
  }, [viewPreset])

  useFrame((_state, delta) => {
    camera.position.lerp(targetPos.current, delta * 3)
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetTarget.current, delta * 3)
      controlsRef.current.update()
    }
  })

  return null
}

interface SceneContentProps {
  buildings: Building[]
  selectedBuildingId: string | null
  dayOfYear: number
  hourOfDay: number
  viewPreset: ViewPreset
  shadowMapSize: number
  onSelectBuilding: (id: string | null) => void
  onUpdateBuilding: (building: Building) => void
  onAddBuilding: (position: { x: number; z: number }) => void
}

function SceneContent({
  buildings,
  selectedBuildingId,
  dayOfYear,
  hourOfDay,
  viewPreset,
  shadowMapSize,
  onSelectBuilding,
  onUpdateBuilding,
  onAddBuilding,
}: SceneContentProps) {
  const controlsRef = useRef<any>(null)

  const handleGroundClick = (point: THREE.Vector3) => {
    const x = snapToGrid(point.x, 2)
    const z = snapToGrid(point.z, 2)
    if (buildings.length < 10) {
      onAddBuilding({ x, z })
    }
    onSelectBuilding(null)
  }

  const handleBackgroundClick = () => {
    onSelectBuilding(null)
  }

  return (
    <>
      <CameraController viewPreset={viewPreset} controlsRef={controlsRef} />
      
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        enablePan={true}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
      />

      <ambientLight intensity={0.4} color="#8899AA" />
      <hemisphereLight args={['#8899AA', '#2A2A3A', 0.3]} />

      <SunLight dayOfYear={dayOfYear} hourOfDay={hourOfDay} shadowMapSize={shadowMapSize} />

      <Grid
        position={[0, 0.01, 0]}
        args={[100, 100]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#4A5568"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#2D3748"
        fadeDistance={50}
        fadeStrength={1}
        infiniteGrid
      />

      <Ground onGroundClick={handleGroundClick} onBackgroundClick={handleBackgroundClick} />

      {buildings.map(building => (
        <BuildingMesh
          key={building.id}
          building={building}
          isSelected={selectedBuildingId === building.id}
          onSelect={onSelectBuilding}
          onUpdate={onUpdateBuilding}
        />
      ))}
    </>
  )
}

interface SceneProps {
  buildings: Building[]
  selectedBuildingId: string | null
  dayOfYear: number
  hourOfDay: number
  viewPreset: ViewPreset
  shadowMapSize: number
  onSelectBuilding: (id: string | null) => void
  onUpdateBuilding: (building: Building) => void
  onAddBuilding: (position: { x: number; z: number }) => void
}

export function Scene({
  buildings,
  selectedBuildingId,
  dayOfYear,
  hourOfDay,
  viewPreset,
  shadowMapSize,
  onSelectBuilding,
  onUpdateBuilding,
  onAddBuilding,
}: SceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [30, 20, 30], fov: 50 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor('#1A202C')
        gl.shadowMap.enabled = true
        gl.shadowMap.type = THREE.PCFSoftShadowMap
        scene.fog = new THREE.Fog('#1A202C', 50, 100)
      }}
    >
      <SceneContent
        buildings={buildings}
        selectedBuildingId={selectedBuildingId}
        dayOfYear={dayOfYear}
        hourOfDay={hourOfDay}
        viewPreset={viewPreset}
        shadowMapSize={shadowMapSize}
        onSelectBuilding={onSelectBuilding}
        onUpdateBuilding={onUpdateBuilding}
        onAddBuilding={onAddBuilding}
      />
    </Canvas>
  )
}
