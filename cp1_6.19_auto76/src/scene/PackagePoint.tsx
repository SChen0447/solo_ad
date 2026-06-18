import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PackagePoint as PackagePointType } from '../types';

interface PackagePointProps {
  pkg: PackagePointType;
}

export function PackagePoint({ pkg }: PackagePointProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      const bob = Math.sin(Date.now() * 0.003 + pkg.position.x) * 0.1;
      meshRef.current.position.y = pkg.position.y + bob;
      meshRef.current.rotation.y += 0.02;
    }
  });

  if (pkg.status !== 'pending') return null;

  return (
    <group position={[pkg.position.x, 0, pkg.position.z]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[0.8, 0.3, 0.8]} />
        <meshStandardMaterial
          color="#ffa500"
          emissive="#ffa500"
          emissiveIntensity={0.4}
          roughness={0.5}
          metalness={0.3}
        />
      </mesh>

      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.5, 0.15, 0.5]} />
        <meshStandardMaterial
          color="#ffcc33"
          emissive="#ffcc33"
          emissiveIntensity={0.3}
        />
      </mesh>

      <pointLight color="#ffa500" intensity={0.5} distance={3} />
    </group>
  );
}
