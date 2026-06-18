import React, { useRef, useMemo, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CSM } from '@react-three/drei';
import { useSandboxStore } from '../store';
import type { WeatherMode, WeatherColors } from '../types';

const weatherColorMap: Record<WeatherMode, WeatherColors> = {
  sunny: {
    ambient: '#ffffff',
    directional: '#fffaf0',
    shadow: 'rgba(0, 0, 0, 0.35)',
    background: '#1a1a2e',
  },
  sunset: {
    ambient: '#ffd4a3',
    directional: '#ffa500',
    shadow: 'rgba(50, 20, 0, 0.4)',
    background: '#2d1b0e',
  },
};

const interpolateColor = (
  color1: string,
  color2: string,
  t: number
): string => {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  const result = new THREE.Color().lerpColors(c1, c2, t);
  return `#${result.getHexString()}`;
};

interface SunLightProps {
  sunPosition: [number, number, number];
  intensity: number;
  color: string;
}

const SunLight: React.FC<SunLightProps> = ({ sunPosition, intensity, color }) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const targetRef = useRef<THREE.Object3D>(new THREE.Object3D(0, 0, 0));

  useEffect(() => {
    if (lightRef.current) {
      lightRef.current.target = targetRef.current;
    }
  }, []);

  return (
    <>
      <primitive object={targetRef.current} />
      <directionalLight
        ref={lightRef}
        position={sunPosition}
        intensity={intensity}
        color={color}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
      />
    </>
  );
};

export const SunShadowSystem: React.FC = () => {
  const { scene } = useThree();
  const sunAngle = useSandboxStore((state) => state.sunAngle);
  const weatherMode = useSandboxStore((state) => state.weatherMode);
  const weatherTransition = useSandboxStore((state) => state.weatherTransition);
  const setWeatherTransition = useSandboxStore(
    (state) => state.setWeatherTransition
  );

  const targetTransition = weatherMode === 'sunny' ? 1 : 0;

  useFrame((_, delta) => {
    if (Math.abs(weatherTransition - targetTransition) > 0.001) {
      const newTransition =
        weatherTransition +
        (targetTransition - weatherTransition) * Math.min(delta / 1.5, 1);
      setWeatherTransition(newTransition);
    } else if (weatherTransition !== targetTransition) {
      setWeatherTransition(targetTransition);
    }
  });

  const sunPosition = useMemo((): [number, number, number] => {
    const azimuthRad = (sunAngle.azimuth * Math.PI) / 180;
    const altitudeRad = (sunAngle.altitude * Math.PI) / 180;
    const radius = 20;
    const x = radius * Math.cos(altitudeRad) * Math.sin(azimuthRad);
    const y = radius * Math.sin(altitudeRad);
    const z = radius * Math.cos(altitudeRad) * Math.cos(azimuthRad);
    return [x, y, z];
  }, [sunAngle]);

  const currentColors = useMemo(() => {
    const sunny = weatherColorMap.sunny;
    const sunset = weatherColorMap.sunset;
    const t = weatherTransition;

    return {
      ambient: interpolateColor(sunset.ambient, sunny.ambient, t),
      directional: interpolateColor(sunset.directional, sunny.directional, t),
      background: interpolateColor(sunset.background, sunny.background, t),
    };
  }, [weatherTransition]);

  useEffect(() => {
    scene.background = new THREE.Color(currentColors.background);
  }, [currentColors.background, scene]);

  const lightIntensity = useMemo(() => {
    const baseIntensity = 1.2;
    const altitudeFactor = Math.max(
      0.1,
      Math.sin((sunAngle.altitude * Math.PI) / 180)
    );
    return baseIntensity * altitudeFactor;
  }, [sunAngle.altitude]);

  const csmFar = 25;
  const csmNear = 1;
  const csmFades = true;
  const csmMaxFar = 50;
  const csmMode = 'practical';
  const csmLightDirection = useMemo(() => {
    const dir = new THREE.Vector3(
      -sunPosition[0],
      -sunPosition[1],
      -sunPosition[2]
    ).normalize();
    return [dir.x, dir.y, dir.z] as [number, number, number];
  }, [sunPosition]);

  return (
    <>
      <ambientLight intensity={0.4} color={currentColors.ambient} />
      <hemisphereLight
        color={currentColors.ambient}
        groundColor="#1a1a1a"
        intensity={0.3}
      />
      <CSM
        far={csmFar}
        near={csmNear}
        fades={csmFades}
        maxFar={csmMaxFar}
        mode={csmMode}
        lightDirection={csmLightDirection}
        lightIntensity={lightIntensity}
        lightColor={currentColors.directional}
        shadowMapSize={1024}
        cascades={3}
        shadowBias={-0.0001}
        penumbra={0.5}
      />
      <SunLight
        sunPosition={sunPosition}
        intensity={lightIntensity}
        color={currentColors.directional}
      />
    </>
  );
};

export const getSunPosition = (
  azimuth: number,
  altitude: number,
  radius: number = 20
): { x: number; y: number; z: number } => {
  const azimuthRad = (azimuth * Math.PI) / 180;
  const altitudeRad = (altitude * Math.PI) / 180;
  return {
    x: radius * Math.cos(altitudeRad) * Math.sin(azimuthRad),
    y: radius * Math.sin(altitudeRad),
    z: radius * Math.cos(altitudeRad) * Math.cos(azimuthRad),
  };
};
