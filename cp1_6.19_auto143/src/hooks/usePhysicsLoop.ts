import { useEffect, useRef, useState, useCallback } from 'react';
import { PhysicsEngine } from '../physics/PhysicsEngine';
import { Particle, Spring, CollisionBall, Shockwave } from '../physics/types';

export interface PhysicsState {
  particles: Particle[];
  springs: Spring[];
  collisionBalls: CollisionBall[];
  shockwaves: Shockwave[];
  particleCount: number;
  fps: number;
}

export function usePhysicsLoop(
  physicsEngine: PhysicsEngine | null,
  running: boolean = true
): PhysicsState {
  const [state, setState] = useState<PhysicsState>({
    particles: [],
    springs: [],
    collisionBalls: [],
    shockwaves: [],
    particleCount: 0,
    fps: 0,
  });

  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const fpsUpdateTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsRef = useRef<number>(0);

  useEffect(() => {
    if (!physicsEngine || !running) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      return;
    }

    const targetFPS = 30;
    const targetFrameTime = 1000 / targetFPS;
    let lastFrameTime = 0;

    const animate = (currentTime: number) => {
      frameRef.current = requestAnimationFrame(animate);

      const elapsed = currentTime - lastFrameTime;
      if (elapsed < targetFrameTime) return;

      lastFrameTime = currentTime - (elapsed % targetFrameTime);

      frameCountRef.current++;
      if (currentTime - fpsUpdateTimeRef.current >= 1000) {
        fpsRef.current = frameCountRef.current;
        frameCountRef.current = 0;
        fpsUpdateTimeRef.current = currentTime;
      }

      const dt = 1 / 60;
      physicsEngine.simulateStep(dt);

      setState({
        particles: physicsEngine.getParticles(),
        springs: physicsEngine.getSprings(),
        collisionBalls: physicsEngine.getCollisionBalls(),
        shockwaves: physicsEngine.getShockwaves(),
        particleCount: physicsEngine.getParticles().length,
        fps: fpsRef.current,
      });
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [physicsEngine, running]);

  return state;
}
