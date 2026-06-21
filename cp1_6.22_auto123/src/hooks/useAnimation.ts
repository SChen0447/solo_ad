import { useState, useEffect, useRef } from 'react';
import type { StretchAction } from '@/types';
import { ANIMATION_CONFIGS } from '@/types';

export const useAnimation = (currentAction: StretchAction, onComplete?: () => void) => {
  const [elapsed, setElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const config = ANIMATION_CONFIGS.find((c) => c.name === currentAction);

  const animate = (time: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = time;
      lastTimeRef.current = time;
    }

    const delta = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    const newElapsed = elapsed + delta;
    setElapsed(newElapsed);

    if (config && newElapsed < config.duration) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setIsPlaying(false);
      if (onComplete) {
        onComplete();
      }
    }
  };

  useEffect(() => {
    if (currentAction !== 'idle') {
      setElapsed(0);
      setIsPlaying(true);
      startTimeRef.current = 0;
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentAction]);

  return {
    elapsed,
    isPlaying,
    config,
    progress: config ? Math.min(elapsed / config.duration, 1) : 0,
  };
};
