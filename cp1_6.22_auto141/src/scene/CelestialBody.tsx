import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CelestialBody as CelestialBodyType, FilterType } from '../types';

interface CelestialBodyProps {
  body: CelestialBodyType;
  filter: FilterType;
  onClick: (body: CelestialBodyType) => void;
}

function hexToRgb(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function generateGalaxyPositions(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const arm = Math.floor(Math.random() * 4);
    const armAngle = (arm / 4) * Math.PI * 2;
    const r = Math.random() * radius;
    const spin = r * 0.8;
    const angle = armAngle + spin + (Math.random() - 0.5) * 0.6;
    const x = Math.cos(angle) * r + (Math.random() - 0.5) * 0.3 * r;
    const z = Math.sin(angle) * r + (Math.random() - 0.5) * 0.3 * r;
    const y = (Math.random() - 0.5) * 0.3 * (1 - r / radius);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return positions;
}

function generateNebulaPositions(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.pow(Math.random(), 0.6) * radius;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  return positions;
}

function generateClusterPositions(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.pow(Math.random(), 0.4) * radius;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  return positions;
}

function generateRingPositions(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const innerRadius = radius * 0.55;
  const outerRadius = radius;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = innerRadius + Math.random() * (outerRadius - innerRadius);
    const thickness = (Math.random() - 0.5) * 0.25 * radius;
    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = thickness;
    positions[i * 3 + 2] = Math.sin(angle) * r;
  }
  return positions;
}

export default function CelestialBody({ body, filter, onClick }: CelestialBodyProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const animationRef = useRef({
    progress: 1,
    startExpansion: 1,
    targetExpansion: 1,
    startColor: new THREE.Color(body.bandColors[filter]),
    targetColor: new THREE.Color(body.bandColors[filter]),
  });

  const basePositions = useMemo(() => {
    switch (body.shape) {
      case 'galaxy':
        return generateGalaxyPositions(body.particleCount, body.radius);
      case 'nebula':
        return generateNebulaPositions(body.particleCount, body.radius);
      case 'cluster':
        return generateClusterPositions(body.particleCount, body.radius);
      case 'ring':
        return generateRingPositions(body.particleCount, body.radius);
      default:
        return generateClusterPositions(body.particleCount, body.radius);
    }
  }, [body]);

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(basePositions);
    const col = new Float32Array(body.particleCount * 3);
    const initialColor = hexToRgb(body.bandColors[filter]);
    for (let i = 0; i < body.particleCount; i++) {
      col[i * 3] = initialColor.r;
      col[i * 3 + 1] = initialColor.g;
      col[i * 3 + 2] = initialColor.b;
    }
    return { positions: pos, colors: col };
  }, [basePositions, body.particleCount, body.bandColors, filter]);

  useEffect(() => {
    const anim = animationRef.current;
    anim.progress = 0;
    anim.startExpansion = anim.targetExpansion;
    anim.targetExpansion = body.bandExpansion[filter];
    anim.startColor = anim.targetColor.clone();
    anim.targetColor = hexToRgb(body.bandColors[filter]);
  }, [filter, body.bandExpansion, body.bandColors]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const anim = animationRef.current;
    const geometry = pointsRef.current.geometry;
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute;

    if (anim.progress < 1) {
      anim.progress = Math.min(anim.progress + delta / 1.5, 1);
      const eased = easeInOutCubic(anim.progress);
      const exp = anim.startExpansion + (anim.targetExpansion - anim.startExpansion) * eased;
      const r = anim.startColor.r + (anim.targetColor.r - anim.startColor.r) * eased;
      const g = anim.startColor.g + (anim.targetColor.g - anim.startColor.g) * eased;
      const b = anim.startColor.b + (anim.targetColor.b - anim.startColor.b) * eased;

      for (let i = 0; i < body.particleCount; i++) {
        posAttr.array[i * 3] = basePositions[i * 3] * exp;
        posAttr.array[i * 3 + 1] = basePositions[i * 3 + 1] * exp;
        posAttr.array[i * 3 + 2] = basePositions[i * 3 + 2] * exp;
        colAttr.array[i * 3] = r;
        colAttr.array[i * 3 + 1] = g;
        colAttr.array[i * 3 + 2] = b;
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }

    pointsRef.current.rotation.y += delta * 0.02;
  });

  return (
    <group position={body.position}>
      <points
        ref={pointsRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick(body);
        }}
      >
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={body.particleCount}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={body.particleCount}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
