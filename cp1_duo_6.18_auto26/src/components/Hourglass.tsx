import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TimeRemaining } from '../modules/timeManager';

interface SandParticlesProps {
  remainingTime: TimeRemaining;
  totalDuration: number;
}

function SandParticles({ remainingTime, totalDuration }: SandParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const frameCount = useRef(0);

  const { positions, velocities } = useMemo(() => {
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.15;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = 0.8 + Math.random() * 0.3;
      positions[i * 3 + 2] = Math.sin(theta) * radius;

      velocities[i * 3] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 1] = -0.005 - Math.random() * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }

    return { positions, velocities };
  }, []);

  useFrame(() => {
    frameCount.current++;

    if (frameCount.current % 60 !== 0 || !particlesRef.current) return;

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const progress = totalDuration > 0 ? 1 - remainingTime.total / totalDuration : 1;

    for (let i = 0; i < positions.length / 3; i++) {
      if (progress > Math.random()) {
        positions[i * 3] += velocities[i * 3];
        positions[i * 3 + 1] += velocities[i * 3 + 1];
        positions[i * 3 + 2] += velocities[i * 3 + 2];

        if (positions[i * 3 + 1] < -0.8) {
          const theta = Math.random() * Math.PI * 2;
          const radius = Math.random() * 0.15;
          positions[i * 3] = Math.cos(theta) * radius;
          positions[i * 3 + 1] = 0.8 + Math.random() * 0.3;
          positions[i * 3 + 2] = Math.sin(theta) * radius;
        }
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={200}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#f0e68c"
        transparent
        opacity={0.9}
        sizeAttenuation
      />
    </points>
  );
}

function HourglassGlass() {
  return (
    <group>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.3, 0.02, 0.8, 32]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.15}
          roughness={0}
          metalness={0.1}
          transmission={0.9}
          thickness={0.5}
        />
      </mesh>
      <mesh position={[0, -0.8, 0]} rotation={[Math.PI, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.02, 0.8, 32]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.15}
          roughness={0}
          metalness={0.1}
          transmission={0.9}
          thickness={0.5}
        />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.02, 0.01, 16, 32]} />
        <meshPhysicalMaterial
          color="#d4af37"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <torusGeometry args={[0.3, 0.02, 16, 32]} />
        <meshPhysicalMaterial
          color="#d4af37"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, -0.4, 0]}>
        <torusGeometry args={[0.3, 0.02, 16, 32]} />
        <meshPhysicalMaterial
          color="#d4af37"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

function SandTop() {
  return (
    <mesh position={[0, 0.7, 0]}>
      <coneGeometry args={[0.2, 0.5, 32, 1, true]} />
      <meshStandardMaterial
        color="#f0e68c"
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function HourglassScene({ remainingTime, totalDuration }: SandParticlesProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.1;
      groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.6} />
      <pointLight position={[2, 3, 2]} intensity={1} color="#f0e68c" />
      <pointLight position={[-2, -1, -2]} intensity={0.5} color="#1a365d" />
      <HourglassGlass />
      <SandTop />
      <SandParticles remainingTime={remainingTime} totalDuration={totalDuration} />
    </group>
  );
}

interface HourglassProps {
  remainingTime: TimeRemaining;
  totalDuration: number;
}

export default function Hourglass({ remainingTime, totalDuration }: HourglassProps) {
  return (
    <div className="hourglass-container">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
      >
        <fog attach="fog" args={['#0a192f', 5, 15]} />
        <HourglassScene remainingTime={remainingTime} totalDuration={totalDuration} />
      </Canvas>
    </div>
  );
}
