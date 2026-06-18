import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, Edges, Line } from '@react-three/drei'
import * as THREE from 'three'
import {
  useStore,
  BuildingData,
  BuildingStyle,
  STYLE_CONFIG,
} from '@store/useStore'
import { generateBuildings } from '@modules/BuildingGenerator'
import {
  applyStyle,
  getBuildingOpacity,
  getBuildPhaseProgress,
} from '@modules/StyleManager'
import { CameraController } from '@modules/CameraController'

interface BuildingMeshProps {
  data: BuildingData
  style: ReturnType<typeof applyStyle>
  phaseProgress: number
  isSelected: boolean
  isHighlighted: boolean
  isHovered: boolean
  isDetailMode: boolean
  onClick: () => void
  onDoubleClick: () => void
  onPointerOver: () => void
  onPointerOut: () => void
  cameraPosition: THREE.Vector3
}

function RoofShape(
  width: number,
  depth: number,
  height: number,
  style: BuildingStyle
): THREE.Shape {
  const shape = new THREE.Shape()
  const halfW = width / 2
  const eave = style === 'song' ? width * 0.25 : style === 'mingqing' ? width * 0.18 : width * 0.15

  shape.moveTo(-halfW - eave, 0)
  shape.lineTo(-halfW, height * 0.1)
  shape.lineTo(0, height)
  shape.lineTo(halfW, height * 0.1)
  shape.lineTo(halfW + eave, 0)
  shape.closePath()

  return shape
}

function BuildingMesh({
  data,
  style,
  phaseProgress,
  isSelected,
  isHighlighted,
  isHovered,
  isDetailMode,
  onClick,
  onDoubleClick,
  onPointerOver,
  onPointerOut,
  cameraPosition,
}: BuildingMeshProps) {
  const groupRef = useRef<THREE.Group>(null)
  const roofRef = useRef<THREE.Mesh>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  const flashTimer = useRef<number>(0)
  const flashCount = useRef<number>(0)
  const targetScale = useRef(1)
  const currentScale = useRef(1)

  const [w, h, d] = data.size
  const roofH = h * 0.38
  const bodyH = h - roofH
  const cfg = STYLE_CONFIG[data.style]

  const styleConfig = useMemo(() => {
    const roofColor = style.roofColor.clone()
    const wallColor = style.wallColor.clone()
    return { roofColor, wallColor }
  }, [style, data.style])

  const phaseY = Math.sin(phaseProgress * Math.PI * 0.5)

  const opacityResult = getBuildingOpacity(data.year, useStore.getState().currentYear)

  const wallOpacity = isDetailMode
    ? isHighlighted || isSelected
      ? 1
      : 0.3
    : opacityResult.opacity

  const roofOpacity = isDetailMode
    ? isHighlighted || isSelected
      ? 1
      : 0.35
    : opacityResult.opacity

  if (isHighlighted && flashCount.current < 4) {
    flashTimer.current += 0.016
    if (flashTimer.current > 0.2) {
      flashTimer.current = 0
      flashCount.current++
    }
  }
  if (!isHighlighted) {
    flashCount.current = 0
  }

  const flashing = isHighlighted && flashCount.current % 2 === 0 && flashCount.current < 4

  targetScale.current = isHighlighted || isSelected ? 1.08 : 1
  if (isDetailMode && isHighlighted) targetScale.current = 1.15

  useFrame((_, dt) => {
    currentScale.current += (targetScale.current - currentScale.current) * Math.min(1, dt * 8)
    if (groupRef.current) {
      groupRef.current.scale.setScalar(currentScale.current)
    }
    if (roofRef.current) {
      const mat = roofRef.current.material as THREE.MeshStandardMaterial
      if (flashing) {
        mat.emissive.lerp(new THREE.Color('#ffaa33'), 0.15)
        mat.emissiveIntensity = 0.8
      } else {
        mat.emissive.lerp(new THREE.Color('#000000'), 0.1)
        mat.emissiveIntensity = 0.15
      }
    }
    if (bodyRef.current) {
      const mat = bodyRef.current.material as THREE.MeshStandardMaterial
      mat.emissive.lerp(
        isHovered || isSelected ? new THREE.Color('#c9a96e') : new THREE.Color('#000000'),
        0.12
      )
      mat.emissiveIntensity = isHovered || isSelected ? 0.25 : 0.05
    }
  })

  const extrudeSettings = useMemo(
    () => ({
      depth: d * 0.9,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 2,
    }),
    [d]
  )

  const roofShape = useMemo(
    () => RoofShape(w, d, roofH, data.style),
    [w, d, roofH, data.style]
  )

  const cameraDist = cameraPosition.distanceTo(
    new THREE.Vector3(...data.position)
  )
  const showLabel = cameraDist < 80 || isHighlighted || isSelected

  const yOffset = phaseY * h * 0.5

  return (
    <group
      ref={groupRef}
      position={[data.position[0], yOffset - h * 0.5, data.position[2]]}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onDoubleClick()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        onPointerOver()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        onPointerOut()
        document.body.style.cursor = 'default'
      }}
    >
      <mesh
        ref={bodyRef}
        position={[0, bodyH / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[w * 0.9, bodyH, d * 0.9]} />
        <meshStandardMaterial
          color={styleConfig.wallColor}
          roughness={0.85}
          metalness={0.05}
          transparent
          opacity={wallOpacity}
          side={THREE.DoubleSide}
        />
        <Edges color={isHovered || isSelected ? '#ffcc66' : '#5a4a3a'} threshold={15} linewidth={1} scale={1.002} />
      </mesh>

      <mesh
        ref={roofRef}
        position={[0, bodyH + roofH * 0.5, 0]}
        rotation={[0, Math.PI / 2, 0]}
        castShadow
      >
        <extrudeGeometry args={[roofShape, extrudeSettings]} />
        <meshStandardMaterial
          color={styleConfig.roofColor}
          roughness={0.7}
          metalness={0.1}
          transparent
          opacity={roofOpacity}
          side={THREE.DoubleSide}
        />
        <Edges color={isHovered || flashing ? '#ffcc66' : '#3a2a1a'} threshold={20} scale={1.003} />
      </mesh>

      {opacityResult.outlineOpacity > 0 && (
        <lineSegments position={[0, bodyH / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(w * 0.92, h * 1.02, d * 0.92)]} />
          <lineBasicMaterial
            color={cfg.tint}
            transparent
            opacity={opacityResult.outlineOpacity}
          />
        </lineSegments>
      )}

      {data.style === 'mingqing' && (
        <mesh position={[0, bodyH * 0.6, w * 0.455]}>
          <boxGeometry args={[w * 0.25, bodyH * 0.3, 0.1]} />
          <meshStandardMaterial color="#8b0000" roughness={0.6} transparent opacity={wallOpacity} />
        </mesh>
      )}

      {showLabel && (
        <Html
          position={[0, h + 4, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              background: 'rgba(20, 15, 10, 0.75)',
              backdropFilter: 'blur(6px)',
              color: '#e8d4a0',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              border: '1px solid rgba(201, 169, 110, 0.4)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5), 0 0 8px rgba(201,169,110,0.2)',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              opacity: Math.min(1, (80 - Math.max(0, cameraDist - 20)) / 60),
              transform: isHighlighted || isSelected ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform 0.3s ease',
              fontFamily: 'Microsoft YaHei, PingFang SC, sans-serif',
            }}
          >
            {data.name}
            <span style={{ color: '#c9a96e', marginLeft: '8px', fontSize: '11px' }}>
              {cfg.name}·{data.year}
            </span>
          </div>
        </Html>
      )}
    </group>
  )
}

interface DustParticleProps {
  position: [number, number, number]
  progress: number
}

function DustParticle({ position, progress }: DustParticleProps) {
  const ref = useRef<THREE.Points>(null)
  const count = 30

  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const siz = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * 3
      pos[i * 3] = position[0] + Math.cos(angle) * r
      pos[i * 3 + 1] = position[1] + Math.random() * 2
      pos[i * 3 + 2] = position[2] + Math.sin(angle) * r
      siz[i] = 0.15 + Math.random() * 0.25
    }
    return [pos, siz]
  }, [position])

  useFrame(() => {
    if (!ref.current) return
    const mat = ref.current.material as THREE.PointsMaterial
    const t = progress
    const alpha = Math.sin(t * Math.PI) * 0.6
    mat.opacity = alpha
    const geom = ref.current.geometry as THREE.BufferGeometry
    const posAttr = geom.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < count; i++) {
      posAttr.setY(i, posAttr.getY(i) + t * 0.05)
    }
    posAttr.needsUpdate = true
  })

  if (progress <= 0 || progress >= 1) return null

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.3}
        color="#d4a574"
        transparent
        opacity={0}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

function SceneContent() {
  const { camera, gl } = useThree()
  const buildings = useStore((s) => s.buildings)
  const currentYear = useStore((s) => s.currentYear)
  const selectedBuilding = useStore((s) => s.selectedBuilding)
  const highlightedBuildingId = useStore((s) => s.highlightedBuildingId)
  const hoveredBuildingId = useStore((s) => s.hoveredBuildingId)
  const detailBuilding = useStore((s) => s.detailBuilding)
  const isDetailPanelOpen = useStore((s) => s.isDetailPanelOpen)
  const isAutoRoaming = useStore((s) => s.camera.isAutoRoaming)
  const setBuildings = useStore((s) => s.setBuildings)
  const selectBuilding = useStore((s) => s.selectBuilding)
  const setHighlightedBuilding = useStore((s) => s.setHighlightedBuilding)
  const setHoveredBuilding = useStore((s) => s.setHoveredBuilding)
  const openDetailPanel = useStore((s) => s.openDetailPanel)
  const setLightingTint = useStore((s) => s.setLightingTint)
  const setCameraState = useStore((s) => s.setCameraState)

  const controllerRef = useRef<CameraController | null>(null)
  const mouseDownPos = useRef<{ x: number; y: number; time: number } | null>(null)
  const cameraPosRef = useRef(new THREE.Vector3())
  const [cameraPos, setCameraPos] = useState(new THREE.Vector3(120, 100, 120))
  const dustParticlesRef = useRef<Map<string, number>>(new Map())
  const [dustTriggers, setDustTriggers] = useState<
    { id: string; pos: [number, number, number]; startTime: number }[]
  >([])

  useEffect(() => {
    const generated = generateBuildings(700, 1900)
    setBuildings(generated)
  }, [setBuildings])

  useEffect(() => {
    if (controllerRef.current) return
    const cam = camera as THREE.PerspectiveCamera
    cam.position.set(120, 100, 120)
    cam.lookAt(0, 5, 0)
    controllerRef.current = new CameraController({
      camera: cam,
      target: new THREE.Vector3(0, 5, 0),
      minDistance: 20,
      maxDistance: 280,
    })
    controllerRef.current.setOnHighlightBuilding((id) => {
      setHighlightedBuilding(id)
    })
    controllerRef.current.setOnRoamComplete(() => {
      setCameraState({ isAutoRoaming: false })
    })
  }, [camera, setHighlightedBuilding, setCameraState])

  useEffect(() => {
    const canvas = gl.domElement

    const onMouseDown = (e: MouseEvent) => {
      mouseDownPos.current = { x: e.clientX, y: e.clientY, time: Date.now() }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!controllerRef.current || !mouseDownPos.current) return

      const dx = e.clientX - mouseDownPos.current.x
      const dy = e.clientY - mouseDownPos.current.y

      if (e.buttons === 2) {
        controllerRef.current.rotate(dx, dy)
        mouseDownPos.current = { x: e.clientX, y: e.clientY, time: Date.now() }
      } else if (e.buttons === 1) {
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 5) {
          controllerRef.current.pan(dx, dy)
          mouseDownPos.current = { x: e.clientX, y: e.clientY, time: Date.now() }
        }
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      controllerRef.current?.dolly(e.deltaY)
    }

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        if (controllerRef.current?.getIsAutoRoaming()) {
          controllerRef.current.stopAutoRoam()
          setCameraState({ isAutoRoaming: false })
        } else {
          controllerRef.current?.startAutoRoam(30)
          setCameraState({ isAutoRoaming: true })
        }
      }
      if (e.code === 'KeyR' && !e.repeat) {
        controllerRef.current?.resetView()
      }
    }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [gl, setCameraState])

  const styleResult = useMemo(() => applyStyle(currentYear), [currentYear])

  useEffect(() => {
    setLightingTint(styleResult.lightingTint)
  }, [styleResult.lightingTint, setLightingTint])

  useEffect(() => {
    const triggers: {
      id: string
      pos: [number, number, number]
      startTime: number
    }[] = []
    const now = Date.now()

    buildings.forEach((b) => {
      const progress = getBuildPhaseProgress(b.year, currentYear, 50)
      const existing = dustParticlesRef.current.get(b.id)
      if (progress > 0 && progress < 1) {
        if (!existing) {
          dustParticlesRef.current.set(b.id, now)
          triggers.push({
            id: `${b.id}-${now}`,
            pos: [b.position[0], 0, b.position[2]],
            startTime: now,
          })
        }
      } else {
        if (existing) {
          dustParticlesRef.current.delete(b.id)
        }
      }
    })

    if (triggers.length > 0) {
      setDustTriggers((prev) => [...prev, ...triggers].slice(-50))
    }
  }, [buildings, currentYear])

  useFrame((_, dt) => {
    if (controllerRef.current) {
      controllerRef.current.update(dt)
    }
    cameraPosRef.current.copy(camera.position)
    setCameraPos(camera.position.clone())

    const now = Date.now()
    setDustTriggers((prev) =>
      prev.filter((t) => now - t.startTime < 2000)
    )
  })

  const handleBuildingClick = useCallback(
    (building: BuildingData) => {
      if (selectedBuilding?.id === building.id) {
        selectBuilding(null)
        setHighlightedBuilding(null)
      } else {
        selectBuilding(building)
        setHighlightedBuilding(building.id)
      }
    },
    [selectedBuilding, selectBuilding, setHighlightedBuilding]
  )

  const handleBuildingDoubleClick = useCallback(
    (building: BuildingData) => {
      openDetailPanel(building)
      if (controllerRef.current) {
        const pos = new THREE.Vector3(...building.position)
        const dist = 30 + Math.max(building.size[0], building.size[2])
        const camPos = pos
          .clone()
          .add(new THREE.Vector3(dist * 0.6, dist * 0.7, dist * 0.6))
        controllerRef.current.flyTo(camPos, pos.clone().add(new THREE.Vector3(0, building.size[1] * 0.3, 0)), 1.2)
      }
    },
    [openDetailPanel]
  )

  const fogColor = useMemo(() => {
    const base = new THREE.Color('#1a2538')
    return base.lerp(styleResult.lightingTint, 0.15)
  }, [styleResult])

  const groundColor = useMemo(() => {
    const base = new THREE.Color('#3d2f22')
    return base.lerp(styleResult.lightingTint, 0.1)
  }, [styleResult])

  return (
    <>
      <color attach="background" args={[fogColor]} />
      <fog attach="fog" args={[fogColor, 150, 350]} />

      <hemisphereLight
        color={styleResult.lightingTint}
        groundColor={groundColor}
        intensity={styleResult.ambientIntensity}
      />

      <directionalLight
        color={styleResult.lightingTint}
        intensity={styleResult.directionalIntensity}
        position={[
          Math.cos((styleResult.sunAngle * Math.PI) / 180) * 150,
          120,
          Math.sin((styleResult.sunAngle * Math.PI) / 180) * 150,
        ]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
        shadow-camera-near={0.5}
        shadow-camera-far={500}
      />

      <ambientLight
        color={styleResult.lightingTint}
        intensity={styleResult.ambientIntensity * 0.4}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color={groundColor} roughness={0.95} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[6, 18, 64]} />
        <meshStandardMaterial
          color="#4a3a28"
          roughness={0.9}
          transparent
          opacity={0.8}
        />
      </mesh>

      <Line
        points={[
          [-180, 0.02, -20],
          [180, 0.02, 20],
        ]}
        color="#3a6a8a"
        lineWidth={40}
      />

      {buildings.map((b) => {
        const phaseProgress = getBuildPhaseProgress(b.year, currentYear, 50)
        if (phaseProgress <= 0.02) return null

        return (
          <BuildingMesh
            key={b.id}
            data={b}
            style={styleResult}
            phaseProgress={phaseProgress}
            isSelected={selectedBuilding?.id === b.id}
            isHighlighted={highlightedBuildingId === b.id}
            isHovered={hoveredBuildingId === b.id}
            isDetailMode={isDetailPanelOpen && detailBuilding?.id !== b.id}
            onClick={() => handleBuildingClick(b)}
            onDoubleClick={() => handleBuildingDoubleClick(b)}
            onPointerOver={() => setHoveredBuilding(b.id)}
            onPointerOut={() => setHoveredBuilding(null)}
            cameraPosition={cameraPos}
          />
        )
      })}

      {dustTriggers.map((t) => {
        const progress = Math.min(1, (Date.now() - t.startTime) / 1500)
        return <DustParticle key={t.id} position={t.pos} progress={progress} />
      })}

      {isAutoRoaming && (
        <Html position={[0, 80, 0]} center style={{ pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(201, 169, 110, 0.2)',
              border: '1px solid rgba(201, 169, 110, 0.5)',
              color: '#e8d4a0',
              padding: '10px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 0 20px rgba(201,169,110,0.3)',
            }}
          >
            自动漫游中... 按空格键退出
          </div>
        </Html>
      )}
    </>
  )
}

export function Scene3D() {
  return (
    <Canvas
      shadows
      camera={{ position: [120, 100, 120], fov: 55, near: 0.1, far: 1000 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent />
    </Canvas>
  )
}
