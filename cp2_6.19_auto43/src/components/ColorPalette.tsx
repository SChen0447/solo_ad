import React from 'react';
import type { ColorEntry } from '../modules/imageProcessor/types';
import { Palette } from 'lucide-react';

interface ColorPaletteProps {
  colors: ColorEntry[];
  selectedColorIndex: number | null;
  onSelectColor: (index: number) => void;
  progress: Record<number, { filled: number; total: number }>;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  colors,
  selectedColorIndex,
  onSelectColor,
  progress,
}) => {
  return (
    <div className="color-palette">
      <div className="palette-header">
        <Palette size={20} color="#6b7280" />
        <span className="palette-title">色板</span>
      </div>

      {colors.length === 0 ? (
        <div className="palette-empty">
          <Palette size={32} color="#ccc" />
          <span>上传图片后<br />自动生成色板</span>
        </div>
      ) : (
        <div className="palette-grid">
          {colors.map((entry) => {
            const p = progress[entry.index];
            const isComplete = p && p.filled >= p.total;
            return (
              <button
                key={entry.index}
                className={`color-swatch ${selectedColorIndex === entry.index ? 'selected' : ''} ${isComplete ? 'complete' : ''}`}
                onClick={() => onSelectColor(entry.index)}
                style={{ '--swatch-color': entry.hex } as React.CSSProperties}
                title={`颜色 ${entry.index + 1}`}
              >
                <div className="swatch-color" style={{ backgroundColor: entry.hex }} />
                <span className="swatch-number">{entry.index + 1}</span>
                {p && (
                  <div className="swatch-progress">
                    {p.filled}/{p.total}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedColorIndex !== null && (
        <div className="palette-hint">
          <span>已选颜色 #{selectedColorIndex + 1}</span>
          <span style={{ color: colors[selectedColorIndex]?.hex || '#888' }}>●</span>
        </div>
      )}
    </div>
  );
};
