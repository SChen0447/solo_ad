import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useAppStore } from './state'
import {
  FURNITURE_TEMPLATES,
  GRID_SIZE,
  CAMERA_MIN_DISTANCE,
  CAMERA_MAX_DISTANCE,
  COLORS,
  FurnitureType,
} from './types'

interface FurnitureMeshProps {
  type: FurnitureType
  color: string
  position: [number, number, number]
  rotation: number
  scale: number
  selected: boolean
  id: string
  onSelect: (id: string) => void
  onDrag: (id: string, position: [number, number, number]) => void
  onDragEnd: () => void
}

function FurnitureMesh({
  type,
  color,
  position,
  rotation,
  scale,
  selected,
  id,
  onSelect,
  onDrag,
  onDragEnd,
}: FurnitureMeshProps) {
  const meshRef = useRef<THREE.Group>(null)
  const [isDragging, setIsDragging] = useState(false)
  const { camera, raycaster, gl } = useThree()
  const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const dragOffset = useRef(new THREE.Vector3())
  const snapToGrid = useAppStore((state) => state.snapToGrid)
  const template = FURNITURE_TEMPLATES[type]

  const handlePointerDown = useCallback(
    (e: any) => {
      e.stopPropagation()
      onSelect(id)

      if (e.ctrlKey) {
        setIsDragging(true)
        e.target.setPointerCapture(e.pointerId)

        const intersectPoint = e.point.clone()
        const meshPos = new THREE.Vector3(...position)
        dragOffset.current.copy(intersectPoint).sub(meshPos)
        dragOffset.current.y = 0
      }
    },
    [id, onSelect, position]
  )

  const handlePointerMove = useCallback(
    (e: any) => {
      if (!isDragging) return
      e.stopPropagation()

      const mouse = new THREE.Vector2(
        (e.clientX / gl.domElement.clientWidth) * 2 - 1,
        -(e.clientY / gl.domElement.clientHeight) * 2 + 1
      )

      raycaster.setFromCamera(mouse, camera)
      const intersectPoint = new THREE.Vector3()
      raycaster.ray.intersectPlane(floorPlane, intersectPoint)

      if (intersectPoint) {
        const newPos: [number, number, number] = [
          intersectPoint.x - dragOffset.current.x,
          template.height / 2,
          intersectPoint.z - dragOffset.current.z,
        ]
        onDrag(id, newPos)
      }
    },
    [isDragging, camera, raycaster, gl, floorPlane, id, onDrag, template.height]
  )

  const handlePointerUp = useCallback(
    (e: any) => {
      if (!isDragging) return
      e.stopPropagation()
      setIsDragging(false)
      e.target.releasePointerCapture(e.pointerId)

      const snappedPos: [number, number, number] = [
        snapToGrid(position[0]),
        position[1],
        snapToGrid(position[2]),
      ]
      onDrag(id, snappedPos)
      onDragEnd()
    },
    [isDragging, id, position, snapToGrid, onDrag, onDragEnd]
  )

  const renderFurniture = () => {
    switch (type) {
      case 'sofa':
        return (
          <group>
            <mesh position={[0, 0.2, 0]} castShadow>
              <boxGeometry args={[template.width, 0.4, template.depth]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, 0.55, -template.depth / 2 + 0.1]} castShadow>
              <boxGeometry args={[template.width, 0.5, 0.2]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[-template.width / 2 + 0.1, 0.4, 0]} castShadow>
              <boxGeometry args={[0.2, 0.35, template.depth]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[template.width / 2 - 0.1, 0.4, 0]} castShadow>
              <boxGeometry args={[0.2, 0.35, template.depth]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        )
      case 'table':
        return (
          <group>
            <mesh position={[0, template.height - 0.05, 0]} castShadow>
              <boxGeometry args={[template.width, 0.08, template.depth]} />
              <meshStandardMaterial color={color} />
            </mesh>
            {[
              [-template.width / 2 + 0.05, -template.depth / 2 + 0.05],
              [template.width / 2 - 0.05, -template.depth / 2 + 0.05],
              [-template.width / 2 + 0.05, template.depth / 2 - 0.05],
              [template.width / 2 - 0.05, template.depth / 2 - 0.05],
            ].map(([x, z], i) => (
              <mesh key={i} position={[x, template.height / 2 - 0.05, z]} castShadow>
                <boxGeometry args={[0.06, template.height - 0.1, 0.06]} />
                <meshStandardMaterial color={color} />
              </mesh>
            ))}
          </group>
        )
      case 'chair':
        return (
          <group>
            <mesh position={[0, 0.45, 0]} castShadow>
              <boxGeometry args={[template.width, 0.08, template.depth]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, 0.7, -template.depth / 2 + 0.05]} castShadow>
              <boxGeometry args={[template.width, 0.5, 0.08]} />
              <meshStandardMaterial color={color} />
            </mesh>
            {[
              [-template.width / 2 + 0.03, -template.depth / 2 + 0.03],
              [template.width / 2 - 0.03, -template.depth / 2 + 0.03],
            ].map(([x, z], i) => (
              <mesh key={i} position={[x, 0.225, z]} castShadow>
                <boxGeometry args={[0.05, 0.45, 0.05]} />
                <meshStandardMaterial color={color} />
              </mesh>
            ))}
            <mesh position={[-template.width / 2 + 0.03, 0.225, template.depth / 2 - 0.03]} castShadow>
              <boxGeometry args={[0.05, 0.45, 0.05]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[template.width / 2 - 0.03, 0.225, template.depth / 2 - 0.03]} castShadow>
              <boxGeometry args={[0.05, 0.45, 0.05]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        )
      case 'cabinet':
        return (
          <group>
            <mesh position={[0, template.height / 2, 0]} castShadow>
              <boxGeometry args={[template.width, template.height, template.depth]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, template.height / 2, template.depth / 2 + 0.01]}>
              <boxGeometry args={[template.width - 0.05, template.height - 0.05, 0.02]} />
              <meshStandardMaterial color="#6B4423" />
            </mesh>
            <mesh position={[0.15, template.height / 2, template.depth / 2 + 0.03]}>
              <cylinderGeometry args={[0.02, 0.02, 0.04, 16]} />
              <meshStandardMaterial color="#gold" metalness={0.8} />
            </mesh>
          </group>
        )
      case 'bed':
        return (
          <group>
            <mesh position={[0, 0.15, 0]} castShadow>
              <boxGeometry args={[template.width, 0.3, template.depth]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, 0.35, 0]} castShadow>
              <boxGeometry args={[template.width - 0.1, 0.15, template.depth - 0.1]} />
              <meshStandardMaterial color="#f5f5dc" />
            </mesh>
            <mesh position={[0, 0.5, -template.depth / 2 + 0.15]} castShadow>
              <boxGeometry args={[template.width - 0.1, 0.4, 0.3]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        )
      case 'lamp':
        return (
          <group>
            <mesh position={[0, 0.05, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.18, 0.1, 32]} />
              <meshStandardMaterial color="#4a4a4a" metalness={0.5} />
            </mesh>
            <mesh position={[0, template.height / 2, 0]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, template.height - 0.3, 16]} />
              <meshStandardMaterial color="#4a4a4a" metalness={0.7} />
            </mesh>
            <mesh position={[0, template.height - 0.2, 0]} castShadow>
              <coneGeometry args={[0.2, 0.35, 32, 1, true]} />
              <meshStandardMaterial color={color} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )
      default:
        return null
    }
  }

  return (
    <group
      ref={meshRef}
      position={position}
      rotation={[0, rotation, 0]}
      scale={scale}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {renderFurniture()}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -template.height / 2 + 0.01, 0]} receiveShadow>
        <circleGeometry args={[Math.max(template.width, template.depth) / 2, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} />
      </mesh>

      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -template.height / 2 + 0.005, 0]}>
          <ringGeometry args={[Math.max(template.width, template.depth) / 2 + 0.1, Math.max(template.width, template.depth) / 2 + 0.15, 32]} />
          <meshBasicMaterial color="#d4a574" />
        </mesh>
      )}

      {isDragging && (
        <Html position={[0, template.height + 0.3, 0]} center distanceFactor={10}>
          <div className="coord-label">
            ({position[0].toFixed(2)}, {position[2].toFixed(2)})
          </div>
        </Html>
      )}
    </group>
  )
}

function RingMenu({ position, furnitureId }: { position: [number, number, number]; furnitureId: string }) {
  const { rotateFurniture, removeFurniture, nudgeFurniture } = useAppStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(false)
    const timer = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(timer)
  }, [furnitureId])

  const menuItems = [
    { icon: '↻', action: () => rotateFurniture(furnitureId, 1), position: [0, 0.8, 0] as [number, number, number] },
    { icon: '✕', action: () => removeFurniture(furnitureId), position: [0, -0.8, 0] as [number, number, number] },
    { icon: '←', action: () => nudgeFurniture(furnitureId, 'left'), position: [-0.8, 0, 0] as [number, number, number] },
    { icon: '→', action: () => nudgeFurniture(furnitureId, 'right'), position: [0.8, 0, 0] as [number, number, number] },
  ]

  return (
    <group position={position}>
      {menuItems.map((item, i) => (
        <Html
          key={i}
          position={item.position}
          center
          distanceFactor={5}
          style={{
            transform: visible ? 'scale(1)' : 'scale(0)',
            transition: 'transform 0.2s ease-in-out',
            transitionDelay: `${i * 0.03}s`,
          }}
        >
          <button
            className="ring-menu-btn"
            onClick={(e) => {
              e.stopPropagation()
              item.action()
            }}
          >
            {item.icon}
          </button>
        </Html>
      ))}
    </group>
  )
}

function RoomModel() {
  const room = useAppStore((state) => state.room)
  const halfW = room.width / 2
  const halfD = room.depth / 2
  const wallHeight = room.height

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[halfW, 0, halfD]} receiveShadow>
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial color={COLORS.floor} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[halfW, wallHeight, halfD]}>
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial color={COLORS.ceiling} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[halfW, wallHeight / 2, 0]}>
        <boxGeometry args={[room.width, wallHeight, 0.1]} />
        <meshStandardMaterial color={COLORS.wall} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[halfW, wallHeight / 2, room.depth]}>
        <boxGeometry args={[room.width, wallHeight, 0.1]} />
        <meshStandardMaterial color={COLORS.wall} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, wallHeight / 2, halfD]}>
        <boxGeometry args={[0.1, wallHeight, room.depth]} />
        <meshStandardMaterial color={COLORS.wall} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[room.width, wallHeight / 2, halfD]}>
        <boxGeometry args={[0.1, wallHeight, room.depth]} />
        <meshStandardMaterial color={COLORS.wall} side={THREE.DoubleSide} />
      </mesh>

      {room.doors.map((door, i) => (
        <mesh
          key={`door-${i}`}
          position={[door.position[0], door.height / 2, door.position[1]]}
          rotation={[0, door.rotation, 0]}
        >
          <boxGeometry args={[door.width, door.height, 0.08]} />
          <meshStandardMaterial color="#8B6914" />
        </mesh>
      ))}

      {room.windows.map((win, i) => (
        <mesh
          key={`window-${i}`}
          position={[win.position[0], win.yOffset + win.height / 2, win.position[1]]}
          rotation={[0, win.rotation, 0]}
        >
          <boxGeometry args={[win.width, win.height, 0.05]} />
          <meshStandardMaterial color="#87CEEB" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function GridFloor() {
  const room = useAppStore((state) => state.room)
  const halfW = room.width / 2
  const halfD = room.depth / 2

  return (
    <gridHelper
      args={[Math.max(room.width, room.depth) * 2, Math.max(room.width, room.depth) * 2 / GRID_SIZE, '#ffffff', '#ffffff']}
      position={[halfW, 0.001, halfD]}
    />
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <pointLight position={[0, 5, 0]} intensity={0.3} />
    </>
  )
}

function DragPreview() {
  const [dragType, setDragType] = useState<FurnitureType | null>(null)
  const [hoverPos, setHoverPos] = useState<[number, number, number] | null>(null)
  const { camera, raycaster, gl } = useThree()
  const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const snapToGrid = useAppStore((state) => state.snapToGrid)
  const addFurniture = useAppStore((state) => state.addFurniture)

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (!e.dataTransfer) return

      const type = e.dataTransfer.getData('furniture-type') as FurnitureType
      if (type) {
        setDragType(type)

        const rect = gl.domElement.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const mouse = new THREE.Vector2(
          (x / rect.width) * 2 - 1,
          -(y / rect.height) * 2 + 1
        )

        raycaster.setFromCamera(mouse, camera)
        const intersectPoint = new THREE.Vector3()
        raycaster.ray.intersectPlane(floorPlane, intersectPoint)

        if (intersectPoint) {
          setHoverPos([
            snapToGrid(intersectPoint.x),
            FURNITURE_TEMPLATES[type].height / 2,
            snapToGrid(intersectPoint.z),
          ])
        }
      }
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      if (!e.dataTransfer) return

      const type = e.dataTransfer.getData('furniture-type') as FurnitureType
      if (type && hoverPos) {
        addFurniture(type, hoverPos)
      }
      setDragType(null)
      setHoverPos(null)
    }

    const handleDragLeave = () => {
      setDragType(null)
      setHoverPos(null)
    }

    const canvas = gl.domElement
    canvas.addEventListener('dragover', handleDragOver)
    canvas.addEventListener('drop', handleDrop)
    canvas.addEventListener('dragleave', handleDragLeave)

    return () => {
      canvas.removeEventListener('dragover', handleDragOver)
      canvas.removeEventListener('drop', handleDrop)
      canvas.removeEventListener('dragleave', handleDragLeave)
    }
  }, [camera, raycaster, gl, floorPlane, snapToGrid, addFurniture, hoverPos])

  if (!dragType || !hoverPos) return null

  const template = FURNITURE_TEMPLATES[dragType]

  return (
    <group position={hoverPos}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[template.width, template.height, template.depth]} />
        <meshStandardMaterial color={template.color} transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

function CameraController() {
  const room = useAppStore((state) => state.room)
  const controlsRef = useRef<any>(null)
  const { camera } = useThree()

  useEffect(() => {
    const centerX = room.width / 2
    const centerZ = room.depth / 2
    const distance = Math.max(room.width, room.depth) * 1.2

    camera.position.set(centerX + distance, distance * 0.8, centerZ + distance)
    camera.lookAt(centerX, 0, centerZ)
  }, [room, camera])

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={CAMERA_MIN_DISTANCE}
      maxDistance={CAMERA_MAX_DISTANCE}
      maxPolarAngle={Math.PI / 2 - 0.1}
      minPolarAngle={0.2}
      rotateSpeed={0.2}
      panSpeed={1}
      zoomSpeed={0.8}
    />
  )
}

function SceneContent() {
  const room = useAppStore((state) => state.room)
  const furnitureList = useAppStore((state) => state.furnitureList)
  const selectedFurnitureId = useAppStore((state) => state.selectedFurnitureId)
  const selectFurniture = useAppStore((state) => state.selectFurniture)
  const moveFurniture = useAppStore((state) => state.moveFurniture)
  const calculateStats = useAppStore((state) => state.calculateStats)
  const setDragging = useAppStore((state) => state.setDragging)

  const handleDrag = useCallback(
    (id: string, position: [number, number, number]) => {
      moveFurniture(id, position)
    },
    [moveFurniture]
  )

  const handleDragEnd = useCallback(() => {
    setDragging(false)
    calculateStats()
  }, [setDragging, calculateStats])

  const handleCanvasClick = useCallback(() => {
    selectFurniture(null)
  }, [selectFurniture])

  const selectedFurniture = furnitureList.find((f) => f.id === selectedFurnitureId)

  return (
    <>
      <Lights />
      <CameraController />
      <RoomModel />
      <GridFloor />
      <DragPreview />

      {furnitureList.map((furniture) => (
        <FurnitureMesh
          key={furniture.id}
          id={furniture.id}
          type={furniture.type}
          color={FURNITURE_TEMPLATES[furniture.type].color}
          position={furniture.position}
          rotation={furniture.rotation}
          scale={furniture.scale}
          selected={furniture.id === selectedFurnitureId}
          onSelect={selectFurniture}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
        />
      ))}

      {selectedFurniture && (
        <RingMenu
          position={[
            selectedFurniture.position[0],
            FURNITURE_TEMPLATES[selectedFurniture.type].height + 0.5,
            selectedFurniture.position[2],
          ]}
          furnitureId={selectedFurniture.id}
        />
      )}

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[room.width / 2, -0.01, room.depth / 2]}
        onClick={handleCanvasClick}
      >
        <planeGeometry args={[room.width * 10, room.depth * 10]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  )
}

export default function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [10, 8, 10], fov: 50 }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      }}
    >
      <color attach="background" args={['#1a1a2e']} />
      <fog attach="fog" args={['#1a1a2e', 20, 50]} />
      <SceneContent />
    </Canvas>
  )
}
