import { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Stars, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store'
import type { NodeType } from '../types'
import { Node } from './Node'
import { ForceLines } from './ForceLines'

interface RadialMenuItem {
  type: NodeType
  label: string
  color: string
  angle: number
}

const RADIAL_ITEMS: RadialMenuItem[] = [
  { type: 'positive', label: '正质量', color: '#ff7722', angle: -Math.PI / 2 },
  { type: 'negative', label: '负质量', color: '#3388ff', angle: Math.PI / 6 },
  { type: 'repulsive', label: '斥力', color: '#aa44ff', angle: Math.PI - Math.PI / 6 },
]

export function Scene() {
  const groupRef = useRef<THREE.Group>(null)
  const { camera, gl, raycaster, pointer } = useThree()

  const nodes = useStore((s) => s.nodes)
  const setAnimationTime = useStore((s) => s.setAnimationTime)
  const addNode = useStore((s) => s.addNode)
  const clearSelection = useStore((s) => s.clearSelection)
  const deleteSelected = useStore((s) => s.deleteSelected)

  const [radialMenu, setRadialMenu] = useState<{
    visible: boolean
    position: THREE.Vector3
    screenPos: { x: number; y: number }
  } | null>(null)
  const [menuHover, setMenuHover] = useState<string | null>(null)
  const menuGroupRef = useRef<THREE.Group>(null)
  const [menuScale, setMenuScale] = useState(0)

  const starsRef = useRef<THREE.Points>(null)

  const handleScenePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (e.target !== e.currentTarget) return
    e.stopPropagation()

    const multiSelect = e.nativeEvent.ctrlKey || e.nativeEvent.metaKey
    if (!multiSelect) {
      clearSelection()
    }

    if (e.button === 0) {
      const worldPos = e.point.clone()
      setRadialMenu({
        visible: true,
        position: worldPos,
        screenPos: {
          x: e.nativeEvent.clientX,
          y: e.nativeEvent.clientY,
        },
      })
    }
  }, [clearSelection])

  const handleScenePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (radialMenu && radialMenu.visible) {
      if (!menuHover) {
        setRadialMenu(null)
      }
    }
  }, [radialMenu, menuHover])

  const selectMenuItem = useCallback((type: NodeType) => {
    if (radialMenu) {
      addNode(type, radialMenu.position)
      setRadialMenu(null)
      setMenuHover(null)
    }
  }, [radialMenu, addNode])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected()
      }
      if (e.key === 'Escape') {
        clearSelection()
        setRadialMenu(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelected, clearSelection])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    setAnimationTime(time)

    if (starsRef.current) {
      starsRef.current.rotation.y += delta * 0.008
      starsRef.current.rotation.x += delta * 0.003
    }

    const targetScale = radialMenu?.visible ? 1 : 0
    setMenuScale((prev) => THREE.MathUtils.lerp(prev, targetScale, 0.25))
  })

  return (
    <group ref={groupRef}>
      <color attach="background" args={[0x0a0a1a]} />

      <fog attach="fog" args={[0x0a0a1a, 15, 40]} />

      <ambientLight intensity={0.15} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={0.4}
        color="#aaccff"
      />
      <pointLight position={[-8, -5, -8]} intensity={0.3} color="#ff9966" />
      <pointLight position={[0, 10, -10]} intensity={0.25} color="#9966ff" />

      <Stars
        ref={starsRef}
        radius={60}
        depth={40}
        count={4000}
        factor={3}
        saturation={0.3}
        fade
        speed={0.3}
      />

      <StarfieldLayer />

      <mesh
        onPointerDown={handleScenePointerDown}
        onPointerUp={handleScenePointerUp}
        position={[0, 0, 0]}
      >
        <sphereGeometry args={[50, 32, 32]} />
        <meshBasicMaterial
          color="#0a0a1a"
          side={THREE.BackSide}
          transparent
          opacity={0.001}
        />
      </mesh>

      {nodes.map((node) => (
        <Node key={node.id} node={node} />
      ))}

      <ForceLines />

      {radialMenu && radialMenu.visible && (
        <RadialMenu
          position={radialMenu.position}
          scale={menuScale}
          menuHover={menuHover}
          setMenuHover={setMenuHover}
          onSelect={selectMenuItem}
        />
      )}

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={30}
        makeDefault
        enablePan={true}
      />
    </group>
  )
}

function StarfieldLayer() {
  const pointsRef = useRef<THREE.Points>(null)

  const { geometry, colors } = useMemo(() => {
    const count = 600
    const positions = new Float32Array(count * 3)
    const colorArr = new Float32Array(count * 3)
    const tempColor = new THREE.Color()

    for (let i = 0; i < count; i++) {
      const radius = 12 + Math.random() * 20
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      const hueChoice = Math.random()
      if (hueChoice < 0.4) {
        tempColor.setHSL(0.6, 0.5, 0.7 + Math.random() * 0.3)
      } else if (hueChoice < 0.7) {
        tempColor.setHSL(0.08, 0.6, 0.7 + Math.random() * 0.3)
      } else {
        tempColor.setHSL(0.78, 0.5, 0.7 + Math.random() * 0.3)
      }
      colorArr[i * 3] = tempColor.r
      colorArr[i * 3 + 1] = tempColor.g
      colorArr[i * 3 + 2] = tempColor.b
    }

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.setAttribute('color', new THREE.BufferAttribute(colorArr, 3))
    return { geometry: geom, colors: colorArr }
  }, [])

  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.005
      pointsRef.current.rotation.z += delta * 0.002
      const time = state.clock.elapsedTime
      const pos = geometry.attributes.position.array as Float32Array
      for (let i = 0; i < 600; i++) {
        const twinkle = 0.8 + Math.sin(time * 2 + i * 0.3) * 0.2
      }
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

interface RadialMenuProps {
  position: THREE.Vector3
  scale: number
  menuHover: string | null
  setMenuHover: (type: string | null) => void
  onSelect: (type: NodeType) => void
}

function RadialMenu({ position, scale, menuHover, setMenuHover, onSelect }: RadialMenuProps) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.quaternion.copy(state.camera.quaternion)
      groupRef.current.scale.setScalar(scale)
    }
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <ringGeometry args={[0.35, 0.45, 64]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.2 * scale}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {RADIAL_ITEMS.map((item, idx) => {
        const radius = 1.1
        const x = Math.cos(item.angle) * radius
        const y = Math.sin(item.angle) * radius
        const isHover = menuHover === item.type
        const itemScale = isHover ? 1.3 : 1

        return (
          <group key={item.type} position={[x, y, 0]} scale={itemScale}>
            <mesh
              onPointerEnter={(e) => {
                e.stopPropagation()
                setMenuHover(item.type)
              }}
              onPointerLeave={(e) => {
                e.stopPropagation()
                setMenuHover(null)
              }}
              onPointerDown={(e) => {
                e.stopPropagation()
              }}
              onPointerUp={(e) => {
                e.stopPropagation()
                if (menuHover === item.type) {
                  onSelect(item.type)
                }
              }}
            >
              <circleGeometry args={[0.35, 48]} />
              <meshBasicMaterial
                color={item.color}
                transparent
                opacity={0.85}
                blending={THREE.AdditiveBlending}
              />
            </mesh>

            <mesh position={[0, 0, 0.01]}>
              <circleGeometry args={[0.25, 32]} />
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.9}
              />
            </mesh>

            <mesh position={[0, -0.75, 0]}>
              <ringGeometry args={[0.05, 0.08, 16]} />
              <meshBasicMaterial
                color={item.color}
                transparent
                opacity={0.6}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        )
      })}

      <mesh>
        <circleGeometry args={[0.18, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
