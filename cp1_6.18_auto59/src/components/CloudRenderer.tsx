import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CloudParams, ParticleData } from '../types';
import { generateProbabilityCloud } from '../utils/quantumMath';

interface CloudRendererProps {
  params: CloudParams;
  visible: boolean;
  seed: number;
}

export default function CloudRenderer({ params, visible, seed }: CloudRendererProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const targetPositions = useRef<Float32Array | null>(null);
  const currentPositions = useRef<Float32Array | null>(null);
  const targetColors = useRef<Float32Array | null>(null);
  const currentColors = useRef<Float32Array | null>(null);

  const particles: ParticleData[] = useMemo(() => {
    return generateProbabilityCloud(params);
  }, [params.nLevel, params.coefficient.s, params.coefficient.p, params.coefficient.d, seed]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particles.length * 3);
    const colors = new Float32Array(particles.length * 3);

    particles.forEach((p, i) => {
      positions[i * 3] = p.position[0];
      positions[i * 3 + 1] = p.position[1];
      positions[i * 3 + 2] = p.position[2];

      const colorMatch = p.color.match(/rgb\((\d+),(\d+),(\d+)\)/);
      if (colorMatch) {
        colors[i * 3] = parseInt(colorMatch[1]) / 255;
        colors[i * 3 + 1] = parseInt(colorMatch[2]) / 255;
        colors[i * 3 + 2] = parseInt(colorMatch[3]) / 255;
      }
    });

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return geo;
  }, [particles]);

  useEffect(() => {
    if (!pointsRef.current) return;

    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = pointsRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;

    if (!targetPositions.current || targetPositions.current.length !== posAttr.array.length) {
      targetPositions.current = new Float32Array(posAttr.array.length);
      currentPositions.current = new Float32Array(posAttr.array.length);
      targetColors.current = new Float32Array(colAttr.array.length);
      currentColors.current = new Float32Array(colAttr.array.length);
    }

    targetPositions.current.set(posAttr.array as Float32Array);
    targetColors.current.set(colAttr.array as Float32Array);

    if (currentPositions.current) {
      for (let i = 0; i < currentPositions.current.length; i += 3) {
        if (Math.abs(currentPositions.current[i]) < 0.0001 &&
            Math.abs(currentPositions.current[i + 1]) < 0.0001 &&
            Math.abs(currentPositions.current[i + 2]) < 0.0001) {
          currentPositions.current[i] = targetPositions.current[i];
          currentPositions.current[i + 1] = targetPositions.current[i + 1];
          currentPositions.current[i + 2] = targetPositions.current[i + 2];
        }
      }
    }
  }, [geometry]);

  useFrame((state) => {
    if (!pointsRef.current || !visible) return;

    const time = state.clock.elapsedTime;
    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = pointsRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;

    if (targetPositions.current && currentPositions.current) {
      for (let i = 0; i < targetPositions.current.length; i++) {
        currentPositions.current[i] += (targetPositions.current[i] - currentPositions.current[i]) * 0.05;
      }
      (posAttr.array as Float32Array).set(currentPositions.current);
    }

    if (targetColors.current && currentColors.current) {
      for (let i = 0; i < targetColors.current.length; i++) {
        currentColors.current[i] += (targetColors.current[i] - currentColors.current[i]) * 0.05;
      }
      (colAttr.array as Float32Array).set(currentColors.current);
    }

    const pulseScale = 1 + Math.sin(time * 2) * 0.02;
    pointsRef.current.scale.setScalar(pulseScale);

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  if (!visible) return null;

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        emissive={new THREE.Color(0x442266)}
        emissiveIntensity={0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
