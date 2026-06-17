import React, { useCallback } from 'react';
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
  gradientFrom: string;
  gradientTo: string;
  onChange: (value: number) => void;
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  gradientFrom,
  gradientTo,
  onChange
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const gradientId = `gradient-${label.replace(/\s/g, '-')}`;

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
            background: `linear-gradient(to right, ${gradientFrom} 0%, ${gradientTo} ${percentage}%, #0f3460 ${percentage}%, #0f3460 100%)`
          }}
        />
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradientFrom} />
              <stop offset="100%" stopColor={gradientTo} />
            </linearGradient>
          </defs>
        </svg>
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
              gradientFrom="#0f3460"
              gradientTo="#e94560"
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
              gradientFrom="#0f3460"
              gradientTo="#e94560"
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
              gradientFrom="#0f3460"
              gradientTo="#e94560"
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
              gradientFrom="#0f3460"
              gradientTo="#e94560"
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
          transition: background 0.1s ease;
        }

        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #e94560;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(233, 69, 96, 0.4);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .custom-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(233, 69, 96, 0.6);
        }

        .custom-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #e94560;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(233, 69, 96, 0.4);
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
