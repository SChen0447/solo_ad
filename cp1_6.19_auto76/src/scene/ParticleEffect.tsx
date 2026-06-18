import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore } from '../store/store';

export function ParticleEffect() {
  const pointsRef = useRef<THREE.Points>(null);
  const particles = useSimulationStore((state) => state.particles);

  const positions = useMemo(() => {
    const pos = new Float32Array(particles.length * 3);
    const colors = new Float32Array(particles.length * 3);
    const sizes = new Float32Array(particles.length);

    particles.forEach((p, i) => {
      pos[i * 3] = p.position.x;
      pos[i * 3 + 1] = p.position.y;
      pos[i * 3 + 2] = p.position.z;

      const color = new THREE.Color(p.color);
      const alpha = p.life / p.maxLife;
      colors[i * 3] = color.r * alpha;
      colors[i * 3 + 1] = color.g * alpha;
      colors[i * 3 + 2] = color.b * alpha;

      sizes[i] = p.size * alpha;
    });

    return { pos, colors, sizes };
  }, [particles]);

  useFrame(() => {
    if (!pointsRef.current) return;

    const geometry = pointsRef.current.geometry;
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = geometry.attributes.color as THREE.BufferAttribute;

    particles.forEach((p, i) => {
      if (i * 3 < posAttr.array.length) {
        posAttr.array[i * 3] = p.position.x;
        posAttr.array[i * 3 + 1] = p.position.y;
        posAttr.array[i * 3 + 2] = p.position.z;

        const alpha = p.life / p.maxLife;
        const color = new THREE.Color(p.color);
        colorAttr.array[i * 3] = color.r * alpha;
        colorAttr.array[i * 3 + 1] = color.g * alpha;
        colorAttr.array[i * 3 + 2] = color.b * alpha;
      }
    });

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  if (particles.length === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length}
          array={positions.pos}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particles.length}
          array={positions.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.2}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
