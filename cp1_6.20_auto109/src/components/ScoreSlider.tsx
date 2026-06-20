import React from 'react';

interface ScoreSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

const ScoreSlider: React.FC<ScoreSliderProps> = ({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
}) => {
  return (
    <div className="slider-group">
      <div className="slider-label">
        <span>{label}</span>
        <span className="slider-value">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
      />
    </div>
  );
};

export default ScoreSlider;
