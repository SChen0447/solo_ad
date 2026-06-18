import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '../store/store';
import { Buildings } from './Buildings';
import { Drone } from './Drone';
import { TrailLine } from './TrailLine';
import { DeliveryCenter } from './DeliveryCenter';
import { PackagePoint } from './PackagePoint';
import { ParticleEffect } from './ParticleEffect';

function SimulationUpdater() {
  const updateSimulation = useSimulationStore((state) => state.updateSimulation);
  const setCameraAngle = useSimulationStore((state) => state.setCameraAngle);
  const { camera } = useThree();

  useFrame((_, delta) => {
    updateSimulation(delta);

    const angle = Math.atan2(camera.position.x, camera.position.z);
    setCameraAngle(angle);
  });

  return null;
}

function SceneContent() {
  const drones = useSimulationStore((state) => state.drones);
  const packages = useSimulationStore((state) => state.packages);
  const deliveryCenters = useSimulationStore((state) => state.deliveryCenters);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[50, 80, 30]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <hemisphereLight args={['#87ceeb', '#1a1a2e', 0.3]} />

      <Grid
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#2a3a4a"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#3a4a5a"
        fadeDistance={100}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#1a2530" />
      </mesh>

      <Buildings />

      {deliveryCenters.map((center) => (
        <DeliveryCenter key={center.id} center={center} />
      ))}

      {packages.map((pkg) => (
        <PackagePoint key={pkg.id} pkg={pkg} />
      ))}

      {drones.map((drone) => (
        <TrailLine key={`trail-${drone.id}`} drone={drone} />
      ))}

      {drones.map((drone) => (
        <Drone key={drone.id} drone={drone} />
      ))}

      <ParticleEffect />

      <SimulationUpdater />
    </>
  );
}

export function SceneManager() {
  return (
    <Canvas
      shadows
      camera={{ position: [60, 60, 60], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#0a1a2a']} />
      <fog attach="fog" args={['#0a1a2a', 80, 150]} />

      <SceneContent />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={20}
        maxDistance={120}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 6}
        autoRotate={false}
        rotateSpeed={0.4}
        zoomSpeed={0.8}
        panSpeed={0.5}
        enablePan={true}
      />
    </Canvas>
  );
}
