import { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useLightStore } from '@/stores/lightStore';
import type { LightData, FurnitureItem, LightType } from '@/types';

const ROOM_WIDTH = 8;
const ROOM_HEIGHT = 4;
const ROOM_DEPTH = 8;
const WALL_GAP = 0.05;
const BOUND = 3.8;

function Room() {
  const presetData = useLightStore((s) => s.presetData);
  const wallColor = presetData.wallColor;
  const floorColor = presetData.floorColor;

  return (
    <group>
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[ROOM_WIDTH, 0.1, ROOM_DEPTH]} />
        <meshStandardMaterial color={floorColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT + 0.05, 0]} receiveShadow>
        <boxGeometry args={[ROOM_WIDTH, 0.1, ROOM_DEPTH]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-ROOM_WIDTH / 2 - 0.05, ROOM_HEIGHT / 2 - WALL_GAP, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.1, ROOM_HEIGHT - WALL_GAP * 2, ROOM_DEPTH]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[ROOM_WIDTH / 2 + 0.05, ROOM_HEIGHT / 2 - WALL_GAP, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.1, ROOM_HEIGHT - WALL_GAP * 2, ROOM_DEPTH]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT / 2 - WALL_GAP, -ROOM_DEPTH / 2 - 0.05]} receiveShadow castShadow>
        <boxGeometry args={[ROOM_WIDTH, ROOM_HEIGHT - WALL_GAP * 2, 0.1]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT / 2 - WALL_GAP, ROOM_DEPTH / 2 + 0.05]} receiveShadow castShadow>
        <boxGeometry args={[ROOM_WIDTH, ROOM_HEIGHT - WALL_GAP * 2, 0.1]} />
        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function FurnitureBlock({ item }: { item: FurnitureItem }) {
  const ref = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.rotation.y = item.rotation;
    }
  }, [item.rotation]);

  return (
    <mesh ref={ref} position={item.position} scale={item.scale} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={item.color} roughness={0.7} metalness={0.1} />
    </mesh>
  );
}

function LightSphere({ light, isSelected }: { light: LightData; isSelected: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const selectLight = useLightStore((s) => s.selectLight);
  const updateLight = useLightStore((s) => s.updateLight);
  const { camera, gl } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -light.position[1]));
  const intersectionPoint = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (ringRef.current && isSelected) {
      const scale = 1 + Math.sin(performance.now() * 0.005) * 0.2;
      ringRef.current.scale.set(scale, scale, scale);
      ringRef.current.rotation.z += delta;
    }
  });

  useEffect(() => {
    dragPlane.current.set(new THREE.Vector3(0, 1, 0), -light.position[1]);
  }, [light.position[1]]);

  const handlePointerDown = useCallback(
    (e: THREE.Event & { stopPropagation: () => void; point: THREE.Vector3 }) => {
      e.stopPropagation();
      selectLight(light.id);
      setIsDragging(true);
      gl.domElement.style.cursor = 'grabbing';
    },
    [light.id, selectLight, gl]
  );

  const handlePointerMove = useCallback(
    (e: THREE.Event & { stopPropagation: () => void; point: THREE.Vector3 }) => {
      if (!isDragging) return;
      e.stopPropagation();

      const raycaster = new THREE.Raycaster();
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e as unknown as { clientX: number }).clientX - rect.left) / rect.width * 2 - 1,
        -((e as unknown as { clientY: number }).clientY - rect.top) / rect.height * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);

      const ray = raycaster.ray;
      if (ray.intersectPlane(dragPlane.current, intersectionPoint.current)) {
        const x = Math.max(-BOUND, Math.min(BOUND, intersectionPoint.current.x));
        const z = Math.max(-BOUND, Math.min(BOUND, intersectionPoint.current.z));
        updateLight(light.id, { position: [x, light.position[1], z] });
      }
    },
    [isDragging, light.id, light.position, updateLight, camera, gl]
  );

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      gl.domElement.style.cursor = 'auto';
    }
  }, [isDragging, gl]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove as EventListener);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove as EventListener);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  return (
    <group>
      <mesh
        ref={meshRef}
        position={light.position}
        onPointerDown={handlePointerDown as never}
      >
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color={light.color} toneMapped={false} />
      </mesh>
      {isSelected && (
        <mesh ref={ringRef} position={light.position} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.22, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function DirectionalIndicator({ from, target }: { from: [number, number, number]; target: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    const dir = new THREE.Vector3(target[0] - from[0], target[1] - from[1], target[2] - from[2]).normalize();
    const origin = new THREE.Vector3(from[0], from[1], from[2]);
    const arrowHelper = new THREE.ArrowHelper(dir, origin, 0.8, 0xffff00, 0.15, 0.08);
    groupRef.current.add(arrowHelper);
    return () => {
      groupRef.current?.remove(arrowHelper);
      arrowHelper.dispose();
    };
  }, [from, target]);

  return <group ref={groupRef} />;
}

function LightSource({ light }: { light: LightData }) {
  const selectedLightId = useLightStore((s) => s.selectedLightId);
  const isSelected = selectedLightId === light.id;

  const lightProps = useMemo(() => {
    const base = {
      position: light.position,
      intensity: light.intensity,
      color: light.color,
      castShadow: true as const,
      shadow: {
        mapSize: new THREE.Vector2(512, 512),
        camera: { near: 0.1, far: 50 },
        bias: -0.001,
      },
    };
    return base;
  }, [light.position, light.intensity, light.color]);

  return (
    <group>
      {light.type === 'point' && (
        <pointLight
          position={lightProps.position}
          intensity={lightProps.intensity}
          color={lightProps.color}
          castShadow={lightProps.castShadow}
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
          shadow-bias={-0.001}
          distance={light.distance}
          decay={light.decay}
        />
      )}
      {light.type === 'spot' && (
        <spotLight
          position={lightProps.position}
          intensity={lightProps.intensity}
          color={lightProps.color}
          castShadow={lightProps.castShadow}
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
          shadow-bias={-0.001}
          angle={light.angle}
          penumbra={light.penumbra}
          target-position={light.target}
        />
      )}
      {light.type === 'directional' && (
        <directionalLight
          position={lightProps.position}
          intensity={lightProps.intensity}
          color={lightProps.color}
          castShadow={lightProps.castShadow}
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
          shadow-bias={-0.001}
          target-position={light.target}
        />
      )}
      <LightSphere light={light} isSelected={isSelected} />
      {(light.type === 'spot' || light.type === 'directional') && (
        <DirectionalIndicator from={light.position} target={light.target} />
      )}
    </group>
  );
}

function HeatmapOverlay() {
  const lights = useLightStore((s) => s.lights);
  const meshRef = useRef<THREE.Mesh>(null);
  const gridSize = 32;

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = gridSize;
    canvas.height = gridSize;
    const ctx = canvas.getContext('2d')!;

    const imageData = ctx.createImageData(gridSize, gridSize);
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const worldX = (x / gridSize) * ROOM_WIDTH - ROOM_WIDTH / 2;
        const worldZ = (y / gridSize) * ROOM_DEPTH - ROOM_DEPTH / 2;

        let totalIntensity = 0;
        for (const light of lights) {
          const dx = worldX - light.position[0];
          const dz = worldZ - light.position[2];
          const dy = 1.5 - light.position[1];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const attenuation = light.intensity / (1 + dist * dist * 0.1);
          totalIntensity += attenuation;
        }

        const t = Math.min(1, totalIntensity / 15);
        const idx = (y * gridSize + x) * 4;

        if (t < 0.25) {
          imageData.data[idx] = 0;
          imageData.data[idx + 1] = 0;
          imageData.data[idx + 2] = Math.floor(128 + t * 4 * 127);
        } else if (t < 0.5) {
          imageData.data[idx] = 0;
          imageData.data[idx + 1] = Math.floor((t - 0.25) * 4 * 255);
          imageData.data[idx + 2] = 255;
        } else if (t < 0.75) {
          imageData.data[idx] = Math.floor((t - 0.5) * 4 * 255);
          imageData.data[idx + 1] = 255;
          imageData.data[idx + 2] = Math.floor(255 - (t - 0.5) * 4 * 255);
        } else {
          imageData.data[idx] = 255;
          imageData.data[idx + 1] = Math.floor(255 - (t - 0.75) * 4 * 255);
          imageData.data[idx + 2] = 0;
        }
        imageData.data[idx + 3] = 200;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [lights, gridSize]);

  return (
    <mesh ref={meshRef} position={[ROOM_WIDTH / 2 - 1.2, 0.02, -ROOM_DEPTH / 2 + 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial map={texture} transparent opacity={0.7} side={THREE.DoubleSide} />
    </mesh>
  );
}

export default function Scene() {
  const presetData = useLightStore((s) => s.presetData);
  const lights = useLightStore((s) => s.lights);

  return (
    <>
      <ambientLight intensity={0.15} />
      <Room />
      {presetData.furniture.map((item, i) => (
        <FurnitureBlock key={i} item={item} />
      ))}
      {lights.map((light) => (
        <LightSource key={light.id} light={light} />
      ))}
      <HeatmapOverlay />
      <OrbitControls
        makeDefault
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={2}
        maxDistance={20}
        target={[0, 1.5, 0]}
      />
    </>
  );
}
