import React, { useState } from 'react';
import type { Tool } from './types';

const COLORS = [
  '#ff4757', '#ffa502', '#ffd32a', '#2ed573', '#1e90ff', '#3742fa',
  '#a55eea', '#ff6b81', '#00d2d3', '#54a0ff', '#5f27cd', '#48dbfb',
];

const SIZES = [
  { value: 2, label: '细' },
  { value: 5, label: '中' },
  { value: 10, label: '粗' },
];

interface ToolbarProps {
  tool: Tool;
  setTool: (t: Tool) => void;
  color: string;
  setColor: (c: string) => void;
  size: number;
  setSize: (s: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSaveSnapshot: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  tool, setTool, color, setColor, size, setSize,
  onUndo, onRedo, onSaveSnapshot, canUndo, canRedo,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const ToolButton: React.FC<{
    active: boolean;
    onClick: () => void;
    title: string;
    icon: string;
    disabled?: boolean;
  }> = ({ active, onClick, title, icon, disabled }) => (
    <button
      className="tool-btn"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: active ? '2px solid #706fd3' : '2px solid transparent',
        background: active ? 'rgba(64, 64, 122, 0.9)' : 'rgba(255, 255, 255, 0.05)',
        color: disabled ? '#5f5f8a' : '#f7f1e3',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        opacity: disabled ? 0.4 : 1,
        boxShadow: active ? '0 2px 8px rgba(112, 111, 211, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = '#40407a';
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = active ? 'rgba(64, 64, 122, 0.9)' : 'rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = active ? '0 2px 8px rgba(112, 111, 211, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)' : 'inset 0 1px 0 rgba(255,255,255,0.05)';
        }
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(0.92)';
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(1.08)';
        }
      }}
    >
      {icon}
    </button>
  );

  const Divider = () => (
    <div style={{
      width: 1,
      height: 28,
      background: 'linear-gradient(to bottom, transparent, #40407a, transparent)',
      margin: '0 8px',
      flexShrink: 0,
    }} />
  );

  const ToolButtons = () => (
    <>
      <ToolButton active={tool === 'brush'} onClick={() => setTool('brush')} title="画笔 (B)" icon="✏️" />
      <ToolButton active={tool === 'eraser'} onClick={() => setTool('eraser')} title="橡皮 (E)" icon="🧹" />
      <ToolButton active={tool === 'sticky'} onClick={() => setTool('sticky')} title="便签 (S)" icon="📝" />
      <ToolButton active={tool === 'line'} onClick={() => setTool('line')} title="连线 (L)" icon="🔗" />
      <ToolButton active={tool === 'select'} onClick={() => setTool('select')} title="选择 (V)" icon="👆" />
      <Divider />
      <ToolButton active={false} onClick={onUndo} title="撤销 (Ctrl+Z)" icon="↶" disabled={!canUndo} />
      <ToolButton active={false} onClick={onRedo} title="重做 (Ctrl+Y)" icon="↷" disabled={!canRedo} />
      <Divider />
      <ToolButton active={false} onClick={onSaveSnapshot} title="保存版本 (Ctrl+S)" icon="💾" />
    </>
  );

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #323265 0%, #2c2c54 100%)',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 2,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        position: 'relative',
        zIndex: 100,
        flexWrap: 'nowrap',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div style={{
        color: '#f7f1e3',
        fontWeight: 700,
        fontSize: 18,
        marginRight: 20,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        letterSpacing: 0.5,
      }}>
        <span style={{ fontSize: 22 }}>🎨</span>
        协作白板
      </div>

      <div className="toolbar-desktop" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <ToolButtons />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>
        <div className="toolbar-colors" style={{
          display: 'flex',
          gap: 4,
          flexWrap: 'wrap',
          maxWidth: 260,
          padding: '4px 6px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 12,
        }}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              title={c}
              className="color-btn"
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${c}dd, ${c})`,
                border: color === c ? '2px solid #f7f1e3' : '2px solid transparent',
                cursor: 'pointer',
                padding: 0,
                boxSizing: 'border-box',
                transition: 'all 0.15s ease',
                boxShadow: color === c ? `0 0 0 2px ${c}44, 0 2px 6px rgba(0,0,0,0.2)` : '0 1px 3px rgba(0,0,0,0.15)',
                transform: color === c ? 'scale(1.1)' : 'scale(1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = color === c ? 'scale(1.1)' : 'scale(1.2)';
                e.currentTarget.style.boxShadow = `0 0 0 2px ${c}44, 0 3px 8px rgba(0,0,0,0.25)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = color === c ? 'scale(1.1)' : 'scale(1)';
                e.currentTarget.style.boxShadow = color === c ? `0 0 0 2px ${c}44, 0 2px 6px rgba(0,0,0,0.2)` : '0 1px 3px rgba(0,0,0,0.15)';
              }}
            />
          ))}
        </div>

        <Divider />

        <div className="toolbar-sizes" style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {SIZES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSize(s.value)}
              title={`粗细: ${s.label} (${s.value}px)`}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: size === s.value ? '#40407a' : 'rgba(255, 255, 255, 0.04)',
                border: size === s.value ? '1px solid #706fd3' : '1px solid transparent',
                color: '#f7f1e3',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#40407a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = size === s.value ? '#40407a' : 'rgba(255, 255, 255, 0.04)';
              }}
            >
              <div style={{
                width: Math.max(6, s.value * 1.6),
                height: Math.max(6, s.value * 1.6),
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f7f1e3, #e8e0c8)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }} />
            </button>
          ))}
        </div>
      </div>

      <button
        className="hamburger-btn"
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          display: 'none',
          width: 40,
          height: 40,
          borderRadius: 10,
          background: menuOpen ? '#40407a' : 'rgba(255, 255, 255, 0.05)',
          border: 'none',
          color: '#f7f1e3',
          cursor: 'pointer',
          fontSize: 22,
          marginLeft: 10,
          flexShrink: 0,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#40407a';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = menuOpen ? '#40407a' : 'rgba(255, 255, 255, 0.05)';
        }}
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {menuOpen && (
        <div className="hamburger-menu" style={{
          position: 'fixed',
          top: 60,
          left: 0,
          right: 0,
          background: 'linear-gradient(180deg, #323265 0%, #2c2c54 100%)',
          padding: '12px 16px',
          display: 'flex',
          gap: 4,
          flexWrap: 'wrap',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          zIndex: 99,
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          <ToolButtons />
          <Divider />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); setMenuOpen(false); }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${c}dd, ${c})`,
                  border: color === c ? '2px solid #f7f1e3' : '2px solid transparent',
                  cursor: 'pointer',
                  padding: 0,
                  boxSizing: 'border-box',
                }}
              />
            ))}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .toolbar-desktop { display: none !important; }
          .toolbar-colors { display: none !important; }
          .toolbar-sizes { display: none !important; }
          .hamburger-btn { display: block !important; }
        }
      `}</style>
    </div>
  );
};

export default Toolbar;
