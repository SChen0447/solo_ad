import React, { useRef, useMemo, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  ForceParams,
  calculateVectorForce,
  PARTICLE_COUNT,
  PARTICLE_RADIUS,
  TRAIL_LENGTH,
  BOUNDARY,
  getParticleColor,
  lerp
} from '../utils/vectorField';

export interface SceneRef {
  setTrailLength: (length: number) => void;
  getFps: () => number;
}

interface SceneProps {
  forces: ForceParams;
}

type ViewType = 'front' | 'side' | 'top' | 'free';

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  trail: THREE.Vector3[];
  color: THREE.Color;
}

const ParticleSystem: React.FC<{ forces: ForceParams; trailLengthRef: React.MutableRefObject<number> }> = ({
  forces,
  trailLengthRef
}) => {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const particlesRef = useRef<ParticleData[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  const { camera } = useThree();

  const trailGeometriesRef = useRef<THREE.BufferGeometry[]>([]);
  const trailLinesRef = useRef<THREE.Line[]>([]);
  const trailGroupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const particles: ParticleData[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * BOUNDARY * 1.5,
        (Math.random() - 0.5) * BOUNDARY * 1.5,
        (Math.random() - 0.5) * BOUNDARY * 1.5
      );
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      );
      const colorData = getParticleColor(i, PARTICLE_COUNT);
      const color = new THREE.Color(colorData.r, colorData.g, colorData.b);
      const trail: THREE.Vector3[] = [];
      for (let j = 0; j < TRAIL_LENGTH; j++) {
        trail.push(position.clone());
      }
      particles.push({ position, velocity, trail, color });
    }
    particlesRef.current = particles;

    if (trailGroupRef.current) {
      trailGroupRef.current.clear();
      trailGeometriesRef.current = [];
      trailLinesRef.current = [];

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(TRAIL_LENGTH * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const colors = new Float32Array(TRAIL_LENGTH * 3);
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.8,
          linewidth: 1
        });

        const line = new THREE.Line(geometry, material);
        trailGroupRef.current.add(line);
        trailGeometriesRef.current.push(geometry);
        trailLinesRef.current.push(line);
      }
    }
  }, []);

  useFrame((state, delta) => {
    if (!instancedMeshRef.current || particlesRef.current.length === 0) return;

    const particles = particlesRef.current;
    const maxTrailLength = trailLengthRef.current;
    timeRef.current += delta;
    const time = timeRef.current;

    const dt = Math.min(delta, 0.05);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      const force = calculateVectorForce(p.position, forces, time);

      p.velocity.x += force.x * dt;
      p.velocity.y += force.y * dt;
      p.velocity.z += force.z * dt;

      p.velocity.multiplyScalar(0.99);

      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.position.z += p.velocity.z * dt;

      if (Math.abs(p.position.x) > BOUNDARY) {
        p.position.x = Math.sign(p.position.x) * BOUNDARY;
        p.velocity.x *= -0.6;
      }
      if (Math.abs(p.position.y) > BOUNDARY) {
        p.position.y = Math.sign(p.position.y) * BOUNDARY;
        p.velocity.y *= -0.6;
      }
      if (Math.abs(p.position.z) > BOUNDARY) {
        p.position.z = Math.sign(p.position.z) * BOUNDARY;
        p.velocity.z *= -0.6;
      }

      const trail = p.trail;
      for (let t = trail.length - 1; t > 0; t--) {
        trail[t].copy(trail[t - 1]);
      }
      trail[0].copy(p.position);

      const dist = p.position.distanceTo(camera.position);
      let particleTrailLength = maxTrailLength;
      if (dist > 50) {
        particleTrailLength = Math.min(particleTrailLength, 10);
      }

      if (trailGeometriesRef.current[i]) {
        const geometry = trailGeometriesRef.current[i];
        const positions = geometry.attributes.position.array as Float32Array;
        const colors = geometry.attributes.color.array as Float32Array;

        const visiblePoints = Math.min(particleTrailLength, trail.length);
        for (let t = 0; t < visiblePoints; t++) {
          positions[t * 3] = trail[t].x;
          positions[t * 3 + 1] = trail[t].y;
          positions[t * 3 + 2] = trail[t].z;

          const alpha = 1 - t / visiblePoints;
          colors[t * 3] = p.color.r;
          colors[t * 3 + 1] = p.color.g;
          colors[t * 3 + 2] = p.color.b;
        }

        for (let t = visiblePoints; t < TRAIL_LENGTH; t++) {
          positions[t * 3] = trail[visiblePoints - 1].x;
          positions[t * 3 + 1] = trail[visiblePoints - 1].y;
          positions[t * 3 + 2] = trail[visiblePoints - 1].z;
          colors[t * 3] = p.color.r;
          colors[t * 3 + 1] = p.color.g;
          colors[t * 3 + 2] = p.color.b;
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        geometry.setDrawRange(0, visiblePoints);

        (trailLinesRef.current[i].material as THREE.LineBasicMaterial).opacity = 0.6 * (dist > 50 ? 0.5 : 1);
      }

      dummy.position.copy(p.position);
      dummy.scale.setScalar(PARTICLE_RADIUS * 2);
      dummy.updateMatrix();
      instancedMeshRef.current.setMatrixAt(i, dummy.matrix);
      instancedMeshRef.current.setColorAt(i, p.color);
    }

    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    if (instancedMeshRef.current.instanceColor) {
      instancedMeshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial transparent opacity={0.85} />
      </instancedMesh>
      <group ref={trailGroupRef} />
    </>
  );
};

const CameraController: React.FC<{ view: ViewType; controlsRef: React.MutableRefObject<any> }> = ({ view, controlsRef }) => {
  const { camera } = useThree();

  useEffect(() => {
    if (!controlsRef.current) return;

    switch (view) {
      case 'front':
        camera.position.set(0, 0, 15);
        controlsRef.current.target.set(0, 0, 0);
        break;
      case 'side':
        camera.position.set(15, 0, 0);
        controlsRef.current.target.set(0, 0, 0);
        break;
      case 'top':
        camera.position.set(0, 15, 0.01);
        controlsRef.current.target.set(0, 0, 0);
        break;
      case 'free':
      default:
        break;
    }
    controlsRef.current?.update?.();
  }, [view, camera, controlsRef]);

  return null;
};

const ViewControls: React.FC<{ view: ViewType; onViewChange: (view: ViewType) => void }> = ({ view, onViewChange }) => {
  const buttons: { id: ViewType; label: string }[] = [
    { id: 'front', label: '正面' },
    { id: 'side', label: '侧面' },
    { id: 'top', label: '俯视' },
    { id: 'free', label: '自由' }
  ];

  return (
    <div style={styles.viewControls}>
      {buttons.map((btn) => (
        <button
          key={btn.id}
          onClick={() => onViewChange(btn.id)}
          style={{
            ...styles.viewButton,
            ...(view === btn.id ? styles.viewButtonActive : {})
          }}
        >
          {btn.label}
        </button>
      ))}
      <button onClick={() => onViewChange('front')} style={{ ...styles.viewButton, ...styles.resetButton }}>
        重置
      </button>
    </div>
  );
};

const SceneContent: React.FC<{
  forces: ForceParams;
  trailLengthRef: React.MutableRefObject<number>;
  controlsRef: React.MutableRefObject<any>;
  view: ViewType;
}> = ({ forces, trailLengthRef, controlsRef, view }) => {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} color="#7c3aed" />

      <ParticleSystem forces={forces} trailLengthRef={trailLengthRef} />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={30}
        enablePan={true}
      />

      <CameraController view={view} controlsRef={controlsRef} />

      <gridHelper args={[16, 16, '#2a2a3e', '#1a1a2e']} position={[0, -8, 0]} />
    </>
  );
};

const Scene = forwardRef<SceneRef, SceneProps>(({ forces }, ref) => {
  const [view, setView] = useState<ViewType>('free');
  const controlsRef = useRef<any>(null);
  const trailLengthRef = useRef<number>(TRAIL_LENGTH);

  useImperativeHandle(ref, () => ({
    setTrailLength: (length: number) => {
      trailLengthRef.current = Math.max(5, Math.min(TRAIL_LENGTH, length));
    },
    getFps: () => 60
  }));

  const handleViewChange = useCallback((newView: ViewType) => {
    setView(newView);
  }, []);

  return (
    <div style={styles.container}>
      <Canvas
        camera={{ position: [8, 6, 10], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <SceneContent forces={forces} trailLengthRef={trailLengthRef} controlsRef={controlsRef} view={view} />
      </Canvas>
      <ViewControls view={view} onViewChange={handleViewChange} />
    </div>
  );
});

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0
  },
  viewControls: {
    position: 'fixed',
    left: 20,
    bottom: 20,
    display: 'flex',
    gap: 8,
    zIndex: 50
  },
  viewButton: {
    padding: '8px 16px',
    background: 'rgba(42, 42, 62, 0.9)',
    border: 'none',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)'
  },
  viewButtonActive: {
    background: '#7c3aed',
    boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)'
  },
  resetButton: {
    marginLeft: 8,
    background: 'rgba(124, 58, 237, 0.3)',
    border: '1px solid rgba(124, 58, 237, 0.5)'
  }
};

Scene.displayName = 'Scene';

export default Scene;
