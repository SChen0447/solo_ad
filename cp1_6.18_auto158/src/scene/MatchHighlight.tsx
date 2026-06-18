import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface MatchHighlightProps {
  edgePointsA: THREE.Vector3[]
  edgePointsB: THREE.Vector3[]
  posA: THREE.Vector3
  posB: THREE.Vector3
  rotA: THREE.Euler
  rotB: THREE.Euler
  visible: boolean
}

export function MatchHighlight({
  edgePointsA,
  edgePointsB,
  posA,
  posB,
  rotA,
  rotB,
  visible
}: MatchHighlightProps) {
  const pointsRef = useRef<THREE.Points>(null)

  const geometry = useMemo(() => {
    const positions: number[] = []
    const sampleCount = Math.min(edgePointsA.length, edgePointsB.length, 50)
    const rotMatA = new THREE.Matrix4().makeRotationFromEuler(rotA)
    const rotMatB = new THREE.Matrix4().makeRotationFromEuler(rotB)

    for (let i = 0; i < sampleCount; i++) {
      const t = i / sampleCount
      const idxA = Math.floor(t * edgePointsA.length)
      const idxB = Math.floor(t * edgePointsB.length)

      const pA = edgePointsA[idxA].clone().applyMatrix4(rotMatA).add(posA)
      const pB = edgePointsB[idxB].clone().applyMatrix4(rotMatB).add(posB)

      const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5)
      positions.push(mid.x, mid.y, mid.z)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [edgePointsA, edgePointsB, posA, posB, rotA, rotB])

  useFrame(({ clock }) => {
    if (!pointsRef.current) return
    const material = pointsRef.current.material as THREE.PointsMaterial
    const time = clock.getElapsedTime()
    material.opacity = 0.6 + 0.3 * Math.sin(time * 3)

    const positions = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const count = positions.count
    const offset = Math.floor(time * 20) % count

    for (let i = 0; i < count; i++) {
      const idx = (i + offset) % count
      const isGlowing = i < 5
      positions.setXYZ(
        i,
        positions.getX(idx),
        positions.getY(idx) + (isGlowing ? 0.05 : 0),
        positions.getZ(idx)
      )
    }
    positions.needsUpdate = true
  })

  if (!visible) return null

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color="#44aaff"
        size={0.15}
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}
