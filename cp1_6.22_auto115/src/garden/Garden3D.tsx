import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { Plant, Seed, PlantTraits } from '../types'

const GRID_SIZE = 6
const PLOT_SPACING = 2.2
const PLOT_SIZE = 1.8

interface Garden3DProps {
  plants: Plant[]
  seeds: Seed[]
  selectedSeedId: string | null
  onPlantPlanted: (plotIndex: number) => void
  onPlantBloom?: (plantId: string) => void
  onPlantSelected?: (plant: Plant) => void
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

interface PlotProps {
  index: number
  position: [number, number, number]
  isSelected: boolean
  hasPlant: boolean
  onClick: () => void
  onPointerOver: () => void
  onPointerOut: () => void
}

function Plot({ position, isSelected, hasPlant, onClick, onPointerOver, onPointerOut }: PlotProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hover, setHover] = useState(false)

  useFrame(() => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial
      const target = hover || isSelected ? 1.0 : 0.6
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, target, 0.15)
    }
  })

  const color = hasPlant ? '#3a5f3e' : '#4a6b3c'

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); onPointerOver() }}
      onPointerOut={(e) => { e.stopPropagation(); setHover(false); onPointerOut() }}
      receiveShadow
    >
      <boxGeometry args={[PLOT_SIZE, 0.25, PLOT_SIZE]} />
      <meshStandardMaterial
        color={color}
        emissive={isSelected ? '#22d3ee' : '#1a3d1a'}
        emissiveIntensity={0.6}
        roughness={0.9}
      />
    </mesh>
  )
}

interface PlantMeshProps {
  plant: Plant
  onBloom?: () => void
  onClick?: () => void
}

function PlantMesh({ plant, onBloom, onClick }: PlantMeshProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [growthT, setGrowthT] = useState(0)
  const [started, setStarted] = useState(false)
  const [bloomTriggered, setBloomTriggered] = useState(false)
  const [swayOffset] = useState(() => Math.random() * Math.PI * 2)
  const startTimeRef = useRef<number | null>(null)
  const { traits } = plant

  useEffect(() => {
    setStarted(true)
    startTimeRef.current = performance.now()
  }, [])

  useFrame((state) => {
    if (!groupRef.current || !started) return
    const now = performance.now()
    const elapsed = (now - (startTimeRef.current || now)) / 1000
    const raw = Math.min(1, elapsed / 3.0)
    const t = easeOutExpo(raw)
    setGrowthT(t)
    groupRef.current.scale.setScalar(Math.max(0.001, t))
    const sway = Math.sin(state.clock.elapsedTime * 1.2 + swayOffset) * 0.03 * t
    groupRef.current.rotation.z = sway
    groupRef.current.rotation.x = -sway * 0.5

    if (t >= 0.85 && !bloomTriggered && onBloom) {
      setBloomTriggered(true)
      setTimeout(() => onBloom(), 0)
    }
  })

  const flowerColor = traits.petalColor
  const leafColor = '#4a8c3a'
  const stemColor = '#6b8e23'
  const height = traits.height
  const flowerSize = traits.flowerSize
  const visible = growthT > 0.01

  if (!visible) return <group ref={groupRef} />

  const petalCount = 5
  const leafShape = traits.leafShape
  const leafGeo = useMemo(() => {
    switch (leafShape) {
      case 'round': return new THREE.SphereGeometry(0.2, 8, 6)
      case 'pointed': return new THREE.ConeGeometry(0.12, 0.35, 4)
      case 'heart': return new THREE.SphereGeometry(0.18, 8, 6)
      case 'lanceolate': return new THREE.ConeGeometry(0.08, 0.4, 4)
      default: return new THREE.SphereGeometry(0.18, 8, 6)
    }
  }, [leafShape])

  return (
    <group
      ref={groupRef}
      position={[0, 0.15, 0]}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
    >
      <mesh position={[0, height * 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, height * 0.7, 8]} />
        <meshStandardMaterial color={stemColor} roughness={0.8} />
      </mesh>

      {[0, 1, 2].map((i) => (
        <mesh
          key={`leaf-${i}`}
          geometry={leafGeo}
          position={[
            (i % 2 === 0 ? 1 : -1) * 0.15,
            height * (0.15 + i * 0.18),
            (i === 1 ? 0.1 : 0)
          ]}
          rotation={[
            -0.5 + i * 0.2,
            (i % 2 === 0 ? 1 : -1) * 0.6,
            0.3
          ]}
          scale={[1 + i * 0.1, 1 + i * 0.1, 0.5]}
          castShadow
        >
          <meshStandardMaterial color={leafColor} roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {growthT > 0.7 && (
        <group position={[0, height * 0.72, 0]}>
          {Array.from({ length: petalCount }).map((_, i) => {
            const angle = (i / petalCount) * Math.PI * 2
            const px = Math.cos(angle) * flowerSize * 0.4
            const pz = Math.sin(angle) * flowerSize * 0.4
            return (
              <mesh
                key={`petal-${i}`}
                position={[px, 0, pz]}
                rotation={[0.4, angle, 0]}
                castShadow
              >
                <sphereGeometry args={[flowerSize * 0.35, 8, 6]} />
                <meshStandardMaterial
                  color={flowerColor}
                  emissive={flowerColor}
                  emissiveIntensity={0.2}
                  roughness={0.4}
                  metalness={0.1}
                />
              </mesh>
            )
          })}
          <mesh position={[0, 0.02, 0]} castShadow>
            <sphereGeometry args={[flowerSize * 0.28, 10, 8]} />
            <meshStandardMaterial color="#ffe44d" emissive="#ffe44d" emissiveIntensity={0.3} roughness={0.5} />
          </mesh>
        </group>
      )}
    </group>
  )
}

interface Particle {
  id: number
  pos: THREE.Vector3
  vel: THREE.Vector3
  life: number
  maxLife: number
  color: string
}

interface ParticlesProps {
  activeParticles: Particle[]
  onComplete: (ids: number[]) => void
}

function Particles({ activeParticles, onComplete }: ParticlesProps) {
  const groupRef = useRef<THREE.Group>(null)
  const meshesRef = useRef<Record<number, THREE.Mesh>>({})
  const prevIdsRef = useRef<Set<number>>(new Set())

  useFrame((_state, delta) => {
    const toRemove: number[] = []
    activeParticles.forEach(p => {
      const mesh = meshesRef.current[p.id]
      if (!mesh) return
      p.life -= delta
      if (p.life <= 0) {
        toRemove.push(p.id)
        return
      }
      mesh.position.addScaledVector(p.vel, delta)
      p.vel.y -= delta * 0.4
      p.vel.multiplyScalar(0.985)
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, p.life / p.maxLife)
    })
    if (toRemove.length > 0) {
      toRemove.forEach(id => {
        const m = meshesRef.current[id]
        if (m && groupRef.current) {
          groupRef.current.remove(m)
          m.geometry.dispose()
          ;(m.material as THREE.Material).dispose()
        }
        delete meshesRef.current[id]
      })
      onComplete(toRemove)
    }

    activeParticles.forEach(p => {
      if (!meshesRef.current[p.id] && groupRef.current) {
        const geo = new THREE.SphereGeometry(0.06, 6, 6)
        const mat = new THREE.MeshBasicMaterial({
          color: p.color,
          transparent: true,
          opacity: 1,
          depthWrite: false
        })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.copy(p.pos)
        groupRef.current.add(mesh)
        meshesRef.current[p.id] = mesh
      }
    })

    const currentIds = new Set(activeParticles.map(p => p.id))
    prevIdsRef.current.forEach(id => {
      if (!currentIds.has(id) && meshesRef.current[id]) {
        const m = meshesRef.current[id]
        if (groupRef.current) groupRef.current.remove(m)
        m.geometry.dispose()
        ;(m.material as THREE.Material).dispose()
        delete meshesRef.current[id]
      }
    })
    prevIdsRef.current = currentIds
  })

  return <group ref={groupRef} />
}

interface PlantPreviewProps {
  position: [number, number, number]
  traits: PlantTraits | null
  genePreviewGenes: any | null
}

function PlantPreview({ position, traits }: PlantPreviewProps) {
  const ref = useRef<THREE.Group>(null)
  const previewTraits = traits || {
    petalColor: '#cccccc',
    leafShape: 'round' as const,
    height: 0.8,
    diseaseResistance: 0.3,
    flowerSize: 0.3
  }

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.8
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.03
    }
  })

  const petals = 5
  const { height, flowerSize, petalColor } = previewTraits

  return (
    <group ref={ref} position={position}>
      <mesh position={[0, height * 0.35, 0]}>
        <cylinderGeometry args={[0.04, 0.06, height * 0.7, 8]} />
        <meshStandardMaterial color="#6b8e23" />
      </mesh>
      <group position={[0, height * 0.75, 0]}>
        {Array.from({ length: petals }).map((_, i) => {
          const angle = (i / petals) * Math.PI * 2
          return (
            <mesh
              key={i}
              position={[
                Math.cos(angle) * flowerSize * 0.4,
                0,
                Math.sin(angle) * flowerSize * 0.4
              ]}
              rotation={[0.4, angle, 0]}
            >
              <sphereGeometry args={[flowerSize * 0.35, 8, 6]} />
              <meshStandardMaterial color={petalColor} emissive={petalColor} emissiveIntensity={0.3} />
            </mesh>
          )
        })}
        <mesh>
          <sphereGeometry args={[flowerSize * 0.28, 10, 8]} />
          <meshStandardMaterial color="#ffe44d" emissive="#ffe44d" emissiveIntensity={0.25} />
        </mesh>
      </group>
    </group>
  )
}

export default function Garden3D({
  plants,
  seeds,
  selectedSeedId,
  onPlantPlanted,
  onPlantBloom,
  onPlantSelected
}: Garden3DProps) {
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null)
  const [hoverPlot, setHoverPlot] = useState<number | null>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const particleIdRef = useRef(0)

  const plots = useMemo(() => {
    const arr: { index: number; position: [number, number, number] }[] = []
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const index = row * GRID_SIZE + col
        const x = (col - (GRID_SIZE - 1) / 2) * PLOT_SPACING
        const z = (row - (GRID_SIZE - 1) / 2) * PLOT_SPACING
        arr.push({ index, position: [x, 0, z] })
      }
    }
    return arr
  }, [])

  const plantByPlot = useMemo(() => {
    const m: Record<number, Plant> = {}
    plants.forEach(p => { m[p.plotIndex] = p })
    return m
  }, [plants])

  const handlePlotClick = useCallback((index: number) => {
    setSelectedPlot(index)
    if (selectedSeedId && !plantByPlot[index]) {
      onPlantPlanted(index)
    }
  }, [selectedSeedId, plantByPlot, onPlantPlanted])

  const triggerBloomParticles = useCallback((plotPos: [number, number, number], color: string) => {
    const newParticles: Particle[] = []
    for (let i = 0; i < 100; i++) {
      const id = ++particleIdRef.current
      const angle = Math.random() * Math.PI * 2
      const speed = 0.5 + Math.random() * 1.5
      newParticles.push({
        id,
        pos: new THREE.Vector3(
          plotPos[0] + (Math.random() - 0.5) * 0.3,
          plotPos[1] + 1.2 + Math.random() * 0.3,
          plotPos[2] + (Math.random() - 0.5) * 0.3
        ),
        vel: new THREE.Vector3(
          Math.cos(angle) * speed * 0.5,
          0.8 + Math.random() * 1.2,
          Math.sin(angle) * speed * 0.5
        ),
        life: 4,
        maxLife: 4,
        color: i % 3 === 0 ? color : (i % 3 === 1 ? '#ffe44d' : '#ffffff')
      })
    }
    setParticles(prev => [...prev, ...newParticles])
  }, [])

  const handleBloom = useCallback((plant: Plant) => {
    const plot = plots.find(p => p.index === plant.plotIndex)
    if (plot) {
      triggerBloomParticles(plot.position, plant.traits.petalColor)
    }
    onPlantBloom?.(plant.id)
  }, [plots, triggerBloomParticles, onPlantBloom])

  const removeParticles = useCallback((ids: number[]) => {
    const set = new Set(ids)
    setParticles(prev => prev.filter(p => !set.has(p.id)))
  }, [])

  const previewSeed = selectedSeedId ? seeds.find(s => s.id === selectedSeedId) : null
  const previewTraits: PlantTraits | null = previewSeed
    ? {
        petalColor: computePreviewColor(previewSeed.geneSequence),
        leafShape: 'round',
        height: 0.6 + previewSeed.geneSequence.filter(g => g).length / 8 * 1.2,
        diseaseResistance: 0.3,
        flowerSize: 0.3
      }
    : null

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [8, 10, 12], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'linear-gradient(180deg, #1a1630 0%, #0f0a1a 100%)' }}
      >
        <color attach="background" args={[0x0f0a1a]} />
        <fog attach="fog" args={[0x0f0a1a, 20, 45]} />

        <ambientLight intensity={0.45} color="#88aaff" />
        <directionalLight
          position={[8, 15, 8]}
          intensity={1.2}
          color="#fff5e0"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
          shadow-camera-near={0.5}
          shadow-camera-far={50}
        />
        <pointLight position={[-6, 5, -6]} intensity={0.5} color="#b04dff" />
        <pointLight position={[6, 4, -8]} intensity={0.3} color="#22d3ee" />

        <mesh rotation-x={-Math.PI / 2} position={[0, -0.2, 0]} receiveShadow>
          <planeGeometry args={[50, 50, 32, 32]} />
          <meshStandardMaterial
            color="#4a7c59"
            roughness={1}
          />
        </mesh>

        <mesh rotation-x={-Math.PI / 2} position={[0, -0.15, 0]} receiveShadow>
          <circleGeometry args={[10, 64]} />
          <meshStandardMaterial
            color="#6b8e51"
            transparent
            opacity={0.6}
            roughness={1}
          />
        </mesh>

        <group>
          {plots.map(p => (
            <Plot
              key={p.index}
              index={p.index}
              position={[p.position[0], 0.02, p.position[2]]}
              isSelected={selectedPlot === p.index || hoverPlot === p.index && !!selectedSeedId && !plantByPlot[p.index]}
              hasPlant={!!plantByPlot[p.index]}
              onClick={() => handlePlotClick(p.index)}
              onPointerOver={() => setHoverPlot(p.index)}
              onPointerOut={() => setHoverPlot(prev => prev === p.index ? null : prev)}
            />
          ))}
        </group>

        {plots.map(p => {
          const plant = plantByPlot[p.index]
          if (!plant) return null
          return (
            <group key={`plant-${plant.id}`} position={p.position}>
              <PlantMesh
                plant={plant}
                onBloom={() => handleBloom(plant)}
                onClick={() => onPlantSelected?.(plant)}
              />
            </group>
          )
        })}

        {selectedPlot !== null && hoverPlot === selectedPlot && previewTraits && !plantByPlot[selectedPlot] && (() => {
          const p = plots[selectedPlot]
          return <PlantPreview position={[p.position[0], 0.2, p.position[2]]} traits={previewTraits} genePreviewGenes={null} />
        })()}

        <Particles activeParticles={particles} onComplete={removeParticles} />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={6}
          maxDistance={28}
          maxPolarAngle={Math.PI / 2.3}
          target={[0, 0.5, 0]}
        />
      </Canvas>

      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        padding: '10px 14px',
        background: 'rgba(30, 41, 59, 0.85)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: 8,
        fontSize: 13,
        color: '#cbd5e1',
        backdropFilter: 'blur(8px)'
      }}>
        <div><span style={{ color: '#22d3ee' }}>🌱</span> 地块 {GRID_SIZE}×{GRID_SIZE} = {GRID_SIZE * GRID_SIZE}</div>
        <div style={{ marginTop: 4 }}>
          已种植: <span style={{ color: '#f59e0b' }}>{plants.length}</span>
          {selectedSeedId && <span style={{ marginLeft: 8, color: '#22d3ee' }}>● 点击地块种植</span>}
        </div>
      </div>
    </div>
  )
}

function computePreviewColor(genes: (string | null)[]): string {
  const colorCounts: Record<string, number> = { red: 0, blue: 0, yellow: 0, purple: 0 }
  genes.forEach(g => { if (g && colorCounts[g] !== undefined) colorCounts[g]++ })
  const total = Object.values(colorCounts).reduce((a, b) => a + b, 0) || 1
  const r = (colorCounts.red * 255) / total
  const g = ((colorCounts.yellow * 200) + (colorCounts.blue * 50)) / total
  const b = ((colorCounts.blue * 255) + (colorCounts.purple * 180)) / total
  return `rgb(${Math.round(Math.min(255, r))}, ${Math.round(Math.min(255, g))}, ${Math.round(Math.min(255, b))})`
}
