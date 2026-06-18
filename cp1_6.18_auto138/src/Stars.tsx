import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Stars() {
  const meshRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);

  const { positions, sizes } = useMemo(() => {
    const count = 2000;
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 40 + Math.random() * 30;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      sz[i] = 0.5 + Math.random() * 1.5;
    }
    return { positions: pos, sizes: sz };
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (meshRef.current) {
      const geo = meshRef.current.geometry;
      const sizeAttr = geo.getAttribute('size') as THREE.BufferAttribute;
      if (sizeAttr) {
        for (let i = 0; i < sizeAttr.count; i++) {
          const base = sizes[i];
          const flicker = 0.3 + 0.5 * (Math.sin(timeRef.current * (1.0 + i * 0.01) + i) * 0.5 + 0.5);
          sizeAttr.array[i] = base * flicker;
        }
        sizeAttr.needsUpdate = true;
      }
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes.slice()}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#ffffff"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
