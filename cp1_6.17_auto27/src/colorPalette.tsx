import React from 'react';
import { ColorInfo, Palette } from './types';

interface ColorPaletteProps {
  palette: Palette;
  selectedIndex: number | null;
  onColorSelect: (index: number) => void;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({
  palette,
  selectedIndex,
  onColorSelect
}) => {
  if (palette.length === 0) {
    return (
      <div className="palette-empty">
        <p>上传图片后将在这里显示调色板</p>
      </div>
    );
  }

  return (
    <div className="color-palette">
      {palette.map((color: ColorInfo, index: number) => (
        <div
          key={index}
          className={`color-card ${selectedIndex === index ? 'selected' : ''}`}
          onClick={() => onColorSelect(index)}
        >
          <div
            className="color-swatch"
            style={{
              background: `linear-gradient(135deg, ${color.hex} 0%, ${color.hex}dd 50%, ${color.hex}aa 100%)`
            }}
          />
          <div className="color-info">
            <span className="color-name">{color.name}</span>
            <span className="color-hex">{color.hex}</span>
            <span className="color-rgb">
              RGB({color.rgb.r}, {color.rgb.g}, {color.rgb.b})
            </span>
            <span className="color-percentage">{color.percentage.toFixed(1)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ColorPalette;
