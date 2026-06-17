import { useState, useEffect, useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';

interface UseFPSOptions {
  onLowFPS?: (fps: number) => void;
  lowFPSThreshold?: number;
  sampleCount?: number;
}

export function useFPS(options: UseFPSOptions = {}) {
  const {
    onLowFPS,
    lowFPSThreshold = 30,
    sampleCount = 30,
  } = options;

  const [fps, setFPS] = useState(60);
  const frameTimes = useRef<number[]>([]);
  const lastTime = useRef(performance.now());
  const lowFPSStartTime = useRef<number | null>(null);
  const lastCheckTime = useRef(0);

  useFrame(() => {
    const now = performance.now();
    const delta = now - lastTime.current;
    lastTime.current = now;

    frameTimes.current.push(delta);
    if (frameTimes.current.length > sampleCount) {
      frameTimes.current.shift();
    }

    if (frameTimes.current.length >= sampleCount) {
      const averageDelta = frameTimes.current.reduce((a, b) => a + b, 0) / frameTimes.current.length;
      const currentFPS = 1000 / averageDelta;
      setFPS(Math.round(currentFPS));

      if (now - lastCheckTime.current > 2000) {
        lastCheckTime.current = now;

        if (currentFPS < lowFPSThreshold) {
          if (lowFPSStartTime.current === null) {
            lowFPSStartTime.current = now;
          } else if (now - lowFPSStartTime.current > 1000) {
            onLowFPS?.(currentFPS);
            lowFPSStartTime.current = null;
          }
        } else {
          lowFPSStartTime.current = null;
        }
      }
    }
  });

  useEffect(() => {
    lastTime.current = performance.now();
    frameTimes.current = [];
  }, []);

  const reset = useCallback(() => {
    frameTimes.current = [];
    lowFPSStartTime.current = null;
    setFPS(60);
  }, []);

  return { fps, reset };
}
