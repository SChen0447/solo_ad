import React, { useState } from 'react';

const PRESET_COLORS: string[] = [
  '#FF0000', '#FF6600', '#FFCC00', '#FFFF00', '#99FF00',
  '#00FF00', '#00FF99', '#00FFFF', '#0099FF', '#0000FF',
  '#6600FF', '#9900FF', '#FF00FF', '#FF0099', '#FF3366',
  '#FFFFFF', '#CCCCCC', '#888888', '#444444', '#000000',
];

function getComplement(hex: string): string {
  const clean = hex.replace('#', '');
  const r = 255 - parseInt(clean.substring(0, 2), 16);
  const g = 255 - parseInt(clean.substring(2, 4), 16);
  const b = 255 - parseInt(clean.substring(4, 6), 16);
  return `rgb(${r},${g},${b})`;
}

interface ColorPaletteProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  isMobile: boolean;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({ currentColor, onColorChange, isMobile }) => {
  const [hexInput, setHexInput] = useState(currentColor);

  const handleHexApply = () => {
    const hex = hexInput.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onColorChange(hex.toUpperCase());
    }
  };

  const handleHexKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleHexApply();
    }
  };

  if (isMobile) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 12px',
        height: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        background: '#2a2a2a',
      }}>
        {PRESET_COLORS.map((color) => (
          <div
            key={color}
            onClick={() => onColorChange(color)}
            style={{
              minWidth: 32,
              width: 32,
              height: 32,
              borderRadius: 4,
              background: color,
              border: currentColor.toUpperCase() === color
                ? `3px solid ${getComplement(color)}`
                : '3px solid transparent',
              cursor: 'pointer',
              flexShrink: 0,
              boxSizing: 'border-box',
            }}
          />
        ))}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flexShrink: 0,
        }}>
          <input
            type="text"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            onKeyDown={handleHexKeyDown}
            placeholder="#RRGGBB"
            style={{
              width: 80,
              height: 28,
              background: '#1a1a1a',
              border: '1px solid #444',
              borderRadius: 4,
              color: '#fff',
              fontSize: 12,
              padding: '0 4px',
              outline: 'none',
            }}
          />
          <button
            onClick={handleHexApply}
            style={{
              height: 28,
              padding: '0 8px',
              background: 'linear-gradient(180deg, #4a90d9, #357abd)',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            应用
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: 12,
      background: '#2a2a2a',
      height: '100%',
      overflowY: 'auto',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 32px)',
        gap: 6,
        justifyContent: 'center',
      }}>
        {PRESET_COLORS.map((color) => (
          <div
            key={color}
            onClick={() => onColorChange(color)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 4,
              background: color,
              border: currentColor.toUpperCase() === color
                ? `3px solid ${getComplement(color)}`
                : '3px solid transparent',
              cursor: 'pointer',
              boxSizing: 'border-box',
            }}
          />
        ))}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '8px 0',
        borderTop: '1px solid #444',
      }}>
        <span style={{ color: '#aaa', fontSize: 12 }}>自定义颜色</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            type="text"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            onKeyDown={handleHexKeyDown}
            placeholder="#RRGGBB"
            style={{
              flex: 1,
              height: 28,
              background: '#1a1a1a',
              border: '1px solid #444',
              borderRadius: 4,
              color: '#fff',
              fontSize: 12,
              padding: '0 6px',
              outline: 'none',
            }}
          />
          <button
            onClick={handleHexApply}
            style={{
              height: 28,
              padding: '0 10px',
              background: 'linear-gradient(180deg, #4a90d9, #357abd)',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            应用
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorPalette;
