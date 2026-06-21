import React from 'react';
import { Color, DEFAULT_PALETTE } from './types';

interface PaletteProps {
  palette?: Color[];
  recentColors: Color[];
  foregroundColor: Color;
  backgroundColor: Color;
  onSelectColor: (color: Color, button: 'left' | 'right') => void;
}

const Palette: React.FC<PaletteProps> = ({
  palette = DEFAULT_PALETTE,
  recentColors,
  foregroundColor,
  backgroundColor,
  onSelectColor,
}) => {
  const handleColorClick = (e: React.MouseEvent, color: Color) => {
    e.preventDefault();
    const button: 'left' | 'right' = e.button === 2 ? 'right' : 'left';
    onSelectColor(color, button);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <aside className="palette-panel">
      <div className="palette-title">
        <span>调色板 · PALETTE</span>
        <span className="dot" />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '8px 4px',
          borderRadius: '8px',
          background: 'rgba(0, 0, 0, 0.15)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 4px',
          }}
        >
          <div className="color-display">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                alignItems: 'flex-start',
              }}
            >
              <span className="color-swatch-label">前景色 · FG</span>
              <div
                className="color-swatch fg"
                style={{
                  background: foregroundColor,
                }}
                title={`前景色: ${foregroundColor}`}
              />
            </div>
          </div>
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: 'var(--text-muted)',
            }}
          >
            ⇄
          </div>
          <div className="color-display">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                alignItems: 'flex-end',
              }}
            >
              <span className="color-swatch-label">背景色 · BG</span>
              <div
                className="color-swatch"
                style={{
                  background:
                    backgroundColor === 'transparent'
                      ? 'repeating-conic-gradient(#333 0% 25%, #1e1e35 0% 50%) 50% / 8px 8px'
                      : backgroundColor,
                }}
                title={`背景色: ${backgroundColor}`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="palette-grid">
        {palette.map((color, idx) => {
          const isFg = color.toLowerCase() === foregroundColor.toLowerCase();
          return (
            <div
              key={`${color}-${idx}`}
              className={`palette-cell ${isFg ? 'selected' : ''}`}
              style={{
                background: color,
              }}
              title={`${color} · 左键=前景色，右键=背景色`}
              onClick={(e) => handleColorClick(e, color)}
              onContextMenu={(e) => {
                handleContextMenu(e);
                handleColorClick(e, color);
              }}
            />
          );
        })}
      </div>

      <div className="recent-section">
        <div className="recent-label">最近使用 · RECENT</div>
        <div className="recent-grid">
          {Array.from({ length: 5 }).map((_, idx) => {
            const color = recentColors[idx];
            if (!color) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="recent-cell empty"
                  title="暂无记录"
                />
              );
            }
            const isFg = color.toLowerCase() === foregroundColor.toLowerCase();
            return (
              <div
                key={`recent-${idx}-${color}`}
                className={`recent-cell ${isFg ? 'selected' : ''}`}
                style={{
                  background: color,
                  borderColor: isFg ? 'var(--accent-start)' : undefined,
                }}
                title={`${color} · 左键=前景色，右键=背景色`}
                onClick={(e) => handleColorClick(e, color)}
                onContextMenu={(e) => {
                  handleContextMenu(e);
                  handleColorClick(e, color);
                }}
              />
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default React.memo(Palette);
