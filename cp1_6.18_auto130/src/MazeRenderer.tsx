import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  useGameStore,
  gridToWorld,
  GRID_SCALE,
  HEIGHT_SCALE,
  Platform,
} from './GameCore';

function PlatformMesh({
  platform,
  size,
  globalTime,
}: {
  platform: Platform;
  size: number;
  globalTime: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);
  const [wx, wy, wz] = gridToWorld(platform.x, platform.z, platform.height, size);

  useFrame(() => {
    if (meshRef.current) {
      const float = Math.sin(globalTime * 0.8 + platform.floatOffset) * 0.08;
      meshRef.current.position.y = wy + float;
      if (edgesRef.current) {
        edgesRef.current.position.y = wy + float;
      }
    }
  });

  const platformColor = platform.isEnd
    ? '#3affb0'
    : platform.isStart
    ? '#ffd700'
    : '#ffffff';

  const emissiveColor = platform.isEnd
    ? '#00ff88'
    : platform.isStart
    ? '#ffaa00'
    : '#1e3a8a';

  const edgeColor = platform.isEnd
    ? '#00ffa0'
    : platform.isStart
    ? '#ffcc00'
    : '#6ccfff';

  return (
    <group>
      <mesh ref={meshRef} position={[wx, wy, wz]} castShadow receiveShadow>
        <boxGeometry args={[GRID_SCALE * 0.92, HEIGHT_SCALE * 0.8, GRID_SCALE * 0.92]} />
        <meshStandardMaterial
          color={platformColor}
          transparent
          opacity={platform.isEnd || platform.isStart ? 0.55 : 0.28}
          emissive={emissiveColor}
          emissiveIntensity={platform.isEnd || platform.isStart ? 0.7 : 0.25}
          roughness={0.2}
          metalness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments ref={edgesRef} position={[wx, wy, wz]}>
        <edgesGeometry
          args={[
            new THREE.BoxGeometry(
              GRID_SCALE * 0.93,
              HEIGHT_SCALE * 0.82,
              GRID_SCALE * 0.93
            ),
          ]}
        />
        <lineBasicMaterial color={edgeColor} transparent opacity={0.95} linewidth={2} />
      </lineSegments>
      {platform.isEnd && (
        <mesh position={[wx, wy + HEIGHT_SCALE * 0.42, wz]}>
          <ringGeometry args={[GRID_SCALE * 0.3, GRID_SCALE * 0.42, 32]} />
          <meshBasicMaterial
            color="#00ffaa"
            transparent
            opacity={0.6 + Math.sin(globalTime * 2) * 0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {platform.isStart && (
        <mesh position={[wx, wy + HEIGHT_SCALE * 0.42, wz]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[GRID_SCALE * 0.3, 0.04, 12, 48]} />
          <meshBasicMaterial
            color="#ffcc00"
            transparent
            opacity={0.8 + Math.sin(globalTime * 2.5) * 0.2}
          />
        </mesh>
      )}
    </group>
  );
}

function BackgroundStars() {
  const count = 70;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 80;
      arr[i * 3 + 1] = Math.random() * 30 + 2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return arr;
  }, []);
  const colors = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = Math.random();
      arr[i * 3] = 0.6 + t * 0.4;
      arr[i * 3 + 1] = 0.7 + t * 0.3;
      arr[i * 3 + 2] = 1.0;
    }
    return arr;
  }, []);
  const pointsRef = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.005;
    }
  });
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export default function MazeRenderer() {
  const { platforms, mazeSize, allGemsCollected } = useGameStore();
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const endBeamRef = useRef<THREE.Mesh>(null);

  const flatPlatforms = useMemo(() => {
    const result: Platform[] = [];
    for (let z = 0; z < mazeSize; z++) {
      for (let x = 0; x < mazeSize; x++) {
        const p = platforms[z][x];
        if (p) result.push(p);
      }
    }
    return result;
  }, [platforms, mazeSize]);

  const endPlatform = platforms[mazeSize - 1]?.[mazeSize - 1];

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.04;
    }
    if (endBeamRef.current && endPlatform && allGemsCollected) {
      const [ex, ey] = gridToWorld(endPlatform.x, endPlatform.z, endPlatform.height, mazeSize);
      endBeamRef.current.position.x = ex;
      endBeamRef.current.position.y = ey + 4;
      endBeamRef.current.position.z = endPlatform.z;
      const mat = endBeamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.5 + Math.sin(timeRef.current * 3) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      <BackgroundStars />
      {flatPlatforms.map((p) => (
        <PlatformMesh
          key={`${p.x}-${p.z}`}
          platform={p}
          size={mazeSize}
          globalTime={timeRef.current}
        />
      ))}
      {allGemsCollected && endPlatform && (
        <mesh
          ref={endBeamRef}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.8, 0.5, 8, 24, 1, true]} />
          <meshBasicMaterial
            color="#00ffd0"
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      {allGemsCollected && endPlatform && (
        <pointLight
          position={[
            endPlatform.x * GRID_SCALE - ((mazeSize - 1) * GRID_SCALE) / 2,
            endPlatform.height * HEIGHT_SCALE + 3.5,
            endPlatform.z * GRID_SCALE - ((mazeSize - 1) * GRID_SCALE) / 2,
          ]}
          color="#00ffd0"
          intensity={2.5}
          distance={18}
          decay={2}
        />
      )}
    </group>
  );
}
