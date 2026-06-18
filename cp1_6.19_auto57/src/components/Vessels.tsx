import React from 'react'
import * as THREE from 'three'
import { useStore } from '@/store'
import { PartMesh, VESSEL_COLOR } from './PartMesh'

const Vessels: React.FC<{ clipPlane: THREE.Plane | null }> = ({ clipPlane }) => {
  const parts = useStore((s) => s.partsDatabase)
  const getPart = (id: string) => parts.find((p) => p.id === id)!
  const vesMat = <meshStandardMaterial color={VESSEL_COLOR} emissive="#330000" emissiveIntensity={0.1} />

  return (
    <group>
      {/* Aorta */}
      <PartMesh partId="aorta" partType="vessel" partInfo={getPart('aorta')} clipPlane={clipPlane}>
        <mesh position={[0.15, 0.9, 0.75]} rotation={[-0.15, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.12, 0.8, 16]} />
          {vesMat}
        </mesh>
        <mesh position={[0, 1.4, 0.4]} rotation={[Math.PI / 2, 0, 0.1]}>
          <torusGeometry args={[0.4, 0.11, 12, 24, Math.PI * 0.6]} />
          {vesMat}
        </mesh>
        <mesh position={[-0.15, 0.0, 0.1]}>
          <cylinderGeometry args={[0.095, 0.1, 2.2, 16]} />
          {vesMat}
        </mesh>
        <mesh position={[-0.2, -2.6, 0.2]}>
          <cylinderGeometry args={[0.085, 0.07, 1.6, 16]} />
          {vesMat}
        </mesh>
      </PartMesh>

      {/* SVC */}
      <PartMesh partId="superior-vena-cava" partType="vessel" partInfo={getPart('superior-vena-cava')} clipPlane={clipPlane}>
        <mesh position={[-0.25, 0.95, 0.75]}>
          <cylinderGeometry args={[0.08, 0.09, 0.9, 16]} />
          {vesMat}
        </mesh>
        <mesh position={[-0.4, 1.6, 0.55]} rotation={[0, 0, 0.4]}>
          <cylinderGeometry args={[0.06, 0.06, 0.8, 12]} />
          {vesMat}
        </mesh>
        <mesh position={[0.4, 1.6, 0.55]} rotation={[0, 0, -0.4]}>
          <cylinderGeometry args={[0.06, 0.06, 0.8, 12]} />
          {vesMat}
        </mesh>
      </PartMesh>

      {/* Carotid */}
      <PartMesh partId="carotid-artery" partType="vessel" partInfo={getPart('carotid-artery')} clipPlane={clipPlane}>
        <mesh position={[-0.35, 2.85, 0.2]}>
          <cylinderGeometry args={[0.035, 0.035, 1.0, 12]} />
          {vesMat}
        </mesh>
        <mesh position={[-0.35, 3.4, 0.25]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          {vesMat}
        </mesh>
        <mesh position={[-0.35, 3.85, 0.25]}>
          <cylinderGeometry args={[0.025, 0.025, 0.5, 10]} />
          {vesMat}
        </mesh>
        <mesh position={[-0.4, 3.85, 0.35]} rotation={[0, 0, 0.2]}>
          <cylinderGeometry args={[0.022, 0.022, 0.5, 10]} />
          {vesMat}
        </mesh>
        <mesh position={[0.35, 2.85, 0.2]}>
          <cylinderGeometry args={[0.035, 0.035, 1.0, 12]} />
          {vesMat}
        </mesh>
        <mesh position={[0.35, 3.4, 0.25]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          {vesMat}
        </mesh>
        <mesh position={[0.35, 3.85, 0.25]}>
          <cylinderGeometry args={[0.025, 0.025, 0.5, 10]} />
          {vesMat}
        </mesh>
        <mesh position={[0.4, 3.85, 0.35]} rotation={[0, 0, -0.2]}>
          <cylinderGeometry args={[0.022, 0.022, 0.5, 10]} />
          {vesMat}
        </mesh>
      </PartMesh>

      {/* Jugular */}
      <PartMesh partId="jugular-vein" partType="vessel" partInfo={getPart('jugular-vein')} clipPlane={clipPlane}>
        <mesh position={[-0.48, 2.8, 0.3]}>
          <cylinderGeometry args={[0.05, 0.055, 1.1, 12]} />
          {vesMat}
        </mesh>
        <mesh position={[-0.48, 3.45, 0.3]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          {vesMat}
        </mesh>
        <mesh position={[0.48, 2.8, 0.3]}>
          <cylinderGeometry args={[0.05, 0.055, 1.1, 12]} />
          {vesMat}
        </mesh>
        <mesh position={[0.48, 3.45, 0.3]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          {vesMat}
        </mesh>
      </PartMesh>

      {/* Subclavian */}
      <PartMesh partId="subclavian-artery" partType="vessel" partInfo={getPart('subclavian-artery')} clipPlane={clipPlane}>
        <mesh position={[-1.05, 1.7, 0.3]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.35, 0.04, 10, 20, Math.PI * 0.7]} />
          {vesMat}
        </mesh>
        <mesh position={[-1.7, 1.35, 0.15]} rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.035, 0.03, 0.7, 12]} />
          {vesMat}
        </mesh>
        <mesh position={[1.05, 1.7, 0.3]} rotation={[0, 0, -Math.PI / 2]}>
          <torusGeometry args={[0.35, 0.04, 10, 20, Math.PI * 0.7]} />
          {vesMat}
        </mesh>
        <mesh position={[1.7, 1.35, 0.15]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.035, 0.03, 0.7, 12]} />
          {vesMat}
        </mesh>
        <mesh position={[-0.55, 1.85, 0.35]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.018, 0.018, 0.8, 10]} />
          {vesMat}
        </mesh>
        <mesh position={[0.55, 1.85, 0.35]} rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.018, 0.018, 0.8, 10]} />
          {vesMat}
        </mesh>
      </PartMesh>

      {/* Pulmonary */}
      <PartMesh partId="pulmonary-artery" partType="vessel" partInfo={getPart('pulmonary-artery')} clipPlane={clipPlane}>
        <mesh position={[0.05, 0.75, 0.8]}>
          <cylinderGeometry args={[0.12, 0.11, 0.5, 14]} />
          {vesMat}
        </mesh>
        <mesh position={[0.05, 1.05, 0.75]}>
          <sphereGeometry args={[0.13, 14, 14]} />
          {vesMat}
        </mesh>
        <mesh position={[-0.55, 1.15, 0.5]} rotation={[0, 0.15, 0.4]}>
          <cylinderGeometry args={[0.07, 0.06, 0.9, 12]} />
          {vesMat}
        </mesh>
        <mesh position={[0.65, 1.15, 0.5]} rotation={[0, -0.15, -0.4]}>
          <cylinderGeometry args={[0.07, 0.06, 0.9, 12]} />
          {vesMat}
        </mesh>
        <mesh position={[-1.0, 0.95, 0.2]} rotation={[0, 0, 0.8]}>
          <cylinderGeometry args={[0.04, 0.03, 0.5, 10]} />
          {vesMat}
        </mesh>
        <mesh position={[1.0, 0.95, 0.2]} rotation={[0, 0, -0.8]}>
          <cylinderGeometry args={[0.04, 0.03, 0.5, 10]} />
          {vesMat}
        </mesh>
      </PartMesh>

      {/* Brachial */}
      <PartMesh partId="brachial-artery" partType="vessel" partInfo={getPart('brachial-artery')} clipPlane={clipPlane}>
        <mesh position={[-2.25, 0.3, 0.15]} rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.025, 0.022, 1.6, 12]} />
          {vesMat}
        </mesh>
        <mesh position={[-2.4, -0.55, 0.1]}>
          <sphereGeometry args={[0.03, 10, 10]} />
          {vesMat}
        </mesh>
        <mesh position={[-2.5, -1.4, -0.05]} rotation={[0, 0, 0.18]}>
          <cylinderGeometry args={[0.018, 0.015, 1.2, 10]} />
          {vesMat}
        </mesh>
        <mesh position={[-2.35, -1.4, 0.2]} rotation={[0, 0, 0.18]}>
          <cylinderGeometry args={[0.018, 0.015, 1.2, 10]} />
          {vesMat}
        </mesh>
        <mesh position={[2.25, 0.3, 0.15]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.025, 0.022, 1.6, 12]} />
          {vesMat}
        </mesh>
        <mesh position={[2.4, -0.55, 0.1]}>
          <sphereGeometry args={[0.03, 10, 10]} />
          {vesMat}
        </mesh>
        <mesh position={[2.5, -1.4, -0.05]} rotation={[0, 0, -0.18]}>
          <cylinderGeometry args={[0.018, 0.015, 1.2, 10]} />
          {vesMat}
        </mesh>
        <mesh position={[2.35, -1.4, 0.2]} rotation={[0, 0, -0.18]}>
          <cylinderGeometry args={[0.018, 0.015, 1.2, 10]} />
          {vesMat}
        </mesh>
      </PartMesh>

      {/* Coronary */}
      <PartMesh partId="coronary-artery" partType="vessel" partInfo={getPart('coronary-artery')} clipPlane={clipPlane}>
        <mesh position={[0.15, 0.6, 0.85]}>
          <sphereGeometry args={[0.14, 16, 16]} />
          {vesMat}
        </mesh>
        <mesh position={[0.02, 0.65, 0.9]} rotation={[0, 0, -0.15]}>
          <cylinderGeometry args={[0.02, 0.018, 0.25, 10]} />
          {vesMat}
        </mesh>
        <mesh position={[-0.15, 0.55, 0.98]} rotation={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.016, 0.012, 0.7, 10]} />
          {vesMat}
        </mesh>
        <mesh position={[-0.05, 0.6, 0.7]} rotation={[0.2, -0.3, 0.2]}>
          <cylinderGeometry args={[0.014, 0.01, 0.6, 10]} />
          {vesMat}
        </mesh>
        <mesh position={[0.3, 0.65, 0.88]} rotation={[0, 0, -0.4]}>
          <cylinderGeometry args={[0.015, 0.01, 0.8, 10]} />
          {vesMat}
        </mesh>
        <mesh position={[0.2, 0.3, 0.65]} rotation={[0.2, 0, 0.3]}>
          <cylinderGeometry args={[0.012, 0.008, 0.35, 8]} />
          {vesMat}
        </mesh>
      </PartMesh>
    </group>
  )
}

export default Vessels
