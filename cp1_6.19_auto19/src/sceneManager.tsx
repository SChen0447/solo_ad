import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useSeismicStore } from './store';
import { Sensor } from './types';
import { isPWaveReached, isSWaveReached, getSensorColumnHeight } from './seismicSimulation';

function GeologicBody() {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[20, 5, 20]} />
      <meshStandardMaterial
        color="#4a6b8a"
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Epicenter() {
  const meshRef = useRef<THREE.Mesh>(null);
  const epicenter = useSeismicStore(state => state.getEpicenter());

  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + 0.2 * Math.sin(state.clock.elapsedTime * Math.PI * 2);
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <mesh ref={meshRef} position={[epicenter.x, epicenter.y, epicenter.z]}>
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshStandardMaterial
        color="#ff4757"
        emissive="#ff4757"
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

function WaveFronts() {
  const pWaveRef = useRef<THREE.Mesh>(null);
  const sWaveRef = useRef<THREE.Mesh>(null);
  const waveData = useSeismicStore(state => state.getWaveFrontData());

  useFrame(() => {
    if (pWaveRef.current) {
      pWaveRef.current.scale.setScalar(Math.max(0.01, waveData.pWaveRadius));
    }
    if (sWaveRef.current) {
      sWaveRef.current.scale.setScalar(Math.max(0.01, waveData.sWaveRadius));
    }
  });

  return (
    <group position={[waveData.epicenter.x, waveData.epicenter.y, waveData.epicenter.z]}>
      <mesh ref={pWaveRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
          wireframe={false}
        />
      </mesh>
      <mesh ref={sWaveRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#ff8c00"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
          wireframe={false}
        />
      </mesh>
    </group>
  );
}

interface SensorPointProps {
  sensor: Sensor;
}

function SensorPoint({ sensor }: SensorPointProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const columnRef = useRef<THREE.Mesh>(null);
  const time = useSeismicStore(state => state.time);
  const epicenter = useSeismicStore(state => state.getEpicenter());
  const setSelectedSensor = useSeismicStore(state => state.setSelectedSensor);
  const setHoverPosition = useSeismicStore(state => state.setHoverPosition);
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkCountRef = useRef(0);
  const blinkTimeoutRef = useRef<number | null>(null);

  const pReached = isPWaveReached(time, epicenter, sensor.position);
  const sReached = isSWaveReached(time, epicenter, sensor.position);
  const columnHeight = getSensorColumnHeight(time, sensor);

  let color = '#ffaa44';
  if (sReached) {
    color = '#ff8c00';
  } else if (pReached) {
    color = '#00ffff';
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setSelectedSensor(sensor);
    setHoverPosition({ x: e.clientX, y: e.clientY });

    if (blinkTimeoutRef.current) {
      clearTimeout(blinkTimeoutRef.current);
    }

    blinkCountRef.current = 0;
    const blink = () => {
      setIsBlinking(prev => !prev);
      blinkCountRef.current++;
      if (blinkCountRef.current < 4) {
        blinkTimeoutRef.current = window.setTimeout(blink, 300);
      } else {
        setIsBlinking(false);
      }
    };
    blink();
  };

  useEffect(() => {
    return () => {
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
      }
    };
  }, []);

  const displayColor = isBlinking ? '#ffffff' : color;
  const emissiveIntensity = pReached || sReached ? 0.8 : 0.2;

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[sensor.position.x, sensor.position.y, sensor.position.z]}
        onClick={handleClick}
      >
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={isBlinking ? 1.5 : emissiveIntensity}
        />
      </mesh>
      <mesh
        ref={columnRef}
        position={[
          sensor.position.x,
          sensor.position.y + columnHeight / 2,
          sensor.position.z
        ]}
      >
        <cylinderGeometry args={[0.15, 0.15, Math.max(0.01, columnHeight), 6]} />
        <meshStandardMaterial
          color="#ff8c00"
          emissive="#ff8c00"
          emissiveIntensity={0.3}
          transparent
          opacity={Math.min(1, columnHeight / 5)}
        />
      </mesh>
    </group>
  );
}

function SensorCloud() {
  const sensors = useSeismicStore(state => state.sensors);

  return (
    <group>
      {sensors.map(sensor => (
        <SensorPoint key={sensor.id} sensor={sensor} />
      ))}
    </group>
  );
}

function SceneGrid() {
  return (
    <group>
      <Grid
        position={[0, -2.5, 0]}
        args={[20, 20]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#333333"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#555555"
        fadeDistance={50}
        fadeStrength={1}
        infiniteGrid={false}
      />
      <Grid
        position={[-10, 0, 0]}
        args={[5, 20]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#333333"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#555555"
        fadeDistance={50}
        fadeStrength={1}
        infiniteGrid={false}
        rotation={[0, 0, Math.PI / 2]}
      />
    </group>
  );
}

function AutoPlay() {
  const time = useSeismicStore(state => state.time);
  const setTime = useSeismicStore(state => state.setTime);
  const isPlaying = useSeismicStore(state => state.isPlaying);
  const setPlaying = useSeismicStore(state => state.setPlaying);
  const lastTimeRef = useRef<number>(0);

  useFrame((state) => {
    if (!isPlaying) {
      lastTimeRef.current = state.clock.elapsedTime;
      return;
    }
    const elapsed = state.clock.elapsedTime - lastTimeRef.current;
    lastTimeRef.current = state.clock.elapsedTime;
    const newTime = time + elapsed;
    if (newTime >= 30) {
      setTime(30);
      setPlaying(false);
    } else {
      setTime(newTime);
    }
  });

  return null;
}

export function SceneManager() {
  const storeSetSelectedSensor = useSeismicStore(state => state.setSelectedSensor);

  const handleSceneClick = () => {
    storeSetSelectedSensor(null);
  };

  return (
    <Canvas
      camera={{ position: [25, 20, 25], fov: 50 }}
      style={{ background: '#000000' }}
      onClick={handleSceneClick}
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />
      <pointLight position={[0, 10, 0]} intensity={0.5} />
      <SceneGrid />
      <GeologicBody />
      <Epicenter />
      <WaveFronts />
      <SensorCloud />
      <AutoPlay />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={80}
      />
    </Canvas>
  );
}
