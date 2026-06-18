import { useRef, useCallback } from 'react';
import * as THREE from 'three';
import { ParticleData, PresetBehavior, SizeCurve } from '@/types';
import { calculateSize, interpolateColor, getRandomSphericalDirection } from '@/utils/presets';

const MAX_PARTICLES_PER_FRAME = 500;
const GRAVITY_VECTOR = new THREE.Vector3(0, -9.8, 0);

export function useParticlePhysics(maxParticles: number) {
  const particlesRef = useRef<ParticleData[]>([]);
  const particleIdCounter = useRef(0);
  const updateIndexRef = useRef(0);

  const createParticle = useCallback(
    (
      position: THREE.Vector3,
      initialSpeed: number,
      lifetime: number,
      startColor: string,
      endColor: string,
      particleRadius: number,
      behavior: PresetBehavior
    ): ParticleData => {
      const direction = getRandomSphericalDirection();

      if (behavior.upwardForce) {
        direction.y = Math.abs(direction.y) * 0.5 + 0.5;
        direction.normalize();
      }

      const velocity = direction.multiplyScalar(initialSpeed * (0.8 + Math.random() * 0.4));

      return {
        id: particleIdCounter.current++,
        position: position.clone(),
        velocity,
        color: new THREE.Color(startColor),
        startColor: new THREE.Color(startColor),
        endColor: new THREE.Color(endColor),
        size: particleRadius,
        startSize: particleRadius,
        endSize: particleRadius * 0.3,
        life: 0,
        maxLife: lifetime * (0.8 + Math.random() * 0.4),
        state: 'alive',
        trail: [],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 2,
      };
    },
    []
  );

  const updateParticle = useCallback(
    (particle: ParticleData, deltaTime: number, behavior: PresetBehavior, sizeCurve: SizeCurve, trailLength: number) => {
      if (particle.state !== 'alive') return;

      particle.life += deltaTime;

      if (particle.life >= particle.maxLife) {
        particle.state = 'dead';
        return;
      }

      const normalizedAge = particle.life / particle.maxLife;

      if (behavior.gravity !== undefined) {
        particle.velocity.addScaledVector(GRAVITY_VECTOR, behavior.gravity * deltaTime);
      }

      if (behavior.upwardForce !== undefined) {
        particle.velocity.y += behavior.upwardForce * deltaTime * (1 - normalizedAge);
      }

      const drag = 0.98;
      particle.velocity.multiplyScalar(drag);

      particle.position.addScaledVector(particle.velocity, deltaTime);

      if (behavior.spin) {
        particle.rotation += particle.rotationSpeed * deltaTime;
      }

      if (trailLength > 0) {
        particle.trail.unshift(particle.position.clone());
        if (particle.trail.length > trailLength) {
          particle.trail.pop();
        }
      }

      particle.size = calculateSize(normalizedAge, sizeCurve, particle.startSize, particle.endSize);
      particle.color = interpolateColor(normalizedAge, particle.startColor, particle.endColor, behavior.colorStops);
    },
    []
  );

  const emitParticles = useCallback(
    (
      count: number,
      position: THREE.Vector3,
      initialSpeed: number,
      lifetime: number,
      startColor: string,
      endColor: string,
      particleRadius: number,
      behavior: PresetBehavior
    ) => {
      const particles = particlesRef.current;
      const emitCount = Math.min(count, maxParticles - particles.length);

      for (let i = 0; i < emitCount; i++) {
        particles.push(
          createParticle(position, initialSpeed, lifetime, startColor, endColor, particleRadius, behavior)
        );
      }
    },
    [createParticle, maxParticles]
  );

  const updateParticles = useCallback(
    (deltaTime: number, behavior: PresetBehavior, sizeCurve: SizeCurve, trailLength: number) => {
      const particles = particlesRef.current;
      const totalParticles = particles.length;

      if (totalParticles === 0) return;

      const batchSize = Math.min(MAX_PARTICLES_PER_FRAME, totalParticles);
      const startIndex = updateIndexRef.current;

      for (let i = 0; i < batchSize; i++) {
        const idx = (startIndex + i) % totalParticles;
        const particle = particles[idx];

        if (particle.state === 'alive') {
          updateParticle(particle, deltaTime, behavior, sizeCurve, trailLength);
        }
      }

      updateIndexRef.current = (startIndex + batchSize) % totalParticles;

      const aliveParticles = particles.filter((p) => p.state !== 'dead');
      particlesRef.current = aliveParticles;
    },
    [updateParticle]
  );

  const clearAllParticles = useCallback(() => {
    particlesRef.current = [];
    updateIndexRef.current = 0;
  }, []);

  const getParticles = useCallback(() => particlesRef.current, []);

  const getParticleCount = useCallback(() => particlesRef.current.length, []);

  return {
    particlesRef,
    emitParticles,
    updateParticles,
    clearAllParticles,
    getParticles,
    getParticleCount,
  };
}
