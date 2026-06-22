import { useEffect, useRef } from 'react';
import { GameEngine } from '../GameEngine';

export function useGameLoop(engine: GameEngine | null): void {
  const engineRef = useRef(engine);
  engineRef.current = engine;

  useEffect(() => {
    if (!engineRef.current) return;
    return () => {
      engineRef.current?.stop();
    };
  }, []);
}
