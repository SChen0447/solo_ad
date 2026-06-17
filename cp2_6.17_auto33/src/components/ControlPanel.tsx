import React, { useState, useRef, useCallback, useEffect } from 'react';
import { HeightMap } from '../server/terrainGenerator';
import { ParticlePath } from '../server/erosionSimulator';

export type TerrainPreset = 'custom' | 'plain' | 'hills' | 'mountains' | 'canyon';

export interface TerrainPresetConfig {
  name: string;
  label: string;
  size: number;
  heightRange: number;
  seed: number;
}

export const TERRAIN_PRESETS: Record<TerrainPreset, TerrainPresetConfig> = {
  custom: { name: 'custom', label: '自定义', size: 30, heightRange: 60, seed: 0 },
  plain: { name: 'plain', label: '平原', size: 40, heightRange: 15, seed: 1234 },
  hills: { name: 'hills', label: '丘陵', size: 35, heightRange: 35, seed: 5678 },
  mountains: { name: 'mountains', label: '山地', size: 30, heightRange: 80, seed: 9012 },
  canyon: { name: 'canyon', label: '峡谷', size: 45, heightRange: 65, seed: 3456 }
};

interface ControlPanelProps {
  onTerrainGenerated: (heightMap: HeightMap, size: number) => void;
  onErosionIteration: (heightMap: HeightMap, paths: ParticlePath[]) => void;
  onIterationComplete: () => void;
  currentIteration: number;
  totalIterations: number;
  isSimulating: boolean;
  onSimulatingChange: (simulating: boolean) => void;
  onIterationChange: (iteration: number) => void;
  onTotalIterationsChange: (total: number) => void;
  currentPreset: TerrainPreset;
  onPresetChange: (preset: TerrainPreset) => void;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

const MountainIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4FC3F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5L4 20h16L14.5 10l-3 3.5L8.5 14.5z" />
    <path d="M4.52 15.52L2 20h20l-2.45-4.5" />
  </svg>
);

const WaterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4FC3F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    <path d="M12 12v6" />
  </svg>
);

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transition: 'transform 0.3s ease',
      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SliderControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, step = 1, unit = '', onChange }) => (
  <div style={styles.sliderContainer}>
    <div style={styles.sliderLabelRow}>
      <span style={styles.sliderLabel}>{label}</span>
      <span style={styles.sliderValue}>
        {value}
        {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={styles.slider}
    />
  </div>
);

const RippleButton: React.FC<{
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  style?: React.CSSProperties;
}> = ({ onClick, disabled, children, variant = 'primary', style }) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [isPressed, setIsPressed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleIdRef = useRef(0);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;

      const button = buttonRef.current;
      if (button) {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = rippleIdRef.current++;

        setRipples((prev) => [...prev, { id, x, y }]);

        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 300);
      }

      onClick(e);
    },
    [disabled, onClick]
  );

  const handleMouseDown = useCallback(() => {
    if (!disabled) setIsPressed(true);
  }, [disabled]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPressed(false);
  }, []);

  const buttonStyle = {
    ...styles.button,
    ...(variant === 'secondary' ? styles.buttonSecondary : styles.buttonPrimary),
    ...(disabled ? styles.buttonDisabled : {}),
    ...(isPressed && !disabled ? styles.buttonPressed : {}),
    ...style
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      style={buttonStyle}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          style={{
            ...styles.ripple,
            left: ripple.x,
            top: ripple.y
          }}
        />
      ))}
      <span style={styles.buttonContent}>{children}</span>
    </button>
  );
};

const CollapsibleGroup: React.FC<{
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={styles.groupContainer}>
      <div
        style={styles.groupHeader}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={styles.groupTitleRow}>
          {icon}
          <span style={styles.groupTitle}>{title}</span>
        </div>
        <ChevronIcon isOpen={isOpen} />
      </div>
      <div
        style={{
          ...styles.groupContent,
          maxHeight: isOpen ? '500px' : '0px',
          opacity: isOpen ? 1 : 0,
          paddingTop: isOpen ? '12px' : '0px',
          paddingBottom: isOpen ? '4px' : '0px'
        }}
      >
        {children}
      </div>
    </div>
  );
};

const ControlPanel: React.FC<ControlPanelProps> = ({
  onTerrainGenerated,
  onErosionIteration,
  onIterationComplete,
  currentIteration,
  totalIterations,
  isSimulating,
  onSimulatingChange,
  onIterationChange,
  onTotalIterationsChange,
  currentPreset,
  onPresetChange
}) => {
  const [terrainSize, setTerrainSize] = useState(30);
  const [heightRange, setHeightRange] = useState(60);
  const [seed, setSeed] = useState(Math.floor(Math.random() * 10000));
  const [iterations, setIterations] = useState(30);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (currentPreset !== 'custom') {
      const preset = TERRAIN_PRESETS[currentPreset];
      setTerrainSize(preset.size);
      setHeightRange(preset.heightRange);
      setSeed(preset.seed);
    }
  }, [currentPreset]);

  const handleParamChange = useCallback(() => {
    if (currentPreset !== 'custom') {
      onPresetChange('custom');
    }
  }, [currentPreset, onPresetChange]);

  useEffect(() => {
    const checkScreenWidth = () => {
      setIsNarrowScreen(window.innerWidth <= 1024);
    };
    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);
    return () => window.removeEventListener('resize', checkScreenWidth);
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-terrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size: terrainSize, heightRange, seed })
      });
      const data = await response.json();
      if (data.heightMap) {
        onTerrainGenerated(data.heightMap, data.size);
      }
    } catch (error) {
      console.error('生成地形失败:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [terrainSize, heightRange, seed, onTerrainGenerated]);

  const handleSimulate = useCallback(async () => {
    if (isSimulating) return;

    onSimulatingChange(true);
    onIterationChange(0);

    try {
      for (let i = 0; i < iterations; i++) {
        const response = await fetch('/api/erode-terrain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            heightMap: await new Promise<HeightMap>((resolve) => {
              const event = new CustomEvent('getHeightMap');
              let heightMap: HeightMap | null = null;
              const handler = (e: Event) => {
                const customEvent = e as CustomEvent<{ heightMap: HeightMap }>;
                heightMap = customEvent.detail.heightMap;
                document.removeEventListener('getHeightMapResponse', handler);
                resolve(heightMap || []);
              };
              document.addEventListener('getHeightMapResponse', handler);
              document.dispatchEvent(event);
            }),
            iterations: 1
          })
        });

        const data = await response.json();
        if (data.heightMap) {
          onErosionIteration(data.heightMap, data.paths || []);
          onIterationChange(i + 1);
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('模拟失败:', error);
    } finally {
      onSimulatingChange(false);
      onIterationComplete();
    }
  }, [iterations, isSimulating, onSimulatingChange, onIterationChange, onErosionIteration, onIterationComplete]);

  const handleRandomSeed = useCallback(() => {
    setSeed(Math.floor(Math.random() * 10000));
    handleParamChange();
  }, [handleParamChange]);

  const panelContent = (
    <>
      <div style={styles.panelHeader}>
        <div style={styles.panelTitleRow}>
          <span style={styles.panelTitle}>控制面板</span>
          {isNarrowScreen && (
            <button
              style={styles.closeButton}
              onClick={() => setIsDrawerOpen(false)}
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>

      <div style={styles.panelContent}>
        <CollapsibleGroup title="地形参数" icon={<MountainIcon />} defaultOpen={true}>
          <div style={styles.presetContainer}>
            <label style={styles.presetLabel}>地貌预设</label>
            <select
              value={currentPreset}
              onChange={(e) => onPresetChange(e.target.value as TerrainPreset)}
              style={styles.presetSelect}
              disabled={isGenerating || isSimulating}
            >
              {Object.values(TERRAIN_PRESETS).map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          <SliderControl
            label="地形大小"
            value={terrainSize}
            min={10}
            max={50}
            unit={`×${terrainSize}`}
            onChange={(val) => {
              setTerrainSize(val);
              handleParamChange();
            }}
          />
          <SliderControl
            label="高度范围"
            value={heightRange}
            min={0}
            max={100}
            unit="单位"
            onChange={(val) => {
              setHeightRange(val);
              handleParamChange();
            }}
          />
          <div style={styles.seedRow}>
            <SliderControl
              label="随机种子"
              value={seed}
              min={0}
              max={9999}
              onChange={(val) => {
                setSeed(val);
                handleParamChange();
              }}
            />
            <button
              onClick={handleRandomSeed}
              style={styles.randomButton}
              disabled={isGenerating || isSimulating}
            >
              随机
            </button>
          </div>
          <RippleButton
            onClick={handleGenerate}
            disabled={isGenerating || isSimulating}
            variant="primary"
            style={{ width: '100%', marginTop: '12px' }}
          >
            {isGenerating ? '生成中...' : '生成地形'}
          </RippleButton>
        </CollapsibleGroup>

        <CollapsibleGroup title="模拟控制" icon={<WaterIcon />} defaultOpen={true}>
          <SliderControl
            label="迭代次数"
            value={iterations}
            min={20}
            max={50}
            unit="次"
            onChange={(val) => {
              setIterations(val);
              onTotalIterationsChange(val);
            }}
          />
          <div style={styles.iterationDisplay}>
            <span style={styles.iterationLabel}>当前进度</span>
            <span style={styles.iterationValue}>
              {currentIteration} / {totalIterations}
            </span>
          </div>
          <div style={styles.progressBarContainer}>
            <div
              style={{
                ...styles.progressBar,
                width: `${totalIterations > 0 ? (currentIteration / totalIterations) * 100 : 0}%`
              }}
            />
          </div>
          <RippleButton
            onClick={handleSimulate}
            disabled={isSimulating || isGenerating}
            variant="secondary"
            style={{ width: '100%', marginTop: '16px' }}
          >
            {isSimulating ? '模拟中...' : '开始模拟'}
          </RippleButton>
        </CollapsibleGroup>
      </div>
    </>
  );

  if (isNarrowScreen) {
    return (
      <>
        <button
          style={styles.drawerToggle}
          onClick={() => setIsDrawerOpen(true)}
        >
          <MenuIcon />
        </button>

        <div
          style={{
            ...styles.drawerOverlay,
            opacity: isDrawerOpen ? 1 : 0,
            pointerEvents: isDrawerOpen ? 'auto' : 'none'
          }}
          onClick={() => setIsDrawerOpen(false)}
        />

        <div
          style={{
            ...styles.panel,
            ...styles.drawerPanel,
            transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
            opacity: isDrawerOpen ? 1 : 0
          }}
        >
          {panelContent}
        </div>
      </>
    );
  }

  return (
    <div style={styles.panel}>
      {panelContent}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: '300px',
    backgroundColor: 'rgba(30, 30, 40, 0.85)',
    borderRadius: '8px',
    padding: '0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(79, 195, 247, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    fontFamily: "'Segoe UI', sans-serif",
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease'
  },

  drawerPanel: {
    position: 'fixed',
    top: '48px',
    right: '0',
    bottom: '0',
    height: 'calc(100vh - 48px)',
    borderRadius: '8px 0 0 8px',
    zIndex: 1000,
    boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.5)'
  },

  drawerOverlay: {
    position: 'fixed',
    top: '48px',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
    transition: 'opacity 0.3s ease',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)'
  },

  drawerToggle: {
    position: 'fixed',
    top: '60px',
    right: '16px',
    width: '44px',
    height: '44px',
    backgroundColor: 'rgba(30, 30, 40, 0.9)',
    border: '1px solid rgba(79, 195, 247, 0.4)',
    borderRadius: '8px',
    color: '#e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 998,
    transition: 'all 0.15s ease',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)'
  },

  panelHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(79, 195, 247, 0.15)',
    backgroundColor: 'rgba(79, 195, 247, 0.05)'
  },

  panelTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  panelTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#ffffff',
    letterSpacing: '0.5px'
  },

  closeButton: {
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'all 0.2s ease'
  },

  panelContent: {
    padding: '12px',
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  groupContainer: {
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(79, 195, 247, 0.1)'
  },

  groupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    color: '#e0e0e0',
    userSelect: 'none'
  },

  groupTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },

  groupTitle: {
    fontSize: '13px',
    fontWeight: 500,
    letterSpacing: '0.3px'
  },

  groupContent: {
    overflow: 'hidden',
    transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, padding 0.3s ease',
    paddingLeft: '14px',
    paddingRight: '14px'
  },

  presetContainer: {
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(79, 195, 247, 0.15)'
  },

  presetLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#b0b0b0',
    marginBottom: '6px'
  },

  presetSelect: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '12px',
    fontFamily: "'Segoe UI', sans-serif",
    color: '#e0e0e0',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(79, 195, 247, 0.4)',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234FC3F7' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: '36px'
  },

  sliderContainer: {
    marginBottom: '14px'
  },

  sliderLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px'
  },

  sliderLabel: {
    fontSize: '12px',
    color: '#b0b0b0'
  },

  sliderValue: {
    fontSize: '12px',
    color: '#4FC3F7',
    fontWeight: 500,
    minWidth: '50px',
    textAlign: 'right'
  },

  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: '#2a2a3a',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    cursor: 'pointer'
  } as React.CSSProperties,

  seedRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-end'
  },

  randomButton: {
    flexShrink: 0,
    padding: '6px 14px',
    fontSize: '11px',
    backgroundColor: 'rgba(79, 195, 247, 0.1)',
    border: '1px solid rgba(79, 195, 247, 0.4)',
    borderRadius: '4px',
    color: '#4FC3F7',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: "'Segoe UI', sans-serif"
  },

  iterationDisplay: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
    marginBottom: '8px',
    padding: '10px 12px',
    backgroundColor: 'rgba(79, 195, 247, 0.08)',
    borderRadius: '4px',
    border: '1px solid rgba(79, 195, 247, 0.15)'
  },

  iterationLabel: {
    fontSize: '12px',
    color: '#b0b0b0'
  },

  iterationValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#4FC3F7'
  },

  progressBarContainer: {
    height: '6px',
    backgroundColor: '#333',
    borderRadius: '3px',
    overflow: 'hidden'
  },

  progressBar: {
    height: '100%',
    backgroundColor: '#4FC3F7',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
    boxShadow: '0 0 8px rgba(79, 195, 247, 0.5)'
  },

  button: {
    position: 'relative',
    padding: '12px 20px',
    fontSize: '13px',
    fontWeight: 500,
    borderRadius: '4px',
    cursor: 'pointer',
    overflow: 'hidden',
    border: '1px solid #4FC3F7',
    fontFamily: "'Segoe UI', sans-serif",
    letterSpacing: '0.3px',
    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    outline: 'none'
  },

  buttonPrimary: {
    backgroundColor: 'rgba(79, 195, 247, 0.15)',
    color: '#4FC3F7'
  },

  buttonSecondary: {
    backgroundColor: 'rgba(79, 195, 247, 0.1)',
    color: '#4FC3F7'
  },

  buttonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed'
  },

  buttonPressed: {
    transform: 'scale(1.05)'
  },

  buttonContent: {
    position: 'relative',
    zIndex: 1
  },

  ripple: {
    position: 'absolute',
    borderRadius: '50%',
    backgroundColor: 'rgba(79, 195, 247, 0.5)',
    transform: 'translate(-50%, -50%) scale(0)',
    pointerEvents: 'none',
    width: '20px',
    height: '20px',
    animation: 'ripple-animation 0.3s ease-out forwards'
  } as React.CSSProperties
};

export default ControlPanel;
