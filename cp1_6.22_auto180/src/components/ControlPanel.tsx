import React, { useCallback } from 'react';
import type { GameState, EnvParams, SpeedMultiplier } from '../types';

interface ControlPanelProps {
  state: GameState;
  onEnvironmentChange: (p: Partial<EnvParams>) => void;
  onSpeedChange: (m: SpeedMultiplier) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  compact?: boolean;
}

const SPEED_OPTIONS: { label: string; value: SpeedMultiplier }[] = [
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '5x', value: 5 },
  { label: '10x', value: 10 }
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  state,
  onEnvironmentChange,
  onSpeedChange,
  collapsed,
  onToggleCollapse,
  compact = false
}) => {
  const env = state.targetEnvironment;

  const handleTemp = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onEnvironmentChange({ temperature: Number(e.target.value) });
    },
    [onEnvironmentChange]
  );

  const handleHumid = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onEnvironmentChange({ humidity: Number(e.target.value) / 100 });
    },
    [onEnvironmentChange]
  );

  const handleRad = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onEnvironmentChange({ radiation: Number(e.target.value) });
    },
    [onEnvironmentChange]
  );

  const togglePlay = useCallback(() => {
    onSpeedChange(state.isPaused ? 1 : 0);
  }, [state.isPaused, onSpeedChange]);

  const container = (
    <div className="glass-panel" style={{ height: compact ? 'auto' : '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <div className="panel-title">
          <span className="dot"></span>
          环境控制面板
        </div>
        {!compact && onToggleCollapse && (
          <button className="collapse-btn" onClick={onToggleCollapse} title={collapsed ? '展开' : '收起'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, marginRight: -4 }}>
        <div className="section-label">地质与气候参数</div>

        <div className="slider-group">
          <div className="slider-label-row">
            <div className="slider-label">🌡️ 环境温度</div>
            <div className="slider-value">{env.temperature.toFixed(1)}°C</div>
          </div>
          <div className="slider-track">
            <input
              type="range"
              className="env-slider"
              min={-10}
              max={50}
              step={0.1}
              value={env.temperature}
              onChange={handleTemp}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 2, width: 'var(--control-width)' }}>
            <span>-10°C 冰川期</span>
            <span>50°C 热带</span>
          </div>
        </div>

        <div className="slider-group">
          <div className="slider-label-row">
            <div className="slider-label">💧 大气湿度</div>
            <div className="slider-value">{(env.humidity * 100).toFixed(0)}%</div>
          </div>
          <div className="slider-track">
            <input
              type="range"
              className="env-slider"
              min={0}
              max={100}
              step={1}
              value={env.humidity * 100}
              onChange={handleHumid}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 2, width: 'var(--control-width)' }}>
            <span>0% 干旱沙漠</span>
            <span>100% 湿润雨林</span>
          </div>
        </div>

        <div className="slider-group">
          <div className="slider-label-row">
            <div className="slider-label">☢️ 宇宙辐射</div>
            <div className="slider-value">{env.radiation.toFixed(1)} Sv</div>
          </div>
          <div className="slider-track">
            <input
              type="range"
              className="env-slider"
              min={0}
              max={10}
              step={0.1}
              value={env.radiation}
              onChange={handleRad}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 2, width: 'var(--control-width)' }}>
            <span>0Sv 安全</span>
            <span>10Sv 剧变期</span>
          </div>
        </div>

        <div className="section-label">模拟速度控制</div>
        <div className="speed-controls">
          <div className="play-row">
            <button
              className={`play-btn ${!state.isPaused ? 'active' : ''}`}
              onClick={togglePlay}
              title={state.isPaused ? '播放' : '暂停'}
            >
              {state.isPaused ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              )}
            </button>
            <div className="gen-stat">
              <div className="gen-number">第 {state.generation.toLocaleString()} 代</div>
              <div className="gen-rate">{state.generationPerSecond.toFixed(1)} 代/秒 · {state.population.length} 个体</div>
            </div>
          </div>

          <div className="speed-btns">
            {SPEED_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`speed-btn ${state.speedMultiplier === opt.value && !state.isPaused ? 'active' : ''}`}
                onClick={() => onSpeedChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="section-label">参数说明</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7, background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
          调整温度、湿度和辐射强度会在5帧内改变种群适应度。耐热基因（蓝绿色）在高温环境下更易存活，耐寒基因（红紫色）在冰川期占优。高辐射率提升基因突变率，加速物种分化。
        </div>
      </div>
    </div>
  );

  return container;
};
