import React from 'react';
import { useGameStore } from '../PlayerState';

export const WaveOverlay: React.FC = React.memo(() => {
  const phase = useGameStore(s => s.phase);
  const wave = useGameStore(s => s.wave);

  if (phase !== 'waveTransition') return null;

  return (
    <div className="wave-overlay">
      <div className="wave-overlay-text">
        <span className="wave-overlay-label">Wave</span>
        <span className="wave-overlay-number">{wave}</span>
      </div>
    </div>
  );
});
WaveOverlay.displayName = 'WaveOverlay';
