import React from 'react';

export interface ControlPanelParams {
  particleCount: number;
  intensity: number;
  sizeMin: number;
  sizeMax: number;
  bgColor: string;
  speed: number;
}

interface ControlPanelProps {
  params: ControlPanelParams;
  isCollapsed: boolean;
  onParamsChange: (params: Partial<ControlPanelParams>) => void;
  onToggleCollapse: () => void;
}

const BG_PRESETS = [
  { name: '深邃黑', value: '#0a0a1a' },
  { name: '星空紫', value: '#1a0a2e' },
  { name: '海洋蓝', value: '#0a1628' },
  { name: '极光绿', value: '#0a1a14' },
  { name: '暖阳橙', value: '#1a1008' },
];

const SPEED_OPTIONS = [0.5, 1, 1.5, 2];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  isCollapsed,
  onParamsChange,
  onToggleCollapse,
}) => {
  if (isCollapsed) {
    return (
      <button
        className="control-panel-float-btn"
        onClick={onToggleCollapse}
        aria-label="展开控制面板"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      </button>
    );
  }

  return (
    <div className="control-panel">
      <button
        className="control-panel-collapse-btn"
        onClick={onToggleCollapse}
        aria-label="折叠控制面板"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <div className="control-panel-content">
        <h3 className="control-panel-title">可视化参数</h3>

        <div className="control-section">
          <label className="control-label">
            粒子数量
            <span className="control-value">{params.particleCount}</span>
          </label>
          <input
            type="range"
            min="1000"
            max="3000"
            step="100"
            value={params.particleCount}
            onChange={(e) =>
              onParamsChange({ particleCount: Number(e.target.value) })
            }
            className="control-slider"
          />
        </div>

        <div className="control-section">
          <label className="control-label">
            爆发强度
            <span className="control-value">{params.intensity.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={params.intensity}
            onChange={(e) =>
              onParamsChange({ intensity: Number(e.target.value) })
            }
            className="control-slider"
          />
        </div>

        <div className="control-section">
          <label className="control-label">
            粒子大小范围
            <span className="control-value">
              {params.sizeMin.toFixed(1)} - {params.sizeMax.toFixed(1)}
            </span>
          </label>
          <div className="dual-slider">
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={params.sizeMin}
              onChange={(e) => {
                const val = Math.min(Number(e.target.value), params.sizeMax - 0.1);
                onParamsChange({ sizeMin: val });
              }}
              className="control-slider"
            />
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={params.sizeMax}
              onChange={(e) => {
                const val = Math.max(Number(e.target.value), params.sizeMin + 0.1);
                onParamsChange({ sizeMax: val });
              }}
              className="control-slider"
            />
          </div>
        </div>

        <div className="control-section">
          <label className="control-label">背景颜色</label>
          <div className="color-preset-grid">
            {BG_PRESETS.map((preset) => (
              <button
                key={preset.value}
                className={`color-preset ${
                  params.bgColor === preset.value ? 'active' : ''
                }`}
                style={{ backgroundColor: preset.value }}
                onClick={() => onParamsChange({ bgColor: preset.value })}
                title={preset.name}
              >
                {params.bgColor === preset.value && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="control-section">
          <label className="control-label">动画速度</label>
          <div className="speed-buttons">
            {SPEED_OPTIONS.map((speed) => (
              <button
                key={speed}
                className={`speed-btn ${params.speed === speed ? 'active' : ''}`}
                onClick={() => onParamsChange({ speed })}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
