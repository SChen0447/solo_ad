import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { TrafficPoint, RoadSegment, HourlyData } from './trafficData'

const GRID_SIZE = 30
const GRID_DIVISIONS = 30

interface BuildingData {
  position: [number, number, number]
  size: [number, number, number]
  color: string
}

export function CityBase() {
  const gridRef = useRef<THREE.GridHelper>(null)
  const groundRef = useRef<THREE.Mesh>(null)
  const buildingsRef = useRef<THREE.Group>(null)

  const buildings = useMemo<BuildingData[]>(() => {
    const result: BuildingData[] = []
    const roadPositions = [3, 7, 11, 15, 19, 23, 27]
    
    for (let x = 0; x < GRID_SIZE; x += 2) {
      for (let z = 0; z < GRID_SIZE; z += 2) {
        const isOnRoad = roadPositions.some(r => Math.abs(x - r) < 1 || Math.abs(z - r) < 1)
        if (isOnRoad) continue
        
        if (Math.random() > 0.3) {
          const height = 1 + Math.random() * 5
          const colorValue = Math.floor(107 + Math.random() * 50)
          const color = `rgb(${colorValue}, ${colorValue + 5}, ${colorValue + 10})`
          
          result.push({
            position: [x + 1, height / 2, z + 1],
            size: [1.5, height, 1.5],
            color,
          })
        }
      }
    }
    return result
  }, [])

  const roads = useMemo(() => {
    const roadPositions = [3, 7, 11, 15, 19, 23, 27]
    return { horizontal: roadPositions, vertical: roadPositions }
  }, [])

  return (
    <group>
      <ambientLight color="#a5d8ff" intensity={0.6} />
      <directionalLight
        position={[40, 50, 30]}
        color="#ffeedd"
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-20}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-20}
      />

      <gridHelper
        ref={gridRef}
        args={[GRID_SIZE, GRID_DIVISIONS, '#4a4a4a', '#4a4a4a']}
        position={[GRID_SIZE / 2, 0, GRID_SIZE / 2]}
      >
        <meshBasicMaterial
          attach="material"
          color="#4a4a4a"
          transparent
          opacity={0.15}
        />
      </gridHelper>

      {roads.horizontal.map((z, i) => (
        <mesh key={`h-${i}`} position={[GRID_SIZE / 2, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[GRID_SIZE, 1]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
        </mesh>
      ))}
      {roads.vertical.map((x, i) => (
        <mesh key={`v-${i}`} position={[x, 0.01, GRID_SIZE / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, GRID_SIZE]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
        </mesh>
      ))}

      <mesh ref={groundRef} position={[GRID_SIZE / 2, -0.1, GRID_SIZE / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[GRID_SIZE + 10, GRID_SIZE + 10]} />
        <meshBasicMaterial color="#1a1a2e" transparent opacity={0.4} />
      </mesh>

      <group ref={buildingsRef}>
        {buildings.map((building, i) => (
          <mesh
            key={i}
            position={building.position}
            castShadow
            receiveShadow
          >
            <boxGeometry args={building.size} />
            <meshStandardMaterial color={building.color} roughness={0.7} metalness={0.1} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

interface TrafficHeatmapProps {
  data: TrafficPoint[]
}

function lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(color1, color2, t)
}

function getFlowColor(flow: number): THREE.Color {
  const normalizedFlow = Math.min(1, Math.max(0, (flow - 100) / 900))
  
  const colors = [
    { pos: 0, color: new THREE.Color('#3b82f6') },
    { pos: 0.33, color: new THREE.Color('#06b6d4') },
    { pos: 0.66, color: new THREE.Color('#eab308') },
    { pos: 1, color: new THREE.Color('#ef4444') },
  ]
  
  for (let i = 0; i < colors.length - 1; i++) {
    if (normalizedFlow >= colors[i].pos && normalizedFlow <= colors[i + 1].pos) {
      const t = (normalizedFlow - colors[i].pos) / (colors[i + 1].pos - colors[i].pos)
      return lerpColor(colors[i].color, colors[i + 1].color, t)
    }
  }
  
  return colors[colors.length - 1].color
}

export function TrafficHeatmap({ data }: TrafficHeatmapProps) {
  const particlesRef = useRef<THREE.Points>(null)
  const prevDataRef = useRef<TrafficPoint[]>([])
  const targetDataRef = useRef<TrafficPoint[]>([])
  const transitionStartRef = useRef<number>(0)

  useEffect(() => {
    prevDataRef.current = targetDataRef.current.length > 0 
      ? targetDataRef.current.map(d => ({ ...d }))
      : data.map(d => ({ ...d }))
    targetDataRef.current = data.map(d => ({ ...d }))
    transitionStartRef.current = performance.now()
  }, [data])

  const particleCount = data.length
  const positions = useMemo(() => new Float32Array(particleCount * 3), [particleCount])
  const colors = useMemo(() => new Float32Array(particleCount * 3), [particleCount])
  const sizes = useMemo(() => new Float32Array(particleCount), [particleCount])

  useFrame(() => {
    if (!particlesRef.current) return

    const elapsed = (performance.now() - transitionStartRef.current) / 500
    const t = Math.min(1, elapsed)
    const easeOut = 1 - Math.pow(1 - t, 3)

    for (let i = 0; i < particleCount; i++) {
      const prev = prevDataRef.current[i] || data[i]
      const target = targetDataRef.current[i] || data[i]
      const currentFlow = prev.flow + (target.flow - prev.flow) * easeOut
      
      const height = 0.5 + (currentFlow / 1000) * 3
      positions[i * 3] = data[i]?.x ?? target.x
      positions[i * 3 + 1] = height
      positions[i * 3 + 2] = data[i]?.z ?? target.z

      const color = getFlowColor(currentFlow)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      sizes[i] = 0.5 + (currentFlow / 1000) * 1.5
    }

    const geometry = particlesRef.current.geometry
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
    ;(geometry.attributes as any).size.needsUpdate = true
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

interface TrajectoryLineProps {
  road: RoadSegment | null
  hourlyData: HourlyData[]
  isPlaying: boolean
  currentHour: number
  speed: number
}

export function TrajectoryLine({ road, hourlyData, isPlaying, currentHour, speed }: TrajectoryLineProps) {
  const groupRef = useRef<THREE.Group>(null)
  const lightPositionRef = useRef(0)

  useFrame((_, delta) => {
    if (!groupRef.current || !road || !isPlaying) return
    
    const moveSpeed = speed * delta * 5
    lightPositionRef.current += moveSpeed
    
    const roadLength = road.isHorizontal 
      ? road.endX - road.startX 
      : road.endZ - road.startZ
    
    if (lightPositionRef.current > roadLength + 5) {
      lightPositionRef.current = -5
    }

    const lightObj = groupRef.current.children[0] as THREE.Mesh
    if (lightObj) {
      const flow = getFlowAtHour(hourlyData, currentHour)
      const color = getFlowColor(flow)
      ;(lightObj.material as THREE.MeshBasicMaterial).color = color
      
      if (road.isHorizontal) {
        lightObj.position.x = road.startX + lightPositionRef.current
        lightObj.position.z = road.startZ
      } else {
        lightObj.position.x = road.startX
        lightObj.position.z = road.startZ + lightPositionRef.current
      }
    }

    const trailObj = groupRef.current.children[1] as THREE.Mesh
    if (trailObj) {
      const trailLength = 5
      const geometry = trailObj.geometry as THREE.BufferGeometry
      const positions = geometry.attributes.position.array as Float32Array
      
      if (road.isHorizontal) {
        const startX = Math.max(road.startX, lightPositionRef.current - trailLength)
        positions[0] = startX
        positions[1] = 0.5
        positions[2] = road.startZ
        positions[3] = road.startX + lightPositionRef.current
        positions[4] = 0.5
        positions[5] = road.startZ
      } else {
        const startZ = Math.max(road.startZ, lightPositionRef.current - trailLength)
        positions[0] = road.startX
        positions[1] = 0.5
        positions[2] = startZ
        positions[3] = road.startX
        positions[4] = 0.5
        positions[5] = road.startZ + lightPositionRef.current
      }
      geometry.attributes.position.needsUpdate = true
    }
  })

  useEffect(() => {
    lightPositionRef.current = 0
  }, [road])

  if (!road) return null

  const flow = getFlowAtHour(hourlyData, currentHour)
  const color = getFlowColor(flow)

  return (
    <group ref={groupRef}>
      <mesh position={[road.startX, 0.5, road.startZ]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array(6)}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={0.6} linewidth={2} />
      </mesh>
    </group>
  )
}

function getFlowAtHour(hourlyData: HourlyData[], hour: number): number {
  if (hourlyData.length === 0) return 300
  
  const h = Math.floor(hour) % 24
  const nextH = (h + 1) % 24
  const fraction = hour - h
  
  const current = hourlyData.find(d => d.hour === h)?.flow || 300
  const next = hourlyData.find(d => d.hour === nextH)?.flow || 300
  
  return current + (next - current) * fraction
}

export interface SceneController {
  getTrafficAtPoint: (x: number, z: number) => number | null
}

export { GRID_SIZE }
