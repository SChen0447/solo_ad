import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Building } from '@/types'
import { snapToGrid, clamp } from '@/utils/sunPosition'

interface BuildingMeshProps {
  building: Building
  isSelected: boolean
  onSelect: (id: string | null) => void
  onUpdate: (building: Building) => void
  gridSize?: number
}

type HandleAxis = 'x' | 'y' | 'z'
type HandleSide = 'positive' | 'negative'

interface HandleInfo {
  axis: HandleAxis
  side: HandleSide
  position: THREE.Vector3
}

export function BuildingMesh({
  building,
  isSelected,
  onSelect,
  onUpdate,
  gridSize = 2,
}: BuildingMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [activeHandle, setActiveHandle] = useState<HandleInfo | null>(null)
  const dragStart = useRef<{ point: THREE.Vector3; building: Building } | null>(null)
  const { camera, raycaster, pointer } = useThree()

  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])

  useEffect(() => {
    const handlePointerMove = () => {
      if (!isDragging && !activeHandle) return

      const ray = new THREE.Raycaster()
      const ndc = new THREE.Vector2(pointer.x, pointer.y)
      ray.setFromCamera(ndc, camera)

      if (isDragging && dragStart.current) {
        const intersect = new THREE.Vector3()
        if (ray.ray.intersectPlane(plane, intersect)) {
          const dx = intersect.x - dragStart.current.point.x
          const dz = intersect.z - dragStart.current.point.z

          const newX = snapToGrid(dragStart.current.building.position.x + dx, gridSize)
          const newZ = snapToGrid(dragStart.current.building.position.z + dz, gridSize)

          onUpdate({
            ...building,
            position: {
              x: clamp(newX, -30, 30),
              y: building.position.y,
              z: clamp(newZ, -30, 30),
            },
          })
        }
      }

      if (activeHandle && dragStart.current) {
        const worldPoint = new THREE.Vector3()
        if (ray.ray.intersectPlane(plane, worldPoint)) {
          const localPoint = worldPoint.clone()
          localPoint.sub(new THREE.Vector3(
            dragStart.current.building.position.x,
            0,
            dragStart.current.building.position.z
          ))

          let newSize = { ...dragStart.current.building.size }
          let newPosition = { ...dragStart.current.building.position }

          if (activeHandle.axis === 'x') {
            const sign = activeHandle.side === 'positive' ? 1 : -1
            let delta = (localPoint.x * sign - (dragStart.current.building.size.x / 2)) * sign
            delta = Math.round(delta / 0.5) * 0.5
            const newWidth = clamp(dragStart.current.building.size.x + delta * sign, 1, 10)
            const widthDiff = newWidth - dragStart.current.building.size.x
            newSize.x = newWidth
            newPosition.x = dragStart.current.building.position.x + (widthDiff / 2) * sign
          } else if (activeHandle.axis === 'z') {
            const sign = activeHandle.side === 'positive' ? 1 : -1
            let delta = (localPoint.z * sign - (dragStart.current.building.size.z / 2)) * sign
            delta = Math.round(delta / 0.5) * 0.5
            const newDepth = clamp(dragStart.current.building.size.z + delta * sign, 1, 10)
            const depthDiff = newDepth - dragStart.current.building.size.z
            newSize.z = newDepth
            newPosition.z = dragStart.current.building.position.z + (depthDiff / 2) * sign
          } else if (activeHandle.axis === 'y') {
            const sign = activeHandle.side === 'positive' ? 1 : -1
            let delta = (worldPoint.y - dragStart.current.building.size.y) * sign
            delta = Math.round(delta / 0.5) * 0.5
            const newHeight = clamp(dragStart.current.building.size.y + delta * sign, 1, 10)
            newSize.y = newHeight
            newPosition.y = newHeight / 2
          }

          onUpdate({
            ...building,
            size: newSize,
            position: newPosition,
          })
        }
      }
    }

    const handlePointerUp = () => {
      setIsDragging(false)
      setActiveHandle(null)
      dragStart.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, activeHandle, building, camera, pointer, raycaster, plane, onUpdate, gridSize])

  const handlePointerDown = (e: any) => {
    e.stopPropagation()
    onSelect(building.id)
    if (e.button !== 2) {
      setIsDragging(true)
      dragStart.current = {
        point: e.point.clone(),
        building: { ...building },
      }
    }
  }

  const handleHandlePointerDown = (e: any, axis: HandleAxis, side: HandleSide) => {
    e.stopPropagation()
    setActiveHandle({ axis, side, position: new THREE.Vector3() })
    setIsDragging(false)
    dragStart.current = {
      point: e.point.clone(),
      building: { ...building },
    }
  }

  const handles = useMemo(() => {
    if (!isSelected) return []

    const { size } = building
    const halfW = size.x / 2
    const halfD = size.z / 2
    const height = size.y

    return [
      { axis: 'x' as HandleAxis, side: 'positive' as HandleSide, pos: [halfW + 0.25, height / 2, 0] },
      { axis: 'x' as HandleAxis, side: 'negative' as HandleSide, pos: [-halfW - 0.25, height / 2, 0] },
      { axis: 'z' as HandleAxis, side: 'positive' as HandleSide, pos: [0, height / 2, halfD + 0.25] },
      { axis: 'z' as HandleAxis, side: 'negative' as HandleSide, pos: [0, height / 2, -halfD - 0.25] },
      { axis: 'y' as HandleAxis, side: 'positive' as HandleSide, pos: [0, height + 0.25, 0] },
    ]
  }, [building, isSelected])

  return (
    <group position={[building.position.x, building.position.y, building.position.z]}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerDown={handlePointerDown}
      >
        <boxGeometry args={[building.size.x, building.size.y, building.size.z]} />
        <meshStandardMaterial
          color={building.color}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {isSelected && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(building.size.x, building.size.y, building.size.z)]} />
          <lineBasicMaterial color="#3B82F6" linewidth={2} />
        </lineSegments>
      )}

      {handles.map((handle, idx) => (
        <mesh
          key={idx}
          position={handle.pos as [number, number, number]}
          onPointerDown={(e) => handleHandlePointerDown(e, handle.axis, handle.side)}
        >
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="#3B82F6" />
        </mesh>
      ))}
    </group>
  )
}
