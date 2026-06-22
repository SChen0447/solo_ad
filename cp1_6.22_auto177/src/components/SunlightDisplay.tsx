import React from 'react';
import { useGameStore } from '../PlayerState';

export const SunlightDisplay: React.FC = React.memo(() => {
  const sunlight = useGameStore(s => s.sunlight);
  const prevSunlight = React.useRef(sunlight);
  const [flashing, setFlashing] = React.useState(false);

  React.useEffect(() => {
    if (sunlight !== prevSunlight.current) {
      prevSunlight.current = sunlight;
      setFlashing(true);
      const timer = setTimeout(() => setFlashing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [sunlight]);

  return (
    <div className={`sunlight-display ${flashing ? 'flash' : ''}`}>
      <span className="sun-icon-large">☀</span>
      <span className="sunlight-number">{sunlight}</span>
    </div>
  );
});
SunlightDisplay.displayName = 'SunlightDisplay';
