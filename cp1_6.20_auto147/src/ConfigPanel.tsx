import React from 'react';
import { useStore } from './store';
import { BubbleConfig, GRADIENT_OPTIONS } from './types';

interface ConfigPanelProps {
  onConfigChange: (config: Partial<BubbleConfig>) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ onConfigChange }) => {
  const { parsedData, config } = useStore();

  if (!parsedData) return null;

  const numericCols = parsedData.columns;
  const timeCols = parsedData.headers;

  const handleSelectChange = (key: keyof BubbleConfig, value: string) => {
    if (key === 'colorGradient') {
      const idx = parseInt(value, 10);
      if (idx >= 0 && idx < GRADIENT_OPTIONS.length) {
        onConfigChange({ colorGradient: GRADIENT_OPTIONS[idx] });
      }
    } else {
      onConfigChange({ [key]: value });
    }
  };

  const handleRadiusChange = (key: 'minRadius' | 'maxRadius', value: number) => {
    onConfigChange({ [key]: value });
  };

  const currentGradientIdx = GRADIENT_OPTIONS.findIndex(
    (g) => g[0] === config.colorGradient[0] && g[1] === config.colorGradient[1]
  );

  return (
    <div style={{
      width: '90%',
      maxWidth: '1200px',
      minHeight: '80px',
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '16px',
      justifyContent: 'center',
    }}>
      <ConfigSelect
        label="X 轴"
        value={config.xAxis}
        options={numericCols}
        onChange={(v) => handleSelectChange('xAxis', v)}
      />
      <ConfigSelect
        label="Y 轴"
        value={config.yAxis}
        options={numericCols}
        onChange={(v) => handleSelectChange('yAxis', v)}
      />
      <ConfigSelect
        label="Z 轴"
        value={config.zAxis}
        options={numericCols}
        onChange={(v) => handleSelectChange('zAxis', v)}
      />
      <ConfigSelect
        label="大小"
        value={config.sizeColumn}
        options={numericCols}
        onChange={(v) => handleSelectChange('sizeColumn', v)}
      />
      <ConfigSelect
        label="时间"
        value={config.timeColumn}
        options={['', ...timeCols]}
        onChange={(v) => handleSelectChange('timeColumn', v)}
        placeholder="无"
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '14px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>渐变</label>
        <select
          value={currentGradientIdx}
          onChange={(e) => handleSelectChange('colorGradient', e.target.value)}
          style={{
            height: '36px',
            borderRadius: '8px',
            border: '1px solid #475569',
            background: '#1e293b',
            color: '#f1f5f9',
            padding: '0 8px',
            fontSize: '13px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {GRADIENT_OPTIONS.map((g, i) => (
            <option key={i} value={i}>
              {g[0]} → {g[1]}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
        <label style={{ fontSize: '14px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
          最小半径: {config.minRadius.toFixed(1)}
        </label>
        <input
          type="range"
          min="0.2"
          max="1.5"
          step="0.1"
          value={config.minRadius}
          onChange={(e) => handleRadiusChange('minRadius', parseFloat(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            background: '#334155',
            outline: 'none',
            cursor: 'pointer',
            accentColor: '#6366f1',
          }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
        <label style={{ fontSize: '14px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
          最大半径: {config.maxRadius.toFixed(1)}
        </label>
        <input
          type="range"
          min="0.2"
          max="1.5"
          step="0.1"
          value={config.maxRadius}
          onChange={(e) => handleRadiusChange('maxRadius', parseFloat(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            background: '#334155',
            outline: 'none',
            cursor: 'pointer',
            accentColor: '#6366f1',
          }}
        />
      </div>
    </div>
  );
};

interface ConfigSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
}

const ConfigSelect: React.FC<ConfigSelectProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '14px', color: '#cbd5e1' }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: '36px',
          borderRadius: '8px',
          border: '1px solid #475569',
          background: '#1e293b',
          color: '#f1f5f9',
          padding: '0 8px',
          fontSize: '13px',
          cursor: 'pointer',
          outline: 'none',
          minWidth: '80px',
        }}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ConfigPanel;
