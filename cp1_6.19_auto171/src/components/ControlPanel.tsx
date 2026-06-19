import { useEffect, useRef, useState } from 'react';
import {
  AnimationParams, AnimationTarget, EASING_OPTIONS, PRESETS } from '@/types';
import './ControlPanel.css';

interface ControlPanelProps {
  target: AnimationTarget;
  params: AnimationParams;
  onTargetChange: (target: AnimationTarget) => void;
  onParamsChange: (params: AnimationParams) => void;
  onReset: () => void;
  onExport: () => void;
  onApplyPreset: (presetIndex: number) => void;
}

interface HighlightCards {
  [key: string]: boolean;
}

export function ControlPanel({
  target,
  params,
  onTargetChange,
  onParamsChange,
  onReset,
  onExport,
  onApplyPreset,
}: ControlPanelProps) {
  const [highlightCards, setHighlightCards] = useState<HighlightCards>({});
  const highlightTimersRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});

  const flashCard = (cardKey: string) => {
    if (highlightTimersRef.current[cardKey]) {
      clearTimeout(highlightTimersRef.current[cardKey]);
    }
    setHighlightCards((prev) => ({ ...prev, [cardKey]: true }));
    highlightTimersRef.current[cardKey] = setTimeout(() => {
      setHighlightCards((prev) => ({ ...prev, [cardKey]: false }));
    }, 300);
  };

  useEffect(() => {
    return () => {
      Object.values(highlightTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  const updateParam = <K extends keyof AnimationParams>(key: K, value: AnimationParams[K]) => {
    onParamsChange({ ...params, [key]: value });
    flashCard('timing');
  };

  return (
    <aside className="control-panel">
      <div className="control-header">
        <h1 className="app-title">动效调试台</h1>
        <p className="app-subtitle">Animation Debugger</p>
      </div>

      <div className={`control-card ${highlightCards.target ? 'flash' : ''}`}>
        <h3 className="card-title">TARGET · 目标元素</h3>
        <div className="target-selector">
          <button
            className={`target-btn ${target === 'square' ? 'active' : ''}`}
            onClick={() => {
          onTargetChange('square');
          flashCard('target');
        }}
          >
            正方形
          </button>
          <button
            className={`target-btn ${target === 'circle' ? 'active' : ''}`}
            onClick={() => {
          onTargetChange('circle');
          flashCard('target');
        }}
          >
            圆形
          </button>
          <button
            className={`target-btn ${target === 'both' ? 'active' : ''}`}
            onClick={() => {
              onTargetChange('both');
              flashCard('target');
            }}
          >
            同时
          </button>
        </div>
      </div>

      <div className={`control-card ${highlightCards.timing ? 'flash' : ''}`}>
        <h3 className="card-title">TIMING · 时间参数</h3>
        <div className="param-group">
          <label className="param-label">
            <span>持续时间</span>
            <span className="param-value">{params.duration.toFixed(1)}s</span>
          </label>
          <input
            type="range"
            className="custom-slider"
            min="0.1"
            max="5"
            step="0.1"
            value={params.duration}
            onChange={(e) => updateParam('duration', parseFloat(e.target.value))}
          />
        </div>
        <div className="param-group">
          <label className="param-label">
            <span>延迟时间</span>
            <span className="param-value">{params.delay.toFixed(1)}s</span>
          </label>
          <input
            type="range"
            className="custom-slider"
            min="0"
            max="3"
            step="0.1"
            value={params.delay}
            onChange={(e) => updateParam('delay', parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className={`control-card ${highlightCards.easing ? 'flash' : ''}`}>
        <h3 className="card-title">EASING · 缓动函数</h3>
        <div className="param-group">
          <select
            className="custom-select"
            value={params.easing}
            onChange={(e) => {
          updateParam('easing', e.target.value as AnimationParams['easing']);
          flashCard('easing');
        }}
          >
            {EASING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {params.easing === 'custom' && (
          <div className="param-group">
            <label className="param-label">
              <span>自定义 cubic-bezier</span>
            </label>
            <input
              type="text"
              className="custom-input"
              placeholder="cubic-bezier(x1, y1, x2, y2)"
              value={params.customEasing}
              onChange={(e) => updateParam('customEasing', e.target.value)}
            />
          </div>
        )}
      </div>

      <div className={`control-card ${highlightCards.loop ? 'flash' : ''}`}>
        <h3 className="card-title">LOOP · 循环与方向</h3>
        <div className="param-group">
          <label className="param-label">
            <span>重复次数</span>
            <span className="param-value">
              {params.iterationCount === 'infinite' ? '∞' : params.iterationCount}
            </span>
          </label>
          <div className="iteration-controls">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={params.iterationCount === 'infinite'}
                onChange={(e) =>
          updateParam('iterationCount', e.target.checked ? 'infinite' : 1)
        }
            />
              <span>无限循环</span>
            </label>
            {params.iterationCount !== 'infinite' && (
              <input
                type="range"
                className="custom-slider small"
                min="1"
                max="10"
                step="1"
                value={params.iterationCount as number}
                onChange={(e) =>
          updateParam('iterationCount', parseInt(e.target.value, 10))}
              />
            )}
          </div>
        </div>
        <div className="param-group">
          <label className="param-label">
            <span>播放方向</span>
          </label>
          <div className="direction-buttons">
            {(['normal', 'reverse', 'alternate'] as const).map((dir) => (
              <button
                key={dir}
                className={`dir-btn ${params.direction === dir ? 'active' : ''}`}
                onClick={() => {
          updateParam('direction', dir);
          flashCard('loop');
        }}
              >
                {dir}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`control-card ${highlightCards.presets ? 'flash' : ''}`}>
        <h3 className="card-title">PRESETS · 预设方案</h3>
        <div className="presets-grid">
          {PRESETS.map((preset, idx) => (
            <button
              key={preset.name}
              className="preset-btn"
              onClick={() => {
          onApplyPreset(idx);
          flashCard('presets');
        }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="action-buttons">
        <button className="action-btn reset" onClick={onReset}>
          ↺ 重置
        </button>
        <button className="action-btn export" onClick={onExport}>
          ⤓ 导出 CSS
        </button>
      </div>

      <div className="control-footer">
        <span className="footer-text">当前目标: {target === 'both' ? '全部元素' : target === 'square' ? '正方形' : '圆形'}</span>
      </div>
    </aside>
  );
}
