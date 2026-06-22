import { useEffect, useState, useCallback, useRef } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  isActive?: boolean;
  className?: string;
}

export function TypewriterText({
  text,
  speed = 80,
  onComplete,
  isActive = true,
  className = ''
}: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const completedRef = useRef(false);

  const animate = useCallback((timestamp: number) => {
    if (!isActive || completedRef.current) return;

    if (timestamp - lastTimeRef.current >= speed) {
      if (indexRef.current < text.length) {
        setDisplayText(text.slice(0, indexRef.current + 1));
        indexRef.current += 1;
        lastTimeRef.current = timestamp;
      } else {
        setIsComplete(true);
        completedRef.current = true;
        if (onComplete) {
          onComplete();
        }
        return;
      }
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [text, speed, isActive, onComplete]);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayText('');
    setIsComplete(false);
    completedRef.current = false;
    lastTimeRef.current = 0;

    if (isActive && text) {
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [text, isActive, animate]);

  return (
    <span className={`typewriter-text ${className} ${isComplete ? 'complete' : ''}`}>
      {displayText}
      {!isComplete && isActive && <span className="cursor">▌</span>}
    </span>
  );
}
