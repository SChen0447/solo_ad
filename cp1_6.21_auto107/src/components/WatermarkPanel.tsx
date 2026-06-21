import { Type, Palette, Move, RotateCw, Sliders, Sparkles } from 'lucide-react';
import type { WatermarkConfig, WatermarkPosition } from '../utils/watermark';
import './WatermarkPanel.css';

interface WatermarkPanelProps {
  config: WatermarkConfig;
  onChange: (config: WatermarkConfig) => void;
  onBatchGenerate: () => void;
  isGenerating: boolean;
  progress: number;
  hasImages: boolean;
  allProcessed: boolean;
}

const FONT_OPTIONS = [
  { value: 'Noto Sans SC', label: '思源黑体' },
  { value: 'Noto Serif SC', label: '思源宋体' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
];

const POSITION_GRID: WatermarkPosition[] = [
  'top-left', 'top-center', 'top-right',
  'center-left', 'center', 'center-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

export default function WatermarkPanel({
  config,
  onChange,
  onBatchGenerate,
  isGenerating,
  progress,
  hasImages,
  allProcessed,
}: WatermarkPanelProps) {
  const updateConfig = (partial: Partial<WatermarkConfig>) => {
    onChange({ ...config, ...partial });
  };

  const batchBtnDisabled = !hasImages || isGenerating;

  return (
    <div className="panel-container">
      <div className="panel-section">
        <div className="section-title">
          <Type size={18} />
          <span>文字内容</span>
        </div>
        <input
          type="text"
          className="text-input"
          placeholder="请输入水印文字（支持中英文）"
          value={config.text}
          onChange={(e) => updateConfig({ text: e.target.value })}
        />
      </div>

      <div className="panel-section">
        <div className="section-title">
          <Sliders size={18} />
          <span>字体设置</span>
        </div>
        <div className="font-row">
          <select
            className="font-select"
            value={config.fontFamily}
            onChange={(e) => updateConfig({ fontFamily: e.target.value })}
          >
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="font-size-control">
            <span className="slider-label">{config.fontSize}px</span>
            <input
              type="range"
              min="10"
              max="100"
              value={config.fontSize}
              onChange={(e) => updateConfig({ fontSize: Number(e.target.value) })}
              className="slider"
            />
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-title">
          <Palette size={18} />
          <span>颜色与透明度</span>
        </div>
        <div className="color-row">
          <div className="color-picker-wrap">
            <input
              type="color"
              className="color-picker"
              value={config.color}
              onChange={(e) => updateConfig({ color: e.target.value })}
            />
            <span className="color-value">{config.color.toUpperCase()}</span>
          </div>
          <div className="opacity-control">
            <span className="slider-label">{Math.round(config.opacity * 100)}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={config.opacity * 100}
              onChange={(e) => updateConfig({ opacity: Number(e.target.value) / 100 })}
              className="slider"
            />
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-title">
          <Move size={18} />
          <span>位置</span>
        </div>
        <div className="position-grid">
          {POSITION_GRID.map((pos) => (
            <button
              key={pos}
              className={`position-btn ${config.position === pos ? 'active' : ''}`}
              onClick={() => updateConfig({ position: pos })}
            >
              <span className="position-dot" />
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="section-title">
          <RotateCw size={18} />
          <span>旋转角度</span>
        </div>
        <div className="rotation-control">
          <span className="slider-label">{config.rotation}°</span>
          <input
            type="range"
            min="-90"
            max="90"
            value={config.rotation}
            onChange={(e) => updateConfig({ rotation: Number(e.target.value) })}
            className="slider"
          />
        </div>
      </div>

      <div className="panel-section batch-section">
        {isGenerating && (
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">{progress}%</span>
          </div>
        )}
        <button
          className="batch-btn"
          onClick={onBatchGenerate}
          disabled={batchBtnDisabled}
        >
          <Sparkles size={18} />
          {isGenerating ? '正在生成...' : allProcessed ? '重新生成全部' : '批量生成'}
        </button>
      </div>
    </div>
  );
}
