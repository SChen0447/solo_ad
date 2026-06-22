import React, { useState } from 'react';
import type { Tool } from './types';

const COLORS = [
  '#ff4757', '#ffa502', '#ffd32a', '#2ed573', '#1e90ff', '#3742fa',
  '#a55eea', '#ff6b81', '#00d2d3', '#54a0ff', '#5f27cd', '#48dbfb',
];

const SIZES = [2, 5, 10];

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

  const btnStyle = (active: boolean): React.CSSProperties => ({
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    background: active ? '#40407a' : 'transparent',
    color: '#f7f1e3',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    transition: 'all 0.15s',
    flexShrink: 0,
  });

  const Divider = () => <div style={{ width: 1, height: 28, background: '#40407a', margin: '0 8px' }} />;

  const ToolButtons = () => (
    <>
      <button
        style={btnStyle(tool === 'brush')}
        onClick={() => setTool('brush')}
        title="画笔"
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >✏️</button>
      <button
        style={btnStyle(tool === 'eraser')}
        onClick={() => setTool('eraser')}
        title="橡皮"
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >🧹</button>
      <button
        style={btnStyle(tool === 'sticky')}
        onClick={() => setTool('sticky')}
        title="便签"
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >📝</button>
      <button
        style={btnStyle(tool === 'line')}
        onClick={() => setTool('line')}
        title="连线"
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >🔗</button>
      <button
        style={btnStyle(tool === 'select')}
        onClick={() => setTool('select')}
        title="选择"
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >👆</button>
      <Divider />
      <button
        style={{ ...btnStyle(false), opacity: canUndo ? 1 : 0.4 }}
        onClick={onUndo}
        disabled={!canUndo}
        title="撤销"
      >↶</button>
      <button
        style={{ ...btnStyle(false), opacity: canRedo ? 1 : 0.4 }}
        onClick={onRedo}
        disabled={!canRedo}
        title="重做"
      >↷</button>
      <Divider />
      <button
        style={btnStyle(false)}
        onClick={onSaveSnapshot}
        title="保存版本"
      >💾</button>
    </>
  );

  return (
    <div style={{
      background: '#2c2c54',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 6,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      position: 'relative',
      zIndex: 100,
      flexWrap: 'nowrap',
    }}>
      <div style={{ color: '#f7f1e3', fontWeight: 'bold', fontSize: 18, marginRight: 16, whiteSpace: 'nowrap' }}>
        协作白板
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, '@media (maxWidth: 768px)': { display: 'none' } } as React.CSSProperties}
        className="toolbar-desktop">
        <ToolButtons />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 260 }}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              title={c}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: c,
                border: color === c ? '2px solid #f7f1e3' : '2px solid transparent',
                cursor: 'pointer',
                padding: 0,
                boxSizing: 'border-box',
              }}
            />
          ))}
        </div>
        <Divider />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: size === s ? '#40407a' : 'transparent',
                border: 'none',
                color: '#f7f1e3',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={`粗细 ${s}px`}
            >
              <div style={{ width: s * 1.5, height: s * 1.5, borderRadius: '50%', background: '#f7f1e3' }} />
            </button>
          ))}
        </div>
      </div>

      <button
        className="hamburger-btn"
        style={{
          display: 'none',
          width: 40,
          height: 40,
          borderRadius: 8,
          background: 'transparent',
          border: 'none',
          color: '#f7f1e3',
          cursor: 'pointer',
          fontSize: 22,
          marginLeft: 8,
        }}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰
      </button>

      {menuOpen && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: 0,
          right: 0,
          background: '#2c2c54',
          padding: 12,
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          <ToolButtons />
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .toolbar-desktop { display: none !important; }
          .hamburger-btn { display: block !important; }
        }
      `}</style>
    </div>
  );
};

export default Toolbar;
