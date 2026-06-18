import React, { useEffect, useCallback } from 'react';
import { useSeismicStore } from './store';
import {
  SOURCE_RANGE,
  MAGNITUDE_RANGE,
  SIM_DURATION,
  PLAYBACK_SPEEDS,
} from './config';

const baseStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: '320px',
    height: '80px',
    background: 'rgba(26, 26, 46, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    gap: '16px',
    zIndex: 100,
  },
  sliderGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  sliderLabel: {
    color: '#aaaacc',
    fontSize: '10px',
    fontFamily: 'monospace',
  },
  slider: {
    width: '80px',
    accentColor: '#6699ff',
    cursor: 'pointer',
  },
  sliderValue: {
    color: '#ffffff',
    fontSize: '10px',
    fontFamily: 'monospace',
    minWidth: '24px',
    textAlign: 'center' as const,
  },
  progressContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    maxWidth: '60%',
  },
  progressBar: {
    width: '100%',
    height: '6px',
    background: '#2a2a3e',
    borderRadius: '3px',
    position: 'relative' as const,
    cursor: 'pointer',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6699ff, #00ccff)',
    borderRadius: '3px',
    transition: 'width 0.1s ease-out',
  },
  progressThumb: {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#ffd700',
    border: '2px solid #ffaa00',
    cursor: 'grab',
    zIndex: 2,
    transition: 'left 0.1s ease-out',
  },
  progressLabel: {
    color: '#8888aa',
    fontSize: '10px',
    fontFamily: 'monospace',
  },
  playButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '2px solid #6699ff',
    background: '#1a1a2e',
    color: '#6699ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out',
    fontSize: '16px',
    flexShrink: 0,
  },
  startButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '2px solid #00ff88',
    background: '#1a1a2e',
    color: '#00ff88',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out',
    fontSize: '12px',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  speedGroup: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
  faultToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  },
  faultCheckbox: {
    accentColor: '#6699ff',
    cursor: 'pointer',
  },
  faultLabel: {
    color: '#aaaacc',
    fontSize: '10px',
    fontFamily: 'monospace',
    cursor: 'pointer',
  },
  separator: {
    width: '1px',
    height: '40px',
    background: '#333355',
    flexShrink: 0,
  },
};

const speedButtonStyle = (active: boolean): React.CSSProperties => ({
  width: '36px',
  height: '24px',
  borderRadius: '4px',
  border: 'none',
  background: active ? '#3366cc' : '#2a2a3e',
  color: '#ffffff',
  fontSize: '10px',
  fontFamily: 'monospace',
  cursor: 'pointer',
  transition: 'background 0.2s ease-out',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const styles = baseStyles;

const UiController: React.FC = () => {
  const sourceX = useSeismicStore((s) => s.sourceX);
  const sourceY = useSeismicStore((s) => s.sourceY);
  const sourceZ = useSeismicStore((s) => s.sourceZ);
  const magnitude = useSeismicStore((s) => s.magnitude);
  const isRunning = useSeismicStore((s) => s.isRunning);
  const isPaused = useSeismicStore((s) => s.isPaused);
  const playbackSpeed = useSeismicStore((s) => s.playbackSpeed);
  const currentTime = useSeismicStore((s) => s.currentTime);
  const showFault = useSeismicStore((s) => s.showFault);

  const setSourceX = useSeismicStore((s) => s.setSourceX);
  const setSourceY = useSeismicStore((s) => s.setSourceY);
  const setSourceZ = useSeismicStore((s) => s.setSourceZ);
  const setMagnitude = useSeismicStore((s) => s.setMagnitude);
  const startSimulation = useSeismicStore((s) => s.startSimulation);
  const pauseSimulation = useSeismicStore((s) => s.pauseSimulation);
  const resumeSimulation = useSeismicStore((s) => s.resumeSimulation);
  const setPlaybackSpeed = useSeismicStore((s) => s.setPlaybackSpeed);
  const toggleFault = useSeismicStore((s) => s.toggleFault);
  const resetSimulation = useSeismicStore((s) => s.resetSimulation);

  const handleSpaceKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isRunning) return;
        if (isPaused) {
          resumeSimulation();
        } else {
          pauseSimulation();
        }
      }
    },
    [isRunning, isPaused, pauseSimulation, resumeSimulation]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleSpaceKey);
    return () => window.removeEventListener('keydown', handleSpaceKey);
  }, [handleSpaceKey]);

  const progress = SIM_DURATION > 0 ? (currentTime / SIM_DURATION) * 100 : 0;

  const handlePlayPause = () => {
    if (!isRunning) {
      startSimulation();
      return;
    }
    if (isPaused) {
      resumeSimulation();
    } else {
      pauseSimulation();
    }
  };

  return (
    <div style={styles.container}>
      <button
        style={{
          ...styles.startButton,
          opacity: isRunning ? 0.5 : 1,
        }}
        onClick={isRunning ? resetSimulation : startSimulation}
        title={isRunning ? '重置' : '开始'}
      >
        {isRunning ? '⟳' : '▶'}
      </button>

      <div style={styles.separator} />

      <div style={styles.sliderGroup}>
        <span style={styles.sliderLabel}>X</span>
        <input
          type="range"
          style={styles.slider}
          min={SOURCE_RANGE.min}
          max={SOURCE_RANGE.max}
          step={SOURCE_RANGE.step}
          value={sourceX}
          onChange={(e) => setSourceX(Number(e.target.value))}
        />
        <span style={styles.sliderValue}>{sourceX}</span>
      </div>

      <div style={styles.sliderGroup}>
        <span style={styles.sliderLabel}>Y</span>
        <input
          type="range"
          style={styles.slider}
          min={SOURCE_RANGE.min}
          max={SOURCE_RANGE.max}
          step={SOURCE_RANGE.step}
          value={sourceY}
          onChange={(e) => setSourceY(Number(e.target.value))}
        />
        <span style={styles.sliderValue}>{sourceY}</span>
      </div>

      <div style={styles.sliderGroup}>
        <span style={styles.sliderLabel}>Z</span>
        <input
          type="range"
          style={styles.slider}
          min={SOURCE_RANGE.min}
          max={SOURCE_RANGE.max}
          step={SOURCE_RANGE.step}
          value={sourceZ}
          onChange={(e) => setSourceZ(Number(e.target.value))}
        />
        <span style={styles.sliderValue}>{sourceZ}</span>
      </div>

      <div style={styles.sliderGroup}>
        <span style={styles.sliderLabel}>震级</span>
        <input
          type="range"
          style={styles.slider}
          min={MAGNITUDE_RANGE.min}
          max={MAGNITUDE_RANGE.max}
          step={MAGNITUDE_RANGE.step}
          value={magnitude}
          onChange={(e) => setMagnitude(Number(e.target.value))}
        />
        <span style={styles.sliderValue}>{magnitude}</span>
      </div>

      <div style={styles.separator} />

      <button
        style={{
          ...styles.playButton,
          opacity: !isRunning ? 0.4 : 1,
        }}
        onClick={handlePlayPause}
        disabled={!isRunning}
        title={isPaused ? '继续' : '暂停'}
      >
        {isPaused ? '▶' : '⏸'}
      </button>

      <div style={styles.progressContainer}>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          <div
            style={{
              ...styles.progressThumb,
              left: `${progress}%`,
            }}
          />
        </div>
        <span style={styles.progressLabel}>
          {currentTime.toFixed(1)}s / {SIM_DURATION}s
        </span>
      </div>

      <div style={styles.speedGroup}>
        {PLAYBACK_SPEEDS.map((sp) => (
          <button
            key={sp}
            style={speedButtonStyle(playbackSpeed === sp)}
            onClick={() => setPlaybackSpeed(sp)}
            title={`${sp}x`}
          >
            {sp}x
          </button>
        ))}
      </div>

      <div style={styles.separator} />

      <div style={styles.faultToggle}>
        <input
          type="checkbox"
          style={styles.faultCheckbox}
          checked={showFault}
          onChange={toggleFault}
          id="fault-toggle"
        />
        <label style={styles.faultLabel} htmlFor="fault-toggle">
          断层
        </label>
      </div>
    </div>
  );
};

export default UiController;
