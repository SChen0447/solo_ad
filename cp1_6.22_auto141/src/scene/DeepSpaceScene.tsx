import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { CelestialBody as CelestialBodyType, FilterType } from '../types';
import { CELESTIAL_BODIES } from '../data/celestialBodies';
import CelestialBody from './CelestialBody';
import Compass from './Compass';

interface DeepSpaceSceneProps {
  selectedFilter: FilterType;
  focusedBody: CelestialBodyType | null;
  onBodyClick: (body: CelestialBodyType) => void;
  onFocusComplete: () => void;
}

function CameraController({
  focusedBody,
  onFocusComplete,
}: {
  focusedBody: CelestialBodyType | null;
  onFocusComplete: () => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const animRef = useRef({
    active: false,
    progress: 0,
    startPos: new THREE.Vector3(),
    targetPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    targetTarget: new THREE.Vector3(),
  });

  useEffect(() => {
    if (!focusedBody) return;
    const anim = animRef.current;
    anim.active = true;
    anim.progress = 0;
    anim.startPos.copy(camera.position);
    anim.startTarget.copy(controlsRef.current?.target || new THREE.Vector3());

    const bodyPos = new THREE.Vector3(...focusedBody.position);
    const distance = focusedBody.radius * 4;
    const direction = new THREE.Vector3(1, 0.5, 1).normalize();
    anim.targetPos.copy(bodyPos).add(direction.multiplyScalar(distance));
    anim.targetTarget.copy(bodyPos);
  }, [focusedBody, camera]);

  useFrame((_, delta) => {
    const anim = animRef.current;
    if (!anim.active) return;
    anim.progress = Math.min(anim.progress + delta / 0.8, 1);
    const t = anim.progress;
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const start = anim.startPos;
    const end = anim.targetPos;
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const startToEnd = end.clone().sub(start);
    const perp = new THREE.Vector3(-startToEnd.z, 0, startToEnd.x).normalize();
    const radius = start.distanceTo(end) * 0.5;
    mid.add(perp.multiplyScalar(radius * 0.3));

    const t1 = 1 - eased;
    const t2 = eased;
    camera.position.set(
      t1 * t1 * start.x + 2 * t1 * t2 * mid.x + t2 * t2 * end.x,
      t1 * t1 * start.y + 2 * t1 * t2 * mid.y + t2 * t2 * end.y,
      t1 * t1 * start.z + 2 * t1 * t2 * mid.z + t2 * t2 * end.z
    );

    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(anim.startTarget, anim.targetTarget, eased);
      controlsRef.current.update();
    }

    if (anim.progress >= 1) {
      anim.active = false;
      onFocusComplete();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.5}
      minDistance={0.5}
      maxDistance={20}
      makeDefault
    />
  );
}

function BackgroundStars() {
  const starRef = useRef<THREE.Points>(null);

  const { positions, sizes, phases } = useMemo(() => {
    const count = 2000;
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const radius = 40 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);
      sz[i] = 0.3 + Math.random() * 0.9;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, sizes: sz, phases: ph };
  }, []);

  useFrame((state) => {
    if (!starRef.current) return;
    const material = starRef.current.material as THREE.PointsMaterial;
    const time = state.clock.elapsedTime;
    const flicker = 0.7 + 0.3 * Math.sin(time * 1.5);
    material.opacity = flicker;
  });

  return (
    <points ref={starRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2000}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function SceneContent({
  selectedFilter,
  focusedBody,
  onBodyClick,
  onFocusComplete,
}: DeepSpaceSceneProps) {
  return (
    <>
      <color attach="background" args={['#000011']} />
      <fog attach="fog" args={['#000011', 20, 80]} />
      <ambientLight intensity={0.3} />
      <BackgroundStars />
      <Stars radius={100} depth={50} count={3000} factor={4} fade speed={0.5} />
      {CELESTIAL_BODIES.map((body) => (
        <CelestialBody
          key={body.id}
          body={body}
          filter={selectedFilter}
          onClick={onBodyClick}
        />
      ))}
      <Compass />
      <CameraController focusedBody={focusedBody} onFocusComplete={onFocusComplete} />
    </>
  );
}

export default function DeepSpaceScene(props: DeepSpaceSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 5, 15], fov: 60, near: 0.1, far: 200 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
