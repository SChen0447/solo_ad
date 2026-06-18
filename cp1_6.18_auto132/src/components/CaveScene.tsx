import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useCaveStore } from '../stores/caveStore';
import { generateCave } from '../caveGenerator';
import { handleMovement, flyToNode } from '../navigation';
import { computeSlice } from '../sliceCalculator';

function CaveMeshes() {
  const caveData = useCaveStore((s) => s.caveData);
  const isGenerating = useCaveStore((s) => s.isGenerating);
  const generationProgress = useCaveStore((s) => s.generationProgress);
  const wallProximity = useCaveStore((s) => s.wallProximity);
  const setCaveData = useCaveStore((s) => s.setCaveData);
  const setIsGenerating = useCaveStore((s) => s.setIsGenerating);
  const setGenerationProgress = useCaveStore((s) => s.setGenerationProgress);

  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    if (!isGenerating) return;

    const complexity = useCaveStore.getState().complexity;
    const branchDensity = useCaveStore.getState().branchDensity;
    const stalactiteDensity = useCaveStore.getState().stalactiteDensity;

    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.1;
      setGenerationProgress(Math.min(progress, 1));
      if (progress >= 1) {
        clearInterval(interval);
        const data = generateCave({ complexity, branchDensity, stalactiteDensity });
        setCaveData(data);
        setIsGenerating(false);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (groupRef.current && caveData) {
      groupRef.current.scale.set(0.01, 0.01, 0.01);
      const startTime = performance.now();
      const expand = () => {
        const elapsed = (performance.now() - startTime) / 800;
        const t = Math.min(elapsed, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        groupRef.current!.scale.setScalar(eased);
        if (t < 1) requestAnimationFrame(expand);
      };
      expand();
    }
  }, [caveData]);

  const rockColor = useMemo(() => new THREE.Color(0x5c5043), []);
  const glowColor = useMemo(() => new THREE.Color(0x4488ff), []);

  const materialProps = useMemo(
    () => ({
      color: rockColor,
      transparent: true,
      opacity: 0.75,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.DoubleSide,
    }),
    [rockColor]
  );

  if (!caveData) return null;

  return (
    <group ref={groupRef}>
      {caveData.tunnelMeshes.map((geo, i) => (
        <mesh key={`tunnel-${i}`} geometry={geo} castShadow receiveShadow>
          <meshStandardMaterial
            ref={materialRef}
            color={wallProximity > 0 ? glowColor.clone().lerp(rockColor, 1 - wallProximity * 0.5) : rockColor}
            transparent
            opacity={0.75}
            roughness={0.9}
            metalness={0.1}
            side={THREE.DoubleSide}
            emissive={wallProximity > 0 ? new THREE.Color(0x4488ff).multiplyScalar(wallProximity * 0.3) : new THREE.Color(0x000000)}
          />
        </mesh>
      ))}
      {caveData.stalactites.map((s, i) => (
        <mesh key={`stalactite-${i}`} position={[s.position.x, s.position.y, s.position.z]}>
          <coneGeometry args={[s.radius, s.length, 6]} />
          <meshStandardMaterial color={0x8a7d6b} roughness={0.85} metalness={0.05} />
        </mesh>
      ))}
      {caveData.stalagmites.map((s, i) => (
        <mesh key={`stalagmite-${i}`} position={[s.position.x, s.position.y, s.position.z]}>
          <coneGeometry args={[s.radius, s.height, 6]} />
          <meshStandardMaterial color={0x7a6d5b} roughness={0.85} metalness={0.05} />
        </mesh>
      ))}
      {caveData.branchNodes.map((node) => (
        <BranchNodeMarker key={node.id} node={node} />
      ))}
      <CaveParticles />
    </group>
  );
}

function BranchNodeMarker({ node }: { node: { id: string; position: THREE.Vector3 } }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const setFlyTarget = useCaveStore((s) => s.setFlyTarget);
  const setIsFlying = useCaveStore((s) => s.setIsFlying);
  const setCameraPosition = useCaveStore((s) => s.setCameraPosition);

  useFrame((_, delta) => {
    if (meshRef.current) {
      const scale = 0.8 + Math.sin(performance.now() * 0.003) * 0.3;
      meshRef.current.scale.setScalar(scale);
    }
  });

  const handleClick = useCallback(
    (e: THREE.Event) => {
      e.stopPropagation();
      const state = useCaveStore.getState();
      setFlyTarget(node);
      setIsFlying(true);
    },
    [node, setFlyTarget, setIsFlying]
  );

  return (
    <mesh
      ref={meshRef}
      position={[node.position.x, node.position.y + 1, node.position.z]}
      onClick={handleClick}
    >
      <sphereGeometry args={[0.8, 12, 12]} />
      <meshStandardMaterial
        color={0x2266ff}
        emissive={0x2266ff}
        emissiveIntensity={0.8}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

function CaveParticles() {
  const particles = useCaveStore((s) => s.particles);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!meshRef.current || particles.length === 0) return;
    for (let i = 0; i < Math.min(particles.length, 200); i++) {
      const p = particles[i];
      dummy.position.copy(p.position);
      const scale = (p.life / p.maxLife) * 0.3;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!particles.length) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 200]}>
      <sphereGeometry args={[0.2, 4, 4]} />
      <meshBasicMaterial color={0x66aaff} transparent opacity={0.6} />
    </instancedMesh>
  );
}

function SceneController() {
  const { camera, gl } = useThree();
  const keysRef = useRef<Set<string>>(new Set());
  const flyStartTimeRef = useRef<number>(0);
  const flyFromPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const flyFromTargetRef = useRef<THREE.Vector3>(new THREE.Vector3());

  const isFlying = useCaveStore((s) => s.isFlying);
  const flyTarget = useCaveStore((s) => s.flyTarget);
  const setIsFlying = useCaveStore((s) => s.setIsFlying);
  const setCameraPosition = useCaveStore((s) => s.setCameraPosition);
  const setCameraTarget = useCaveStore((s) => s.setCameraTarget);
  const addParticles = useCaveStore((s) => s.addParticles);
  const updateParticles = useCaveStore((s) => s.updateParticles);
  const caveData = useCaveStore((s) => s.caveData);
  const setWallProximity = useCaveStore((s) => s.setWallProximity);
  const setIsSliceMode = useCaveStore((s) => s.setIsSliceMode);
  const setSliceLineStart = useCaveStore((s) => s.setSliceLineStart);
  const setSliceLineEnd = useCaveStore((s) => s.setSliceLineEnd);
  const setSliceData = useCaveStore((s) => s.setSliceData);
  const sliceLineStart = useCaveStore((s) => s.sliceLineStart);
  const sliceLineEnd = useCaveStore((s) => s.sliceLineEnd);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === 'Shift') {
        setIsSliceMode(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
      if (e.key === 'Shift') {
        setIsSliceMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (isFlying && flyTarget) {
      flyStartTimeRef.current = performance.now();
      flyFromPosRef.current.copy(camera.position);
      flyFromTargetRef.current.copy(
        (camera as THREE.PerspectiveCamera).getWorldDirection(new THREE.Vector3())
          .multiplyScalar(10)
          .add(camera.position)
      );
    }
  }, [isFlying, flyTarget]);

  useFrame((_, delta) => {
    updateParticles(delta);

    if (isFlying && flyTarget) {
      const elapsed = (performance.now() - flyStartTimeRef.current) / 1000;
      const result = flyToNode(
        flyFromPosRef.current,
        flyTarget,
        elapsed,
        flyFromTargetRef.current
      );

      camera.position.copy(result.position);
      camera.lookAt(result.target);

      if (result.particles.length > 0) {
        addParticles(result.particles);
      }

      if (result.progress >= 1) {
        setIsFlying(false);
        setCameraPosition(camera.position.clone());
      }
    } else if (caveData) {
      const activeKeys = new Set(keysRef.current);
      const hasMovement = ['w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].some((k) =>
        activeKeys.has(k)
      );

      if (hasMovement) {
        const result = handleMovement(
          activeKeys,
          camera,
          new THREE.Vector3(0, 0, 0),
          delta,
          caveData.tunnelPaths
        );
        camera.position.copy(result.newCameraPos);
        setCameraPosition(result.newCameraPos);
        setWallProximity(result.wallProximity);
      }
    }
  });

  return null;
}

function SliceLine() {
  const isSliceMode = useCaveStore((s) => s.isSliceMode);
  const sliceLineStart = useCaveStore((s) => s.sliceLineStart);
  const sliceLineEnd = useCaveStore((s) => s.sliceLineEnd);

  if (!isSliceMode || !sliceLineStart || !sliceLineEnd) return null;

  const points = [sliceLineStart, sliceLineEnd];
  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [sliceLineStart, sliceLineEnd]);

  return (
    <line geometry={lineGeometry}>
      <lineDashedMaterial
        color={0xffff00}
        dashSize={1}
        gapSize={0.5}
        linewidth={2}
      />
    </line>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -15, 0]} receiveShadow>
      <planeGeometry args={[500, 500]} />
      <meshStandardMaterial color={0x2d2d44} roughness={1} />
    </mesh>
  );
}

export default function CaveScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 50, 50], fov: 60, near: 0.1, far: 500 }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%', background: '#1a1a2e' }}
    >
      <color attach="background" args={['#1a1a2e']} />
      <fog attach="fog" args={['#1a1a2e', 80, 200]} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[50, 80, 50]} intensity={0.4} castShadow />
      <pointLight position={[0, 30, 0]} intensity={0.3} color="#4466aa" distance={100} />
      <CaveMeshes />
      <Floor />
      <SliceLine />
      <SceneController />
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minPolarAngle={THREE.MathUtils.degToRad(15)}
        maxPolarAngle={THREE.MathUtils.degToRad(45)}
        minDistance={10}
        maxDistance={150}
      />
    </Canvas>
  );
}
