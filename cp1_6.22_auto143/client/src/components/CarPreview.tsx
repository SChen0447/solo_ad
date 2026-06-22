import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { PartSelection } from '../types';
import * as THREE from 'three';

interface CarModelProps {
  selection: PartSelection;
  tireColor: string;
}

function RacingCar({ selection, tireColor }: CarModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });

  const wingHigh = selection.wing === 'wing-high' || selection.wing === 'wing-drs';
  const engineColor =
    selection.engine === 'engine-high-rev' ? '#ef4444' :
    selection.engine === 'engine-low-torque' ? '#3b82f6' :
    selection.engine === 'engine-turbo' ? '#8b5cf6' : '#22c55e';

  const suspensionStiff =
    selection.suspension === 'suspension-hard' || selection.suspension === 'suspension-track';

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2.2, 0.6, 4.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>

      <mesh position={[0, 1.05, -0.3]} castShadow>
        <boxGeometry args={[1.8, 0.55, 1.8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.4} />
      </mesh>

      <mesh position={[0, 1.1, 0.6]} castShadow>
        <boxGeometry args={[1.6, 0.35, 0.8]} />
        <meshStandardMaterial color={engineColor} metalness={0.8} roughness={0.2} emissive={engineColor} emissiveIntensity={0.15} />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh key={`tire-fl-${side}`} position={[side * 0.95, suspensionStiff ? 0.35 : 0.3, 1.4]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.38, 0.38, 0.32, 16]} />
          <meshStandardMaterial color={tireColor} roughness={0.9} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`tire-rl-${side}`} position={[side * 0.95, suspensionStiff ? 0.35 : 0.3, -1.4]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.38, 0.38, 0.32, 16]} />
          <meshStandardMaterial color={tireColor} roughness={0.9} />
        </mesh>
      ))}

      {[-1, 1].map((side) => (
        <mesh key={`rim-fl-${side}`} position={[side * 1.13, suspensionStiff ? 0.35 : 0.3, 1.4]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.34, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`rim-rl-${side}`} position={[side * 1.13, suspensionStiff ? 0.35 : 0.3, -1.4]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.34, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {wingHigh && (
        <>
          <mesh position={[-1.0, 1.2, -1.9]} castShadow>
            <boxGeometry args={[0.1, 0.7, 0.1]} />
            <meshStandardMaterial color="#f97316" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[1.0, 1.2, -1.9]} castShadow>
            <boxGeometry args={[0.1, 0.7, 0.1]} />
            <meshStandardMaterial color="#f97316" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.5, -1.9]} castShadow>
            <boxGeometry args={[2.3, 0.1, 0.4]} />
            <meshStandardMaterial color="#f97316" metalness={0.8} roughness={0.2} />
          </mesh>
        </>
      )}

      <mesh position={[0, 0.52, -2.1]} castShadow>
        <boxGeometry args={[2.0, 0.05, 0.2]} />
        <meshStandardMaterial color="#f97316" metalness={0.8} roughness={0.2} />
      </mesh>

      <mesh position={[0, 0.9, 1.65]}>
        <boxGeometry args={[1.2, 0.3, 0.1]} />
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.5} />
      </mesh>

      {[-0.4, 0.4].map((x) => (
        <mesh key={`headlight-${x}`} position={[x, 0.8, 2.12]}>
          <boxGeometry args={[0.3, 0.2, 0.05]} />
          <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

interface Props {
  selection: PartSelection;
  tireColor: string;
}

export default function CarPreview({ selection, tireColor }: Props) {
  return (
    <Canvas shadows camera={{ position: [5, 3.5, 5], fov: 45 }} style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-5, 3, -3]} intensity={0.4} />
      <RacingCar selection={selection} tireColor={tireColor} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <OrbitControls enablePan={false} minDistance={4} maxDistance={12} minPolarAngle={0.3} maxPolarAngle={Math.PI / 2.1} />
    </Canvas>
  );
}
