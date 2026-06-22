import React from 'react';
import { EffectConfig, Subtitle, IN_EFFECTS, OUT_EFFECTS, InEffectType, OutEffectType } from '../types';
import { eventBus } from '../utils/eventBus';

interface EffectPanelProps {
  effectConfig: EffectConfig;
  onEffectConfigChange: (config: EffectConfig) => void;
  selectedSubtitle: Subtitle | null;
  onSelectedSubtitleChange: (subtitle: Subtitle) => void;
  isPlaying: boolean;
  onPreview: () => void;
  onPause: () => void;
}

export const EffectPanel: React.FC<EffectPanelProps> = ({
  effectConfig,
  onEffectConfigChange,
  selectedSubtitle,
  onSelectedSubtitleChange,
  isPlaying,
  onPreview,
  onPause,
}) => {
  const handleInDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const newConfig = { ...effectConfig, inAnimationDuration: value };
    onEffectConfigChange(newConfig);
    eventBus.emit('effect:update', newConfig);
  };

  const handleOutDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const newConfig = { ...effectConfig, outAnimationDuration: value };
    onEffectConfigChange(newConfig);
    eventBus.emit('effect:update', newConfig);
  };

  const handleSelectedInEffectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (selectedSubtitle) {
      const updated = { ...selectedSubtitle, inEffect: e.target.value as InEffectType };
      onSelectedSubtitleChange(updated);
      eventBus.emit('subtitle:update', { id: selectedSubtitle.id, updates: { inEffect: e.target.value as InEffectType } });
    }
  };

  const handleSelectedOutEffectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (selectedSubtitle) {
      const updated = { ...selectedSubtitle, outEffect: e.target.value as OutEffectType };
      onSelectedSubtitleChange(updated);
      eventBus.emit('subtitle:update', { id: selectedSubtitle.id, updates: { outEffect: e.target.value as OutEffectType } });
    }
  };

  return (
    <div className="section">
      <h2 className="section-title">
        <span>✨</span>
        特效控制
      </h2>

      <div className="section">
        <div className="slider-container" style={{ marginBottom: '16px' }}>
          <div className="slider-header">
            <label>🎬 入场动画时长</label>
            <span className="slider-value">{effectConfig.inAnimationDuration.toFixed(1)}秒</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={effectConfig.inAnimationDuration}
            onChange={handleInDurationChange}
          />
        </div>

        <div className="slider-container">
          <div className="slider-header">
            <label>🎞 出场动画时长</label>
            <span className="slider-value">{effectConfig.outAnimationDuration.toFixed(1)}秒</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={effectConfig.outAnimationDuration}
            onChange={handleOutDurationChange}
          />
        </div>
      </div>

      {selectedSubtitle && (
        <div className="section">
          <h3 className="section-title" style={{ fontSize: '13px' }}>
            <span>🎬</span>
            当前字幕特效
          </h3>
          
          <div className="input-row">
            <div className="input-group">
              <label>入场特效</label>
              <div className="select-control">
                <select
                  value={selectedSubtitle.inEffect}
                  onChange={handleSelectedInEffectChange}
                >
                  {IN_EFFECTS.map(effect => (
                    <option key={effect.value} value={effect.value}>
                      {effect.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="input-group">
              <label>出场特效</label>
              <div className="select-control">
                <select
                  value={selectedSubtitle.outEffect}
                  onChange={handleSelectedOutEffectChange}
                >
                  {OUT_EFFECTS.map(effect => (
                    <option key={effect.value} value={effect.value}>
                      {effect.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="btn-group">
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={isPlaying ? onPause : onPreview}
        >
          {isPlaying ? '⏸ 暂停' : '▶ 预览'}
        </button>
      </div>
    </div>
  );
};
