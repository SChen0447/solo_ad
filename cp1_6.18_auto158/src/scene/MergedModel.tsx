import { useMemo } from 'react'
import * as THREE from 'three'

interface MergedModelProps {
  geometry: THREE.BufferGeometry | null
  visible: boolean
}

export function MergedModel({ geometry, visible }: MergedModelProps) {
  const edgesGeometry = useMemo(() => {
    if (!geometry) return null
    return new THREE.EdgesGeometry(geometry, 15)
  }, [geometry])

  if (!visible || !geometry) return null

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.8}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      {edgesGeometry && (
        <lineSegments geometry={edgesGeometry}>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.2} />
        </lineSegments>
      )}
    </group>
  )
}
