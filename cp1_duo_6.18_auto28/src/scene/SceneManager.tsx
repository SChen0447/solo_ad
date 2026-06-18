import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { computeSunPosition, sunToDirectionVector } from '@/utils/mathUtils';

function BuildingMesh({
  id,
  position,
  width,
  depth,
  height,
  color,
  isSelected,
  onClick,
}: {
  id: string;
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  color: string;
  isSelected: boolean;
  onClick: (id: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);

  const edgesGeometry = useMemo(() => {
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, depth));
    return geo;
  }, [width, height, depth]);

  return (
    <group position={[position[0], position[1] + height / 2, position[2]]}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onClick(id);
        }}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
      </mesh>
      {isSelected && (
        <lineSegments ref={edgesRef} geometry={edgesGeometry}>
          <lineBasicMaterial color="#ffaa00" linewidth={2} />
        </lineSegments>
      )}
      <Html
        position={[0, height / 2 + 2, 0]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
          }}
        >
          {id}
        </div>
      </Html>
    </group>
  );
}

function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#2a2a3e" />
      </mesh>
      <gridHelper args={[100, 20, '#555566', '#3a3a4a']} position={[0, 0.01, 0]} />
    </group>
  );
}

function SunLight() {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const time = useStore((state) => state.time);
  const dayOfYear = useStore((state) => state.dayOfYear);

  useFrame(() => {
    if (lightRef.current) {
      const sunPos = computeSunPosition(dayOfYear, time);
      const dir = sunToDirectionVector(sunPos);
      const distance = 200;

      lightRef.current.position.set(
        dir.x * distance,
        dir.y * distance + 50,
        dir.z * distance
      );
      lightRef.current.target.position.set(0, 0, 0);
      lightRef.current.target.updateMatrixWorld();

      if (sunPos.elevation <= 0) {
        lightRef.current.intensity = 0;
      } else {
        lightRef.current.intensity = Math.min(1.5, sunPos.elevation / 45);
      }
    }
  });

  return (
    <directionalLight
      ref={lightRef}
      castShadow
      intensity={1}
      color="#fff5e6"
      shadow-mapSize-width={4096}
      shadow-mapSize-height={4096}
      shadow-camera-far={500}
      shadow-camera-left={-100}
      shadow-camera-right={100}
      shadow-camera-top={100}
      shadow-camera-bottom={-100}
      shadow-bias={-0.0001}
    />
  );
}

function ShadowCameraHelper() {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const helperRef = useRef<THREE.CameraHelper>(null);
  const time = useStore((state) => state.time);
  const dayOfYear = useStore((state) => state.dayOfYear);

  useFrame(() => {
    if (lightRef.current && helperRef.current) {
      const sunPos = computeSunPosition(dayOfYear, time);
      const dir = sunToDirectionVector(sunPos);
      const distance = 200;

      lightRef.current.position.set(
        dir.x * distance,
        dir.y * distance + 50,
        dir.z * distance
      );
      lightRef.current.target.position.set(0, 0, 0);
      lightRef.current.target.updateMatrixWorld();
      lightRef.current.shadow.camera.updateProjectionMatrix();
      helperRef.current.update();
    }
  });

  return (
    <>
      <directionalLight ref={lightRef} position={[100, 100, 50]} intensity={0}>
        <orthographicCamera
          attach="shadow-camera"
          args={[-100, 100, 100, -100, 0.1, 500]}
        />
      </directionalLight>
      <cameraHelper ref={helperRef} args={[lightRef.current?.shadow.camera!]} color="#ff6600" />
    </>
  );
}

function Buildings() {
  const buildings = useStore((state) => state.buildings);
  const selectedBuildingId = useStore((state) => state.selectedBuildingId);
  const setSelectedBuildingId = useStore((state) => state.setSelectedBuildingId);

  return (
    <>
      {buildings.map((building) => (
        <BuildingMesh
          key={building.id}
          id={building.id}
          position={[building.position.x, building.position.y, building.position.z]}
          width={building.width}
          depth={building.depth}
          height={building.height}
          color={building.color}
          isSelected={building.id === selectedBuildingId}
          onClick={setSelectedBuildingId}
        />
      ))}
    </>
  );
}

export function SceneManager() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <hemisphereLight args={['#87ceeb', '#2a2a3e', 0.3]} />
      <SunLight />
      <Ground />
      <Buildings />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={30}
        maxDistance={300}
        target={[0, 0, 0]}
      />
    </>
  );
}
