import React, { useState } from 'react';
import { Save, Sun, Contrast, Palette, Droplets, X, Check } from 'lucide-react';
import { FilterParams } from '@/types';
import { filterPresetManager } from '@/engine/FilterPresetManager';

interface FilterControlsProps {
  params: FilterParams;
  onParamsChange: (params: FilterParams) => void;
  onReset: () => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  params,
  onParamsChange,
  onReset,
}) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleParamChange = (key: keyof FilterParams, value: number) => {
    onParamsChange({ ...params, [key]: value });
  };

  const handleSavePreset = () => {
    const validation = filterPresetManager.validateName(presetName);
    if (!validation.valid) {
      setSaveError(validation.error || '保存失败');
      return;
    }

    const result = filterPresetManager.savePreset(presetName, params);
    if (result) {
      setShowSaveDialog(false);
      setPresetName('');
      setSaveError(null);
    } else {
      setSaveError('保存失败，请重试');
    }
  };

  const handleCancelSave = () => {
    setShowSaveDialog(false);
    setPresetName('');
    setSaveError(null);
  };

  const sliders: {
    key: keyof FilterParams;
    label: string;
    min: number;
    max: number;
    icon: React.ReactNode;
    unit: string;
  }[] = [
    { key: 'brightness', label: '亮度', min: -100, max: 100, icon: <Sun size={16} />, unit: '' },
    { key: 'contrast', label: '对比度', min: -100, max: 100, icon: <Contrast size={16} />, unit: '' },
    { key: 'hueRotate', label: '色相旋转', min: 0, max: 360, icon: <Palette size={16} />, unit: '°' },
    { key: 'saturation', label: '饱和度', min: 0, max: 200, icon: <Droplets size={16} />, unit: '%' },
  ];

  return (
    <div className="filter-controls">
      <div className="controls-header">
        <h3>滤镜调节</h3>
        <button className="reset-btn" onClick={onReset}>
          重置
        </button>
      </div>

      <div className="sliders-container">
        {sliders.map((slider) => (
          <div key={slider.key} className="slider-item">
            <div className="slider-label">
              <span className="slider-icon">{slider.icon}</span>
              <span>{slider.label}</span>
              <span className="slider-value">
                {params[slider.key] > 0 && slider.min < 0 ? '+' : ''}
                {params[slider.key]}{slider.unit}
              </span>
            </div>
            <div className="slider-track">
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                value={params[slider.key]}
                onChange={(e) => handleParamChange(slider.key, Number(e.target.value))}
                className="filter-slider"
              />
              <div
                className="slider-fill"
                style={{
                  width: `${((params[slider.key] - slider.min) / (slider.max - slider.min)) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="controls-footer">
        <button
          className="save-preset-btn"
          onClick={() => setShowSaveDialog(true)}
        >
          <Save size={16} />
          保存为预设
        </button>
      </div>

      {showSaveDialog && (
        <div className="save-dialog-overlay" onClick={handleCancelSave}>
          <div className="save-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="save-dialog-header">
              <h4>保存自定义预设</h4>
              <button className="close-btn" onClick={handleCancelSave}>
                <X size={18} />
              </button>
            </div>
            <div className="save-dialog-body">
              <label className="input-label">预设名称</label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => {
                  setPresetName(e.target.value);
                  setSaveError(null);
                }}
                placeholder="请输入3-20个字符"
                maxLength={20}
                className="preset-name-input"
                autoFocus
              />
              {saveError && <p className="save-error">{saveError}</p>}
              <p className="char-count">{presetName.length}/20</p>
            </div>
            <div className="save-dialog-footer">
              <button className="cancel-btn" onClick={handleCancelSave}>
                取消
              </button>
              <button
                className="confirm-btn"
                onClick={handleSavePreset}
                disabled={presetName.length < 3}
              >
                <Check size={16} />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
