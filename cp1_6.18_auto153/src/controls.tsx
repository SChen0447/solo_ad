import React, { useState, useEffect } from 'react';
import { useSeismicStore } from './store';
import type { DisplayMode, ViewMode, WaveType } from './types';

const styles: Record<string, React.CSSProperties> = {
  panel: {
    height: '100%',
    backgroundColor: '#2a2e3a',
    color: '#e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif',
  },
  scrollContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
  },
  group: {
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid #3a3f4f',
  },
  groupLast: {
    marginBottom: '0',
    paddingBottom: '0',
    borderBottom: 'none',
  },
  groupTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#8a90a0',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '12px',
  },
  label: {
    fontSize: '13px',
    color: '#b0b6c0',
    marginBottom: '6px',
    display: 'block',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: '#1a1e2a',
    border: '1px solid #3a3f4f',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  inputFocused: {
    borderColor: '#2b7be4',
    boxShadow: '0 0 8px rgba(43, 123, 228, 0.4)',
  },
  slider: {
    width: '100%',
    height: '4px',
    marginTop: '4px',
    marginBottom: '4px',
    WebkitAppearance: 'none',
    appearance: 'none',
    background: '#3a3f4f',
    borderRadius: '2px',
    outline: 'none',
    cursor: 'pointer',
  },
  valueLabel: {
    fontSize: '12px',
    color: '#8a90a0',
    minWidth: '50px',
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  buttonRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '8px',
  },
  button: {
    flex: 1,
    minWidth: '80px',
    padding: '10px 14px',
    backgroundColor: '#3a3f4f',
    color: '#e0e0e0',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  buttonActive: {
    backgroundColor: '#2b7be4',
    color: '#ffffff',
    transform: 'scale(1.02)',
  },
  buttonActiveRed: {
    backgroundColor: '#e44b2b',
    color: '#ffffff',
    transform: 'scale(1.02)',
  },
  buttonPrimary: {
    padding: '12px 20px',
    backgroundColor: '#2b7be4',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    width: '100%',
  },
  buttonDanger: {
    padding: '12px 20px',
    backgroundColor: '#e44b2b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    width: '100%',
  },
  buttonSecondary: {
    padding: '10px 20px',
    backgroundColor: '#3a3f4f',
    color: '#e0e0e0',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    width: '100%',
    marginTop: '8px',
  },
  statsPanel: {
    position: 'absolute',
    left: '16px',
    bottom: '16px',
    backgroundColor: 'rgba(42, 46, 58, 0.9)',
    backdropFilter: 'blur(8px)',
    padding: '16px 20px',
    borderRadius: '8px',
    border: '1px solid #3a3f4f',
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#e0e0e0',
    minWidth: '220px',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
  },
  statLabel: {
    color: '#8a90a0',
    fontSize: '12px',
  },
  statValue: {
    color: '#ffffff',
    fontWeight: 600,
    fontFamily: 'monospace',
  },
  statValueFinished: {
    color: '#2b7be4',
    fontWeight: 700,
    fontFamily: 'monospace',
  },
  mobileToggle: {
    position: 'absolute',
    right: '16px',
    top: '16px',
    zIndex: 100,
    padding: '10px 16px',
    backgroundColor: '#2a2e3a',
    color: '#e0e0e0',
    border: '1px solid #3a3f4f',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  mobileDrawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
    backgroundColor: '#2a2e3a',
    borderTop: '1px solid #3a3f4f',
    borderTopLeftRadius: '16px',
    borderTopRightRadius: '16px',
    zIndex: 50,
    transition: 'transform 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
  },
};

function SliderInput({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = '',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleInputBlur = () => {
    const num = parseFloat(inputValue);
    if (!isNaN(num)) {
      const clamped = Math.max(min, Math.min(max, num));
      onChange(clamped);
    } else {
      setInputValue(value.toString());
    }
    setFocused(false);
  };

  return (
    <div>
      <span style={styles.label}>{label}</span>
      <div style={styles.inputRow}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={styles.slider}
        />
      </div>
      <div style={styles.inputRow}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={handleInputBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleInputBlur()}
          style={{
            ...styles.input,
            ...(focused ? styles.inputFocused : {}),
          }}
        />
        <span style={styles.valueLabel}>
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit}
        </span>
      </div>
    </div>
  );
}

function ToggleButton({
  label,
  active,
  onClick,
  color = 'blue',
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: 'blue' | 'red';
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles.button,
        ...(active
          ? color === 'red'
            ? styles.buttonActiveRed
            : styles.buttonActive
          : {}),
        transform: hovered || active ? 'scale(1.02)' : 'scale(1)',
        boxShadow: hovered ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      {label}
    </button>
  );
}

function ControlPanelContent() {
  const {
    hypocenter,
    displayMode,
    viewMode,
    waveTypes,
    isSimulating,
    setHypocenter,
    setDisplayMode,
    setViewMode,
    toggleWaveType,
    startSimulation,
    stopSimulation,
    resetSimulation,
  } = useSeismicStore();

  const [simButtonHover, setSimButtonHover] = useState(false);
  const [resetButtonHover, setResetButtonHover] = useState(false);

  return (
    <div style={styles.scrollContainer}>
      <div style={styles.group}>
        <div style={styles.groupTitle}>震源参数</div>
        <SliderInput
          label="经度 (°)"
          value={hypocenter.longitude}
          min={-180}
          max={180}
          step={1}
          onChange={(v) => setHypocenter({ longitude: v })}
          unit="°"
        />
        <SliderInput
          label="纬度 (°)"
          value={hypocenter.latitude}
          min={-90}
          max={90}
          step={1}
          onChange={(v) => setHypocenter({ latitude: v })}
          unit="°"
        />
        <SliderInput
          label="深度 (公里)"
          value={hypocenter.depth}
          min={0}
          max={700}
          step={1}
          onChange={(v) => setHypocenter({ depth: v })}
          unit="km"
        />
      </div>

      <div style={styles.group}>
        <div style={styles.groupTitle}>显示模式</div>
        <div style={styles.buttonRow}>
          {(['wavefront', 'rays', 'both'] as DisplayMode[]).map((mode) => (
            <ToggleButton
              key={mode}
              label={
                mode === 'wavefront' ? '波前' : mode === 'rays' ? '射线' : '全部'
              }
              active={displayMode === mode}
              onClick={() => setDisplayMode(mode)}
            />
          ))}
        </div>
      </div>

      <div style={styles.group}>
        <div style={styles.groupTitle}>波类型</div>
        <div style={styles.buttonRow}>
          <ToggleButton
            label="P 波"
            active={waveTypes.P}
            onClick={() => toggleWaveType('P')}
            color="blue"
          />
          <ToggleButton
            label="S 波"
            active={waveTypes.S}
            onClick={() => toggleWaveType('S')}
            color="red"
          />
        </div>
      </div>

      <div style={styles.group}>
        <div style={styles.groupTitle}>视角切换</div>
        <div style={styles.buttonRow}>
          {(['top', 'side', 'cross', 'global'] as ViewMode[]).map((mode) => (
            <ToggleButton
              key={mode}
              label={
                mode === 'top'
                  ? '俯视'
                  : mode === 'side'
                  ? '侧视'
                  : mode === 'cross'
                  ? '剖视'
                  : '全局'
              }
              active={viewMode === mode}
              onClick={() => setViewMode(mode)}
            />
          ))}
        </div>
      </div>

      <div style={{ ...styles.group, ...styles.groupLast }}>
        <div style={styles.groupTitle}>模拟控制</div>
        <button
          onClick={isSimulating ? stopSimulation : startSimulation}
          onMouseEnter={() => setSimButtonHover(true)}
          onMouseLeave={() => setSimButtonHover(false)}
          style={{
            ...(isSimulating ? styles.buttonDanger : styles.buttonPrimary),
            transform: simButtonHover ? 'scale(1.02)' : 'scale(1)',
            boxShadow: simButtonHover ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          {isSimulating ? '⏹ 停止模拟' : '▶ 开始模拟'}
        </button>
        <button
          onClick={resetSimulation}
          onMouseEnter={() => setResetButtonHover(true)}
          onMouseLeave={() => setResetButtonHover(false)}
          style={{
            ...styles.buttonSecondary,
            transform: resetButtonHover ? 'scale(1.02)' : 'scale(1)',
            boxShadow: resetButtonHover ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          ↺ 重置
        </button>
      </div>
    </div>
  );
}

export function StatsPanel() {
  const stats = useSeismicStore((state) => state.stats);

  return (
    <div style={styles.statsPanel}>
      <div style={{ ...styles.groupTitle, marginBottom: '10px' }}>实时统计</div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>模拟时间</span>
        <span
          style={{
            ...(stats.isFinished ? styles.statValueFinished : styles.statValue),
          }}
        >
          {stats.simulationTime.toFixed(2)} s
        </span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>P波最远距离</span>
        <span style={styles.statValue}>{stats.pWaveMaxDistance} km</span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>S波最远距离</span>
        <span style={styles.statValue}>{stats.sWaveMaxDistance} km</span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>已到达接收点</span>
        <span style={styles.statValue}>{stats.arrivedReceiversCount} / 100</span>
      </div>
      {stats.isFinished && (
        <>
          <div
            style={{
              borderTop: '1px solid #3a3f4f',
              marginTop: '10px',
              paddingTop: '10px',
            }}
          >
            <div style={{ ...styles.groupTitle, marginBottom: '8px' }}>
              模拟结果
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>总耗时</span>
              <span style={styles.statValueFinished}>
                {stats.totalTime.toFixed(2)} s
              </span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>平均P波波速</span>
              <span style={styles.statValue}>
                {stats.averagePSpeed.toFixed(2)} km/s
              </span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>平均S波波速</span>
              <span style={styles.statValue}>
                {stats.averageSSpeed.toFixed(2)} km/s
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ControlPanel({
  isMobile,
  drawerOpen,
  onToggleDrawer,
}: {
  isMobile: boolean;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
}) {
  if (isMobile) {
    return (
      <>
        <button style={styles.mobileToggle} onClick={onToggleDrawer}>
          {drawerOpen ? '▼ 收起面板' : '☰ 控制面板'}
        </button>
        <div
          style={{
            ...styles.mobileDrawer,
            transform: drawerOpen ? 'translateY(0)' : 'translateY(100%)',
          }}
        >
          <ControlPanelContent />
        </div>
      </>
    );
  }

  return (
    <div style={styles.panel}>
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #3a3f4f',
          backgroundColor: '#222633',
        }}
      >
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#ffffff',
            margin: 0,
          }}
        >
          地震波传播模拟器
        </h2>
        <p style={{ fontSize: '12px', color: '#8a90a0', margin: '4px 0 0 0' }}>
          Seismic Wave Visualizer
        </p>
      </div>
      <ControlPanelContent />
    </div>
  );
}
