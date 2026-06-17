import React from 'react';
import type { VisualizationMode } from './ParticleSystem';

interface ModeSelectorProps {
  currentMode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
}

const modes: { id: VisualizationMode; label: string; icon: string }[] = [
  { id: 'waveform', label: 'Waveform', icon: '〰' },
  { id: 'spectrum', label: 'Spectrum', icon: '▮' },
  { id: 'pulse', label: 'Pulse', icon: '◉' },
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onModeChange }) => {
  return (
    <div className="mode-selector">
      {modes.map((mode) => (
        <button
          key={mode.id}
          className={`mode-button ${currentMode === mode.id ? 'active' : ''}`}
          onClick={() => onModeChange(mode.id)}
          title={mode.label}
          aria-label={mode.label}
        >
          <span className="mode-icon">{mode.icon}</span>
        </button>
      ))}
    </div>
  );
};
