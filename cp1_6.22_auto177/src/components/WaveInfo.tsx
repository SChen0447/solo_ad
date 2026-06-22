import React from 'react';
import { useGameStore } from '../PlayerState';
import { TOTAL_WAVES, MAX_LEAKS } from '../types';

export const WaveInfo: React.FC = React.memo(() => {
  const wave = useGameStore(s => s.wave);
  const leaks = useGameStore(s => s.leaks);
  const kills = useGameStore(s => s.kills);

  return (
    <div className="wave-info">
      <div className="wave-count">
        Wave <span className="wave-number">{wave}</span>/{TOTAL_WAVES}
      </div>
      <div className="leak-count">
        漏敌: <span className={`leak-number ${leaks >= 3 ? 'warning' : ''}`}>{leaks}</span>/{MAX_LEAKS}
      </div>
      <div className="kill-count">
        击杀: <span className="kill-number">{kills}</span>
      </div>
    </div>
  );
});
WaveInfo.displayName = 'WaveInfo';
