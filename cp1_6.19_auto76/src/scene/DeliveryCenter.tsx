import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DeliveryCenter as DeliveryCenterType } from '../types';

interface DeliveryCenterProps {
  center: DeliveryCenterType;
}

export function DeliveryCenter({ center }: DeliveryCenterProps) {
  const radarRef = useRef<THREE.Mesh>(null);
  const dishRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (radarRef.current) {
      radarRef.current.rotation.y += delta * 2;
    }
    if (dishRef.current) {
      dishRef.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.3;
    }
  });

  return (
    <group position={[center.position.x, center.position.y, center.position.z]}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1.5, 1.8, 0.5, 32]} />
        <meshStandardMaterial
          color="#3399ff"
          emissive="#3399ff"
          emissiveIntensity={0.2}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>

      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[1.3, 1.5, 0.1, 32]} />
        <meshStandardMaterial
          color="#55aaff"
          emissive="#55aaff"
          emissiveIntensity={0.3}
        />
      </mesh>

      <group ref={radarRef} position={[0, 0.8, 0]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.6, 8]} />
          <meshStandardMaterial color="#88ccff" />
        </mesh>

        <mesh ref={dishRef} position={[0, 0.3, 0]} rotation={[0.5, 0, 0]}>
          <coneGeometry args={[0.6, 0.4, 16, 1, true]} />
          <meshStandardMaterial
            color="#ffffff"
            side={THREE.DoubleSide}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      </group>

      <pointLight color="#3399ff" intensity={0.8} distance={10} />
    </group>
  );
}
