import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleEmitter } from './ParticleEmitter';
import { useParticleStore } from '@/store/useParticleStore';
import { useParticlePhysics } from '@/hooks/useParticlePhysics';
import { ParticleData } from '@/types';

export function ParticleSystem() {
  const { emitterConfig, presetBehavior, maxParticles, emitterPosition } = useParticleStore();
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const glowMeshRef = useRef<THREE.InstancedMesh>(null);
  const trailLinesRef = useRef<THREE.LineSegments>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const glowDummy = useMemo(() => new THREE.Object3D(), []);

  const { particlesRef, updateParticles, getParticleCount } = useParticlePhysics(maxParticles);

  const particleGeometry = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const glowGeometry = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);

  const particleMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const glowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      }),
    []
  );

  const trailGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const trailMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        transparent: true,
        opacity: 0.3,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  useEffect(() => {
    return () => {
      particleGeometry.dispose();
      glowGeometry.dispose();
      trailGeometry.dispose();
      particleMaterial.dispose();
      glowMaterial.dispose();
      trailMaterial.dispose();
    };
  }, [particleGeometry, glowGeometry, trailGeometry, particleMaterial, glowMaterial, trailMaterial]);

  useFrame((_, delta) => {
    const particles = particlesRef.current;
    const count = particles.length;

    updateParticles(delta, presetBehavior, emitterConfig.sizeCurve, emitterConfig.trailLength);

    if (instancedMeshRef.current) {
      instancedMeshRef.current.count = count;
    }
    if (glowMeshRef.current) {
      glowMeshRef.current.count = count;
    }

    const trailPositions: number[] = [];
    const trailColors: number[] = [];

    for (let i = 0; i < count; i++) {
      const particle = particles[i];
      if (particle.state !== 'alive') continue;

      const size = particle.size;
      const glowSize = size * 2;

      dummy.position.copy(particle.position);
      dummy.scale.set(size, size, size);
      dummy.updateMatrix();
      instancedMeshRef.current?.setMatrixAt(i, dummy.matrix);
      instancedMeshRef.current?.setColorAt(i, particle.color);

      glowDummy.position.copy(particle.position);
      glowDummy.scale.set(glowSize, glowSize, glowSize);
      glowDummy.updateMatrix();
      glowMeshRef.current?.setMatrixAt(i, glowDummy.matrix);
      glowMeshRef.current?.setColorAt(i, particle.color);

      if (emitterConfig.trailLength > 0 && particle.trail.length > 1) {
        for (let j = 0; j < particle.trail.length - 1; j++) {
          const alpha = 1 - j / particle.trail.length;
          const col = particle.color.clone().multiplyScalar(alpha);

          trailPositions.push(
            particle.trail[j].x,
            particle.trail[j].y,
            particle.trail[j].z,
            particle.trail[j + 1].x,
            particle.trail[j + 1].y,
            particle.trail[j + 1].z
          );
          trailColors.push(col.r, col.g, col.b, col.r, col.g, col.b);
        }
      }
    }

    if (instancedMeshRef.current) {
      instancedMeshRef.current.instanceMatrix.needsUpdate = true;
      if (instancedMeshRef.current.instanceColor) {
        instancedMeshRef.current.instanceColor.needsUpdate = true;
      }
    }

    if (glowMeshRef.current) {
      glowMeshRef.current.instanceMatrix.needsUpdate = true;
      if (glowMeshRef.current.instanceColor) {
        glowMeshRef.current.instanceColor.needsUpdate = true;
      }
    }

    if (trailLinesRef.current) {
      trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(trailPositions, 3));
      trailGeometry.setAttribute('color', new THREE.Float32BufferAttribute(trailColors, 3));
      trailGeometry.computeBoundingSphere();
    }
  });

  return (
    <group>
      <ParticleEmitter />
      <instancedMesh
        ref={instancedMeshRef}
        args={[particleGeometry, particleMaterial, maxParticles]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={glowMeshRef}
        args={[glowGeometry, glowMaterial, maxParticles]}
        frustumCulled={false}
      />
      <lineSegments ref={trailLinesRef} geometry={trailGeometry} material={trailMaterial} />
      <mesh position={emitterPosition}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}
