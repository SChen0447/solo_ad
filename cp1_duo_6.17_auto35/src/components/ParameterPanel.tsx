import React, { useCallback, useMemo } from 'react';
import type { TypographyParams } from '../utils/textSample';
import { FONT_OPTIONS, SLIDER_CONFIG, ALIGN_OPTIONS } from '../utils/textSample';

interface ParameterPanelProps {
  params: TypographyParams;
  onParamsChange: (params: TypographyParams) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  hueStart: number;
  hueEnd: number;
  onChange: (value: number) => void;
}

const hslToHex = (h: number, s: number, l: number): string => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  hueStart,
  hueEnd,
  onChange
}) => {
  const percentage = useMemo(() => ((value - min) / (max - min)) * 100, [value, min, max]);

  const dynamicGradient = useMemo(() => {
    const currentHue = hueStart + (hueEnd - hueStart) * (percentage / 100);
    const startColor = hslToHex(hueStart, 0.7, 0.35);
    const endColor = hslToHex(currentHue, 0.8, 0.55);
    return `linear-gradient(to right, ${startColor} 0%, ${endColor} ${percentage}%, #0f3460 ${percentage}%, #0f3460 100%)`;
  }, [percentage, hueStart, hueEnd]);

  const thumbColor = useMemo(() => {
    const currentHue = hueStart + (hueEnd - hueStart) * (percentage / 100);
    return hslToHex(currentHue, 0.85, 0.6);
  }, [percentage, hueStart, hueEnd]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  }, [onChange]);

  return (
    <div className="slider-group">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value">
          {value.toFixed(step < 1 ? 2 : 0)}{unit}
        </span>
      </div>
      <div className="slider-wrapper">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="custom-slider"
          style={{
            background: dynamicGradient,
            ['--thumb-color' as string]: thumbColor
          }}
        />
      </div>
    </div>
  );
};

export const ParameterPanel: React.FC<ParameterPanelProps> = ({
  params,
  onParamsChange,
  collapsed,
  onToggleCollapse
}) => {
  const handleFontChange = useCallback((fontName: string) => {
    onParamsChange({ ...params, fontFamily: fontName });
  }, [params, onParamsChange]);

  const handleSliderChange = useCallback((key: keyof Omit<TypographyParams, 'fontFamily' | 'textAlign'>, value: number) => {
    onParamsChange({ ...params, [key]: value });
  }, [params, onParamsChange]);

  const handleAlignChange = useCallback((align: TypographyParams['textAlign']) => {
    onParamsChange({ ...params, textAlign: align });
  }, [params, onParamsChange]);

  return (
    <div className={`parameter-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="panel-header">
        <h2 className="panel-title">参数控制</h2>
        <button
          className="collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? '展开面板' : '折叠面板'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {!collapsed && (
        <div className="panel-content">
          <div className="section">
            <h3 className="section-title">字体选择</h3>
            <div className="font-grid">
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font.name}
                  className={`font-card ${params.fontFamily === font.name ? 'selected' : ''}`}
                  onClick={() => handleFontChange(font.name)}
                  style={{ fontFamily: font.cssValue }}
                >
                  <span className="font-name">{font.label}</span>
                  <span className="font-category">{font.category}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">字号</h3>
            <Slider
              label="Font Size"
              value={params.fontSize}
              min={SLIDER_CONFIG.fontSize.min}
              max={SLIDER_CONFIG.fontSize.max}
              step={SLIDER_CONFIG.fontSize.step}
              unit="px"
              hueStart={210}
              hueEnd={340}
              onChange={(v) => handleSliderChange('fontSize', v)}
            />
          </div>

          <div className="section">
            <h3 className="section-title">行高</h3>
            <Slider
              label="Line Height"
              value={params.lineHeight}
              min={SLIDER_CONFIG.lineHeight.min}
              max={SLIDER_CONFIG.lineHeight.max}
              step={SLIDER_CONFIG.lineHeight.step}
              unit=""
              hueStart={180}
              hueEnd={300}
              onChange={(v) => handleSliderChange('lineHeight', v)}
            />
          </div>

          <div className="section">
            <h3 className="section-title">字间距</h3>
            <Slider
              label="Letter Spacing"
              value={params.letterSpacing}
              min={SLIDER_CONFIG.letterSpacing.min}
              max={SLIDER_CONFIG.letterSpacing.max}
              step={SLIDER_CONFIG.letterSpacing.step}
              unit="em"
              hueStart={30}
              hueEnd={280}
              onChange={(v) => handleSliderChange('letterSpacing', v)}
            />
          </div>

          <div className="section">
            <h3 className="section-title">对齐方式</h3>
            <div className="align-buttons">
              {ALIGN_OPTIONS.map((align) => (
                <button
                  key={align.value}
                  className={`align-btn ${params.textAlign === align.value ? 'active' : ''}`}
                  onClick={() => handleAlignChange(align.value)}
                >
                  {align.label}
                </button>
              ))}
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">容器宽度</h3>
            <Slider
              label="Container Width"
              value={params.containerWidth}
              min={SLIDER_CONFIG.containerWidth.min}
              max={SLIDER_CONFIG.containerWidth.max}
              step={SLIDER_CONFIG.containerWidth.step}
              unit="px"
              hueStart={140}
              hueEnd={200}
              onChange={(v) => handleSliderChange('containerWidth', v)}
            />
          </div>
        </div>
      )}

      <style>{`
        .parameter-panel {
          width: 320px;
          min-width: 320px;
          background-color: #16213e;
          border-right: 1px solid #0f3460;
          display: flex;
          flex-direction: column;
          transition: width 0.3s ease, min-width 0.3s ease;
          overflow: hidden;
        }

        .parameter-panel.collapsed {
          width: 60px;
          min-width: 60px;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          border-bottom: 1px solid #0f3460;
        }

        .panel-title {
          font-size: 16px;
          font-weight: 600;
          color: #eaeaea;
          white-space: nowrap;
        }

        .parameter-panel.collapsed .panel-title {
          display: none;
        }

        .collapse-btn {
          width: 32px;
          height: 32px;
          background-color: #0f3460;
          border: none;
          border-radius: 6px;
          color: #eaeaea;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          font-size: 14px;
        }

        .collapse-btn:hover {
          background-color: #e94560;
          transform: scale(1.05);
        }

        .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .panel-content::-webkit-scrollbar {
          width: 6px;
        }

        .panel-content::-webkit-scrollbar-track {
          background: #16213e;
        }

        .panel-content::-webkit-scrollbar-thumb {
          background: #0f3460;
          border-radius: 3px;
        }

        .section {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 12px;
          font-weight: 500;
          color: #a0a0a0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
        }

        .font-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .font-card {
          background-color: #0f3460;
          border: 2px solid transparent;
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 4px;
          transition: all 0.3s ease;
          text-align: left;
        }

        .font-card:hover {
          border-color: #e94560;
          transform: translateY(-2px);
        }

        .font-card.selected {
          border-color: #e94560;
          background-color: rgba(233, 69, 96, 0.1);
        }

        .font-name {
          font-size: 14px;
          color: #eaeaea;
          font-weight: 500;
        }

        .font-category {
          font-size: 10px;
          color: #a0a0a0;
          text-transform: lowercase;
        }

        .slider-group {
          margin-bottom: 0;
        }

        .slider-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .slider-label {
          font-size: 13px;
          color: #eaeaea;
        }

        .slider-value {
          font-size: 13px;
          font-weight: 600;
          color: #e94560;
          font-variant-numeric: tabular-nums;
        }

        .slider-wrapper {
          position: relative;
        }

        .custom-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 8px;
          border-radius: 4px;
          outline: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--thumb-color, #e94560);
          cursor: pointer;
          box-shadow: 0 2px 8px var(--thumb-color, rgba(233, 69, 96, 0.4));
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.15s ease;
        }

        .custom-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 14px var(--thumb-color, rgba(233, 69, 96, 0.6));
        }

        .custom-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--thumb-color, #e94560);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px var(--thumb-color, rgba(233, 69, 96, 0.4));
          transition: background 0.15s ease;
        }

        .align-buttons {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }

        .align-btn {
          padding: 10px 8px;
          background-color: #0f3460;
          border: 2px solid transparent;
          border-radius: 6px;
          color: #eaeaea;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .align-btn:hover {
          border-color: #e94560;
        }

        .align-btn.active {
          background-color: #e94560;
          border-color: #e94560;
        }

        @media (max-width: 768px) {
          .parameter-panel {
            width: 100%;
            min-width: 100%;
            border-right: none;
            border-bottom: 1px solid #0f3460;
          }

          .parameter-panel.collapsed {
            width: 100%;
            min-width: 100%;
            height: 60px;
          }

          .font-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ParameterPanel;
