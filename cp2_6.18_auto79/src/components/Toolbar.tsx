import React from 'react';

export type BorderStyle = 'none' | 'white' | 'gray-dashed';
export type LayoutMode = 'compact' | 'loose';

interface ToolbarProps {
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
  borderStyle: BorderStyle;
  onBorderStyleChange: (style: BorderStyle) => void;
  layoutMode: LayoutMode;
  onLayoutModeChange: (mode: LayoutMode) => void;
}

const PRESET_COLORS = [
  '#f3f4f6',
  '#fef3c7',
  '#fce7f3',
  '#dbeafe',
  '#d1fae5',
  '#e0e7ff',
  '#fed7aa',
  '#fecaca',
  '#c7d2fe',
  '#a7f3d0',
  '#fde68a',
  '#fbcfe8'
];

const BORDER_STYLES: { value: BorderStyle; label: string; style: React.CSSProperties }[] = [
  {
    value: 'none',
    label: '无边框',
    style: { border: 'none' }
  },
  {
    value: 'white',
    label: '白色边框',
    style: { border: '2px solid #ffffff', borderRadius: '8px' }
  },
  {
    value: 'gray-dashed',
    label: '灰色虚线',
    style: { border: '1px dashed #9ca3af', borderRadius: '8px' }
  }
];

const Toolbar: React.FC<ToolbarProps> = ({
  backgroundColor,
  onBackgroundColorChange,
  borderStyle,
  onBorderStyleChange,
  layoutMode,
  onLayoutModeChange
}) => {
  return (
    <div className="toolbar">
      <h3 className="toolbar-title">编辑工具栏</h3>

      <div className="toolbar-section">
        <h4 className="section-title">背景色</h4>
        <div className="color-palette">
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
        <h4 className="section-title">边框样式</h4>
        <div className="border-options">
          {BORDER_STYLES.map((option) => (
            <button
              key={option.value}
              className={`border-option ${borderStyle === option.value ? 'active' : ''}`}
              onClick={() => onBorderStyleChange(option.value)}
            >
              <div className="border-preview" style={option.style} />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <h4 className="section-title">布局模式</h4>
        <div className="layout-options">
          <button
            className={`layout-btn ${layoutMode === 'compact' ? 'active' : ''}`}
            onClick={() => onLayoutModeChange('compact')}
          >
            紧凑模式
            <small>间距 8px</small>
          </button>
          <button
            className={`layout-btn ${layoutMode === 'loose' ? 'active' : ''}`}
            onClick={() => onLayoutModeChange('loose')}
          >
            宽松模式
            <small>间距 20px</small>
          </button>
        </div>
      </div>

      <style>{`
        .toolbar {
          width: 240px;
          padding: 20px;
          background: #ffffff;
          border-left: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 24px;
          overflow-y: auto;
        }

        .toolbar-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .toolbar-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
          margin: 0;
        }

        .color-palette {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
        }

        .color-swatch {
          width: 28px;
          height: 28px;
          border: 2px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease-out;
          padding: 0;
        }

        .color-swatch:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .color-swatch.active {
          border-color: #3b82f6;
          transform: scale(1.1);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
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
          padding: 10px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: #ffffff;
          cursor: pointer;
          transition: all 0.2s ease-out;
          font-size: 14px;
          color: #374151;
        }

        .border-option:hover {
          border-color: #d1d5db;
          background: #f9fafb;
        }

        .border-option.active {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .border-preview {
          width: 32px;
          height: 32px;
          background: #f3f4f6;
          flex-shrink: 0;
        }

        .layout-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .layout-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: #ffffff;
          cursor: pointer;
          transition: all 0.2s ease-out;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .layout-btn:hover {
          border-color: #d1d5db;
          background: #f9fafb;
        }

        .layout-btn.active {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .layout-btn small {
          font-size: 12px;
          font-weight: 400;
          color: #6b7280;
          margin-top: 2px;
        }

        .layout-btn.active small {
          color: #3b82f6;
        }

        @media (max-width: 1024px) {
          .toolbar {
            width: 200px;
            padding: 16px;
          }

          .color-palette {
            grid-template-columns: repeat(4, 1fr);
          }

          .color-swatch {
            width: 24px;
            height: 24px;
          }
        }
      `}</style>
    </div>
  );
};

export default Toolbar;
