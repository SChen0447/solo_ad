import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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

  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [posZ, setPosZ] = useState(0);
  const [intensity, setIntensity] = useState(0);
  const [color, setColor] = useState('#ffffff');

  const dragFrameRef = useRef<number | null>(null);
  const dragStateRef = useRef<{ id: string } | null>(null);

  const selectedLight = useMemo(
    () => lights.find((l) => l.id === selectedLightId),
    [lights, selectedLightId]
  );

  const syncFromSelected = useCallback(() => {
    if (!selectedLight) return;
    setPosX(Number(selectedLight.light.position.x.toFixed(2)));
    setPosY(Number(selectedLight.light.position.y.toFixed(2)));
    setPosZ(Number(selectedLight.light.position.z.toFixed(2)));
    setIntensity(Number((selectedLight.light.intensity / 50).toFixed(2)));
    setColor(`#${selectedLight.light.color.getHexString()}`);
  }, [selectedLight]);

  useEffect(() => {
    if (!sceneManager) return;
    const fresh = [...sceneManager.lights];
    setLights(fresh);
    if (fresh.length > 0 && !selectedLightId) {
      setSelectedLightId(fresh[0].id);
    }
  }, [sceneManager, selectedLightId]);

  useEffect(() => {
    syncFromSelected();
  }, [syncFromSelected]);

  const scheduleDragFrame = useCallback(
    (id: string, apply: () => void) => {
      dragStateRef.current = { id };
      apply();
      if (dragFrameRef.current !== null) cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = requestAnimationFrame(() => {
        dragFrameRef.current = null;
      });
    },
    []
  );

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
      const fresh = [...sceneManager.lights];
      setLights(fresh);
      setSelectedLightId(entry.id);
    }
  };

  const handleRemoveLight = () => {
    if (!sceneManager || !selectedLightId) return;
    sceneManager.removeLight(selectedLightId);
    const fresh = [...sceneManager.lights];
    setLights(fresh);
    setSelectedLightId(fresh.length > 0 ? fresh[0].id : '');
  };

  const handleSelectedTypeChange = (type: 'point' | 'spot') => {
    if (!sceneManager || !selectedLightId) return;
    const current = sceneManager.lights.find((l) => l.id === selectedLightId);
    if (!current || current.type === type) return;
    const newEntry = sceneManager.convertLightType(selectedLightId, type);
    const fresh = [...sceneManager.lights];
    setLights(fresh);
    if (newEntry) setSelectedLightId(newEntry.id);
  };

  const handlePositionInput = (axis: 'x' | 'y' | 'z', rawValue: string) => {
    if (!sceneManager || !selectedLightId) return;
    const value = parseFloat(rawValue);
    if (Number.isNaN(value)) return;
    const setter =
      axis === 'x' ? setPosX : axis === 'y' ? setPosY : setPosZ;
    setter(Number(value.toFixed(2)));
    scheduleDragFrame(selectedLightId, () => {
      const entry = sceneManager.lights.find((l) => l.id === selectedLightId);
      if (!entry) return;
      const p = entry.light.position;
      const nx = axis === 'x' ? value : p.x;
      const ny = axis === 'y' ? value : p.y;
      const nz = axis === 'z' ? value : p.z;
      sceneManager.updateLightPosition(selectedLightId, nx, ny, nz);
    });
  };

  const handleColorInput = (raw: string) => {
    if (!sceneManager || !selectedLightId) return;
    setColor(raw);
    scheduleDragFrame(selectedLightId, () => {
      sceneManager.updateLightColor(selectedLightId, raw);
    });
  };

  const handleIntensityInput = (rawValue: string) => {
    if (!sceneManager || !selectedLightId) return;
    const value = parseFloat(rawValue);
    if (Number.isNaN(value)) return;
    setIntensity(Number(value.toFixed(2)));
    scheduleDragFrame(selectedLightId, () => {
      sceneManager.updateLightIntensity(selectedLightId, value);
    });
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

  const selectedType: 'point' | 'spot' = selectedLight?.type ?? 'point';
  const previewColor = selectedLight ? `#${selectedLight.light.color.getHexString()}` : '#ffffff';

  return (
    <div className="light-panel" style={panelStyle}>
      <div style={controlsStyle}>
        <div style={cellStyle}>
          <label style={labelStyle}>光源</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              title={previewColor}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: previewColor,
                boxShadow: `0 0 6px ${previewColor}aa`,
                border: '1px solid rgba(255,255,255,0.15)',
                flexShrink: 0,
                display: selectedLight ? 'inline-block' : 'none',
              }}
            />
            <select
              value={selectedLightId}
              onChange={(e) => setSelectedLightId(e.target.value)}
              style={selectStyle}
            >
              {lights.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} · {l.type === 'point' ? '点光源' : '聚光灯'}
                </option>
              ))}
            </select>
          </div>
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
              <label style={axisLabelStyle('x')}>X</label>
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={Number(posX.toFixed(1))}
                onInput={(e) => handlePositionInput('x', (e.target as HTMLInputElement).value)}
                style={sliderStyle}
              />
              <span style={valueTagStyle}>{posX.toFixed(1)}</span>
            </div>
            <div style={cellStyle}>
              <label style={axisLabelStyle('y')}>Y</label>
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={Number(posY.toFixed(1))}
                onInput={(e) => handlePositionInput('y', (e.target as HTMLInputElement).value)}
                style={sliderStyle}
              />
              <span style={valueTagStyle}>{posY.toFixed(1)}</span>
            </div>
            <div style={cellStyle}>
              <label style={axisLabelStyle('z')}>Z</label>
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={Number(posZ.toFixed(1))}
                onInput={(e) => handlePositionInput('z', (e.target as HTMLInputElement).value)}
                style={sliderStyle}
              />
              <span style={valueTagStyle}>{posZ.toFixed(1)}</span>
            </div>

            <div style={cellStyle}>
              <label style={labelSmallStyle}>颜色</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 6px ${color}aa`,
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                />
                <input
                  type="color"
                  value={color}
                  onInput={(e) => handleColorInput((e.target as HTMLInputElement).value)}
                  onChange={(e) => handleColorInput(e.target.value)}
                  style={colorPickerStyle}
                />
              </div>
            </div>

            <div style={cellStyle}>
              <label style={intensityLabelStyle}>强度</label>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={Number(intensity.toFixed(1))}
                onInput={(e) => handleIntensityInput((e.target as HTMLInputElement).value)}
                style={sliderStyle}
              />
              <span style={{ ...valueTagStyle, minWidth: 30 }}>{intensity.toFixed(1)}</span>
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

const axisLabelStyle = (axis: 'x' | 'y' | 'z'): React.CSSProperties => {
  const colorMap = { x: '#ff6b6b', y: '#51cf66', z: '#4dabf7' };
  return {
    color: colorMap[axis],
    fontSize: 11,
    fontWeight: 700,
    minWidth: 16,
    textShadow: `0 0 4px ${colorMap[axis]}66`,
  };
};

const intensityLabelStyle: React.CSSProperties = {
  color: '#ffa726',
  fontSize: 11,
  fontWeight: 700,
  minWidth: 32,
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
    width: 80px;
    height: 4px;
    border-radius: 2px;
    background: linear-gradient(90deg, #2a4a63, #4fc3f7);
    outline: none;
    cursor: pointer;
    transition: background 0.18s ease, box-shadow 0.18s ease;
  }
  .light-panel input[type="range"]:hover {
    background: linear-gradient(90deg, #2e5570, #6fcbf7);
  }
  .light-panel input[type="range"]:active,
  .light-panel input[type="range"]:focus {
    background: linear-gradient(90deg, #335f7e, #81d4fa);
    box-shadow: 0 0 8px rgba(79, 195, 247, 0.55);
  }
  .light-panel input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4fc3f7;
    border: 2px solid #1a1a2e;
    cursor: grab;
    transition: background 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
    box-shadow: 0 0 5px rgba(79, 195, 247, 0.65);
  }
  .light-panel input[type="range"]:hover::-webkit-slider-thumb {
    background: #81d4fa;
    transform: scale(1.15);
  }
  .light-panel input[type="range"]:active::-webkit-slider-thumb {
    cursor: grabbing;
    box-shadow: 0 0 9px rgba(79, 195, 247, 0.9);
    transform: scale(1.2);
  }
  .light-panel input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4fc3f7;
    border: 2px solid #1a1a2e;
    cursor: grab;
  }

  .light-panel button {
    transition: all 0.22s ease;
  }
  .light-panel button:hover:not(:disabled) {
    filter: brightness(1.18);
  }
  .light-panel button:active:not(:disabled) {
    transform: scale(0.95);
  }

  .light-panel select {
    transition: border-color 0.2s ease, background 0.2s ease;
  }
  .light-panel select:hover {
    border-color: rgba(79, 195, 247, 0.45);
    background: rgba(255, 255, 255, 0.1);
  }
  .light-panel select:focus {
    border-color: rgba(79, 195, 247, 0.7);
    box-shadow: 0 0 0 2px rgba(79, 195, 247, 0.15);
  }

  .light-panel input[type="color"] {
    transition: border-color 0.2s ease, transform 0.15s ease;
  }
  .light-panel input[type="color"]:hover {
    transform: scale(1.06);
  }
  .light-panel input[type="color"]:active {
    transform: scale(0.96);
  }

  @keyframes spin360 {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
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
  backdropFilter: 'blur(16px) saturate(140%)',
  WebkitBackdropFilter: 'blur(16px) saturate(140%)',
  borderRadius: 12,
  border: '1px solid rgba(79, 195, 247, 0.18)',
  boxShadow:
    '0 6px 28px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.025) inset',
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
  minWidth: 30,
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

const valueTagStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 32,
  padding: '1px 6px',
  color: '#e8f3ff',
  fontSize: 10,
  fontWeight: 600,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontVariantNumeric: 'tabular-nums',
  background: 'rgba(79, 195, 247, 0.12)',
  border: '1px solid rgba(79, 195, 247, 0.25)',
  borderRadius: 4,
  letterSpacing: '0.3px',
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
