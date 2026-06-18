import { useRef, useMemo, useEffect, useState, MutableRefObject } from 'react'
import {
  Canvas,
  useFrame,
  useThree,
  ThreeEvent,
} from '@react-three/fiber'
import {
  OrbitControls,
  Environment,
  Grid,
  Html,
  Edges,
} from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import useAppStore from './store'
import {
  PlacedObject,
  colorTemperatureToRGB,
  easeOutBounce,
  easeInOut,
  LightParams,
  TreeType,
  BenchType,
} from './types'

const GROUND_SIZE = 20
const GROUND_Y = 0

function AnimatedObject({
  object,
  isSelected,
  onSelect,
  onDrag,
}: {
  object: PlacedObject
  isSelected: boolean
  onSelect: () => void
  onDrag: (pos: [number, number, number]) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const dragOffset = useRef(new THREE.Vector3())
  const dragIntersection = useRef(new THREE.Vector3())
  const spawnProgress = useRef(0)
  const spawnStart = useRef(object.createdAt)
  const highlightIntensity = useRef(0)

  useFrame((state, delta) => {
    if (!groupRef.current) return

    const age = (Date.now() - spawnStart.current) / 800
    spawnProgress.current = Math.min(1, age)
    const eased = easeOutBounce(spawnProgress.current)
    const baseY = object.position[1]
    const dropStart = 6
    const y = baseY + dropStart * (1 - eased)
    const scale = 0.8 + 0.2 * eased

    groupRef.current.position.set(object.position[0], y, object.position[2])
    groupRef.current.scale.setScalar(scale)

    const targetHighlight = isSelected ? 1 : 0
    highlightIntensity.current += (targetHighlight - highlightIntensity.current) * delta * 8
  })

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onSelect()
    if (groupRef.current) {
      setIsDragging(true)
      const target = e.target as Element | null
      if (target && 'setPointerCapture' in target) {
        target.setPointerCapture(e.pointerId)
      }

      const raycaster = new THREE.Raycaster()
      const mouse = new THREE.Vector2()
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

      raycaster.setFromCamera(mouse, e.camera)
      if (raycaster.ray.intersectPlane(dragPlane.current, dragIntersection.current)) {
        dragOffset.current
          .copy(dragIntersection.current)
          .sub(new THREE.Vector3(object.position[0], 0, object.position[2]))
      }
    }
  }

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return
    e.stopPropagation()

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

    raycaster.setFromCamera(mouse, e.camera)
    if (raycaster.ray.intersectPlane(dragPlane.current, dragIntersection.current)) {
      const newPos = dragIntersection.current.clone().sub(dragOffset.current)
      const half = GROUND_SIZE / 2 - 0.5
      const x = Math.max(-half, Math.min(half, newPos.x))
      const z = Math.max(-half, Math.min(half, newPos.z))
      onDrag([x, 0, z])
    }
  }

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    setIsDragging(false)
    try {
      const target = e.target as Element | null
      if (target && 'releasePointerCapture' in target) {
        target.releasePointerCapture(e.pointerId)
      }
    } catch {}
  }

  const renderContent = () => {
    switch (object.category) {
      case 'lamp':
        return (
          <LampModel
            lightParams={object.lightParams!}
            isSelected={isSelected}
            highlightIntensity={highlightIntensity}
          />
        )
      case 'tree':
        return (
          <TreeModel
            type={object.subType as TreeType}
            isSelected={isSelected}
            highlightIntensity={highlightIntensity}
          />
        )
      case 'bench':
        return (
          <BenchModel
            type={object.subType as BenchType}
            isSelected={isSelected}
            highlightIntensity={highlightIntensity}
          />
        )
      default:
        return null
    }
  }

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {renderContent()}
    </group>
  )
}

function LampModel({
  lightParams,
  isSelected,
  highlightIntensity,
}: {
  lightParams: LightParams
  isSelected: boolean
  highlightIntensity: MutableRefObject<number>
}) {
  const spotRef = useRef<THREE.SpotLight>(null)
  const meshRef = useRef<THREE.MeshStandardMaterial>(null)

  const color = useMemo(() => {
    const [r, g, b] = colorTemperatureToRGB(lightParams.colorTemperature)
    return new THREE.Color(r, g, b)
  }, [lightParams.colorTemperature])

  const coneHeight = useMemo(() => {
    return 3 + lightParams.coneAngle / 40
  }, [lightParams.coneAngle])

  const coneRadius = useMemo(() => {
    return Math.tan((lightParams.coneAngle * Math.PI) / 180 / 2) * coneHeight
  }, [lightParams.coneAngle, coneHeight])

  useFrame(() => {
    if (meshRef.current) {
      const t = highlightIntensity.current
      meshRef.current.emissiveIntensity = 0.3 + t * 0.7
      meshRef.current.emissive.copy(color).multiplyScalar(t ? 0.6 : 0.2)
    }
    if (spotRef.current) {
      spotRef.current.angle = (lightParams.coneAngle * Math.PI) / 180
      spotRef.current.intensity = lightParams.brightness * 40
      spotRef.current.color.copy(color)
    }
  })

  return (
    <group>
      <mesh position={[0, 1.75, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 3.5, 8]} />
        <meshStandardMaterial
          color="#3a3a3a"
          metalness={0.8}
          roughness={0.3}
          emissive={isSelected ? '#ff8c42' : '#000000'}
          emissiveIntensity={0}
        />
        {isSelected && <Edges threshold={15} color="#ff8c42" scale={1.02} />}
      </mesh>

      <mesh position={[0, 3.6, 0]}>
        <boxGeometry args={[0.5, 0.15, 0.5]} />
        <meshStandardMaterial ref={meshRef} color="#2a2a2a" metalness={0.9} roughness={0.2} />
      </mesh>

      <spotLight
        ref={spotRef}
        position={[0, 3.5, 0]}
        angle={Math.PI / 6}
        penumbra={0.5}
        distance={15}
        decay={2}
        castShadow
        shadow-mapSize={[512, 512]}
        target-position={[0, 0, 0]}
      />

      <group position={[0, 3.5 - coneHeight / 2, 0]}>
        <mesh>
          <coneGeometry args={[coneRadius, coneHeight, 24, 1, true]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.08 + highlightIntensity.current * 0.05}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[coneRadius, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function TreeModel({
  type,
  isSelected,
  highlightIntensity,
}: {
  type: TreeType
  isSelected: boolean
  highlightIntensity: MutableRefObject<number>
}) {
  const leafMaterial = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(() => {
    if (leafMaterial.current) {
      leafMaterial.current.emissiveIntensity = highlightIntensity.current * 0.4
    }
  })

  const renderLeaves = () => {
    switch (type) {
      case 'sphere':
        return (
          <group position={[0, 2.5, 0]}>
            <mesh>
              <sphereGeometry args={[1.2, 16, 12]} />
              <meshStandardMaterial
                ref={leafMaterial}
                color="#2d5a27"
                emissive="#ff8c42"
                emissiveIntensity={0}
                roughness={0.9}
              />
              {isSelected && <Edges threshold={15} color="#ff8c42" scale={1.02} />}
            </mesh>
          </group>
        )
      case 'cone':
        return (
          <group position={[0, 2.5, 0]}>
            <mesh>
              <coneGeometry args={[1, 2.5, 8]} />
              <meshStandardMaterial
                ref={leafMaterial}
                color="#1e4620"
                emissive="#ff8c42"
                emissiveIntensity={0}
                roughness={0.9}
              />
              {isSelected && <Edges threshold={15} color="#ff8c42" scale={1.02} />}
            </mesh>
            <mesh position={[0, -0.8, 0]}>
              <coneGeometry args={[1.3, 1.5, 8]} />
              <meshStandardMaterial
                color="#24501e"
                emissive="#ff8c42"
                emissiveIntensity={0}
                roughness={0.9}
              />
              {isSelected && <Edges threshold={15} color="#ff8c42" scale={1.02} />}
            </mesh>
          </group>
        )
      case 'umbrella':
        return (
          <group position={[0, 3, 0]}>
            <mesh>
              <sphereGeometry args={[1.5, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
              <meshStandardMaterial
                ref={leafMaterial}
                color="#3a6b32"
                emissive="#ff8c42"
                emissiveIntensity={0}
                roughness={0.9}
                side={THREE.DoubleSide}
              />
              {isSelected && <Edges threshold={15} color="#ff8c42" scale={1.02} />}
            </mesh>
          </group>
        )
    }
  }

  return (
    <group>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 1.6, 8]} />
        <meshStandardMaterial
          color="#5c3a1e"
          roughness={1}
          emissive={isSelected ? '#ff8c42' : '#000000'}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>
      {renderLeaves()}
    </group>
  )
}

function BenchModel({
  type,
  isSelected,
  highlightIntensity,
}: {
  type: BenchType
  isSelected: boolean
  highlightIntensity: MutableRefObject<number>
}) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = highlightIntensity.current * 0.3
    }
  })

  const benchColor = '#6b4226'

  if (type === 'long') {
    return (
      <group>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[3, 0.1, 0.5]} />
          <meshStandardMaterial
            ref={materialRef}
            color={benchColor}
            roughness={0.8}
            emissive="#ff8c42"
            emissiveIntensity={0}
          />
          {isSelected && <Edges threshold={15} color="#ff8c42" scale={1.02} />}
        </mesh>
        <mesh position={[-1.3, 0.45, 0]}>
          <boxGeometry args={[0.4, 0.3, 0.5]} />
          <meshStandardMaterial
            color={benchColor}
            roughness={0.8}
            emissive="#ff8c42"
            emissiveIntensity={isSelected ? 0.1 : 0}
          />
        </mesh>
        <mesh position={[1.3, 0.45, 0]}>
          <boxGeometry args={[0.4, 0.3, 0.5]} />
          <meshStandardMaterial
            color={benchColor}
            roughness={0.8}
            emissive="#ff8c42"
            emissiveIntensity={isSelected ? 0.1 : 0}
          />
        </mesh>
        {[[-1.2, 0], [-1.2, 0.35], [1.2, 0], [1.2, 0.35]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.125, z]}>
            <boxGeometry args={[0.08, 0.25, 0.08]} />
            <meshStandardMaterial
              color="#2a2a2a"
              metalness={0.7}
              roughness={0.4}
              emissive="#ff8c42"
              emissiveIntensity={isSelected ? 0.15 : 0}
            />
          </mesh>
        ))}
      </group>
    )
  }

  return (
    <group>
      <mesh position={[0, 0.25, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1, 0.2, 8, 24]} />
        <meshStandardMaterial
          ref={materialRef}
          color={benchColor}
          roughness={0.8}
          emissive="#ff8c42"
          emissiveIntensity={0}
        />
        {isSelected && <Edges threshold={15} color="#ff8c42" scale={1.02} />}
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const x = Math.cos(angle) * 1
        const z = Math.sin(angle) * 1
        return (
          <mesh key={i} position={[x, 0.125, z]}>
            <cylinderGeometry args={[0.04, 0.05, 0.25, 6]} />
            <meshStandardMaterial
              color="#2a2a2a"
              metalness={0.7}
              roughness={0.4}
              emissive="#ff8c42"
              emissiveIntensity={isSelected ? 0.15 : 0}
            />
          </mesh>
        )
      })}
    </group>
  )
}

function GhostPreview() {
  const { selectedLibraryItem, schemes, activeSchemeId, addObject, selectObject } = useAppStore()
  const [hover, setHover] = useState<[number, number, number] | null>(null)
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())
  const groupRef = useRef<THREE.Group>(null)

  const activeScheme = schemes.find((s) => s.id === activeSchemeId)

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!selectedLibraryItem) return
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const intersection = new THREE.Vector3()

    const canvas = e.target as HTMLCanvasElement
    const rect = canvas.getBoundingClientRect
      ? canvas.getBoundingClientRect()
      : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }

    mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.current.setFromCamera(mouse.current, e.camera)
    if (raycaster.current.ray.intersectPlane(plane, intersection)) {
      const half = GROUND_SIZE / 2 - 0.5
      const x = Math.max(-half, Math.min(half, intersection.x))
      const z = Math.max(-half, Math.min(half, intersection.z))
      setHover([x, 0, z])
    }
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!selectedLibraryItem || !hover) return
    e.stopPropagation()
    addObject(hover)
    setHover(null)
  }

  useFrame(() => {
    if (groupRef.current && hover) {
      groupRef.current.position.set(hover[0], hover[1] + 0.01, hover[2])
    }
  })

  if (!selectedLibraryItem || !hover) return null

  const renderGhost = () => {
    switch (selectedLibraryItem.category) {
      case 'lamp':
        return (
          <group>
            <mesh position={[0, 1.75, 0]}>
              <cylinderGeometry args={[0.05, 0.08, 3.5, 8]} />
              <meshBasicMaterial color="#ff8c42" transparent opacity={0.5} />
            </mesh>
            <mesh position={[0, 3.6, 0]}>
              <boxGeometry args={[0.5, 0.15, 0.5]} />
              <meshBasicMaterial color="#ff8c42" transparent opacity={0.6} />
            </mesh>
          </group>
        )
      case 'tree':
        return (
          <group>
            <mesh position={[0, 0.8, 0]}>
              <cylinderGeometry args={[0.12, 0.18, 1.6, 8]} />
              <meshBasicMaterial color="#ff8c42" transparent opacity={0.5} />
            </mesh>
            <mesh position={[0, 2.5, 0]}>
              {(selectedLibraryItem.subType === 'cone' ? (
                <coneGeometry args={[1, 2.5, 8]} />
              ) : (
                <sphereGeometry args={[1.2, 16, 12]} />
              ))}
              <meshBasicMaterial color="#ff8c42" transparent opacity={0.5} />
            </mesh>
          </group>
        )
      case 'bench':
        return (
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[3, 0.1, 0.5]} />
            <meshBasicMaterial color="#ff8c42" transparent opacity={0.5} />
          </mesh>
        )
    }
  }

  return (
    <group
      ref={groupRef}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
    >
      {renderGhost()}
    </group>
  )
}

function Ground({ onPointerMove, onClick }: {
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void
  onClick: (e: ThreeEvent<MouseEvent>) => void
}) {
  const { selectObject } = useAppStore()

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onPointerMove={onPointerMove}
        onClick={(e) => {
          e.stopPropagation()
          onClick(e)
        }}
      >
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color="#3d3d3d" roughness={0.95} />
      </mesh>

      <Grid
        args={[GROUND_SIZE, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#555555"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#ff8c42"
        fadeDistance={30}
        fadeStrength={1}
        infiniteGrid={false}
        position={[0, 0.001, 0]}
      />
    </>
  )
}

function SurroundingBuildings() {
  const buildings = useMemo(() => {
    const result: { pos: [number, number, number]; size: [number, number, number] }[] = []
    const configs: { pos: [number, number, number]; size: [number, number, number] }[] = [
      { pos: [-13, 0, -8], size: [6, 8, 5] },
      { pos: [13, 0, -10], size: [5, 10, 4] },
      { pos: [-12, 0, 10], size: [7, 6, 4] },
      { pos: [12, 0, 8], size: [4, 7, 6] },
      { pos: [-8, 0, -14], size: [4, 9, 5] },
      { pos: [10, 0, -14], size: [6, 7, 4] },
    ]
    for (const c of configs) {
      result.push({ pos: c.pos, size: c.size })
    }
    return result
  }, [])

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.pos[0], b.size[1] / 2, b.pos[2]]} castShadow receiveShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color="#2a2a33" roughness={0.7} metalness={0.2} />
          <Edges threshold={20} color="#1a1a22" scale={1.001} />
        </mesh>
      ))}
    </group>
  )
}

function CameraIntro({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const { camera } = useThree()
  const introStart = useRef(Date.now())
  const duration = 2000
  const hasStarted = useRef(false)

  useFrame(() => {
    const elapsed = Date.now() - introStart.current
    const t = Math.min(1, elapsed / duration)

    if (!hasStarted.current) {
      camera.position.set(30, 30, 30)
      camera.lookAt(0, 0, 0)
      hasStarted.current = true
    }

    const eased = easeInOut(t)
    const startPos = new THREE.Vector3(30, 30, 30)
    const endPos = new THREE.Vector3(14, 14, 14)
    camera.position.lerpVectors(startPos, endPos, eased)
    camera.lookAt(0, 2, 0)

    if (controlsRef.current && t >= 1) {
      if (!controlsRef.current.enabled) {
        controlsRef.current.enabled = true
      }
    } else if (controlsRef.current) {
      controlsRef.current.enabled = false
      controlsRef.current.target.set(0, 2, 0)
      controlsRef.current.update()
    }
  })

  return null
}

function FogTransition() {
  const { scene } = useThree()
  const { isTransitioning, setTransitioning, setTransitionProgress, activeSchemeId } = useAppStore()
  const transitionStart = useRef(0)
  const transitionDuration = 1000
  const fogRef = useRef<THREE.Fog | null>(null)

  useEffect(() => {
    const fog = new THREE.Fog('#1a1a1a', 20, 60)
    scene.fog = fog
    fogRef.current = fog
    return () => {
      scene.fog = null
    }
  }, [scene])

  useEffect(() => {
    if (!fogRef.current) return
    transitionStart.current = Date.now()
    setTransitioning(true)
  }, [activeSchemeId, setTransitioning])

  useFrame(() => {
    if (!fogRef.current) return
    const elapsed = Date.now() - transitionStart.current
    let t = Math.min(1, elapsed / transitionDuration)

    if (isTransitioning) {
      if (t < 0.5) {
        const localT = t * 2
        const eased = easeInOut(localT)
        fogRef.current.near = 20 - 15 * eased
        fogRef.current.far = 60 - 40 * eased
      } else {
        const localT = (t - 0.5) * 2
        const eased = easeInOut(localT)
        fogRef.current.near = 5 + 15 * eased
        fogRef.current.far = 20 + 40 * eased
      }
      setTransitionProgress(t)
      if (t >= 1) {
        setTransitioning(false)
      }
    }
  })

  return null
}

function SceneContent() {
  const controlsRef = useRef<any>(null)
  const {
    schemes,
    activeSchemeId,
    selectedObjectId,
    selectObject,
    updateObjectPosition,
    selectedLibraryItem,
    addObject,
  } = useAppStore()

  const activeScheme = schemes.find((s) => s.id === activeSchemeId)
  const objects = activeScheme?.objects || []
  const ghostRef = useRef<THREE.Group>(null)
  const [ghostHover, setGhostHover] = useState<[number, number, number] | null>(null)

  const handleGroundPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!selectedLibraryItem) return
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const intersection = new THREE.Vector3()
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(mouse, e.camera)
    if (raycaster.ray.intersectPlane(plane, intersection)) {
      const half = GROUND_SIZE / 2 - 0.5
      const x = Math.max(-half, Math.min(half, intersection.x))
      const z = Math.max(-half, Math.min(half, intersection.z))
      setGhostHover([x, 0, z])
    }
  }

  const handleGroundClick = (e: ThreeEvent<MouseEvent>) => {
    if (selectedLibraryItem && ghostHover) {
      addObject(ghostHover)
      setGhostHover(null)
      return
    }
    if (!selectedLibraryItem) {
      selectObject(null)
    }
  }

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      <Ground onPointerMove={handleGroundPointerMove} onClick={handleGroundClick} />
      <SurroundingBuildings />

      {selectedLibraryItem && ghostHover && (
        <group ref={ghostRef} position={ghostHover}>
          {selectedLibraryItem.category === 'lamp' && (
            <group>
              <mesh position={[0, 1.75, 0]}>
                <cylinderGeometry args={[0.05, 0.08, 3.5, 8]} />
                <meshBasicMaterial color="#ff8c42" transparent opacity={0.5} />
              </mesh>
              <mesh position={[0, 3.6, 0]}>
                <boxGeometry args={[0.5, 0.15, 0.5]} />
                <meshBasicMaterial color="#ff8c42" transparent opacity={0.6} />
              </mesh>
            </group>
          )}
          {selectedLibraryItem.category === 'tree' && (
            <group>
              <mesh position={[0, 0.8, 0]}>
                <cylinderGeometry args={[0.12, 0.18, 1.6, 8]} />
                <meshBasicMaterial color="#ff8c42" transparent opacity={0.5} />
              </mesh>
              <mesh position={[0, 2.5, 0]}>
                {selectedLibraryItem.subType === 'cone' ? (
                  <coneGeometry args={[1, 2.5, 8]} />
                ) : selectedLibraryItem.subType === 'umbrella' ? (
                  <sphereGeometry args={[1.5, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
                ) : (
                  <sphereGeometry args={[1.2, 16, 12]} />
                )}
                <meshBasicMaterial color="#ff8c42" transparent opacity={0.5} />
              </mesh>
            </group>
          )}
          {selectedLibraryItem.category === 'bench' && (
            <group>
              {selectedLibraryItem.subType === 'ring' ? (
                <mesh position={[0, 0.25, 0]} rotation={[0, Math.PI / 2, 0]}>
                  <torusGeometry args={[1, 0.2, 8, 24]} />
                  <meshBasicMaterial color="#ff8c42" transparent opacity={0.5} />
                </mesh>
              ) : (
                <mesh position={[0, 0.25, 0]}>
                  <boxGeometry args={[3, 0.1, 0.5]} />
                  <meshBasicMaterial color="#ff8c42" transparent opacity={0.5} />
                </mesh>
              )}
            </group>
          )}
        </group>
      )}

      {objects.map((obj) => (
        <AnimatedObject
          key={obj.id}
          object={obj}
          isSelected={selectedObjectId === obj.id}
          onSelect={() => selectObject(obj.id)}
          onDrag={(pos) => updateObjectPosition(obj.id, pos)}
        />
      ))}

      <FogTransition />
      <CameraIntro controlsRef={controlsRef} />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 2, 0]}
        enabled={true}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.8}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.3} darkness={0.8} />
      </EffectComposer>
    </>
  )
}

export default function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [14, 14, 14], fov: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearColor('#1a1a1a')
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.0
      }}
    >
      <SceneContent />
    </Canvas>
  )
}
