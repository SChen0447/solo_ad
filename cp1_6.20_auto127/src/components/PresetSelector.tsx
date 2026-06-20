import React from 'react';
import { Preset, presets } from '../utils/vectorField';

interface PresetSelectorProps {
  selectedPreset: string | null;
  onSelect: (preset: Preset) => void;
}

const PresetSelector: React.FC<PresetSelectorProps> = ({ selectedPreset, onSelect }) => {
  return (
    <div style={styles.container}>
      <div style={styles.presetList}>
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset)}
            style={{
              ...styles.presetCard,
              ...(selectedPreset === preset.id ? styles.presetCardActive : {})
            }}
          >
            <span style={styles.presetIcon}>
              {preset.id === 'turbulence' && '🌀'}
              {preset.id === 'spiral' && '🎡'}
              {preset.id === 'vortex' && '🌪️'}
              {preset.id === 'gravity' && '⬇️'}
              {preset.id === 'brownian' && '✨'}
            </span>
            <span style={styles.presetName}>{preset.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    background: 'rgba(15, 15, 35, 0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderBottom: '1px solid rgba(124, 58, 237, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '0 20px'
  },
  presetList: {
    display: 'flex',
    gap: 12,
    alignItems: 'center'
  },
  presetCard: {
    width: 120,
    height: 40,
    background: '#2a2a3e',
    border: '2px solid transparent',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s ease',
    outline: 'none'
  },
  presetCardActive: {
    borderColor: '#7c3aed',
    background: 'rgba(124, 58, 237, 0.2)',
    boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)'
  },
  presetIcon: {
    fontSize: 16
  },
  presetName: {
    fontSize: 13
  }
};

export default PresetSelector;
