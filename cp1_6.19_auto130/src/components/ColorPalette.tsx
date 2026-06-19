import { useState, useRef, useEffect } from 'react';
import type { Color, Palette } from '../types/colors';
import {
  createColor,
  adjustBrightness,
  adjustSaturation,
  adjustHue,
  isLightColor,
  generateCSSVariables,
} from '../utils/colorEngine';
import './ColorPalette.css';

interface ColorPaletteProps {
  palettes: Palette[];
  onColorChange?: (color: Color) => void;
  onPaletteSelect?: (palette: Palette) => void;
}

interface ColorPickerProps {
  color: Color;
  isOpen: boolean;
  onClose: () => void;
  onChange: (color: Color) => void;
}

function ColorPicker({ color, isOpen, onClose, onChange }: ColorPickerProps) {
  const [localColor, setLocalColor] = useState(color);
  const [isDragging, setIsDragging] = useState(false);
  const hueRingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalColor(color);
  }, [color]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleHueClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hueRingRef.current) return;

    const rect = hueRingRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = e.clientX - centerX;
    const y = e.clientY - centerY;

    let angle = Math.atan2(y, x) * (180 / Math.PI);
    angle = (angle + 360) % 360;

    const newColor = adjustHue(localColor.hex, angle - localColor.hsl.h);
    setLocalColor(newColor);
    onChange(newColor);
  };

  const handleHueMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleHueClick(e);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!hueRingRef.current) return;
      const rect = hueRingRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const x = e.clientX - centerX;
      const y = e.clientY - centerY;

      let angle = Math.atan2(y, x) * (180 / Math.PI);
      angle = (angle + 360) % 360;

      const newColor = adjustHue(localColor.hex, angle - localColor.hsl.h);
      setLocalColor(newColor);
      onChange(newColor);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, localColor, onChange]);

  const handleSaturationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    const newColor = adjustSaturation(localColor.hex, value - localColor.hsl.s);
    setLocalColor(newColor);
    onChange(newColor);
  };

  const handleLightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    const newColor = adjustBrightness(localColor.hex, value - localColor.hsl.l);
    setLocalColor(newColor);
    onChange(newColor);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^[0-9A-Fa-f]{0,6}$/.test(value)) {
      if (value.length === 6) {
        try {
          const newColor = createColor(`#${value}`);
          setLocalColor(newColor);
          onChange(newColor);
        } catch {
          // Invalid hex
        }
      }
    }
  };

  if (!isOpen) return null;

  const hueAngle = localColor.hsl.h;

  return (
    <div className="color-picker-overlay" onClick={onClose}>
      <div className="color-picker-modal glass-effect" onClick={(e) => e.stopPropagation()}>
        <div className="color-picker-header">
          <h3>调色面板</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="color-picker-preview">
          <div
            className="preview-color"
            style={{ backgroundColor: localColor.hex }}
          >
            <span style={{ color: isLightColor(localColor.hex) ? '#000' : '#fff' }}>
              {localColor.name}
            </span>
          </div>
        </div>

        <div className="hue-ring-container">
          <div
            ref={hueRingRef}
            className="hue-ring"
            onMouseDown={handleHueMouseDown}
          >
            <div
              className="hue-ring-indicator"
              style={{ transform: `rotate(${hueAngle}deg)` }}
            >
              <div className="hue-ring-dot" />
            </div>
          </div>
        </div>

        <div className="slider-group">
          <div className="slider-row">
            <label>饱和度</label>
            <input
              type="range"
              min="0"
              max="100"
              value={localColor.hsl.s}
              onChange={handleSaturationChange}
              className="saturation-slider"
              style={{
                background: `linear-gradient(to right, hsl(${localColor.hsl.h}, 0%, 50%), hsl(${localColor.hsl.h}, 100%, 50%))`,
              }}
            />
            <span className="slider-value">{localColor.hsl.s}%</span>
          </div>

          <div className="slider-row">
            <label>明度</label>
            <input
              type="range"
              min="0"
              max="100"
              value={localColor.hsl.l}
              onChange={handleLightnessChange}
              className="lightness-slider"
              style={{
                background: `linear-gradient(to right, #000, hsl(${localColor.hsl.h}, 100%, 50%), #fff)`,
              }}
            />
            <span className="slider-value">{localColor.hsl.l}%</span>
          </div>
        </div>

        <div className="hex-input-group">
          <label>HEX</label>
          <div className="hex-input-wrapper">
            <span className="hex-prefix">#</span>
            <input
              type="text"
              value={localColor.hex.substring(1)}
              onChange={handleHexChange}
              maxLength={6}
              className="hex-input"
            />
          </div>
        </div>

        <div className="color-info">
          <div className="info-row">
            <span>RGB:</span>
            <span>
              {localColor.rgb.r}, {localColor.rgb.g}, {localColor.rgb.b}
            </span>
          </div>
          <div className="info-row">
            <span>HSL:</span>
            <span>
              {localColor.hsl.h}°, {localColor.hsl.s}%, {localColor.hsl.l}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorCard({ color, onClick, index }: { color: Color; onClick: () => void; index: number }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`color-card ${isLightColor(color.hex) ? 'light' : 'dark'}`}
      style={{
        backgroundColor: color.hex,
        animationDelay: `${index * 0.1}s`,
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="color-card-content">
        <span className="color-hex">{color.hex}</span>
        {isHovered && <span className="color-name">{color.name}</span>}
      </div>
    </div>
  );
}

function PaletteStrip({
  palette,
  onColorClick,
  onSelect,
}: {
  palette: Palette;
  onColorClick: (color: Color) => void;
  onSelect: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`palette-strip ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      <div className="palette-colors">
        {palette.colors.map((color, idx) => (
          <div
            key={idx}
            className="palette-color-block"
            style={{
              backgroundColor: color.hex,
              borderRadius:
                idx === 0 ? '8px 0 0 8px' : idx === palette.colors.length - 1 ? '0 8px 8px 0' : '0',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onColorClick(color);
            }}
          >
            {isHovered && (
              <span className={`color-tooltip ${isLightColor(color.hex) ? 'dark' : 'light'}`}>
                {color.hex}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="palette-label">{palette.name}</div>
    </div>
  );
}

export default function ColorPalette({ palettes, onColorChange, onPaletteSelect }: ColorPaletteProps) {
  const [pickerColor, setPickerColor] = useState<Color | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleColorClick = (color: Color) => {
    setPickerColor(color);
    setIsPickerOpen(true);
  };

  const handleColorChange = (newColor: Color) => {
    setPickerColor(newColor);
    if (onColorChange) {
      onColorChange(newColor);
    }
  };

  const handleCopyCSS = () => {
    if (palettes.length > 0) {
      const css = generateCSSVariables(palettes[0].colors);
      navigator.clipboard.writeText(css);
    }
  };

  return (
    <div className="color-palette-container">
      <div className="palette-header">
        <h2>配色方案</h2>
        <button className="btn btn-primary" onClick={handleCopyCSS}>
          复制 CSS 变量
        </button>
      </div>

      <div className="palettes-list">
        {palettes.length === 0 ? (
          <div className="empty-state">
            <p>上传图片或选择颜色来生成配色方案</p>
          </div>
        ) : (
          palettes.map((palette) => (
            <PaletteStrip
              key={palette.id}
              palette={palette}
              onColorClick={(color) => handleColorClick(color)}
              onSelect={() => onPaletteSelect?.(palette)}
            />
          ))
        )}
      </div>

      {pickerColor && (
        <ColorPicker
          color={pickerColor}
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onChange={handleColorChange}
        />
      )}
    </div>
  );
}

export { ColorCard, ColorPicker };
