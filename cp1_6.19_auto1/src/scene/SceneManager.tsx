import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, Grid } from '@react-three/drei';
import { BuildingMesh } from './BuildingMesh';
import { getBuildings } from './BuildingFactory';
import { useAppStore } from '../store/AppStore';

function calculateSunPosition(time: number, month: number, day: number): THREE.Vector3 {
  const dayOfYear = getDayOfYear(month, day);
  const declination = 23.45 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365);
  
  const hourAngle = (time - 12) * 15;
  
  const latRad = 35 * (Math.PI / 180);
  const decRad = declination * (Math.PI / 180);
  const haRad = hourAngle * (Math.PI / 180);
  
  const sinAltitude = 
    Math.sin(latRad) * Math.sin(decRad) + 
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude)));
  
  const cosAzimuth = 
    (Math.sin(decRad) - Math.sin(latRad) * sinAltitude) / 
    (Math.cos(latRad) * Math.cos(altitude));
  
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAzimuth)));
  if (hourAngle > 0) {
    azimuth = 2 * Math.PI - azimuth;
  }
  
  const distance = 300;
  const x = distance * Math.cos(altitude) * Math.sin(azimuth);
  const y = Math.max(5, distance * Math.sin(altitude));
  const z = distance * Math.cos(altitude) * Math.cos(azimuth);
  
  return new THREE.Vector3(x, y, z);
}

function getDayOfYear(month: number, day: number): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let dayOfYear = day;
  for (let i = 0; i < month - 1; i++) {
    dayOfYear += daysInMonth[i];
  }
  return dayOfYear;
}

function Sun({ position }: { position: THREE.Vector3 }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.position.copy(position);
      lightRef.current.target.position.set(0, 0, 0);
      lightRef.current.target.updateMatrixWorld();
    }
    if (meshRef.current) {
      meshRef.current.position.copy(position);
    }
  });

  const intensity = Math.max(0.2, Math.min(1.5, position.y / 150));

  return (
    <>
      <directionalLight
        ref={lightRef}
        castShadow
        intensity={intensity}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={600}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
      />
      <mesh ref={meshRef}>
        <sphereGeometry args={[8, 32, 32]} />
        <meshBasicMaterial color="#ffd54f" />
      </mesh>
    </>
  );
}

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#f5f5f5" roughness={1} />
      </mesh>
      <Grid
        args={[400, 40]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#c0c0c0"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#a0a0a0"
        fadeDistance={400}
        fadeStrength={1}
        followCamera={false}
        position={[0, 0.01, 0]}
      />
    </>
  );
}

interface SceneManagerProps {
  cameraRef?: React.RefObject<THREE.PerspectiveCamera>;
}

export function SceneManager({ cameraRef }: SceneManagerProps) {
  const { time, month, day, selectedBuildingId, selectBuilding } = useAppStore();
  const buildings = useMemo(() => getBuildings(), []);
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  const sunPosition = useMemo(
    () => calculateSunPosition(time, month, day),
    [time, month, day]
  );

  const resetCamera = () => {
    if (camera) {
      camera.position.set(0, 250, 250);
      camera.lookAt(0, 0, 0);
    }
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  (window as any).resetCamera = resetCamera;

  return (
    <>
      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#87ceeb', '#4a4a4a', 0.3]} />
      <Sun position={sunPosition} />
      <Ground />
      {buildings.map((building) => (
        <BuildingMesh
          key={building.id}
          building={building}
          isSelected={selectedBuildingId === building.id}
          onClick={selectBuilding}
        />
      ))}
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={50}
        maxDistance={500}
        target={[0, 0, 0]}
      />
      <fog attach="fog" args={['#1a365d', 200, 600]} />
    </>
  );
}

export { calculateSunPosition, getDayOfYear };
