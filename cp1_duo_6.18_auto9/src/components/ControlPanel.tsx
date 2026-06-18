import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { FontUploader } from './FontUploader';

export const ControlPanel: React.FC = () => {
  const {
    testText,
    setTestText,
    typesetParams,
    activeParamsId,
    updateActiveParams,
  } = useAppStore();

  const activeParams = typesetParams.find((p) => p.id === activeParamsId);

  const [colorInputValue, setColorInputValue] = useState(activeParams?.color || '#333333');

  useEffect(() => {
    if (activeParams) {
      setColorInputValue(activeParams.color);
    }
  }, [activeParams?.color, activeParams?.id]);

  if (!activeParams) return null;

  const handleSliderChange = (
    key: keyof typeof activeParams,
    value: number | string
  ) => {
    updateActiveParams({ [key]: value });
  };

  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setColorInputValue(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      updateActiveParams({ color: value });
    }
  };

  const handleColorInputBlur = () => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(colorInputValue)) {
      setColorInputValue(activeParams.color);
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setColorInputValue(value);
    updateActiveParams({ color: value });
  };

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <FontUploader />
      </div>

      <div style={styles.section}>
        <div style={styles.label}>测试文本</div>
        <textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="输入测试文本..."
          style={styles.textarea}
          onFocus={(e) => {
            e.target.style.borderColor = '#4a90d9';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#ccc';
          }}
        />
      </div>

      <div style={styles.section}>
        <div style={styles.label}>
          字距 <span style={styles.value}>{activeParams.letterSpacing.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="-5"
          max="5"
          step="0.1"
          value={activeParams.letterSpacing}
          onChange={(e) => handleSliderChange('letterSpacing', parseFloat(e.target.value))}
          style={styles.slider}
        />
        <div style={styles.rangeLabels}>
          <span>-5</span>
          <span>0</span>
          <span>5</span>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>
          行高 <span style={styles.value}>{activeParams.lineHeight.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0.8"
          max="3.0"
          step="0.1"
          value={activeParams.lineHeight}
          onChange={(e) => handleSliderChange('lineHeight', parseFloat(e.target.value))}
          style={styles.slider}
        />
        <div style={styles.rangeLabels}>
          <span>0.8</span>
          <span>1.5</span>
          <span>3.0</span>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>
          字号 <span style={styles.value}>{activeParams.fontSize}px</span>
        </div>
        <input
          type="range"
          min="12"
          max="72"
          step="1"
          value={activeParams.fontSize}
          onChange={(e) => handleSliderChange('fontSize', parseInt(e.target.value))}
          style={styles.slider}
        />
        <div style={styles.rangeLabels}>
          <span>12px</span>
          <span>42px</span>
          <span>72px</span>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>
          字重 <span style={styles.value}>{activeParams.fontWeight}</span>
        </div>
        <input
          type="range"
          min="300"
          max="900"
          step="100"
          value={activeParams.fontWeight}
          onChange={(e) => handleSliderChange('fontWeight', parseInt(e.target.value))}
          style={styles.slider}
        />
        <div style={styles.rangeLabels}>
          <span>Light</span>
          <span>Regular</span>
          <span>Black</span>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>
          颜色 <span style={{ ...styles.value, color: activeParams.color }}>{activeParams.color}</span>
        </div>
        <div style={styles.colorContainer}>
          <input
            type="color"
            value={activeParams.color}
            onChange={handleColorPickerChange}
            style={styles.colorPicker}
          />
          <input
            type="text"
            value={colorInputValue}
            onChange={handleColorInputChange}
            onBlur={handleColorInputBlur}
            style={styles.colorInput}
            placeholder="#RRGGBB"
          />
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    padding: '20px',
    overflowY: 'auto',
    height: '100%',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
  },
  value: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#4a90d9',
  },
  textarea: {
    width: '100%',
    height: '80px',
    padding: '12px',
    fontSize: '16px',
    color: '#333',
    border: '1px solid #ccc',
    borderRadius: '8px',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s ease',
    outline: 'none',
    boxSizing: 'border-box',
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: 'linear-gradient(to right, #4a90d9 0%, #7ab0e8 50%, #b3d4f5 100%)',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    WebkitAppearance: 'none',
  },
  rangeLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#999',
    marginTop: '4px',
  },
  colorContainer: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  colorPicker: {
    width: '48px',
    height: '36px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    cursor: 'pointer',
    padding: '2px',
    transition: 'all 0.2s ease',
  },
  colorInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    transition: 'border-color 0.2s ease',
    outline: 'none',
  },
};

const sliderStyle = document.createElement('style');
sliderStyle.textContent = `
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #4a90d9;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    transition: all 0.2s ease;
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    background: #3a7bc8;
  }
  input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #4a90d9;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    transition: all 0.2s ease;
  }
  input[type="range"]::-moz-range-thumb:hover {
    transform: scale(1.15);
    background: #3a7bc8;
  }
  input[type="range"]:active::-webkit-slider-runnable-track {
    background: linear-gradient(to right, #3a7bc8 0%, #6aa0d8 50%, #a3c4e5 100%);
  }
  select:focus, input:focus {
    border-color: #4a90d9 !important;
  }
  select:hover:not(:disabled) {
    border-color: #999;
  }
  button:hover {
    transform: scale(1.02);
  }
`;
document.head.appendChild(sliderStyle);
