import React, { useCallback, useRef, useState } from 'react';
import type { FilterParams } from './ImagePreview';

interface FilterPanelProps {
  filter: FilterParams;
  onFilterChange: (filter: FilterParams) => void;
  hasImage: boolean;
}

interface SliderConfig {
  key: keyof FilterParams;
  label: string;
  min: number;
  max: number;
  step: number;
  ticks: number[];
}

const FILTER_CONFIGS: Record<string, { label: string; desc: string; sliders: SliderConfig[] }> = {
  pixelate: {
    label: 'Pixelate',
    desc: 'Block-based pixel art style',
    sliders: [
      { key: 'pixelSize', label: 'Pixel Block Size', min: 2, max: 20, step: 1, ticks: [2, 6, 10, 14, 20] },
    ],
  },
  oil: {
    label: 'Oil Painting',
    desc: 'Brush stroke painting effect',
    sliders: [
      { key: 'oilBrushSize', label: 'Brush Size', min: 5, max: 30, step: 1, ticks: [5, 12, 20, 30] },
      { key: 'oilDetail', label: 'Detail Level', min: 1, max: 5, step: 1, ticks: [1, 2, 3, 4, 5] },
    ],
  },
  watercolor: {
    label: 'Watercolor',
    desc: 'Soft diffusion watercolor',
    sliders: [
      { key: 'watercolorSpread', label: 'Color Spread Radius', min: 3, max: 15, step: 1, ticks: [3, 6, 9, 12, 15] },
      { key: 'watercolorEdgeBlur', label: 'Edge Blur', min: 0, max: 5, step: 1, ticks: [0, 1, 2, 3, 4, 5] },
    ],
  },
  sketch: {
    label: 'Sketch',
    desc: 'Pencil drawing effect',
    sliders: [
      { key: 'sketchLineWidth', label: 'Line Width', min: 1, max: 8, step: 0.5, ticks: [1, 2, 4, 6, 8] },
      { key: 'sketchShadow', label: 'Shadow Intensity', min: 0.5, max: 2.0, step: 0.1, ticks: [0.5, 1.0, 1.5, 2.0] },
    ],
  },
};

const FILTER_TYPES = [
  { value: 'pixelate', label: '🖼 Pixelate' },
  { value: 'oil', label: '🎨 Oil Painting' },
  { value: 'watercolor', label: '💧 Watercolor' },
  { value: 'sketch', label: '✏️ Sketch' },
];

const CustomSlider: React.FC<{
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  ticks: number[];
  onChange: (v: number) => void;
}> = ({ label, min, max, step, value, ticks, onChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const percent = ((value - min) / (max - min)) * 100;

  const calcValue = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return value;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const raw = min + ratio * (max - min);
      return Math.round(raw / step) * step;
    },
    [min, max, step, value]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      onChange(calcValue(e.clientX));

      const handleMouseMove = (ev: MouseEvent) => {
        onChange(calcValue(ev.clientX));
      };
      const handleMouseUp = () => {
        setDragging(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [calcValue, onChange]
  );

  const displayValue = step < 1 ? value.toFixed(1) : value.toString();

  return (
    <div className="slider-group">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{displayValue}</span>
      </div>
      <div className="slider-track" ref={trackRef} onMouseDown={handleMouseDown}>
        <div className="slider-fill" style={{ width: `${percent}%` }} />
        <div
          className={`slider-thumb${dragging ? ' dragging' : ''}`}
          style={{ left: `${percent}%` }}
        />
      </div>
      <div className="slider-ticks">
        {ticks.map((t) => (
          <span className="slider-tick" key={t}>
            {step < 1 ? t.toFixed(1) : t}
          </span>
        ))}
      </div>
    </div>
  );
};

const FilterPanel: React.FC<FilterPanelProps> = ({ filter, onFilterChange, hasImage }) => {
  const config = FILTER_CONFIGS[filter.type];

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as FilterParams['type'];
    onFilterChange({
      ...filter,
      type: newType,
    });
  };

  const handleSliderChange = (key: keyof FilterParams, value: number) => {
    onFilterChange({
      ...filter,
      [key]: value,
    });
  };

  if (!hasImage) return null;

  return (
    <div className="filter-panel">
      <div className="section-title">Filter Style</div>
      <select className="filter-select" value={filter.type} onChange={handleTypeChange}>
        {FILTER_TYPES.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <div className="preset-card active" style={{ marginTop: 8 }}>
        <div className="preset-dot" />
        <div>
          <div className="preset-name">{config.label}</div>
          <div className="preset-desc">{config.desc}</div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="section-title">Parameters</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {config.sliders.map((slider) => (
            <CustomSlider
              key={slider.key}
              label={slider.label}
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={filter[slider.key] as number}
              ticks={slider.ticks}
              onChange={(v) => handleSliderChange(slider.key, v)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
