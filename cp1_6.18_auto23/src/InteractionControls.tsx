import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface InteractionControlsProps {
  autoRotateSpeed?: number;
  idleTimeout?: number;
  resetDuration?: number;
  minDistance?: number;
  maxDistance?: number;
}

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 1, 5);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

export default function InteractionControls({
  autoRotateSpeed = 0.3,
  idleTimeout = 3000,
  resetDuration = 2000,
  minDistance = 0.5,
  maxDistance = 3.0,
}: InteractionControlsProps) {
  const controlsRef = useRef<any>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const idleTimerRef = useRef<number | null>(null);
  const resetProgressRef = useRef(0);
  const startPositionRef = useRef(new THREE.Vector3());
  const startTargetRef = useRef(new THREE.Vector3());
  const { camera } = useThree();

  const handleInteraction = useCallback(() => {
    setIsInteracting(true);
    setIsResetting(false);
    
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    
    idleTimerRef.current = window.setTimeout(() => {
      setIsInteracting(false);
      setIsResetting(true);
      resetProgressRef.current = 0;
      if (controlsRef.current) {
        startPositionRef.current.copy(camera.position);
        startTargetRef.current.copy(controlsRef.current.target);
      }
    }, idleTimeout);
  }, [idleTimeout, camera.position]);

  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  useFrame((state, delta) => {
    if (!controlsRef.current) return;

    if (isResetting) {
      resetProgressRef.current += delta * 1000 / resetDuration;
      
      if (resetProgressRef.current >= 1) {
        resetProgressRef.current = 1;
        setIsResetting(false);
        controlsRef.current.target.copy(DEFAULT_TARGET);
        camera.position.copy(DEFAULT_CAMERA_POSITION);
      } else {
        const t = easeInOutCubic(resetProgressRef.current);
        controlsRef.current.target.lerpVectors(startTargetRef.current, DEFAULT_TARGET, t);
        camera.position.lerpVectors(startPositionRef.current, DEFAULT_CAMERA_POSITION, t);
      }
      controlsRef.current.update();
    } else if (!isInteracting) {
      const time = state.clock.elapsedTime;
      const radius = camera.position.length();
      const angle = time * autoRotateSpeed * 0.1;
      const height = Math.sin(time * 0.1) * 0.5 + 1;
      
      camera.position.x = Math.sin(angle) * radius;
      camera.position.z = Math.cos(angle) * radius;
      camera.position.y = height;
      camera.lookAt(controlsRef.current.target);
    }
  });

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={minDistance}
      maxDistance={maxDistance}
      enablePan={false}
      onStart={handleInteraction}
      onChange={handleInteraction}
      onEnd={() => {
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }
        idleTimerRef.current = window.setTimeout(() => {
          setIsInteracting(false);
          setIsResetting(true);
          resetProgressRef.current = 0;
          if (controlsRef.current) {
            startPositionRef.current.copy(camera.position);
            startTargetRef.current.copy(controlsRef.current.target);
          }
        }, idleTimeout);
      }}
    />
  );
}
