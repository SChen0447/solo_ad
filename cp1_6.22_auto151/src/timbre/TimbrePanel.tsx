import { useState, useEffect } from 'react';
import { eventBus } from '@/events/EventBus';
import { TimbreId, TIMBRE_CONFIGS, TIMBRE_NAMES } from '@/audio/AudioEngine';
import './TimbrePanel.css';

const TIMBRE_ICONS: Record<TimbreId, string> = {
  piano: '🎹',
  synth: '🎛️',
  strings: '🎻',
  guitar: '🎸',
  bass: '🎸',
  drums: '🥁',
};

export function TimbrePanel() {
  const [activeTimbre, setActiveTimbre] = useState<TimbreId>('piano');
  const timbres = Object.keys(TIMBRE_CONFIGS) as TimbreId[];

  useEffect(() => {
    eventBus.emit('timbre:change', activeTimbre);
  }, [activeTimbre]);

  const handleSelect = (timbre: TimbreId) => {
    setActiveTimbre(timbre);
  };

  return (
    <div className="timbre-panel">
      <div className="timbre-panel__title">音色选择</div>
      <div className="timbre-panel__cards">
        {timbres.map((timbre) => (
          <div
            key={timbre}
            className={`timbre-card ${activeTimbre === timbre ? 'timbre-card--active' : ''}`}
            onClick={() => handleSelect(timbre)}
          >
            <div className="timbre-card__icon">{TIMBRE_ICONS[timbre]}</div>
            <div className="timbre-card__name">{TIMBRE_NAMES[timbre]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
