import type { VisualizationMode } from './ParticleSystem';

interface ModeSelectorProps {
  currentMode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
}

const modes: { key: VisualizationMode; label: string; icon: string }[] = [
  { key: 'waveform', label: 'Waveform', icon: '≋' },
  { key: 'spectrum', label: 'Spectrum', icon: '▮' },
  { key: 'pulse', label: 'Pulse', icon: '◉' },
];

export function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  return (
    <div style={styles.container}>
      {modes.map((mode) => {
        const isActive = currentMode === mode.key;
        return (
          <button
            key={mode.key}
            onClick={() => onModeChange(mode.key)}
            title={mode.label}
            style={{
              ...styles.button,
              ...(isActive ? styles.buttonActive : {}),
            }}
          >
            <span style={styles.icon}>{mode.icon}</span>
          </button>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  button: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#2a2a3a',
    color: '#cccccc',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    padding: 0,
    outline: 'none',
  },
  buttonActive: {
    backgroundColor: '#00e5ff',
    color: '#0a0a2e',
    transform: 'scale(1.1)',
    boxShadow: '0 0 10px #00e5ff',
  },
  icon: {
    fontSize: '14px',
    lineHeight: 1,
    fontWeight: 'bold',
  },
};
