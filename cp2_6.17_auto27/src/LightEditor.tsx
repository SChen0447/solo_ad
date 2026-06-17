import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  const [, forceTick] = useState(0);

  const selectedLight = useMemo(
    () => lights.find((l) => l.id === selectedLightId),
    [lights, selectedLightId]
  );

  const refreshLights = useCallback(() => {
    if (!sceneManager) return;
    setLights([...sceneManager.lights]);
    forceTick((t) => t + 1);
  }, [sceneManager]);

  useEffect(() => {
    if (!sceneManager) return;
    setLights([...sceneManager.lights]);
    if (sceneManager.lights.length > 0 && !selectedLightId) {
      setSelectedLightId(sceneManager.lights[0].id);
    }
  }, [sceneManager, selectedLightId]);

  useEffect(() => {
    const id = window.setInterval(refreshLights, 150);
    return () => window.clearInterval(id);
  }, [refreshLights]);

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

  const handleSelectedTypeChange = (type: 'point' | 'spot') => {
    if (!sceneManager || !selectedLightId) return;
    const current = sceneManager.lights.find((l) => l.id === selectedLightId);
    if (!current || current.type === type) return;
    const newEntry = sceneManager.convertLightType(selectedLightId, type);
    refreshLights();
    if (newEntry) setSelectedLightId(newEntry.id);
  };

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    if (!sceneManager || !selectedLightId || !selectedLight) return;
    const x = axis === 'x' ? value : selectedLight.light.position.x;
    const y = axis === 'y' ? value : selectedLight.light.position.y;
    const z = axis === 'z' ? value : selectedLight.light.position.z;
    sceneManager.updateLightPosition(selectedLightId, x, y, z);
    forceTick((t) => t + 1);
  };

  const handleColorChange = (color: string) => {
    if (!sceneManager || !selectedLightId) return;
    sceneManager.updateLightColor(selectedLightId, color);
    forceTick((t) => t + 1);
  };

  const handleIntensityChange = (intensity: number) => {
    if (!sceneManager || !selectedLightId) return;
    sceneManager.updateLightIntensity(selectedLightId, intensity);
    forceTick((t) => t + 1);
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
      await sceneManager.exportSnapshot(1920, 1080);
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

  const selectedType: 'point' | 'spot' = selectedLight?.type ?? 'point';

  return (
    <div className="light-panel" style={panelStyle}>
      <div style={controlsStyle}>
        <div style={cellStyle}>
          <label style={labelStyle}>光源</label>
          <select
            value={selectedLightId}
            onChange={(e) => setSelectedLightId(e.target.value)}
            style={selectStyle}
          >
            {lights.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div style={cellStyle}>
          <label style={labelStyle}>类型</label>
          <select
            value={selectedType}
            onChange={(e) => handleSelectedTypeChange(e.target.value as 'point' | 'spot')}
            style={selectStyle}
          >
            <option value="point">点光源</option>
            <option value="spot">聚光灯</option>
          </select>
        </div>

        <div style={cellStyle}>
          <label style={labelStyle}>新建</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <select
              value={newLightType}
              onChange={(e) => setNewLightType(e.target.value as 'point' | 'spot')}
              style={selectStyle}
            >
              <option value="point">点光源</option>
              <option value="spot">聚光灯</option>
            </select>
            <button
              onClick={handleAddLight}
              style={iconBtnStyle}
              title="添加光源"
              disabled={lights.length >= MAX_LIGHTS}
            >
              <Plus size={14} />
            </button>
            <button
              onClick={handleRemoveLight}
              style={iconBtnStyle}
              title="删除光源"
              disabled={!selectedLightId}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {selectedLight && (
          <>
            <div style={cellStyle}>
              <label style={labelSmallStyle}>X</label>
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={Number(pos.x.toFixed(1))}
                onChange={(e) => handlePositionChange('x', parseFloat(e.target.value))}
                style={sliderStyle}
              />
              <span style={valueStyle}>{pos.x.toFixed(1)}</span>
            </div>
            <div style={cellStyle}>
              <label style={labelSmallStyle}>Y</label>
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={Number(pos.y.toFixed(1))}
                onChange={(e) => handlePositionChange('y', parseFloat(e.target.value))}
                style={sliderStyle}
              />
              <span style={valueStyle}>{pos.y.toFixed(1)}</span>
            </div>
            <div style={cellStyle}>
              <label style={labelSmallStyle}>Z</label>
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={Number(pos.z.toFixed(1))}
                onChange={(e) => handlePositionChange('z', parseFloat(e.target.value))}
                style={sliderStyle}
              />
              <span style={valueStyle}>{pos.z.toFixed(1)}</span>
            </div>

            <div style={cellStyle}>
              <label style={labelSmallStyle}>颜色</label>
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(e.target.value)}
                style={colorPickerStyle}
              />
            </div>

            <div style={cellStyle}>
              <label style={labelSmallStyle}>强度</label>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={Number(intensity.toFixed(1))}
                onChange={(e) => handleIntensityChange(parseFloat(e.target.value))}
                style={sliderStyle}
              />
              <span style={valueStyle}>{intensity.toFixed(1)}</span>
            </div>
          </>
        )}

        <div style={cellStyle}>
          <button
            onClick={handleNightToggle}
            style={toggleBtnStyle}
            title={isNight ? '切换日间' : '切换夜间'}
          >
            {isNight ? <Moon size={16} /> : <Sun size={16} />}
            <span style={toggleTextStyle}>{isNight ? '夜间' : '日间'}</span>
          </button>
        </div>

        <div style={{ ...cellStyle, position: 'relative' }}>
          <div style={exportWrapperStyle}>
            <button
              onClick={handleExport}
              style={exportBtnStyle}
              disabled={exporting}
              title="导出快照"
            >
              <Camera size={16} />
            </button>
            {exporting && <div style={spinnerStyle} />}
          </div>
        </div>
      </div>

      <style>{customCss}</style>
    </div>
  );
};

const customCss = `
  .light-panel {
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
  }

  .light-panel input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 72px;
    height: 4px;
    border-radius: 2px;
    background: #4fc3f7;
    outline: none;
    cursor: pointer;
    transition: background 0.2s ease, box-shadow 0.2s ease;
  }
  .light-panel input[type="range"]:hover {
    background: #6fcbf7;
  }
  .light-panel input[type="range"]:active,
  .light-panel input[type="range"]:focus {
    background: #81d4fa;
    box-shadow: 0 0 6px rgba(79, 195, 247, 0.6);
  }
  .light-panel input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4fc3f7;
    border: 2px solid #1a1a2e;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.15s ease;
    box-shadow: 0 0 4px rgba(79, 195, 247, 0.5);
  }
  .light-panel input[type="range"]::-webkit-slider-thumb:hover {
    background: #81d4fa;
    transform: scale(1.15);
  }
  .light-panel input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4fc3f7;
    border: 2px solid #1a1a2e;
    cursor: pointer;
  }

  .light-panel button {
    transition: all 0.25s ease;
  }
  .light-panel button:hover:not(:disabled) {
    filter: brightness(1.15);
  }
  .light-panel button:active:not(:disabled) {
    transform: scale(0.95);
  }

  @keyframes spin360 {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .snapshot-spinner {
    animation: spin360 1s linear infinite;
  }

  @media (max-width: 1280px) {
    .light-panel {
      transform: translateX(-50%) scale(0.8);
      transform-origin: top center;
    }
  }
`;

const panelStyle: React.CSSProperties = {};

const controlsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(12, auto)',
  alignItems: 'center',
  columnGap: 12,
  rowGap: 8,
  padding: '8px 22px',
  height: 60,
  background: 'rgba(30, 30, 40, 0.85)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  borderRadius: 12,
  border: '1px solid rgba(79, 195, 247, 0.18)',
  boxShadow:
    '0 4px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255,255,255,0.02) inset',
};

const cellStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  color: '#4fc3f7',
  fontSize: 11,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
};

const labelSmallStyle: React.CSSProperties = {
  color: '#cfd2e0',
  fontSize: 11,
  fontWeight: 700,
  minWidth: 18,
};

const selectStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.07)',
  color: '#e8e8f0',
  border: '1px solid rgba(79, 195, 247, 0.22)',
  borderRadius: 6,
  padding: '3px 22px 3px 8px',
  fontSize: 12,
  outline: 'none',
  cursor: 'pointer',
  transition: 'border-color 0.2s, background 0.2s',
};

const iconBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  background: 'rgba(255, 255, 255, 0.07)',
  border: '1px solid rgba(79, 195, 247, 0.22)',
  borderRadius: 6,
  color: '#4fc3f7',
  cursor: 'pointer',
};

const sliderStyle: React.CSSProperties = {};

const valueStyle: React.CSSProperties = {
  color: '#b8bccb',
  fontSize: 10,
  minWidth: 28,
  textAlign: 'right',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontVariantNumeric: 'tabular-nums',
};

const colorPickerStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  border: '2px solid rgba(79, 195, 247, 0.35)',
  borderRadius: 6,
  cursor: 'pointer',
  background: 'transparent',
  padding: 0,
};

const toggleBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '5px 14px',
  background: 'rgba(255, 167, 38, 0.14)',
  border: '1px solid rgba(255, 167, 38, 0.32)',
  borderRadius: 8,
  color: '#ffa726',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const toggleTextStyle: React.CSSProperties = {
  fontSize: 11,
};

const exportWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 3,
};

const exportBtnStyle: React.CSSProperties = {
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
  boxShadow: '0 2px 8px rgba(63, 81, 181, 0.4)',
};

const spinnerStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  border: '3px solid rgba(63, 81, 181, 0.25)',
  borderTopColor: '#3f51b5',
  borderRadius: '50%',
  animation: 'spin360 1s linear infinite',
};
