import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStarStore } from '../store/starStore';

const MAX_PARTICLES = 2000;

interface StarMeshProps {
  physicsState: ReturnType<typeof useStarStore.getState>['physicsState'];
  isFast: boolean;
}

function StarMesh({ physicsState, isFast }: StarMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const starMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(physicsState.color.r, physicsState.color.g, physicsState.color.b),
    });
  }, []);

  const glowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(physicsState.color.r, physicsState.color.g, physicsState.color.b),
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    });
  }, []);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1;
      const targetScale = physicsState.radius * 0.5;
      const currentScale = meshRef.current.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * 0.1;
      meshRef.current.scale.setScalar(newScale);

      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.color.lerp(
        new THREE.Color(physicsState.color.r, physicsState.color.g, physicsState.color.b),
        0.1
      );
    }

    if (glowRef.current) {
      const glowScale = physicsState.radius * 0.5 * (1.5 + physicsState.particleIntensity * 0.5);
      glowRef.current.scale.setScalar(glowScale);
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.color.lerp(
        new THREE.Color(physicsState.color.r, physicsState.color.g, physicsState.color.b),
        0.1
      );
      mat.opacity = 0.2 + physicsState.particleIntensity * 0.15;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <primitive object={starMaterial} attach="material" />
      </mesh>
      <mesh ref={glowRef} scale={3}>
        <sphereGeometry args={[2, 32, 32]} />
        <primitive object={glowMaterial} attach="material" />
      </mesh>
      {isFast && <SpeedLines radius={physicsState.radius * 0.5} color={physicsState.color} />}
    </group>
  );
}

interface SpeedLinesProps {
  radius: number;
  color: { r: number; g: number; b: number };
}

function SpeedLines({ radius, color }: SpeedLinesProps) {
  const linesRef = useRef<THREE.Points>(null);
  const count = 200;

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (1.2 + Math.random() * 0.3);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const speed = 0.5 + Math.random() * 1;
      vel[i * 3] = (pos[i * 3] / r) * speed;
      vel[i * 3 + 1] = (pos[i * 3 + 1] / r) * speed;
      vel[i * 3 + 2] = (pos[i * 3 + 2] / r) * speed;
    }
    return { positions: pos, velocities: vel };
  }, [radius]);

  useFrame((_, delta) => {
    if (!linesRef.current) return;
    const positions = linesRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      positions[i * 3] += velocities[i * 3] * delta * 5;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * delta * 5;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * delta * 5;

      const dist = Math.sqrt(
        positions[i * 3] ** 2 + positions[i * 3 + 1] ** 2 + positions[i * 3 + 2] ** 2
      );
      if (dist > radius * 3) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = radius * 1.2;
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
      }
    }
    linesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={new THREE.Color(color.r, color.g, color.b)}
        size={0.05}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

interface DustParticlesProps {
  physicsState: ReturnType<typeof useStarStore.getState>['physicsState'];
}

function DustParticles({ physicsState }: DustParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const count = MAX_PARTICLES;

  const { positions, sizes, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const ph = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3 + Math.random() * 8;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      siz[i] = 0.02 + Math.random() * 0.06;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, sizes: siz, phases: ph };
  }, []);

  useFrame(({ clock }) => {
    if (!particlesRef.current) return;
    const time = clock.getElapsedTime();
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const intensity = physicsState.particleIntensity;
    const speedMul = physicsState.particleSpeed * 0.5;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const baseR = 3 + (i % 10) * 0.5;
      const phase = phases[i];

      const angle = time * 0.2 * speedMul + phase;
      const heightOffset = Math.sin(time * 0.3 + phase) * 0.5;
      const expansion = physicsState.stage === 'redGiant' ? intensity * 2 : 0;
      const supernovaExpansion = physicsState.stage === 'supernova'
        ? (physicsState.stageProgress * 15 + 1)
        : 1;

      const r = (baseR + expansion) * supernovaExpansion;

      positions[idx] = r * Math.cos(angle) * Math.cos(phase * 0.3);
      positions[idx + 1] = r * Math.sin(angle * 0.7) * 0.5 + heightOffset;
      positions[idx + 2] = r * Math.sin(angle) * Math.sin(phase * 0.3);
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;

    const mat = particlesRef.current.material as THREE.PointsMaterial;
    const targetColor = new THREE.Color(
      physicsState.particleColor.r,
      physicsState.particleColor.g,
      physicsState.particleColor.b
    );
    mat.color.lerp(targetColor, 0.05);
    mat.opacity = 0.3 + intensity * 0.3;
    mat.size = 0.05 + intensity * 0.03;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={0x88aaff}
        size={0.05}
        transparent
        opacity={0.5}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

interface SupernovaRingProps {
  physicsState: ReturnType<typeof useStarStore.getState>['physicsState'];
}

function SupernovaRing({ physicsState }: SupernovaRingProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const debrisRef = useRef<THREE.Points>(null);
  const debrisCount = 500;

  const debrisPositions = useMemo(() => {
    const pos = new Float32Array(debrisCount * 3);
    for (let i = 0; i < debrisCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame(() => {
    if (physicsState.stage !== 'supernova') return;

    const progress = physicsState.stageProgress;
    const radius = 2 + progress * 20;

    if (ringRef.current) {
      ringRef.current.scale.setScalar(radius);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 1 - progress) * 0.8;
    }

    if (debrisRef.current) {
      const positions = debrisRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < debrisCount; i++) {
        const idx = i * 3;
        const speed = 0.8 + (i % 10) * 0.05;
        positions[idx] = debrisPositions[idx] * radius * speed;
        positions[idx + 1] = debrisPositions[idx + 1] * radius * speed * 0.6;
        positions[idx + 2] = debrisPositions[idx + 2] * radius * speed;
      }
      debrisRef.current.geometry.attributes.position.needsUpdate = true;
      const mat = debrisRef.current.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0.1, 1 - progress * 0.7);
    }
  });

  if (physicsState.stage !== 'supernova') return null;

  return (
    <group>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.95, 1.05, 64]} />
        <meshBasicMaterial
          color={new THREE.Color(physicsState.particleColor.r, physicsState.particleColor.g, physicsState.particleColor.b)}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      <points ref={debrisRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={debrisCount}
            array={new Float32Array(debrisCount * 3)}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={0xffeedd}
          size={0.08}
          transparent
          opacity={0.9}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

function SceneContent() {
  const physicsState = useStarStore(state => state.physicsState);
  const tick = useStarStore(state => state.tick);
  const timeSpeed = useStarStore(state => state.timeSpeed);
  const isPlaying = useStarStore(state => state.isPlaying);
  const isFast = timeSpeed >= 3 && isPlaying;

  useFrame((_, delta) => {
    tick(delta);
  });

  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <StarMesh physicsState={physicsState} isFast={isFast} />
      <DustParticles physicsState={physicsState} />
      <SupernovaRing physicsState={physicsState} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={30}
        autoRotate={false}
      />
    </>
  );
}

export default function StarScene() {
  return (
    <div className="star-scene-container">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0a0b1a' }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
