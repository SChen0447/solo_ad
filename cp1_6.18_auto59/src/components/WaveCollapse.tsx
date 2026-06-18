import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CollapseEvent, ParticleData, CloudParams } from '../types';
import { generateProbabilityCloud, getCollapseAnimation } from '../utils/quantumMath';

interface WaveCollapseProps {
  collapseEvent: CollapseEvent | null;
  params: CloudParams;
  onComplete: () => void;
}

const ANIMATION_DURATION = 2000;

export default function WaveCollapse({ collapseEvent, params, onComplete }: WaveCollapseProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const startTimeRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [initialParticles, setInitialParticles] = useState<ParticleData[]>([]);
  const completedRef = useRef(false);

  const baseParticles = useMemo(() => generateProbabilityCloud(params), [params.nLevel]);

  useEffect(() => {
    if (collapseEvent?.active) {
      setInitialParticles(baseParticles);
      startTimeRef.current = performance.now();
      completedRef.current = false;
      setProgress(0);
    }
  }, [collapseEvent, baseParticles]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(initialParticles.length * 3);
    const colors = new Float32Array(initialParticles.length * 3);

    initialParticles.forEach((p, i) => {
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
  }, [initialParticles]);

  useFrame(() => {
    if (!pointsRef.current || !collapseEvent?.active || startTimeRef.current === null) return;

    const elapsed = performance.now() - startTimeRef.current;
    const newProgress = Math.min(1, elapsed / ANIMATION_DURATION);
    setProgress(newProgress);

    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const frames = getCollapseAnimation(collapseEvent.position, initialParticles, newProgress);

    const posArray = posAttr.array as Float32Array;
    frames.forEach((frame, idx) => {
      posArray[idx * 3] = frame.position[0];
      posArray[idx * 3 + 1] = frame.position[1];
      posArray[idx * 3 + 2] = frame.position[2];
    });
    posAttr.needsUpdate = true;

    const material = pointsRef.current.material as THREE.PointsMaterial;
    if (newProgress < 0.5) {
      material.opacity = 0.6 + newProgress * 0.8;
      material.size = 0.08 + newProgress * 0.12;
    } else {
      material.opacity = 1 - (newProgress - 0.5) * 2;
      material.size = 0.2 - (newProgress - 0.5) * 0.24;
    }

    if (glowRef.current) {
      const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
      if (newProgress < 0.5) {
        glowRef.current.scale.setScalar(0.1 + newProgress * 0.5);
        glowMat.opacity = newProgress * 2;
      } else {
        glowRef.current.scale.setScalar(0.6 + (newProgress - 0.5) * 3);
        glowMat.opacity = 1 - (newProgress - 0.5) * 2;
      }
    }

    if (newProgress >= 1 && !completedRef.current) {
      completedRef.current = true;
      startTimeRef.current = null;
      onComplete();
    }
  });

  if (!collapseEvent?.active || initialParticles.length === 0) return null;

  return (
    <group>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          size={0.08}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation
          emissive={new THREE.Color(0xffffff)}
          emissiveIntensity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <mesh ref={glowRef} position={collapseEvent.position}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial
          color={0xffffff}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
