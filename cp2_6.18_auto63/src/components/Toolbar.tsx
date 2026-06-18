import React from 'react';
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
  '#f3f4f6', '#ffffff', '#fef3c7', '#fce7f3',
  '#dbeafe', '#dcfce7', '#e9d5ff', '#fed7aa',
  '#fef9c3', '#fecaca', '#ccfbf1', '#c7d2fe',
];

const Toolbar: React.FC<ToolbarProps> = ({
  backgroundColor,
  borderStyle,
  layoutMode,
  onBackgroundColorChange,
  onBorderStyleChange,
  onLayoutModeChange,
}) => {
  return (
    <div
      style={{
        width: '240px',
        padding: '20px 16px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        boxSizing: 'border-box',
        height: 'fit-content',
      }}
    >
      <h3
        style={{
          margin: 0,
          marginBottom: '20px',
          fontSize: '16px',
          fontWeight: 600,
          color: '#1f2937',
        }}
      >
        编辑工具栏
      </h3>

      <div style={{ marginBottom: '24px' }}>
        <p style={{ margin: 0, marginBottom: '12px', fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
          背景色
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '8px',
          }}
        >
          {PRESET_COLORS.map((color) => {
            const isSelected = backgroundColor === color;
            return (
              <button
                key={color}
                onClick={() => onBackgroundColorChange(color)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: color,
                  border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  cursor: 'pointer',
                  padding: 0,
                  boxSizing: 'border-box',
                  transition: 'all 0.2s',
                  position: 'relative',
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
                title={color}
              >
                {isSelected && (
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: color === '#ffffff' ? '#3b82f6' : '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <p style={{ margin: 0, marginBottom: '12px', fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
          边框样式
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { value: 'none' as BorderStyle, label: '无边框' },
            { value: 'white' as BorderStyle, label: '白色圆角边框' },
            { value: 'gray-dashed' as BorderStyle, label: '灰色虚线边框' },
          ].map((option) => {
            const isSelected = borderStyle === option.value;
            return (
              <button
                key={option.value}
                onClick={() => onBorderStyleChange(option.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: isSelected ? '#eff6ff' : '#f9fafb',
                  color: isSelected ? '#2563eb' : '#374151',
                  border: `1px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
                  cursor: 'pointer',
                  fontSize: '13px',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  fontWeight: isSelected ? 500 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p style={{ margin: 0, marginBottom: '12px', fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
          布局模式
        </p>
        <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
          {[
            { value: 'compact' as LayoutMode, label: '紧凑' },
            { value: 'loose' as LayoutMode, label: '宽松' },
          ].map((option) => {
            const isSelected = layoutMode === option.value;
            return (
              <button
                key={option.value}
                onClick={() => onLayoutModeChange(option.value)}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: isSelected ? '#3b82f6' : '#ffffff',
                  color: isSelected ? '#fff' : '#374151',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                  fontWeight: isSelected ? 500 : 400,
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
