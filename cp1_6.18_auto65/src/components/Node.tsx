import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import type { NodeData, NodeType } from '../types'

interface NodeProps {
  node: NodeData
}

const typeConfig: Record<NodeType, {
  coreColor: string
  glowColor: string
  ringColor: string
  particleColor: string
}> = {
  positive: {
    coreColor: '#ff9944',
    glowColor: '#ff6600',
    ringColor: '#ffaa55',
    particleColor: '#ffcc88',
  },
  negative: {
    coreColor: '#44aaff',
    glowColor: '#0066ff',
    ringColor: '#55bbff',
    particleColor: '#88ddff',
  },
  repulsive: {
    coreColor: '#cc66ff',
    glowColor: '#9933ff',
    ringColor: '#dd88ff',
    particleColor: '#eeaaff',
  },
}

const PARTICLE_COUNT = 24
const EXPLOSION_PARTICLES = 40

export function Node({ node }: NodeProps) {
  const groupRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const selectionRingRef = useRef<THREE.Mesh>(null)
  const particleRingRef = useRef<THREE.Points>(null)
  const explosionParticlesRef = useRef<THREE.Points>(null)

  const [spawnProgress, setSpawnProgress] = useState(0)
  const [isExplosionDone, setIsExplosionDone] = useState(false)

  const config = typeConfig[node.type]
  const isSelected = useStore((s) => s.selectedNodeIds.has(node.id))
  const toggleSelection = useStore((s) => s.toggleNodeSelection)
  const updatePosition = useStore((s) => s.updateNodePosition)
  const setDragging = useStore((s) => s.setDragging)
  const animationTime = useStore((s) => s.animationTime)

  const ringParticleData = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const phases = new Float32Array(PARTICLE_COUNT)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2
      const radius = 0.6 + Math.random() * 0.15
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.1
      positions[i * 3 + 2] = Math.sin(angle) * radius
      phases[i] = Math.random() * Math.PI * 2
    }
    return { positions, phases }
  }, [])

  const explosionData = useMemo(() => {
    const positions = new Float32Array(EXPLOSION_PARTICLES * 3)
    const velocities = new Float32Array(EXPLOSION_PARTICLES * 3)
    for (let i = 0; i < EXPLOSION_PARTICLES; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = 0.3 + Math.random() * 0.7
      const vx = Math.sin(phi) * Math.cos(theta) * speed
      const vy = Math.sin(phi) * Math.sin(theta) * speed
      const vz = Math.cos(phi) * speed
      velocities[i * 3] = vx
      velocities[i * 3 + 1] = vy
      velocities[i * 3 + 2] = vz
    }
    return { positions, velocities }
  }, [])

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(node.position)
      groupRef.current.scale.setScalar(0)
    }
  }, [])

  useFrame((state, delta) => {
    if (!groupRef.current) return

    setSpawnProgress((prev) => Math.min(prev + delta * 2.5, 1))
    const easeProgress = 1 - Math.pow(1 - Math.min(spawnProgress + delta * 2.5, 1), 3)
    groupRef.current.scale.setScalar(easeProgress)

    const targetPos = node.position
    const currentPos = groupRef.current.position
    currentPos.lerp(targetPos, 0.35)

    if (coreRef.current) {
      const pulse = 1 + Math.sin(animationTime * 2 + node.createdAt) * 0.05
      coreRef.current.scale.setScalar(pulse)
    }

    if (glowRef.current) {
      const glowPulse = 1.5 + Math.sin(animationTime * 1.5 + node.createdAt * 0.5) * 0.2
      glowRef.current.scale.setScalar(glowPulse)
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.25 + Math.sin(animationTime * 2 + node.createdAt) * 0.08
    }

    if (selectionRingRef.current) {
      if (isSelected) {
        selectionRingRef.current.visible = true
        selectionRingRef.current.rotation.y += delta * 2
        selectionRingRef.current.rotation.x += delta * 0.8
        const ringPulse = 1 + Math.sin(animationTime * 4) * 0.15
        selectionRingRef.current.scale.setScalar(ringPulse)
        const mat = selectionRingRef.current.material as THREE.MeshBasicMaterial
        mat.opacity = 0.6 + Math.sin(animationTime * 4) * 0.2
      } else {
        selectionRingRef.current.visible = false
      }
    }

    if (particleRingRef.current && spawnProgress > 0.3) {
      particleRingRef.current.rotation.y += delta * 1.5
      particleRingRef.current.rotation.x = Math.sin(animationTime * 0.5 + node.createdAt) * 0.3
      const positions = particleRingRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const yOffset = Math.sin(animationTime * 2 + ringParticleData.phases[i]) * 0.12
        positions[i * 3 + 1] = yOffset
      }
      particleRingRef.current.geometry.attributes.position.needsUpdate = true
      const pmat = particleRingRef.current.material as THREE.PointsMaterial
      pmat.opacity = 0.5 + Math.sin(animationTime * 3) * 0.2
    }

    if (explosionParticlesRef.current && !isExplosionDone) {
      const positions = explosionParticlesRef.current.geometry.attributes.position.array as Float32Array
      const elapsed = (performance.now() - node.createdAt) / 1000
      if (elapsed < 1.2) {
        for (let i = 0; i < EXPLOSION_PARTICLES; i++) {
          const decay = Math.pow(Math.max(0, 1 - elapsed / 1.2), 2)
          positions[i * 3] = explosionData.velocities[i * 3] * elapsed * 2 * decay
          positions[i * 3 + 1] = explosionData.velocities[i * 3 + 1] * elapsed * 2 * decay
          positions[i * 3 + 2] = explosionData.velocities[i * 3 + 2] * elapsed * 2 * decay
        }
        explosionParticlesRef.current.geometry.attributes.position.needsUpdate = true
        const emat = explosionParticlesRef.current.material as THREE.PointsMaterial
        emat.opacity = Math.max(0, 1 - elapsed / 1.2) * 0.8
        emat.size = 0.08 + elapsed * 0.1
      } else {
        setIsExplosionDone(true)
        explosionParticlesRef.current.visible = false
      }
    }
  })

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const multiSelect = e.nativeEvent.ctrlKey || e.nativeEvent.metaKey
    toggleSelection(node.id, multiSelect)

    if (isSelected || multiSelect) return

    setDragging(true)
    ;(e.target as any).setPointerCapture?.(e.pointerId)

    const initialIntersection = e.point.clone()
    const initialNodePos = node.position.clone()
    const planeNormal = new THREE.Vector3(0, 0, 1)
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      planeNormal.transformDirection(groupRef.current!.matrixWorld),
      initialIntersection
    )

    const onPointerMove = (moveEvent: any) => {
      const event = moveEvent as ThreeEvent<PointerEvent>
      const raycaster = event.ray
      const intersection = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(plane, intersection)) {
        const delta = intersection.sub(initialIntersection)
        updatePosition(node.id, initialNodePos.clone().add(delta))
      }
    }

    const onPointerUp = () => {
      setDragging(false)
      window.removeEventListener('pointermove', onPointerMove as any)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove as any)
    window.addEventListener('pointerup', onPointerUp)
  }

  return (
    <group ref={groupRef}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshBasicMaterial
          color={config.glowColor}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={coreRef} onPointerDown={handlePointerDown}>
        <sphereGeometry args={[0.28, 48, 48]} />
        <meshStandardMaterial
          color={config.coreColor}
          emissive={config.glowColor}
          emissiveIntensity={0.8}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>

      <mesh ref={coreRef} onPointerDown={handlePointerDown}>
        <sphereGeometry args={[0.18, 32, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <points ref={particleRingRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[ringParticleData.positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={config.particleColor}
          size={0.05}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      <mesh ref={selectionRingRef} visible={false}>
        <torusGeometry args={[0.55, 0.025, 16, 64]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh>
        <torusGeometry args={[0.5, 0.008, 8, 64]} />
        <meshBasicMaterial
          color={config.ringColor}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      <points ref={explosionParticlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[explosionData.positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={config.particleColor}
          size={0.08}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  )
}
