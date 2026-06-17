import React from 'react';
import { ColorWheel } from './ColorWheel';

interface ToolPanelProps {
  color: string;
  hue: number;
  saturation: number;
  lightness: number;
  brushSize: number;
  canUndo: boolean;
  canRedo: boolean;
  isUndoing: boolean;
  isRedoing: boolean;
  onColorChange: (hue: number, saturation: number, lightness: number) => void;
  onBrushSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onPublish: () => void;
  isPublishing: boolean;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({
  color,
  hue,
  saturation,
  lightness,
  brushSize,
  canUndo,
  canRedo,
  isUndoing,
  isRedoing,
  onColorChange,
  onBrushSizeChange,
  onUndo,
  onRedo,
  onPublish,
  isPublishing,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        background: 'rgba(255, 252, 245, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 20,
        padding: 20,
        boxShadow: '0 8px 32px rgba(93, 78, 55, 0.12)',
        border: '1px solid rgba(139, 115, 85, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        zIndex: 100,
        minWidth: 200,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, color: '#5D4E37', fontWeight: 500 }}>颜色</span>
        <div style={{ flex: 1 }} />
        <ColorWheel
          hue={hue}
          saturation={saturation}
          lightness={lightness}
          onChange={onColorChange}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#5D4E37', fontWeight: 500 }}>笔刷大小</span>
          <span style={{ fontSize: 12, color: '#8B7355' }}>{brushSize}px</span>
        </div>
        <div style={{ position: 'relative', height: 6 }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '100%',
              background: 'rgba(139, 115, 85, 0.15)',
              borderRadius: 3,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${((brushSize - 1) / 49) * 100}%`,
              height: '100%',
              background: `linear-gradient(90deg, #d4c4a8, ${color})`,
              borderRadius: 3,
              transition: 'width 0.1s ease',
            }}
          />
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              margin: 0,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `calc(${((brushSize - 1) / 49) * 100}% - 8px)`,
              width: 16,
              height: 16,
              background: '#fff',
              borderRadius: '50%',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              transition: 'left 0.1s ease',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 12,
            border: 'none',
            background: canUndo
              ? 'linear-gradient(135deg, #d4c4a8, #c4b393)'
              : 'rgba(139, 115, 85, 0.1)',
            color: canUndo ? '#5D4E37' : '#b8a88a',
            fontSize: 13,
            fontWeight: 500,
            cursor: canUndo ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            transform: isUndoing ? 'translateY(2px)' : 'translateY(0)',
            boxShadow: isUndoing
              ? '0 1px 3px rgba(0,0,0,0.1)'
              : canUndo
              ? '0 3px 8px rgba(93, 78, 55, 0.2)'
              : 'none',
          }}
          onMouseEnter={(e) => {
            if (canUndo) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 5px 12px rgba(93, 78, 55, 0.25)';
            }
          }}
          onMouseLeave={(e) => {
            if (canUndo) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 3px 8px rgba(93, 78, 55, 0.2)';
            }
          }}
        >
          ↶ 撤销
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 12,
            border: 'none',
            background: canRedo
              ? 'linear-gradient(135deg, #d4c4a8, #c4b393)'
              : 'rgba(139, 115, 85, 0.1)',
            color: canRedo ? '#5D4E37' : '#b8a88a',
            fontSize: 13,
            fontWeight: 500,
            cursor: canRedo ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            transform: isRedoing ? 'translateY(2px)' : 'translateY(0)',
            boxShadow: isRedoing
              ? '0 1px 3px rgba(0,0,0,0.1)'
              : canRedo
              ? '0 3px 8px rgba(93, 78, 55, 0.2)'
              : 'none',
          }}
          onMouseEnter={(e) => {
            if (canRedo) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 5px 12px rgba(93, 78, 55, 0.25)';
            }
          }}
          onMouseLeave={(e) => {
            if (canRedo) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 3px 8px rgba(93, 78, 55, 0.2)';
            }
          }}
        >
          ↷ 重做
        </button>
      </div>

      <button
        onClick={onPublish}
        disabled={isPublishing}
        style={{
          padding: '14px 20px',
          borderRadius: 14,
          border: 'none',
          background: 'linear-gradient(135deg, #8B7355, #6B5344)',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: isPublishing ? 'wait' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 12px rgba(139, 115, 85, 0.3)',
        }}
        onMouseEnter={(e) => {
          if (!isPublishing) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 115, 85, 0.4)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 115, 85, 0.3)';
        }}
      >
        {isPublishing ? '发布中...' : '✨ 发布到公共画布'}
      </button>
    </div>
  );
};
