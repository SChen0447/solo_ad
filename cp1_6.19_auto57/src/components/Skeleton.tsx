import React from 'react'
import * as THREE from 'three'
import { useStore } from '@/store'
import { PartMesh } from './PartMesh'

const Skeleton: React.FC<{ clipPlane: THREE.Plane | null }> = ({ clipPlane }) => {
  const parts = useStore((s) => s.partsDatabase)
  const getPart = (id: string) => parts.find((p) => p.id === id)!
  const boneMat = <meshStandardMaterial color="#f5f5dc" />

  return (
    <group>
      {/* Skull */}
      <PartMesh partId="skull" partType="bone" partInfo={getPart('skull')} clipPlane={clipPlane}>
        <mesh position={[0, 4.1, 0]} castShadow receiveShadow>
          <sphereGeometry args={[1.0, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
          {boneMat}
        </mesh>
        <mesh position={[0, 3.9, 0.45]} castShadow receiveShadow>
          <sphereGeometry args={[0.7, 24, 24]} />
          {boneMat}
        </mesh>
        <mesh position={[-0.32, 4.05, 0.95]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        <mesh position={[0.32, 4.05, 0.95]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        <mesh position={[0, 3.8, 1.05]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
      </PartMesh>

      {/* Mandible */}
      <PartMesh partId="mandible" partType="bone" partInfo={getPart('mandible')} clipPlane={clipPlane}>
        <mesh position={[0, 3.45, 0.5]} rotation={[0.15, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.85, 0.3, 0.45]} />
          {boneMat}
        </mesh>
        <mesh position={[-0.55, 3.6, 0.15]} castShadow receiveShadow>
          <sphereGeometry args={[0.1, 12, 12]} />
          {boneMat}
        </mesh>
        <mesh position={[0.55, 3.6, 0.15]} castShadow receiveShadow>
          <sphereGeometry args={[0.1, 12, 12]} />
          {boneMat}
        </mesh>
      </PartMesh>

      {/* Spine */}
      <PartMesh partId="spine" partType="bone" partInfo={getPart('spine')} clipPlane={clipPlane}>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={`cerv-${i}`} position={[0, 3.0 - i * 0.22, -0.1]} castShadow receiveShadow>
            <cylinderGeometry args={[0.18, 0.2, 0.15, 16]} />
            {boneMat}
          </mesh>
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={`thor-${i}`} position={[0, 1.15 - i * 0.26, -0.05 + Math.sin(i * 0.15) * 0.05]} castShadow receiveShadow>
            <cylinderGeometry args={[0.22, 0.24, 0.18, 16]} />
            {boneMat}
          </mesh>
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={`lum-${i}`} position={[0, -2.3 - i * 0.32, 0.05]} castShadow receiveShadow>
            <cylinderGeometry args={[0.28, 0.3, 0.22, 16]} />
            {boneMat}
          </mesh>
        ))}
        <mesh position={[0, -4.2, 0.1]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.8, 0.35]} />
          {boneMat}
        </mesh>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={`spin-${i}`} position={[0, 1.05 - i * 0.26, -0.3 - (i < 4 ? 0.2 : 0.1)]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 0.2, 0.25]} />
            {boneMat}
          </mesh>
        ))}
      </PartMesh>

      {/* Sternum */}
      <PartMesh partId="sternum" partType="bone" partInfo={getPart('sternum')} clipPlane={clipPlane}>
        <mesh position={[0, 0.7, 1.3]} rotation={[0.1, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.28, 1.6, 0.12]} />
          {boneMat}
        </mesh>
        <mesh position={[0, 1.55, 1.2]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.35, 0.12]} />
          {boneMat}
        </mesh>
        <mesh position={[0, -0.2, 1.3]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 0.25, 0.08]} />
          {boneMat}
        </mesh>
      </PartMesh>

      {/* Rib cage */}
      <PartMesh partId="ribcage" partType="bone" partInfo={getPart('ribcage')} clipPlane={clipPlane}>
        {Array.from({ length: 6 }, (_, i) => {
          const y = 1.35 - i * 0.35
          const radius = 1.05 - i * 0.02
          return (
            <mesh key={`rib-l-${i}`} position={[-0.05, y, 0]} rotation={[0, 0, 0.3]} castShadow receiveShadow>
              <torusGeometry args={[radius * 0.6, 0.06, 12, 28, Math.PI * 0.85]} />
              {boneMat}
            </mesh>
          )
        })}
        {Array.from({ length: 6 }, (_, i) => {
          const y = 1.35 - i * 0.35
          const radius = 1.05 - i * 0.02
          return (
            <mesh key={`rib-r-${i}`} position={[0.05, y, 0]} rotation={[Math.PI, 0, -0.3]} castShadow receiveShadow>
              <torusGeometry args={[radius * 0.6, 0.06, 12, 28, Math.PI * 0.85]} />
              {boneMat}
            </mesh>
          )
        })}
      </PartMesh>

      {/* Clavicles */}
      <PartMesh partId="clavicle" partType="bone" partInfo={getPart('clavicle')} clipPlane={clipPlane}>
        <mesh position={[-0.7, 1.9, 1.0]} rotation={[0.2, -0.15, -0.3]} castShadow receiveShadow>
          <capsuleGeometry args={[0.09, 0.85, 8, 16]} />
          {boneMat}
        </mesh>
        <mesh position={[0.7, 1.9, 1.0]} rotation={[-0.2, 0.15, 0.3]} castShadow receiveShadow>
          <capsuleGeometry args={[0.09, 0.85, 8, 16]} />
          {boneMat}
        </mesh>
      </PartMesh>

      {/* Scapulae */}
      <PartMesh partId="scapula" partType="bone" partInfo={getPart('scapula')} clipPlane={clipPlane}>
        <mesh position={[-1.55, 0.8, -0.9]} rotation={[0, 0.35, 0.2]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 1.1, 0.9]} />
          {boneMat}
        </mesh>
        <mesh position={[-1.48, 0.9, -0.6]} rotation={[0, 0.35, 0.5]} castShadow receiveShadow>
          <boxGeometry args={[0.08, 0.08, 0.6]} />
          {boneMat}
        </mesh>
        <mesh position={[-1.75, 1.55, -0.4]} rotation={[0, 0.35, 0.2]} castShadow receiveShadow>
          <boxGeometry args={[0.15, 0.18, 0.35]} />
          {boneMat}
        </mesh>
        <mesh position={[1.55, 0.8, -0.9]} rotation={[0, -0.35, -0.2]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 1.1, 0.9]} />
          {boneMat}
        </mesh>
        <mesh position={[1.48, 0.9, -0.6]} rotation={[0, -0.35, -0.5]} castShadow receiveShadow>
          <boxGeometry args={[0.08, 0.08, 0.6]} />
          {boneMat}
        </mesh>
        <mesh position={[1.75, 1.55, -0.4]} rotation={[0, -0.35, -0.2]} castShadow receiveShadow>
          <boxGeometry args={[0.15, 0.18, 0.35]} />
          {boneMat}
        </mesh>
      </PartMesh>

      {/* Humeri */}
      <PartMesh partId="humerus" partType="bone" partInfo={getPart('humerus')} clipPlane={clipPlane}>
        <mesh position={[-2.05, 0.35, 0]} rotation={[0, 0, 0.28]} castShadow receiveShadow>
          <capsuleGeometry args={[0.22, 2.0, 12, 24]} />
          {boneMat}
        </mesh>
        <mesh position={[-1.8, 1.55, -0.1]} castShadow receiveShadow>
          <sphereGeometry args={[0.3, 16, 16]} />
          {boneMat}
        </mesh>
        <mesh position={[-2.3, -0.75, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.2, 16, 16]} />
          {boneMat}
        </mesh>
        <mesh position={[2.05, 0.35, 0]} rotation={[0, 0, -0.28]} castShadow receiveShadow>
          <capsuleGeometry args={[0.22, 2.0, 12, 24]} />
          {boneMat}
        </mesh>
        <mesh position={[1.8, 1.55, -0.1]} castShadow receiveShadow>
          <sphereGeometry args={[0.3, 16, 16]} />
          {boneMat}
        </mesh>
        <mesh position={[2.3, -0.75, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.2, 16, 16]} />
          {boneMat}
        </mesh>
      </PartMesh>

      {/* Pelvis */}
      <PartMesh partId="pelvis" partType="bone" partInfo={getPart('pelvis')} clipPlane={clipPlane}>
        <mesh position={[-0.9, -3.2, -0.15]} rotation={[0.1, 0, 0.3]} castShadow receiveShadow>
          <boxGeometry args={[0.15, 1.1, 1.0]} />
          {boneMat}
        </mesh>
        <mesh position={[0.9, -3.2, -0.15]} rotation={[0.1, 0, -0.3]} castShadow receiveShadow>
          <boxGeometry args={[0.15, 1.1, 1.0]} />
          {boneMat}
        </mesh>
        <mesh position={[0, -3.9, 0.4]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.35, 0.3]} />
          {boneMat}
        </mesh>
        <mesh position={[-0.4, -4.4, 0.15]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.3, 0.35]} />
          {boneMat}
        </mesh>
        <mesh position={[0.4, -4.4, 0.15]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.3, 0.35]} />
          {boneMat}
        </mesh>
        <mesh position={[-1.05, -2.6, -0.1]} castShadow receiveShadow>
          <sphereGeometry args={[0.15, 12, 12]} />
          {boneMat}
        </mesh>
        <mesh position={[1.05, -2.6, -0.1]} castShadow receiveShadow>
          <sphereGeometry args={[0.15, 12, 12]} />
          {boneMat}
        </mesh>
      </PartMesh>
    </group>
  )
}

export default Skeleton
