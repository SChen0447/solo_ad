import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TimeRemaining } from '../modules/timeManager';

const MAX_PARTICLES = 200;
const UPDATE_INTERVAL = 60;
const TARGET_FPS = 55;
const FRAME_TIME_THRESHOLD = 1000 / TARGET_FPS;
const BATCH_SIZE = 40;
const ENABLE_FPS_LOG = false;

interface SandParticlesProps {
  remainingTime: TimeRemaining;
  totalDuration: number;
}

function SandParticles({ remainingTime, totalDuration }: SandParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const frameCount = useRef(0);
  const progressRef = useRef(0);
  const lastUpdateTime = useRef(0);
  const fpsFrames = useRef(0);
  const fpsLastTime = useRef(performance.now());
  const batchOffset = useRef(0);

  const particleCount = Math.min(MAX_PARTICLES, 200);

  const geometryData = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const activeFlags = new Uint8Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.15;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = 0.8 + Math.random() * 0.3;
      positions[i * 3 + 2] = Math.sin(theta) * radius;

      velocities[i * 3] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 1] = -0.005 - Math.random() * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;

      activeFlags[i] = 0;
    }

    return { positions, velocities, activeFlags };
  }, [particleCount]);

  useEffect(() => {
    if (ENABLE_FPS_LOG) {
      const logInterval = setInterval(() => {
        const now = performance.now();
        const elapsed = now - fpsLastTime.current;
        const fps = (fpsFrames.current * 1000) / elapsed;
        console.debug(`[Hourglass FPS]: ${fps.toFixed(1)}`);
        fpsFrames.current = 0;
        fpsLastTime.current = now;
      }, 2000);
      return () => clearInterval(logInterval);
    }
  }, []);

  useFrame(() => {
    frameCount.current++;
    if (ENABLE_FPS_LOG) fpsFrames.current++;

    progressRef.current = totalDuration > 0 ? 1 - remainingTime.total / totalDuration : 1;

    if (!particlesRef.current) return;

    const now = performance.now();
    if (frameCount.current % UPDATE_INTERVAL !== 0) return;

    const frameTime = now - lastUpdateTime.current;
    if (frameTime < FRAME_TIME_THRESHOLD && lastUpdateTime.current > 0) {
      return;
    }
    lastUpdateTime.current = now;

    const positionAttr = particlesRef.current.geometry.attributes.position;
    const positions = positionAttr.array as Float32Array;
    const progress = progressRef.current;
    const { velocities, activeFlags } = geometryData;
    let needsUpdate = false;

    const startIdx = batchOffset.current;
    const endIdx = Math.min(startIdx + BATCH_SIZE, particleCount);

    for (let i = startIdx; i < endIdx; i++) {
      const isActive = activeFlags[i] === 1 || progress > Math.random();

      if (!isActive) continue;

      activeFlags[i] = 1;
      const idx = i * 3;
      positions[idx] += velocities[idx];
      positions[idx + 1] += velocities[idx + 1];
      positions[idx + 2] += velocities[idx + 2];

      if (positions[idx + 1] < -0.8) {
        const theta = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.15;
        positions[idx] = Math.cos(theta) * radius;
        positions[idx + 1] = 0.8 + Math.random() * 0.3;
        positions[idx + 2] = Math.sin(theta) * radius;
      }

      needsUpdate = true;
    }

    batchOffset.current = endIdx >= particleCount ? 0 : endIdx;

    if (needsUpdate) {
      positionAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={geometryData.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#f0e68c"
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
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
        depthWrite={false}
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
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <fog attach="fog" args={['#0a192f', 5, 15]} />
        <HourglassScene remainingTime={remainingTime} totalDuration={totalDuration} />
      </Canvas>
    </div>
  );
}
