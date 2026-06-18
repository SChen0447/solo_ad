import React from 'react';
import { Palette, Frame, LayoutGrid, Maximize2, Minimize2 } from 'lucide-react';
import type { BorderStyle, LayoutMode } from './PuzzleCanvas';

interface ToolbarProps {
  backgroundColor: string;
  borderStyle: BorderStyle;
  layoutMode: LayoutMode;
  onBackgroundColorChange: (color: string) => void;
  onBorderStyleChange: (style: BorderStyle) => void;
  onLayoutModeChange: (mode: LayoutMode) => void;
}

const PRESET_COLORS = [
  '#f3f4f6',
  '#ffffff',
  '#fef3c7',
  '#fce7f3',
  '#dbeafe',
  '#dcfce7',
  '#e0e7ff',
  '#f3e8ff',
  '#fed7aa',
  '#cffafe',
  '#fef9c3',
  '#fecdd3'
];

const BORDER_OPTIONS: { value: BorderStyle; label: string; preview: React.CSSProperties }[] = [
  {
    value: 'none',
    label: '无边框',
    preview: { border: 'none', borderRadius: '4px' }
  },
  {
    value: 'white-solid',
    label: '白色圆角',
    preview: { border: '3px solid #ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
  },
  {
    value: 'gray-dashed',
    label: '灰色虚线',
    preview: { border: '2px dashed #9ca3af', borderRadius: '8px' }
  }
];

const Toolbar: React.FC<ToolbarProps> = ({
  backgroundColor,
  borderStyle,
  layoutMode,
  onBackgroundColorChange,
  onBorderStyleChange,
  onLayoutModeChange
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <div className="section-title">
          <Palette size={16} />
          <span>背景色</span>
        </div>
        <div className="color-grid">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className={`color-swatch ${backgroundColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onBackgroundColorChange(color)}
              title={color}
            />
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <div className="section-title">
          <Frame size={16} />
          <span>边框样式</span>
        </div>
        <div className="border-options">
          {BORDER_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`border-option ${borderStyle === option.value ? 'active' : ''}`}
              onClick={() => onBorderStyleChange(option.value)}
            >
              <div className="border-preview" style={option.preview}>
                <div className="preview-inner" />
              </div>
              <span className="option-label">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <div className="section-title">
          <LayoutGrid size={16} />
          <span>布局模式</span>
        </div>
        <div className="layout-toggle">
          <button
            className={`layout-btn ${layoutMode === 'compact' ? 'active' : ''}`}
            onClick={() => onLayoutModeChange('compact')}
          >
            <Maximize2 size={14} />
            <span>紧凑</span>
          </button>
          <button
            className={`layout-btn ${layoutMode === 'loose' ? 'active' : ''}`}
            onClick={() => onLayoutModeChange('loose')}
          >
            <Minimize2 size={14} />
            <span>宽松</span>
          </button>
        </div>
        <div className="layout-info">
          {layoutMode === 'compact' ? '间距: 8px' : '间距: 20px'}
        </div>
      </div>

      <style>{`
        .toolbar {
          width: 240px;
          background: #ffffff;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          display: flex;
          flex-direction: column;
          gap: 24px;
          flex-shrink: 0;
        }

        .toolbar-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          padding-bottom: 8px;
          border-bottom: 1px solid #f3f4f6;
        }

        .color-grid {
          display: grid;
          grid-template-columns: repeat(4, 20px);
          gap: 8px;
          justify-content: space-between;
        }

        .color-swatch {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          border: 2px solid #e5e7eb;
          cursor: pointer;
          transition: all 0.2s ease-out;
          padding: 0;
          position: relative;
          flex-shrink: 0;
        }

        .color-swatch:hover {
          transform: scale(1.15);
          border-color: #3b82f6;
        }

        .color-swatch.active {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
        }

        .color-swatch.active::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #3b82f6;
        }

        .border-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .border-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: #fafafa;
          cursor: pointer;
          transition: all 0.2s ease-out;
        }

        .border-option:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .border-option.active {
          border-color: #3b82f6;
          background: #eff6ff;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        .border-preview {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          background: #e5e7eb;
          overflow: hidden;
        }

        .preview-inner {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%);
        }

        .option-label {
          font-size: 13px;
          color: #374151;
        }

        .layout-toggle {
          display: flex;
          gap: 8px;
        }

        .layout-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: #fafafa;
          cursor: pointer;
          font-size: 13px;
          color: #374151;
          transition: all 0.2s ease-out;
        }

        .layout-btn:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .layout-btn.active {
          border-color: #3b82f6;
          background: #3b82f6;
          color: white;
        }

        .layout-info {
          font-size: 12px;
          color: #9ca3af;
          text-align: center;
          padding-top: 4px;
        }

        @media (max-width: 1280px) {
          .toolbar {
            width: 220px;
            padding: 16px;
          }
        }

        @media (max-width: 1024px) {
          .toolbar {
            width: 100%;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 16px;
            padding: 16px;
          }

          .toolbar-section {
            flex: 1;
            min-width: 200px;
          }

          .color-grid {
            grid-template-columns: repeat(6, 20px);
            justify-content: flex-start;
          }
        }

        @media (max-width: 768px) {
          .toolbar {
            padding: 12px;
            gap: 12px;
          }

          .toolbar-section {
            min-width: 150px;
          }
        }
      `}</style>
    </div>
  );
};

export default Toolbar;
