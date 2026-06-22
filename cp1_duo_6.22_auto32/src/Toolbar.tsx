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
    active: boolean; onClick: () => void; title: string; icon: string; disabled?: boolean;
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
        border: 'none',
        background: active ? '#40407a' : 'transparent',
        color: disabled ? '#5f5f8a' : '#f7f1e3',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        transition: 'all 0.15s ease',
        flexShrink: 0,
        opacity: disabled ? 0.4 : 1,
      }}
    >{icon}</button>
  );

  const Divider = () => (
    <div style={{ width: 1, height: 28, background: '#40407a', margin: '0 6px', flexShrink: 0 }} />
  );

  const ToolButtons = () => (
    <>
      <ToolButton active={tool === 'brush'} onClick={() => setTool('brush')} title="画笔" icon="✏️" />
      <ToolButton active={tool === 'eraser'} onClick={() => setTool('eraser')} title="橡皮" icon="🧹" />
      <ToolButton active={tool === 'sticky'} onClick={() => setTool('sticky')} title="便签" icon="📝" />
      <ToolButton active={tool === 'line'} onClick={() => setTool('line')} title="连线" icon="🔗" />
      <ToolButton active={tool === 'select'} onClick={() => setTool('select')} title="选择" icon="👆" />
      <Divider />
      <ToolButton active={false} onClick={onUndo} title="撤销" icon="↶" disabled={!canUndo} />
      <ToolButton active={false} onClick={onRedo} title="重做" icon="↷" disabled={!canRedo} />
      <Divider />
      <ToolButton active={false} onClick={onSaveSnapshot} title="保存版本" icon="💾" />
    </>
  );

  return (
    <>
      <div
        style={{
          background: '#2c2c54',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          position: 'relative',
          zIndex: 100,
          flexWrap: 'nowrap',
        }}
      >
        <div style={{
          color: '#f7f1e3', fontWeight: 'bold', fontSize: 17,
          marginRight: 12, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          协作白板
        </div>

        <div className="toolbar-desktop" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ToolButtons />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
          <div className="toolbar-colors" style={{ display: 'flex', gap: 3, flexWrap: 'wrap', maxWidth: 240 }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                title={c}
                className="color-btn"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: c,
                  border: color === c ? '2px solid #f7f1e3' : '2px solid transparent',
                  cursor: 'pointer',
                  padding: 0,
                  boxSizing: 'border-box',
                  transition: 'transform 0.15s, border-color 0.15s',
                }}
              />
            ))}
          </div>
          <Divider />
          <div className="toolbar-sizes" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {SIZES.map((s) => (
              <button
                key={s.value}
                onClick={() => setSize(s.value)}
                title={`粗细: ${s.label} (${s.value}px)`}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: size === s.value ? '#40407a' : 'transparent',
                  border: 'none',
                  color: '#f7f1e3',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  transition: 'background 0.15s',
                }}
              >
                <div style={{
                  width: Math.max(6, s.value * 1.5),
                  height: Math.max(6, s.value * 1.5),
                  borderRadius: '50%',
                  background: '#f7f1e3',
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
            borderRadius: 8,
            background: menuOpen ? '#40407a' : 'transparent',
            border: 'none',
            color: '#f7f1e3',
            cursor: 'pointer',
            fontSize: 22,
            marginLeft: 8,
            flexShrink: 0,
          }}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {menuOpen && (
        <div className="hamburger-menu" style={{
          position: 'fixed',
          top: 56,
          left: 0,
          right: 0,
          background: '#2c2c54',
          padding: '12px 16px',
          display: 'flex',
          gap: 4,
          flexWrap: 'wrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
          zIndex: 99,
          alignItems: 'center',
        }}>
          <ToolButtons />
          <Divider />
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); setMenuOpen(false); }}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: c,
                  border: color === c ? '2px solid #f7f1e3' : '2px solid transparent',
                  cursor: 'pointer', padding: 0, boxSizing: 'border-box',
                }}
              />
            ))}
          </div>
        </div>
      )}

      <style>{`
        .tool-btn:hover:not(:disabled) {
          background: #40407a !important;
          transform: scale(1.05);
        }
        .tool-btn:active:not(:disabled) {
          transform: scale(0.95) !important;
          background: #52529a !important;
        }
        .color-btn:hover {
          transform: scale(1.2);
        }
        .color-btn:active {
          transform: scale(0.95);
        }
        @media (max-width: 768px) {
          .toolbar-desktop { display: none !important; }
          .toolbar-colors { display: none !important; }
          .toolbar-sizes { display: none !important; }
          .hamburger-btn { display: block !important; }
        }
      `}</style>
    </>
  );
};

export default Toolbar;
