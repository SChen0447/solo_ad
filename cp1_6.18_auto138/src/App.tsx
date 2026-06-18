import React, { useMemo, useCallback } from 'react';
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Earth from './earth/Earth';
import OceanLayer from './ocean/OceanLayer';
import Stars from './Stars';
import ControlPanel from './ui/ControlPanel';
import { loadOceanCurrentData, findNearestCurrent } from './data/CurrentDataLoader';
import { EARTH_RADIUS, latLngToVec3 } from './ocean/CurrentSimulator';
import { useAppStore } from './store';

function vec3ToLatLng(v: THREE.Vector3): { lat: number; lng: number } {
  const r = v.length();
  const lat = 90 - Math.acos(v.y / r) * (180 / Math.PI);
  const lng = ((Math.atan2(v.z, -v.x) * (180 / Math.PI)) - 180 + 360) % 360;
  return {
    lat: parseFloat(lat.toFixed(2)),
    lng: parseFloat((lng > 180 ? lng - 360 : lng).toFixed(2)),
  };
}

function ClickHandler() {
  const { setMarkerPosition, setMarkerInfo } = useAppStore();

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const point = e.point;
      if (!point) return;
      const { lat, lng } = vec3ToLatLng(point);
      if (point.length() < EARTH_RADIUS * 0.8) return;

      setMarkerPosition({ lat, lng });
      const currents = loadOceanCurrentData();
      const nearest = findNearestCurrent(lat, lng, currents);
      if (nearest) {
        setMarkerInfo({
          name: nearest.current.name,
          nameZh: nearest.current.nameZh,
          speed: nearest.current.speed,
          direction: nearest.current.direction,
          directionZh: nearest.current.directionZh,
        });
      }
    },
    [setMarkerPosition, setMarkerInfo]
  );

  return (
    <mesh onClick={handleClick} visible={false}>
      <sphereGeometry args={[EARTH_RADIUS + 0.06, 64, 64]} />
      <meshBasicMaterial transparent opacity={0} side={THREE.FrontSide} />
    </mesh>
  );
}

function CameraController() {
  const zoom = useAppStore((s) => s.zoom);
  const { camera } = useThree();

  React.useEffect(() => {
    const targetZ = 15 / zoom;
    const currentZ = camera.position.z;
    camera.position.z = currentZ + (targetZ - currentZ) * 0.1;
  }, [zoom, camera]);

  return null;
}

export default function App() {
  const currents = useMemo(() => loadOceanCurrentData(), []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 15], fov: 45, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'linear-gradient(180deg, #0a0a2e 0%, #1a1a3e 100%)' }}
      >
        <CameraController />
        <OrbitControls
          enablePan={false}
          minDistance={7}
          maxDistance={30}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
        />
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 5, 8]} intensity={1.0} />
        <Stars />
        <Earth />
        <OceanLayer currents={currents} />
        <ClickHandler />
      </Canvas>
      <ControlPanel />
    </div>
  );
}
