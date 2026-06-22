import { useEffect, useState } from 'react';
import { getBackground } from '../characters/data';

interface BackgroundProps {
  backgroundId: string;
}

export function Background({ backgroundId }: BackgroundProps) {
  const [currentBg, setCurrentBg] = useState(getBackground(backgroundId));
  const [nextBg, setNextBg] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const newBg = getBackground(backgroundId);
    if (newBg !== currentBg) {
      setNextBg(newBg);
      setIsTransitioning(true);
      
      const timer = setTimeout(() => {
        setCurrentBg(newBg);
        setNextBg(null);
        setIsTransitioning(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [backgroundId, currentBg]);

  return (
    <div className="game-background">
      <div
        className="background-layer current"
        style={{ background: currentBg }}
      />
      {isTransitioning && nextBg && (
        <div
          className="background-layer next"
          style={{ background: nextBg }}
        />
      )}
      <div className="pixel-overlay" />
    </div>
  );
}
