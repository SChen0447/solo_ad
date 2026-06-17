import React, { useState, useCallback, useEffect } from 'react';
import { Camera, Sun, Moon, Plus, Trash2 } from 'lucide-react';
import { SceneManager, LightEntry } from './SceneManager';
import { MAX_LIGHTS, ROOM, InitialLight } from './roomData';

interface LightEditorProps {
  sceneManager: SceneManager | null;
}

export const LightEditor: React.FC<LightEditorProps> = ({ sceneManager }) => {
  const [selectedLightId, setSelectedLightId] = useState<string>('');
  const [lights, setLights] = useState<LightEntry[]>([]);
  const [isNight, setIsNight] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [newLightType, setNewLightType] = useState<'point' | 'spot'>('point');

  const selectedLight = lights.find((l) => l.id === selectedLightId);

  const refreshLights = useCallback(() => {
    if (!sceneManager) return;
    setLights([...sceneManager.lights]);
  }, [sceneManager]);

  useEffect(() => {
    if (!sceneManager) return;
    refreshLights();
    if (sceneManager.lights.length > 0 && !selectedLightId) {
      setSelectedLightId(sceneManager.lights[0].id);
    }
  }, [sceneManager, refreshLights, selectedLightId]);

  const handleAddLight = () => {
    if (!sceneManager || lights.length >= MAX_LIGHTS) return;
    const config: InitialLight = {
      name: newLightType === 'point' ? `点光源${lights.length + 1}` : `聚光灯${lights.length + 1}`,
      type: newLightType,
      x: ROOM.width / 2,
      y: 2.0,
      z: ROOM.depth / 2,
      color: '#ffffff',
      intensity: 0.6,
    };
    const entry = sceneManager.addLight(config);
    if (entry) {
      refreshLights();
      setSelectedLightId(entry.id);
    }
  };

  const handleRemoveLight = () => {
    if (!sceneManager || !selectedLightId) return;
    sceneManager.removeLight(selectedLightId);
    refreshLights();
    const remaining = sceneManager.lights;
    setSelectedLightId(remaining.length > 0 ? remaining[0].id : '');
  };

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    if (!sceneManager || !selectedLightId) return;
    const entry = sceneManager.lights.find((l) => l.id === selectedLightId);
    if (!entry) return;
    const pos = entry.light.position;
    const newPos = { x: pos.x, y: pos.y, z: pos.z };
    newPos[axis] = value;
    sceneManager.updateLightPosition(selectedLightId, newPos.x, newPos.y, newPos.z);
    refreshLights();
  };

  const handleColorChange = (color: string) => {
    if (!sceneManager || !selectedLightId) return;
    sceneManager.updateLightColor(selectedLightId, color);
    refreshLights();
  };

  const handleIntensityChange = (intensity: number) => {
    if (!sceneManager || !selectedLightId) return;
    sceneManager.updateLightIntensity(selectedLightId, intensity);
    refreshLights();
  };

  const handleNightToggle = () => {
    if (!sceneManager) return;
    const next = !isNight;
    setIsNight(next);
    sceneManager.setNightMode(next);
  };

  const handleExport = async () => {
    if (!sceneManager || exporting) return;
    setExporting(true);
    try {
      await sceneManager.exportSnapshot();
    } finally {
      setTimeout(() => setExporting(false), 800);
    }
  };

  const pos = selectedLight
    ? {
        x: selectedLight.light.position.x,
        y: selectedLight.light.position.y,
        z: selectedLight.light.position.z,
      }
    : { x: 0, y: 0, z: 0 };

  const intensity = selectedLight ? selectedLight.light.intensity / 50 : 0;
  const color = selectedLight
    ? `#${selectedLight.light.color.getHexString()}`
    : '#ffffff';

  return (
    <div style={styles.panel}>
      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <label style={styles.label}>光源</label>
          <select
            value={selectedLightId}
            onChange={(e) => setSelectedLightId(e.target.value)}
            style={styles.select}
          >
            {lights.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.controlGroup}>
          <label style={styles.label}>类型</label>
          <select
            value={newLightType}
            onChange={(e) => setNewLightType(e.target.value as 'point' | 'spot')}
            style={styles.select}
          >
            <option value="point">点光源</option>
            <option value="spot">聚光灯</option>
          </select>
        </div>

        <div style={styles.controlGroup}>
          <button onClick={handleAddLight} style={styles.iconBtn} title="添加光源" disabled={lights.length >= MAX_LIGHTS}>
            <Plus size={14} />
          </button>
          <button onClick={handleRemoveLight} style={styles.iconBtn} title="删除光源" disabled={!selectedLightId}>
            <Trash2 size={14} />
          </button>
        </div>

        <div style={styles.divider} />

        {selectedLight && (
          <>
            <div style={styles.controlGroup}>
              <label style={styles.labelSmall}>X</label>
              <input
                type="range"
                min={0}
                max={ROOM.width}
                step={0.1}
                value={pos.x}
                onChange={(e) => handlePositionChange('x', parseFloat(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.value}>{pos.x.toFixed(1)}</span>
            </div>
            <div style={styles.controlGroup}>
              <label style={styles.labelSmall}>Y</label>
              <input
                type="range"
                min={0}
                max={ROOM.height}
                step={0.1}
                value={pos.y}
                onChange={(e) => handlePositionChange('y', parseFloat(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.value}>{pos.y.toFixed(1)}</span>
            </div>
            <div style={styles.controlGroup}>
              <label style={styles.labelSmall}>Z</label>
              <input
                type="range"
                min={0}
                max={ROOM.depth}
                step={0.1}
                value={pos.z}
                onChange={(e) => handlePositionChange('z', parseFloat(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.value}>{pos.z.toFixed(1)}</span>
            </div>

            <div style={styles.divider} />

            <div style={styles.controlGroup}>
              <label style={styles.labelSmall}>颜色</label>
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(e.target.value)}
                style={styles.colorPicker}
              />
            </div>

            <div style={styles.controlGroup}>
              <label style={styles.labelSmall}>强度</label>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={intensity}
                onChange={(e) => handleIntensityChange(parseFloat(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.value}>{intensity.toFixed(1)}</span>
            </div>
          </>
        )}

        <div style={styles.divider} />

        <button onClick={handleNightToggle} style={styles.toggleBtn} title={isNight ? '切换日间' : '切换夜间'}>
          {isNight ? <Moon size={16} /> : <Sun size={16} />}
          <span style={styles.toggleText}>{isNight ? '夜间' : '日间'}</span>
        </button>

        <div style={styles.exportWrapper}>
          <button onClick={handleExport} style={styles.exportBtn} disabled={exporting} title="导出快照">
            <Camera size={16} />
          </button>
          {exporting && <div style={styles.spinner} />}
        </div>
      </div>

      <style>{sliderStyles}</style>
    </div>
  );
};

const sliderStyles = `
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 70px;
    height: 4px;
    border-radius: 2px;
    background: #4fc3f7;
    outline: none;
    cursor: pointer;
    transition: background 0.2s;
  }
  input[type="range"]:hover {
    background: #81d4fa;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4fc3f7;
    border: 2px solid #1a1a2e;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s;
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    background: #81d4fa;
    transform: scale(1.15);
  }
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4fc3f7;
    border: 2px solid #1a1a2e;
    cursor: pointer;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (max-width: 1280px) {
    .light-panel {
      transform: scale(0.8);
      transform-origin: top center;
    }
  }
`;

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    className: 'light-panel',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 20px',
    height: 60,
    background: 'rgba(30, 30, 40, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 12,
    border: '1px solid rgba(79, 195, 247, 0.15)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  },
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    color: '#4fc3f7',
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    letterSpacing: '0.5px',
  },
  labelSmall: {
    color: '#a0a0b0',
    fontSize: 11,
    fontWeight: 500,
    minWidth: 20,
  },
  select: {
    background: 'rgba(255,255,255,0.08)',
    color: '#e0e0e0',
    border: '1px solid rgba(79, 195, 247, 0.2)',
    borderRadius: 6,
    padding: '3px 8px',
    fontSize: 12,
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  iconBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(79, 195, 247, 0.2)',
    borderRadius: 6,
    color: '#4fc3f7',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  divider: {
    width: 1,
    height: 32,
    background: 'rgba(79, 195, 247, 0.15)',
    margin: '0 4px',
  },
  slider: {},
  value: {
    color: '#b0b0c0',
    fontSize: 10,
    minWidth: 26,
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  colorPicker: {
    width: 24,
    height: 24,
    border: '2px solid rgba(79, 195, 247, 0.3)',
    borderRadius: 6,
    cursor: 'pointer',
    background: 'transparent',
    padding: 0,
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 12px',
    background: 'rgba(255, 167, 38, 0.15)',
    border: '1px solid rgba(255, 167, 38, 0.3)',
    borderRadius: 8,
    color: '#ffa726',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    transition: 'all 0.25s',
    whiteSpace: 'nowrap',
  },
  toggleText: {
    fontSize: 11,
  },
  exportWrapper: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    background: '#3f51b5',
    border: 'none',
    borderRadius: 8,
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  spinner: {
    width: 20,
    height: 20,
    border: '3px solid rgba(63, 81, 181, 0.3)',
    borderTopColor: '#3f51b5',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginTop: 4,
  },
};
