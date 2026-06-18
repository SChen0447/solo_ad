import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WheelRenderer } from './wheelRenderer';
import { useAppStore } from '../store/useAppStore';
import { WHEEL_POSITIONS, ComparisonSide } from '../types';

interface CarAssemblerProps {
  side: ComparisonSide;
}

function createCarBody(): THREE.Group {
  const carGroup = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xc0c0c0,
    roughness: 0.3,
    metalness: 0.7,
  });

  const lowerBodyGeo = new THREE.BoxGeometry(2.2, 0.5, 4.0);
  const lowerBody = new THREE.Mesh(lowerBodyGeo, bodyMat);
  lowerBody.position.y = 0.45;
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  carGroup.add(lowerBody);

  const upperBodyGeo = new THREE.BoxGeometry(1.9, 0.55, 2.4);
  const upperBody = new THREE.Mesh(upperBodyGeo, bodyMat);
  upperBody.position.set(0, 0.95, -0.1);
  upperBody.castShadow = true;
  upperBody.receiveShadow = true;
  carGroup.add(upperBody);

  const hoodGeo = new THREE.BoxGeometry(1.9, 0.15, 1.0);
  const hood = new THREE.Mesh(hoodGeo, bodyMat);
  hood.position.set(0, 0.7, 1.6);
  hood.castShadow = true;
  carGroup.add(hood);

  const trunkGeo = new THREE.BoxGeometry(1.9, 0.15, 0.6);
  const trunk = new THREE.Mesh(trunkGeo, bodyMat);
  trunk.position.set(0, 0.7, -1.9);
  trunk.castShadow = true;
  carGroup.add(trunk);

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.7,
  });

  const frontWindshieldGeo = new THREE.PlaneGeometry(1.7, 0.5);
  const frontWindshield = new THREE.Mesh(frontWindshieldGeo, glassMat);
  frontWindshield.position.set(0, 1.0, 1.1);
  frontWindshield.rotation.x = -0.4;
  carGroup.add(frontWindshield);

  const rearWindshieldGeo = new THREE.PlaneGeometry(1.7, 0.45);
  const rearWindshield = new THREE.Mesh(rearWindshieldGeo, glassMat);
  rearWindshield.position.set(0, 1.0, -1.3);
  rearWindshield.rotation.x = Math.PI + 0.3;
  carGroup.add(rearWindshield);

  const sideGlassLeftGeo = new THREE.PlaneGeometry(2.0, 0.45);
  const sideGlassLeft = new THREE.Mesh(sideGlassLeftGeo, glassMat);
  sideGlassLeft.position.set(-0.96, 1.0, -0.1);
  sideGlassLeft.rotation.y = Math.PI / 2;
  carGroup.add(sideGlassLeft);

  const sideGlassRightGeo = new THREE.PlaneGeometry(2.0, 0.45);
  const sideGlassRight = new THREE.Mesh(sideGlassRightGeo, glassMat);
  sideGlassRight.position.set(0.96, 1.0, -0.1);
  sideGlassRight.rotation.y = -Math.PI / 2;
  carGroup.add(sideGlassRight);

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffee,
    emissive: 0xffffaa,
    emissiveIntensity: 0.3,
  });

  const headlightLeftGeo = new THREE.BoxGeometry(0.3, 0.12, 0.05);
  const headlightLeft = new THREE.Mesh(headlightLeftGeo, headlightMat);
  headlightLeft.position.set(-0.6, 0.55, 2.01);
  carGroup.add(headlightLeft);

  const headlightRightGeo = new THREE.BoxGeometry(0.3, 0.12, 0.05);
  const headlightRight = new THREE.Mesh(headlightRightGeo, headlightMat);
  headlightRight.position.set(0.6, 0.55, 2.01);
  carGroup.add(headlightRight);

  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xff2222,
    emissive: 0xff0000,
    emissiveIntensity: 0.2,
  });

  const taillightLeftGeo = new THREE.BoxGeometry(0.25, 0.1, 0.05);
  const taillightLeft = new THREE.Mesh(taillightLeftGeo, taillightMat);
  taillightLeft.position.set(-0.65, 0.5, -2.01);
  carGroup.add(taillightLeft);

  const taillightRightGeo = new THREE.BoxGeometry(0.25, 0.1, 0.05);
  const taillightRight = new THREE.Mesh(taillightRightGeo, taillightMat);
  taillightRight.position.set(0.65, 0.5, -2.01);
  carGroup.add(taillightRight);

  const grilleMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.6,
    metalness: 0.4,
  });

  const grilleGeo = new THREE.BoxGeometry(0.6, 0.12, 0.03);
  const grille = new THREE.Mesh(grilleGeo, grilleMat);
  grille.position.set(0, 0.4, 2.01);
  carGroup.add(grille);

  const bumperMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.8,
    metalness: 0.2,
  });

  const frontBumperGeo = new THREE.BoxGeometry(2.0, 0.15, 0.08);
  const frontBumper = new THREE.Mesh(frontBumperGeo, bumperMat);
  frontBumper.position.set(0, 0.25, 2.02);
  frontBumper.castShadow = true;
  carGroup.add(frontBumper);

  const rearBumperGeo = new THREE.BoxGeometry(2.0, 0.15, 0.08);
  const rearBumper = new THREE.Mesh(rearBumperGeo, bumperMat);
  rearBumper.position.set(0, 0.25, -2.02);
  rearBumper.castShadow = true;
  carGroup.add(rearBumper);

  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xb0b0b0,
    roughness: 0.35,
    metalness: 0.65,
  });

  const roofGeo = new THREE.BoxGeometry(1.85, 0.05, 2.3);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 1.25, -0.1);
  roof.castShadow = true;
  carGroup.add(roof);

  return carGroup;
}

function Ground() {
  const groundRef = useRef<THREE.Mesh>(null);

  return (
    <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <circleGeometry args={[5, 64]} />
      <meshStandardMaterial
        color={0x2a2a2a}
        transparent
        opacity={0.6}
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
}

function GroundReflection() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
      <circleGeometry args={[5, 64]} />
      <meshStandardMaterial
        color={0x1a1a1a}
        transparent
        opacity={0.3}
        roughness={0.1}
        metalness={0.9}
      />
    </mesh>
  );
}

function AnimatedWheel({
  wheelId,
  color,
  size,
  position,
  rotation,
  rotationSpeed,
  isTransitioning,
  transitionPhase,
}: {
  wheelId: string;
  color: string;
  size: number;
  position: [number, number, number];
  rotation: [number, number, number];
  rotationSpeed: number;
  isTransitioning: boolean;
  transitionPhase: 'shrink' | 'grow' | 'idle';
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [scale, setScale] = useState(1);
  const [currentWheelId, setCurrentWheelId] = useState(wheelId);

  useEffect(() => {
    if (wheelId !== currentWheelId && !isTransitioning) {
      setCurrentWheelId(wheelId);
    }
  }, [wheelId, currentWheelId, isTransitioning]);

  useFrame((_, delta) => {
    if (isTransitioning && groupRef.current) {
      if (transitionPhase === 'shrink') {
        setScale((s) => Math.max(0, s - delta * 2));
        if (scale <= 0.01) {
          setCurrentWheelId(wheelId);
        }
      } else if (transitionPhase === 'grow') {
        setScale((s) => Math.min(1, s + delta * 2));
      }
    } else if (!isTransitioning) {
      setScale(1);
    }
  });

  useEffect(() => {
    if (!isTransitioning) {
      setScale(1);
      setCurrentWheelId(wheelId);
    }
  }, [isTransitioning, wheelId]);

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      <WheelRenderer
        wheelId={currentWheelId}
        color={color}
        size={size}
        position={position}
        rotation={rotation}
        rotationSpeed={rotationSpeed}
      />
    </group>
  );
}

export function CarAssembler({ side }: CarAssemblerProps) {
  const carBody = useMemo(() => createCarBody(), []);
  const [transitionState, setTransitionState] = useState<{
    isTransitioning: boolean;
    phase: 'shrink' | 'grow' | 'idle';
    targetWheelId: string;
  }>({ isTransitioning: false, phase: 'idle', targetWheelId: '' });

  const wheelParams = useAppStore((state) =>
    side === 'right' ? state.rightWheelParams : state.leftWheelParams
  );

  const [prevWheelId, setPrevWheelId] = useState(wheelParams.wheelId);
  const rotationSpeed = (5 * Math.PI) / 180;

  useEffect(() => {
    if (wheelParams.wheelId !== prevWheelId && !transitionState.isTransitioning) {
      setTransitionState({
        isTransitioning: true,
        phase: 'shrink',
        targetWheelId: wheelParams.wheelId,
      });

      setTimeout(() => {
        setTransitionState((prev) => ({ ...prev, phase: 'grow' }));
      }, 250);

      setTimeout(() => {
        setTransitionState({ isTransitioning: false, phase: 'idle', targetWheelId: '' });
        setPrevWheelId(wheelParams.wheelId);
      }, 500);
    }
  }, [wheelParams.wheelId, prevWheelId, transitionState.isTransitioning]);

  const displayWheelId = transitionState.isTransitioning && transitionState.phase === 'shrink'
    ? prevWheelId
    : wheelParams.wheelId;

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-3, 4, -3]} intensity={0.3} />
      <hemisphereLight args={[0x87ceeb, 0x2a2a2a, 0.3]} />

      <primitive object={carBody} />

      {WHEEL_POSITIONS.map((wp) => (
        <AnimatedWheel
          key={wp.name}
          wheelId={displayWheelId}
          color={wheelParams.color}
          size={wheelParams.size}
          position={wp.position}
          rotation={wp.rotation}
          rotationSpeed={rotationSpeed}
          isTransitioning={transitionState.isTransitioning}
          transitionPhase={transitionState.phase}
        />
      ))}

      <Ground />
      <GroundReflection />
    </>
  );
}
