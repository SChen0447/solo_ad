import { type ChangeEvent, type FC } from 'react';

export interface ControlParams {
  intensity: number;
  contrast: number;
  detailLevel: number;
}

interface ControlPanelProps {
  params: ControlParams;
  onChange: (params: ControlParams) => void;
  disabled: boolean;
}

export const ControlPanel: FC<ControlPanelProps> = ({ params, onChange, disabled }) => {
  const handleChange = (key: keyof ControlParams) => (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...params, [key]: Number(e.target.value) });
  };

  return (
    <div className="control-panel">
      <h3 className="control-panel-title">参数调节</h3>
      <div className="control-sliders">
        <div className="slider-group">
          <div className="slider-header">
            <label>强度</label>
            <span className="slider-value">{params.intensity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={params.intensity}
            onChange={handleChange('intensity')}
            disabled={disabled}
            className="slider slider-intensity"
          />
        </div>
        <div className="slider-group">
          <div className="slider-header">
            <label>对比度</label>
            <span className="slider-value">{params.contrast > 0 ? '+' : ''}{params.contrast}</span>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            step="1"
            value={params.contrast}
            onChange={handleChange('contrast')}
            disabled={disabled}
            className="slider slider-contrast"
          />
        </div>
        <div className="slider-group">
          <div className="slider-header">
            <label>细节保留</label>
            <span className="slider-value">{params.detailLevel}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="150"
            step="1"
            value={params.detailLevel}
            onChange={handleChange('detailLevel')}
            disabled={disabled}
            className="slider slider-detail"
          />
        </div>
      </div>
    </div>
  );
};
