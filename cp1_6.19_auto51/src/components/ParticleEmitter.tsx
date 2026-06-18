import { useRef, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useParticleStore } from '@/store/useParticleStore';
import { useParticlePhysics } from '@/hooks/useParticlePhysics';

export function ParticleEmitter() {
  const { emitterConfig, emitterPosition, presetBehavior, maxParticles } = useParticleStore();
  const emissionAccumulator = useRef(0);
  const { scene, camera, raycaster, pointer } = useThree();
  const isDragging = useRef(false);

  const { emitParticles, clearAllParticles } = useParticlePhysics(maxParticles);

  const handleClick = useCallback(
    (event: PointerEvent) => {
      if (isDragging.current) return;

      raycaster.setFromCamera(pointer, camera);
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersectPoint = new THREE.Vector3();

      raycaster.ray.intersectPlane(groundPlane, intersectPoint);

      if (intersectPoint) {
        useParticleStore.getState().setEmitterPosition(intersectPoint);
      }
    },
    [raycaster, pointer, camera]
  );

  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('pointerdown', () => {
        isDragging.current = false;
      });
      canvas.addEventListener('pointermove', (e) => {
        if (e.buttons > 0) {
          isDragging.current = true;
        }
      });
      canvas.addEventListener('pointerup', handleClick);
      canvas.addEventListener('click', handleClick);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('pointerup', handleClick);
        canvas.removeEventListener('click', handleClick);
      }
    };
  }, [handleClick]);

  useEffect(() => {
    clearAllParticles();
    emissionAccumulator.current = 0;
  }, [clearAllParticles]);

  useFrame((_, delta) => {
    const { emissionRate, initialSpeed, lifetime, startColor, endColor, particleRadius } = emitterConfig;

    emissionAccumulator.current += delta * emissionRate;

    while (emissionAccumulator.current >= 1) {
      emitParticles(
        1,
        emitterPosition,
        initialSpeed,
        lifetime,
        startColor,
        endColor,
        particleRadius,
        presetBehavior
      );
      emissionAccumulator.current -= 1;
    }
  });

  return null;
}
