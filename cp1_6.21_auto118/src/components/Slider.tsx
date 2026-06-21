import React, { useState } from 'react';

export interface SliderProps {
  min: number;
  max: number;
  value: number;
  trackColor: string;
  thumbColor: string;
  showValue?: boolean;
}

export const Slider: React.FC<SliderProps> = ({ min, max, value: initialValue, trackColor, thumbColor, showValue = true }) => {
  const [value, setValue] = useState(initialValue);
  const percent = ((value - min) / (max - min)) * 100;

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: `linear-gradient(to right, ${trackColor} 0%, ${trackColor} ${percent}%, #e0e0e0 ${percent}%, #e0e0e0 100%)`,
    appearance: 'none',
    outline: 'none',
    cursor: 'pointer',
  };

  const thumbStyle = `
    .playground-slider::-webkit-slider-thumb {
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: ${thumbColor};
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      transition: transform 200ms ease;
    }
    .playground-slider::-webkit-slider-thumb:hover {
      transform: scale(1.1);
    }
    .playground-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: ${thumbColor};
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }
  `;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
      <style>{thumbStyle}</style>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        style={sliderStyle}
        className="playground-slider"
      />
      {showValue && (
        <span style={{ color: '#ffffff', fontSize: '14px', minWidth: '40px', textAlign: 'right' }}>
          {value}
        </span>
      )}
    </div>
  );
};

export const generateSliderCode = (props: SliderProps): string => {
  return `<Slider
  min={${props.min}}
  max={${props.max}}
  value={${props.value}}
  trackColor="${props.trackColor}"
  thumbColor="${props.thumbColor}"
  showValue={${props.showValue}}
/>`;
};

export const defaultSliderProps: SliderProps = {
  min: 0,
  max: 100,
  value: 50,
  trackColor: '#6c63ff',
  thumbColor: '#e040fb',
  showValue: true,
};
