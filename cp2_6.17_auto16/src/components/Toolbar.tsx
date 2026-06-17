import React, { useState } from 'react';
import type { ToolType } from '../types';
import { COLOR_PALETTE, THICKNESS_OPTIONS } from '../types';

interface ToolbarProps {
  tool: ToolType;
  onToolChange: (tool: ToolType) => void;
  color: string;
  onColorChange: (color: string) => void;
  thickness: number;
  onThicknessChange: (thickness: number) => void;
  stickyShape: 'rectangle' | 'circle' | 'hexagon';
  onStickyShapeChange: (shape: 'rectangle' | 'circle' | 'hexagon') => void;
  onExport: () => void;
  isExporting: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  onToolChange,
  color,
  onColorChange,
  thickness,
  onThicknessChange,
  stickyShape,
  onStickyShapeChange,
  onExport,
  isExporting,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const tools: { id: ToolType; icon: string; label: string }[] = [
    { id: 'select', icon: 'fa-mouse-pointer', label: '选择' },
    { id: 'pen', icon: 'fa-pencil', label: '画笔' },
    { id: 'sticky', icon: 'fa-sticky-note', label: '便利贴' },
    { id: 'arrow', icon: 'fa-arrow-right', label: '箭头' },
    { id: 'eraser', icon: 'fa-eraser', label: '橡皮擦' },
  ];

  const stickyShapes: { id: 'rectangle' | 'circle' | 'hexagon'; label: string }[] = [
    { id: 'rectangle', label: '矩形' },
    { id: 'circle', label: '圆形' },
    { id: 'hexagon', label: '六边形' },
  ];

  return (
    <div style={{
      height: 60,
      backgroundColor: '#16213e',
      borderBottom: '1px solid #e94560',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 20,
    }}>
      <div style={{ fontSize: 18, fontWeight: 'bold', color: '#e94560', marginRight: 10 }}>
        <i className="fas fa-palette" style={{ marginRight: 8 }}></i>
        创意白板
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        {tools.map(t => (
          <button
            key={t.id}
            onClick={() => onToolChange(t.id)}
            title={t.label}
            style={{
              width: 42,
              height: 42,
              borderRadius: 8,
              border: 'none',
              backgroundColor: tool === t.id 
                ? 'linear-gradient(135deg, #0f3460, #e94560)' 
                : 'transparent',
              background: tool === t.id 
                ? 'linear-gradient(135deg, #0f3460, #e94560)' 
                : 'transparent',
              color: tool === t.id ? '#fff' : '#aaa',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              fontSize: 16,
            }}
            onMouseEnter={(e) => {
              if (tool !== t.id) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (tool !== t.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <i className={`fas ${t.icon}`}></i>
            {tool === t.id && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 24,
                height: 2,
                backgroundColor: '#e94560',
                borderRadius: 1,
                transition: 'all 0.2s ease',
              }} />
            )}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 30, backgroundColor: '#333' }} />

      {(tool === 'pen' || tool === 'arrow') && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            style={{
              width: 42,
              height: 42,
              borderRadius: 8,
              border: '2px solid #333',
              backgroundColor: color,
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          />
          {showColorPicker && (
            <div
              style={{
                position: 'absolute',
                top: 50,
                left: 0,
                backgroundColor: '#16213e',
                padding: 10,
                borderRadius: 8,
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 6,
                zIndex: 100,
              }}
              onMouseLeave={() => setShowColorPicker(false)}
            >
              {COLOR_PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => {
                    onColorChange(c);
                    setShowColorPicker(false);
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    border: color === c ? '2px solid #fff' : '2px solid transparent',
                    backgroundColor: c,
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tool === 'pen' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {THICKNESS_OPTIONS.map(t => (
            <button
              key={t}
              onClick={() => onThicknessChange(t)}
              title={`${t}px`}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: thickness === t ? '2px solid #fff' : '2px solid transparent',
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                width: t,
                height: t,
                borderRadius: '50%',
                backgroundColor: thickness === t ? '#e94560' : '#888',
              }} />
            </button>
          ))}
        </div>
      )}

      {tool === 'sticky' && (
        <div style={{ display: 'flex', gap: 4 }}>
          {stickyShapes.map(s => (
            <button
              key={s.id}
              onClick={() => onStickyShapeChange(s.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: stickyShape === s.id ? '#e94560' : 'rgba(255,255,255,0.1)',
                color: stickyShape === s.id ? '#fff' : '#aaa',
                cursor: 'pointer',
                fontSize: 12,
                transition: 'all 0.2s ease',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1 }} />

      <button
        onClick={onExport}
        disabled={isExporting}
        style={{
          padding: '8px 16px',
          borderRadius: 8,
          border: 'none',
          background: 'linear-gradient(135deg, #0f3460, #e94560)',
          color: '#fff',
          cursor: isExporting ? 'not-allowed' : 'pointer',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          transition: 'transform 0.2s ease, opacity 0.2s ease',
          opacity: isExporting ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isExporting) {
            e.currentTarget.style.transform = 'scale(1.05)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {isExporting ? (
          <>
            <i className="fas fa-cog fa-spin"></i>
            导出中...
          </>
        ) : (
          <>
            <i className="fas fa-download"></i>
            导出PNG
          </>
        )}
      </button>
    </div>
  );
};

export default Toolbar;
