import React from 'react'
import * as THREE from 'three'
import { useStore } from '@/store'
import { PartMesh, MUSCLE_COLOR, shadeColor } from './PartMesh'

const Muscles: React.FC<{ clipPlane: THREE.Plane | null }> = ({ clipPlane }) => {
  const parts = useStore((s) => s.partsDatabase)
  const getPart = (id: string) => parts.find((p) => p.id === id)!
  const musMat = <meshStandardMaterial color={MUSCLE_COLOR} />
  const darkMat = <meshStandardMaterial color={shadeColor(MUSCLE_COLOR, -0.15)} />

  return (
    <group>
      {/* Trapezius */}
      <PartMesh partId="trapezius" partType="muscle" partInfo={getPart('trapezius')} clipPlane={clipPlane}>
        <mesh position={[-0.55, 2.4, -0.6]} rotation={[-0.15, 0, 0.25]} castShadow>
          <boxGeometry args={[0.12, 0.9, 0.7]} />
          {musMat}
        </mesh>
        <mesh position={[0.55, 2.4, -0.6]} rotation={[-0.15, 0, -0.25]} castShadow>
          <boxGeometry args={[0.12, 0.9, 0.7]} />
          {musMat}
        </mesh>
        <mesh position={[0, 0.8, -1.0]} castShadow>
          <boxGeometry args={[2.0, 0.7, 0.15]} />
          {musMat}
        </mesh>
        <mesh position={[-0.6, -0.5, -0.85]} rotation={[0.2, 0, 0.35]} castShadow>
          <boxGeometry args={[0.1, 1.0, 0.55]} />
          {musMat}
        </mesh>
        <mesh position={[0.6, -0.5, -0.85]} rotation={[0.2, 0, -0.35]} castShadow>
          <boxGeometry args={[0.1, 1.0, 0.55]} />
          {musMat}
        </mesh>
      </PartMesh>

      {/* Pectoralis Major */}
      <PartMesh partId="pectoralis-major" partType="muscle" partInfo={getPart('pectoralis-major')} clipPlane={clipPlane}>
        <mesh position={[-0.75, 1.45, 1.15]} rotation={[0.1, 0.1, 0.3]} castShadow>
          <boxGeometry args={[0.65, 0.28, 0.15]} />
          {musMat}
        </mesh>
        <mesh position={[-0.95, 0.75, 1.1]} rotation={[0.15, 0.2, 0.45]} castShadow>
          <boxGeometry args={[0.85, 0.7, 0.18]} />
          {musMat}
        </mesh>
        <mesh position={[0.75, 1.45, 1.15]} rotation={[0.1, -0.1, -0.3]} castShadow>
          <boxGeometry args={[0.65, 0.28, 0.15]} />
          {musMat}
        </mesh>
        <mesh position={[0.95, 0.75, 1.1]} rotation={[0.15, -0.2, -0.45]} castShadow>
          <boxGeometry args={[0.85, 0.7, 0.18]} />
          {musMat}
        </mesh>
      </PartMesh>

      {/* Deltoid */}
      <PartMesh partId="deltoid" partType="muscle" partInfo={getPart('deltoid')} clipPlane={clipPlane}>
        <mesh position={[-1.85, 1.55, 0.4]} rotation={[0, 0.2, 0.1]} castShadow>
          <boxGeometry args={[0.3, 0.6, 0.3]} />
          {musMat}
        </mesh>
        <mesh position={[-2.15, 1.55, 0]} castShadow>
          <sphereGeometry args={[0.35, 16, 16]} />
          {musMat}
        </mesh>
        <mesh position={[-1.85, 1.55, -0.4]} rotation={[0, -0.2, 0.1]} castShadow>
          <boxGeometry args={[0.3, 0.6, 0.3]} />
          {musMat}
        </mesh>
        <mesh position={[1.85, 1.55, 0.4]} rotation={[0, -0.2, -0.1]} castShadow>
          <boxGeometry args={[0.3, 0.6, 0.3]} />
          {musMat}
        </mesh>
        <mesh position={[2.15, 1.55, 0]} castShadow>
          <sphereGeometry args={[0.35, 16, 16]} />
          {musMat}
        </mesh>
        <mesh position={[1.85, 1.55, -0.4]} rotation={[0, 0.2, -0.1]} castShadow>
          <boxGeometry args={[0.3, 0.6, 0.3]} />
          {musMat}
        </mesh>
      </PartMesh>

      {/* Biceps */}
      <PartMesh partId="biceps-brachii" partType="muscle" partInfo={getPart('biceps-brachii')} clipPlane={clipPlane}>
        <mesh position={[-2.1, 0.55, 0.3]} rotation={[0, 0, 0.3]} castShadow>
          <capsuleGeometry args={[0.15, 1.5, 8, 16]} />
          {musMat}
        </mesh>
        <mesh position={[-1.9, 0.55, 0.15]} rotation={[0, 0, 0.3]} castShadow>
          <capsuleGeometry args={[0.13, 1.4, 8, 16]} />
          {musMat}
        </mesh>
        <mesh position={[2.1, 0.55, 0.3]} rotation={[0, 0, -0.3]} castShadow>
          <capsuleGeometry args={[0.15, 1.5, 8, 16]} />
          {musMat}
        </mesh>
        <mesh position={[1.9, 0.55, 0.15]} rotation={[0, 0, -0.3]} castShadow>
          <capsuleGeometry args={[0.13, 1.4, 8, 16]} />
          {musMat}
        </mesh>
      </PartMesh>

      {/* Triceps */}
      <PartMesh partId="triceps-brachii" partType="muscle" partInfo={getPart('triceps-brachii')} clipPlane={clipPlane}>
        <mesh position={[-2.15, 0.55, -0.3]} rotation={[0, 0, 0.3]} castShadow>
          <capsuleGeometry args={[0.14, 1.6, 8, 16]} />
          {musMat}
        </mesh>
        <mesh position={[-2.35, 0.55, -0.05]} rotation={[0, 0, 0.3]} castShadow>
          <capsuleGeometry args={[0.12, 1.3, 8, 16]} />
          {musMat}
        </mesh>
        <mesh position={[2.15, 0.55, -0.3]} rotation={[0, 0, -0.3]} castShadow>
          <capsuleGeometry args={[0.14, 1.6, 8, 16]} />
          {musMat}
        </mesh>
        <mesh position={[2.35, 0.55, -0.05]} rotation={[0, 0, -0.3]} castShadow>
          <capsuleGeometry args={[0.12, 1.3, 8, 16]} />
          {musMat}
        </mesh>
      </PartMesh>

      {/* Latissimus Dorsi */}
      <PartMesh partId="latissimus-dorsi" partType="muscle" partInfo={getPart('latissimus-dorsi')} clipPlane={clipPlane}>
        <mesh position={[-0.9, -0.8, -0.95]} rotation={[0.25, 0.1, 0.45]} castShadow>
          <boxGeometry args={[0.12, 1.8, 1.1]} />
          {musMat}
        </mesh>
        <mesh position={[0.9, -0.8, -0.95]} rotation={[0.25, -0.1, -0.45]} castShadow>
          <boxGeometry args={[0.12, 1.8, 1.1]} />
          {musMat}
        </mesh>
        <mesh position={[0, -2.3, -0.8]} castShadow>
          <boxGeometry args={[1.6, 1.4, 0.12]} />
          {musMat}
        </mesh>
      </PartMesh>

      {/* Rectus Abdominis */}
      <PartMesh partId="rectus-abdominis" partType="muscle" partInfo={getPart('rectus-abdominis')} clipPlane={clipPlane}>
        {Array.from({ length: 4 }, (_, i) => (
          <mesh key={`ra-l-${i}`} position={[-0.22, 0.25 - i * 0.55, 1.2]} castShadow>
            <boxGeometry args={[0.32, 0.42, 0.18]} />
            {musMat}
          </mesh>
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <mesh key={`ra-r-${i}`} position={[0.22, 0.25 - i * 0.55, 1.2]} castShadow>
            <boxGeometry args={[0.32, 0.42, 0.18]} />
            {musMat}
          </mesh>
        ))}
        <mesh position={[0, 0, 1.3]} castShadow>
          <boxGeometry args={[0.05, 2.5, 0.05]} />
          {darkMat}
        </mesh>
        {Array.from({ length: 3 }, (_, i) => (
          <mesh key={`ti-${i}`} position={[0, 0.55 - i * 0.55, 1.22]} castShadow>
            <boxGeometry args={[0.8, 0.05, 0.1]} />
            {darkMat}
          </mesh>
        ))}
      </PartMesh>

      {/* Obliques */}
      <PartMesh partId="obliques" partType="muscle" partInfo={getPart('obliques')} clipPlane={clipPlane}>
        <mesh position={[-0.9, -0.7, 0.7]} rotation={[0.15, 0, 0.4]} castShadow>
          <boxGeometry args={[0.1, 2.2, 0.9]} />
          {musMat}
        </mesh>
        <mesh position={[0.9, -0.7, 0.7]} rotation={[0.15, 0, -0.4]} castShadow>
          <boxGeometry args={[0.1, 2.2, 0.9]} />
          {musMat}
        </mesh>
      </PartMesh>

      {/* SCM */}
      <PartMesh partId="sternocleidomastoid" partType="muscle" partInfo={getPart('sternocleidomastoid')} clipPlane={clipPlane}>
        <mesh position={[-0.4, 3.0, 0.3]} rotation={[-0.15, 0.1, -0.35]} castShadow>
          <capsuleGeometry args={[0.09, 0.8, 8, 16]} />
          {musMat}
        </mesh>
        <mesh position={[0.4, 3.0, 0.3]} rotation={[-0.15, -0.1, 0.35]} castShadow>
          <capsuleGeometry args={[0.09, 0.8, 8, 16]} />
          {musMat}
        </mesh>
      </PartMesh>
    </group>
  )
}

export default Muscles
