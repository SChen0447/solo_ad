import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { PhysicsEngine } from './PhysicsEngine';
import { generateInitialParticles, generateEmitParticle, adjustColorBrightness } from '../utils/ParticleGenerator';
import type { ParticleData, SandboxConfig, PhysicsConfig, EmitConfig } from '../utils/types';

const SANDBOX_CONFIG: SandboxConfig = {
  width: 20,
  height: 10,
  depth: 20,
};

const PARTICLE_RADIUS = 0.3;
const PARTICLE_MASS = 0.1;
const INITIAL_PARTICLE_COUNT = 500;
const MAX_PARTICLE_COUNT = 2000;
const EMIT_SPEED = 5;

interface ParticleSimulatorProps {
  gravity: number;
  friction: number;
  emitRate: number;
  onClear: boolean;
  onParticleCountChange: (count: number) => void;
  onAverageHeightChange: (height: number) => void;
  onHeightGridChange: (grid: number[][]) => void;
  onMaxParticlesReached: (reached: boolean) => void;
}

interface ParticleMeshProps {
  particle: ParticleData;
  physicsEngine: PhysicsEngine;
  onCollide?: (id: number) => void;
}

const ParticleMesh: React.FC<ParticleMeshProps> = ({ particle, physicsEngine, onCollide }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    const pos = physicsEngine.getParticlePosition(particle.id);
    if (pos && meshRef.current) {
      meshRef.current.position.set(pos.x, pos.y, pos.z);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[particle.radius, 8, 8]} />
      <meshStandardMaterial color={particle.color} roughness={0.8} metalness={0.1} />
    </mesh>
  );
};

interface SandboxProps {
  config: SandboxConfig;
}

const Sandbox: React.FC<SandboxProps> = ({ config }) => {
  const { width, height, depth } = config;
  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;

  const edges = useMemo(() => {
    const points: THREE.Vector3[] = [];
    points.push(new THREE.Vector3(-halfW, -halfH, -halfD));
    points.push(new THREE.Vector3(halfW, -halfH, -halfD));
    points.push(new THREE.Vector3(halfW, -halfH, halfD));
    points.push(new THREE.Vector3(-halfW, -halfH, halfD));
    points.push(new THREE.Vector3(-halfW, -halfH, -halfD));
    points.push(new THREE.Vector3(-halfW, halfH, -halfD));
    points.push(new THREE.Vector3(halfW, halfH, -halfD));
    points.push(new THREE.Vector3(halfW, -halfH, -halfD));
    points.push(new THREE.Vector3(halfW, halfH, -halfD));
    points.push(new THREE.Vector3(halfW, halfH, halfD));
    points.push(new THREE.Vector3(halfW, -halfH, halfD));
    points.push(new THREE.Vector3(halfW, halfH, halfD));
    points.push(new THREE.Vector3(-halfW, halfH, halfD));
    points.push(new THREE.Vector3(-halfW, -halfH, halfD));
    points.push(new THREE.Vector3(-halfW, halfH, halfD));
    points.push(new THREE.Vector3(-halfW, halfH, -halfD));
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [width, height, depth]);

  return (
    <group>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#4A90D9" transparent opacity={0.6} />
      </lineSegments>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -halfH + 0.01, 0]}>
        <planeGeometry args={[width, depth, 20, 20]} />
        <meshBasicMaterial color="#2A3A4A" wireframe transparent opacity={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -halfH + 0.005, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#1A2530" transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

interface ParticleSystemProps {
  physicsEngine: PhysicsEngine;
  particles: Map<number, ParticleData>;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({ physicsEngine, particles }) => {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { scene } = useThree();

  const particleArray = useMemo(() => Array.from(particles.values()), [particles]);

  useFrame(() => {
    if (instancedMeshRef.current && particleArray.length > 0) {
      for (let i = 0; i < particleArray.length; i++) {
        const particle = particleArray[i];
        const pos = physicsEngine.getParticlePosition(particle.id);
        if (pos) {
          dummy.position.set(pos.x, pos.y, pos.z);
          dummy.updateMatrix();
          instancedMeshRef.current!.setMatrixAt(i, dummy.matrix);
        }
      }
      instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  if (particleArray.length === 0) return null;

  return (
    <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, particleArray.length]}>
      <sphereGeometry args={[PARTICLE_RADIUS, 8, 8]} />
      <meshStandardMaterial color="#D4B06A" roughness={0.8} metalness={0.1} />
    </instancedMesh>
  );
};

interface SceneContentProps {
  physicsEngine: PhysicsEngine;
  particles: Map<number, ParticleData>;
  isEmitActive: boolean;
  emitPosition: { x: number; y: number; z: number } | null;
  emitDirection: { x: number; y: number; z: number };
  emitRate: number;
  setParticles: React.Dispatch<React.SetStateAction<Map<number, ParticleData>>>;
  onMaxParticlesReached: (reached: boolean) => void;
}

const SceneContent: React.FC<SceneContentProps> = ({
  physicsEngine,
  particles,
  isEmitActive,
  emitPosition,
  emitDirection,
  emitRate,
  setParticles,
  onMaxParticlesReached,
}) => {
  const lastEmitTime = useRef(0);
  const particleIdCounter = useRef(INITIAL_PARTICLE_COUNT);

  useFrame((state, delta) => {
    physicsEngine.step(delta);

    if (isEmitActive && emitPosition) {
      const now = state.clock.elapsedTime;
      const emitInterval = 1 / emitRate;

      if (now - lastEmitTime.current > emitInterval) {
        if (physicsEngine.getParticleCount() < MAX_PARTICLE_COUNT) {
          const newParticle = generateEmitParticle(
            emitPosition,
            emitDirection,
            EMIT_SPEED,
            PARTICLE_RADIUS,
            PARTICLE_MASS,
            0.5
          );
          
          const id = particleIdCounter.current++;
          newParticle.id = id;

          physicsEngine.addParticle(
            newParticle.position,
            newParticle.velocity,
            newParticle.radius,
            newParticle.mass
          );

          setParticles((prev) => {
            const newMap = new Map(prev);
            newMap.set(id, newParticle);
            return newMap;
          });

          onMaxParticlesReached(false);
        } else {
          onMaxParticlesReached(true);
        }
        lastEmitTime.current = now;
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />
      <directionalLight position={[-5, 8, -5]} intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#FFEEDD" />
      
      <Sandbox config={SANDBOX_CONFIG} />
      <ParticleSystem physicsEngine={physicsEngine} particles={particles} />
      
      {isEmitActive && emitPosition && (
        <mesh position={[emitPosition.x, emitPosition.y, emitPosition.z]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color="#FF6600" transparent opacity={0.8} />
        </mesh>
      )}
    </>
  );
};

export const ParticleSimulator: React.FC<ParticleSimulatorProps> = ({
  gravity,
  friction,
  emitRate,
  onClear,
  onParticleCountChange,
  onAverageHeightChange,
  onHeightGridChange,
  onMaxParticlesReached,
}) => {
  const physicsEngineRef = useRef<PhysicsEngine | null>(null);
  const [particles, setParticles] = useState<Map<number, ParticleData>>(new Map());
  const [isEmitActive, setIsEmitActive] = useState(false);
  const emitPositionRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const emitDirectionRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: -1, z: 0 });
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [maxParticlesReached, setMaxParticlesReached] = useState(false);

  useEffect(() => {
    const defaultPhysicsConfig: PhysicsConfig = {
      gravity,
      friction,
      restitution: 0.3,
    };
    const engine = new PhysicsEngine(SANDBOX_CONFIG, defaultPhysicsConfig);
    physicsEngineRef.current = engine;

    const initialParticles = generateInitialParticles(
      INITIAL_PARTICLE_COUNT,
      SANDBOX_CONFIG,
      PARTICLE_RADIUS,
      PARTICLE_MASS
    );

    initialParticles.forEach((particle) => {
      engine.addParticle(
        particle.position,
        particle.velocity,
        particle.radius,
        particle.mass
      );
    });

    const particleMap = new Map<number, ParticleData>();
    initialParticles.forEach((p) => particleMap.set(p.id, p));
    setParticles(particleMap);
  }, []);

  useEffect(() => {
    if (physicsEngineRef.current) {
      physicsEngineRef.current.setGravity(gravity);
    }
  }, [gravity]);

  useEffect(() => {
    if (physicsEngineRef.current) {
      physicsEngineRef.current.setFriction(friction);
    }
  }, [friction]);

  useEffect(() => {
    if (onClear && !isClearing) {
      setIsClearing(true);
      setTimeout(() => {
        if (physicsEngineRef.current) {
          physicsEngineRef.current.removeAllParticles();
          setParticles(new Map());
          setMaxParticlesReached(false);
        }
        setIsClearing(false);
      }, 1500);
    }
  }, [onClear]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (physicsEngineRef.current) {
        const count = physicsEngineRef.current.getParticleCount();
        const avgHeight = physicsEngineRef.current.getAverageHeight();
        const heightGrid = physicsEngineRef.current.getHeightGrid(20);
        
        onParticleCountChange(count);
        onAverageHeightChange(avgHeight);
        onHeightGridChange(heightGrid);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [onParticleCountChange, onAverageHeightChange, onHeightGridChange]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isEmitActive || !containerRef.current || !physicsEngineRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (lastMousePos.current) {
      const dx = x - lastMousePos.current.x;
      const dy = y - lastMousePos.current.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 0) {
        emitDirectionRef.current = {
          x: dx / length * 0.5,
          y: -0.8,
          z: dy / length * 0.5,
        };
      }
    }

    const worldX = x * (SANDBOX_CONFIG.width / 2) * 0.8;
    const worldZ = y * (SANDBOX_CONFIG.depth / 2) * 0.8;

    emitPositionRef.current = {
      x: Math.max(-SANDBOX_CONFIG.width / 2 + 1, Math.min(SANDBOX_CONFIG.width / 2 - 1, worldX)),
      y: SANDBOX_CONFIG.height / 2 - 1,
      z: Math.max(-SANDBOX_CONFIG.depth / 2 + 1, Math.min(SANDBOX_CONFIG.depth / 2 - 1, worldZ)),
    };

    lastMousePos.current = { x, y };
  }, [isEmitActive]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.shiftKey && e.button === 0) {
      e.preventDefault();
      setIsEmitActive(true);
      lastMousePos.current = null;
    }
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (e.button === 0) {
      setIsEmitActive(false);
      emitPositionRef.current = null;
      lastMousePos.current = null;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseDown, handleMouseUp]);

  const handleMaxParticlesReached = useCallback((reached: boolean) => {
    setMaxParticlesReached(reached);
    onMaxParticlesReached(reached);
  }, [onMaxParticlesReached]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [25, 15, 25], fov: 50 }}
        gl={{ antialias: true }}
        style={{ background: 'linear-gradient(180deg, #0A1628 0%, #2C3E50 50%, #3D4F5F 100%)' }}
      >
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={15}
          maxDistance={60}
          maxPolarAngle={Math.PI / 2.1}
        />
        {physicsEngineRef.current && (
          <SceneContent
            physicsEngine={physicsEngineRef.current}
            particles={particles}
            isEmitActive={isEmitActive}
            emitPosition={emitPositionRef.current}
            emitDirection={emitDirectionRef.current}
            emitRate={emitRate}
            setParticles={setParticles}
            onMaxParticlesReached={handleMaxParticlesReached}
          />
        )}
      </Canvas>
      
      {maxParticlesReached && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255, 100, 100, 0.9)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            pointerEvents: 'none',
            animation: 'fadeIn 0.3s ease',
            zIndex: 100,
          }}
        >
          已达到最大颗粒数（{MAX_PARTICLE_COUNT}颗）
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ParticleSimulator;
