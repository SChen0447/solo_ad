import React from 'react'
import * as THREE from 'three'
import { useStore } from '@/store'
import { PartMesh, SKIN_COLOR } from './PartMesh'

const SkinLayer: React.FC<{ clipPlane: THREE.Plane | null }> = ({ clipPlane }) => {
  const clippingPlanes = clipPlane ? [clipPlane] : []
  const setSelectedPart = useStore((s) => s.setSelectedPart)

  const skinMatProps = {
    color: SKIN_COLOR,
    transparent: true,
    opacity: 0.4,
    clippingPlanes,
    side: THREE.DoubleSide as const,
    depthWrite: false,
  }

  return (
    <group onClick={() => setSelectedPart(null)} onPointerMissed={() => setSelectedPart(null)}>
      <mesh position={[0, 4.1, 0]}>
        <sphereGeometry args={[1.15, 32, 32]} />
        <meshStandardMaterial {...skinMatProps} />
      </mesh>
      <mesh position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.55, 0.65, 0.9, 24]} />
        <meshStandardMaterial {...skinMatProps} />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[1.45, 1.55, 1.8, 32]} />
        <meshStandardMaterial {...skinMatProps} />
      </mesh>
      <mesh position={[0, -0.8, 0]}>
        <cylinderGeometry args={[1.55, 1.45, 1.8, 32]} />
        <meshStandardMaterial {...skinMatProps} />
      </mesh>
      <mesh position={[0, -2.6, 0]}>
        <cylinderGeometry args={[1.45, 1.55, 1.2, 32]} />
        <meshStandardMaterial {...skinMatProps} />
      </mesh>
      <mesh position={[-1.7, 1.6, 0]}>
        <sphereGeometry args={[0.8, 24, 24]} />
        <meshStandardMaterial {...skinMatProps} />
      </mesh>
      <mesh position={[1.7, 1.6, 0]}>
        <sphereGeometry args={[0.8, 24, 24]} />
        <meshStandardMaterial {...skinMatProps} />
      </mesh>
      <mesh position={[-2.1, 0.4, 0]} rotation={[0, 0, 0.25]}>
        <capsuleGeometry args={[0.5, 1.6, 12, 24]} />
        <meshStandardMaterial {...skinMatProps} />
      </mesh>
      <mesh position={[2.1, 0.4, 0]} rotation={[0, 0, -0.25]}>
        <capsuleGeometry args={[0.5, 1.6, 12, 24]} />
        <meshStandardMaterial {...skinMatProps} />
      </mesh>
      <mesh position={[-2.4, -1.4, 0]} rotation={[0, 0, 0.15]}>
        <capsuleGeometry args={[0.4, 1.5, 12, 24]} />
        <meshStandardMaterial {...skinMatProps} />
      </mesh>
      <mesh position={[2.4, -1.4, 0]} rotation={[0, 0, -0.15]}>
        <capsuleGeometry args={[0.4, 1.5, 12, 24]} />
        <meshStandardMaterial {...skinMatProps} />
      </mesh>
    </group>
  )
}

export default SkinLayer
