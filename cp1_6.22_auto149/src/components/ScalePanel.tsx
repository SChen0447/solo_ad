import { useState, useEffect } from 'react';
import './ScalePanel.css';

interface ScalePanelProps {
  baseServings: number;
  basePanSize: number;
  onScaleChange: (factor: number, mode: 'pan' | 'servings', value: number) => void;
}

const PAN_SIZES = [6, 8, 10];

export default function ScalePanel({ baseServings, basePanSize, onScaleChange }: ScalePanelProps) {
  const [mode, setMode] = useState<'pan' | 'servings'>('pan');
  const [panSize, setPanSize] = useState<number>(basePanSize);
  const [servings, setServings] = useState<number>(baseServings);
  const [bumpKey, setBumpKey] = useState(0);

  const calculatePanFactor = (target: number, base: number) => {
    return (target * target) / (base * base);
  };

  const calculateServingsFactor = (target: number, base: number) => {
    return target / base;
  };

  useEffect(() => {
    let factor: number;
    let value: number;
    if (mode === 'pan') {
      factor = calculatePanFactor(panSize, basePanSize);
      value = panSize;
    } else {
      factor = calculateServingsFactor(servings, baseServings);
      value = servings;
    }
    onScaleChange(factor, mode, value);
  }, [mode, panSize, servings, basePanSize, baseServings, onScaleChange]);

  const handleModeChange = (newMode: 'pan' | 'servings') => {
    setMode(newMode);
    setBumpKey(k => k + 1);
  };

  const handlePanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPanSize(Number(e.target.value));
    setBumpKey(k => k + 1);
  };

  const handleServingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(1, Math.min(20, Number(e.target.value) || 1));
    setServings(val);
    setBumpKey(k => k + 1);
  };

  const currentFactor = mode === 'pan'
    ? calculatePanFactor(panSize, basePanSize)
    : calculateServingsFactor(servings, baseServings);

  return (
    <div className="scale-panel" key={bumpKey}>
      <div className="scale-header">
        <h3>🧁 配方调整</h3>
        <div className="factor-display">
          调整系数: <span className="factor-value">{currentFactor.toFixed(2)}x</span>
        </div>
      </div>

      <div className="mode-toggle">
        <button
          className={`mode-btn ${mode === 'pan' ? 'active' : ''}`}
          onClick={() => handleModeChange('pan')}
        >
          按模具尺寸
        </button>
        <button
          className={`mode-btn ${mode === 'servings' ? 'active' : ''}`}
          onClick={() => handleModeChange('servings')}
        >
          按食用人数
        </button>
      </div>

      {mode === 'pan' && (
        <div className="control-group">
          <label>模具尺寸</label>
          <div className="pan-size-control">
            <select value={panSize} onChange={handlePanChange} className="pan-select">
              {PAN_SIZES.map(size => (
                <option key={size} value={size}>
                  {size}寸圆形模具
                </option>
              ))}
            </select>
            <div className="pan-buttons">
              {PAN_SIZES.map(size => (
                <button
                  key={size}
                  className={`pan-btn ${panSize === size ? 'active' : ''}`}
                  onClick={() => { setPanSize(size); setBumpKey(k => k + 1); }}
                >
                  {size}"
                </button>
              ))}
            </div>
          </div>
          <div className="scale-tip">
            基础配方为 {basePanSize} 寸模具，当前体积比例 {(currentFactor * 100).toFixed(0)}%
          </div>
        </div>
      )}

      {mode === 'servings' && (
        <div className="control-group">
          <label>食用人数 (1-20人)</label>
          <div className="servings-control">
            <button
              className="servings-btn"
              onClick={() => { setServings(s => Math.max(1, s - 1)); setBumpKey(k => k + 1); }}
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={20}
              value={servings}
              onChange={handleServingsChange}
              className="servings-input"
            />
            <button
              className="servings-btn"
              onClick={() => { setServings(s => Math.min(20, s + 1)); setBumpKey(k => k + 1); }}
            >
              +
            </button>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={servings}
            onChange={handleServingsChange}
            className="servings-slider"
          />
          <div className="scale-tip">
            基础配方为 {baseServings} 人份，当前用量比例 {(currentFactor * 100).toFixed(0)}%
          </div>
        </div>
      )}
    </div>
  );
}
