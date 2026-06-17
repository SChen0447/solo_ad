import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ColorTheme, colorThemes, lerpThemeColors, getGradientColor, adjustSaturation } from '@/utils/colorThemes';
import { createRandomPaths, precomputePathPoints, getPositionOnPath } from '@/utils/bezierPaths';

interface LightSculptureProps {
  particleCount: number;
  flowSpeed: number;
  colorTheme: ColorTheme;
  amplitude: number;
  particleSize: number;
}

interface ParticleData {
  pathIndex: number;
  progress: number;
  speed: number;
  size: number;
  offset: number;
}

export default function LightSculpture({
  particleCount,
  flowSpeed,
  colorTheme,
  amplitude,
  particleSize,
}: LightSculptureProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const [currentTheme, setCurrentTheme] = useState(colorTheme);
  const [transitionProgress, setTransitionProgress] = useState(1);
  const prevThemeRef = useRef(colorTheme);

  const pathCount = 12;
  const paths = useMemo(() => createRandomPaths(pathCount, 2.5), []);
  const precomputedPaths = useMemo(
    () => paths.map((path) => precomputePathPoints(path, 200)),
    [paths]
  );

  const particleData = useMemo<ParticleData[]>(() => {
    const data: ParticleData[] = [];
    for (let i = 0; i < particleCount; i++) {
      data.push({
        pathIndex: Math.floor(Math.random() * pathCount),
        progress: Math.random(),
        speed: 0.002 + Math.random() * 0.003,
        size: 0.1 + Math.random() * 0.4,
        offset: Math.random() * 0.2 - 0.1,
      });
    }
    return data;
  }, [particleCount]);

  useEffect(() => {
    if (colorTheme !== prevThemeRef.current) {
      prevThemeRef.current = colorTheme;
      setCurrentTheme((prev) => {
        prevThemeRef.current = prev;
        return colorTheme;
      });
      setTransitionProgress(0);
    }
  }, [colorTheme]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const data = particleData[i];
      const pos = getPositionOnPath(precomputedPaths[data.pathIndex], data.progress);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;

      sizes[i] = data.size;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    return geo;
  }, [particleCount, particleData, precomputedPaths]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    if (transitionProgress < 1) {
      setTransitionProgress((prev) => Math.min(1, prev + delta / 1.5));
    }

    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;
    const sizes = geometry.attributes.size.array as Float32Array;

    const amplitudeFactor = 1 + amplitude / 100 * 1.5;
    const sizeAmplitudeFactor = 1 + amplitude / 100 * 0.8;
    const saturationFactor = 1 + amplitude / 100 * 0.6;

    const time = state.clock.elapsedTime;
    const effectiveSpeed = flowSpeed * amplitudeFactor;

    const fromTheme = colorThemes[prevThemeRef.current];
    const toTheme = colorThemes[colorTheme];
    const tProgress = transitionProgress;

    for (let i = 0; i < particleCount; i++) {
      const data = particleData[i];
      
      data.progress += data.speed * effectiveSpeed * delta * 60;
      if (data.progress > 1) data.progress -= 1;

      const pos = getPositionOnPath(precomputedPaths[data.pathIndex], data.progress);
      
      const offsetAmount = data.offset * (1 + amplitude / 100 * 0.5);
      const offsetDir = new THREE.Vector3(
        Math.sin(time * 0.5 + i * 0.1) * offsetAmount,
        Math.cos(time * 0.3 + i * 0.15) * offsetAmount * 0.5,
        Math.sin(time * 0.7 + i * 0.05) * offsetAmount
      );

      positions[i * 3] = pos.x + offsetDir.x;
      positions[i * 3 + 1] = pos.y + offsetDir.y;
      positions[i * 3 + 2] = pos.z + offsetDir.z;

      const colorFrom = getGradientColor(fromTheme, data.progress, time);
      const colorTo = getGradientColor(toTheme, data.progress, time);
      const color = colorFrom.lerp(colorTo, tProgress);
      const saturatedColor = adjustSaturation(color, saturationFactor);

      colors[i * 3] = saturatedColor.r;
      colors[i * 3 + 1] = saturatedColor.g;
      colors[i * 3 + 2] = saturatedColor.b;

      sizes[i] = data.size * particleSize * sizeAmplitudeFactor;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
  });

  const tubeGeometries = useMemo(() => {
    return paths.map((path, index) => {
      const geometry = new THREE.TubeGeometry(path, 100, 0.02, 8, true);
      return { geometry, index };
    });
  }, [paths]);

  return (
    <group>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          size={0.15}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      
      {tubeGeometries.map(({ geometry, index }) => {
        const themeColor = colorThemes[currentTheme].glow;
        return (
          <mesh key={index} geometry={geometry}>
            <meshBasicMaterial
              color={themeColor}
              transparent
              opacity={0.15 + Math.sin(Date.now() * 0.001 + index) * 0.05}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
