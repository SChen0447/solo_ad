import React, { useState, useEffect, useCallback } from 'react';
import { ColorInfo } from './types';
import { hslToColorInfo } from './colorAnalyzer';

interface ColorEditorProps {
  color: ColorInfo | null;
  onColorChange: (color: ColorInfo) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onPickFromImage?: () => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
  gradient?: string;
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  unit,
  onChange,
  gradient
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(Math.max(min, value - 1));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(Math.min(max, value + 1));
    }
  };

  return (
    <div className="slider-row">
      <label className="slider-label">{label}</label>
      <div className="slider-track-wrapper">
        <div
          className="slider-gradient"
          style={gradient ? { background: gradient } : undefined}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onKeyDown={handleKeyDown}
          className="slider-input"
        />
      </div>
      <span className="slider-value">
        {value}
        {unit}
      </span>
    </div>
  );
};

const ColorEditor: React.FC<ColorEditorProps> = ({
  color,
  onColorChange,
  onPickFromImage
}) => {
  const [h, setH] = useState(0);
  const [s, setS] = useState(0);
  const [l, setL] = useState(0);

  useEffect(() => {
    if (color) {
      setH(color.hsl.h);
      setS(color.hsl.s);
      setL(color.hsl.l);
    }
  }, [color]);

  const updateColor = useCallback(
    (newH: number, newS: number, newL: number) => {
      const pct = color?.percentage ?? 0;
      const newColor = hslToColorInfo({ h: newH, s: newS, l: newL }, pct);
      newColor.name = color?.name;
      onColorChange(newColor);
    },
    [color, onColorChange]
  );

  const handleHChange = (v: number) => {
    setH(v);
    updateColor(v, s, l);
  };

  const handleSChange = (v: number) => {
    setS(v);
    updateColor(h, v, l);
  };

  const handleLChange = (v: number) => {
    setL(v);
    updateColor(h, s, v);
  };

  if (!color) {
    return (
      <div className="color-editor-empty">
        <p>从调色板中选择一个颜色进行编辑</p>
      </div>
    );
  }

  const hueGradient =
    'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)';
  const satGradient = `linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))`;
  const lightGradient = `linear-gradient(to right, #000000, hsl(${h}, ${s}%, 50%), #ffffff)`;

  return (
    <div className="color-editor">
      <div className="editor-header">
        <div
          className="editor-preview"
          style={{ backgroundColor: color.hex }}
        />
        <div className="editor-info">
          <div className="editor-color-name">{color.name}</div>
          <div className="editor-color-hex">{color.hex}</div>
        </div>
        <button
          className="eyedropper-btn"
          onClick={onPickFromImage}
          title="从图片取色"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m2 22 1-1h3l9-9" />
            <path d="M3 21v-3l9-9" />
            <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
          </svg>
          <span>吸管取色</span>
        </button>
      </div>

      <div className="sliders-container">
        <Slider
          label="色相 H"
          value={h}
          min={0}
          max={360}
          unit="°"
          onChange={handleHChange}
          gradient={hueGradient}
        />
        <Slider
          label="饱和度 S"
          value={s}
          min={0}
          max={100}
          unit="%"
          onChange={handleSChange}
          gradient={satGradient}
        />
        <Slider
          label="明度 L"
          value={l}
          min={0}
          max={100}
          unit="%"
          onChange={handleLChange}
          gradient={lightGradient}
        />
      </div>
    </div>
  );
};

export default ColorEditor;
