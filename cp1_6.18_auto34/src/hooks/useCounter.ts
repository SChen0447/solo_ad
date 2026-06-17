import { useState, useEffect, useRef } from 'react';

export function useCounter(target: number, duration: number = 500): number {
  const [current, setCurrent] = useState(0);
  const previousTarget = useRef(0);
  const startTime = useRef<number | null>(null);
  const startValue = useRef(0);

  useEffect(() => {
    if (target === previousTarget.current) return;

    startValue.current = previousTarget.current;
    startTime.current = null;
    previousTarget.current = target;

    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (startTime.current === null) {
        startTime.current = timestamp;
      }

      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const currentValue = Math.round(
        startValue.current + (target - startValue.current) * easeProgress
      );

      setCurrent(currentValue);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [target, duration]);

  return current;
}
