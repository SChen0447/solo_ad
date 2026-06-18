import React from 'react';
import { ToolType } from './CanvasRenderer';

interface ToolPanelProps {
  currentTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  isMobile: boolean;
}

const btnBase: React.CSSProperties = {
  width: 40,
  height: 40,
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  color: '#ccc',
  fontSize: 18,
  position: 'relative',
  transition: 'background 0.2s ease-out, transform 0.1s ease',
};

const btnActive: React.CSSProperties = {
  background: 'rgba(255,255,255,0.12)',
  color: '#fff',
};

const btnDisabled: React.CSSProperties = {
  opacity: 0.4,
  pointerEvents: 'none' as const,
  cursor: 'default',
};

const activeBar: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 20,
  height: 3,
  background: '#4a90d9',
  borderRadius: '2px 2px 0 0',
  transition: 'all 0.2s ease-out',
};

function BrushIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.37 2.63a2.12 2.12 0 0 1 3 3L14 13l-4 1 1-4 7.37-7.37z"/>
      <path d="M9 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5"/>
    </svg>
  );
}

function SprayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1"/>
      <circle cx="8" cy="8" r="1"/>
      <circle cx="16" cy="8" r="1"/>
      <circle cx="8" cy="16" r="1"/>
      <circle cx="16" cy="16" r="1"/>
      <circle cx="12" cy="6" r="1"/>
      <circle cx="12" cy="18" r="1"/>
      <circle cx="6" cy="12" r="1"/>
      <circle cx="18" cy="12" r="1"/>
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20H7L3 16l9-9 8 8-4 4z"/>
      <path d="M6.5 13.5L15 5"/>
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/>
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  );
}

const ToolPanel: React.FC<ToolPanelProps> = ({
  currentTool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  isMobile,
}) => {
  const tools: { type: ToolType; icon: React.ReactNode; label: string }[] = [
    { type: 'brush', icon: <BrushIcon />, label: '笔刷' },
    { type: 'spray', icon: <SprayIcon />, label: '喷漆' },
    { type: 'eraser', icon: <EraserIcon />, label: '橡皮' },
  ];

  if (isMobile) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '0 12px',
        height: '100%',
        background: '#2a2a2a',
      }}>
        {tools.map((tool) => (
          <button
            key={tool.type}
            onClick={() => onToolChange(tool.type)}
            title={tool.label}
            style={{
              ...btnBase,
              ...(currentTool === tool.type ? btnActive : {}),
            }}
          >
            {tool.icon}
            {currentTool === tool.type && <span style={activeBar}/>}
          </button>
        ))}
        <div style={{ width: 1, height: 24, background: '#444', margin: '0 4px' }}/>
        <button
          onClick={onUndo}
          title="撤销"
          style={{ ...btnBase, ...(!canUndo ? btnDisabled : {}) }}
        >
          <UndoIcon/>
        </button>
        <button
          onClick={onRedo}
          title="重做"
          style={{ ...btnBase, ...(!canRedo ? btnDisabled : {}) }}
        >
          <RedoIcon/>
        </button>
        <div style={{ width: 1, height: 24, background: '#444', margin: '0 4px' }}/>
        <button
          onClick={onSave}
          title="保存"
          style={btnBase}
        >
          <SaveIcon/>
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      padding: '8px 0',
      width: 56,
      background: '#2a2a2a',
      height: '100%',
    }}>
      {tools.map((tool) => (
        <button
          key={tool.type}
          onClick={() => onToolChange(tool.type)}
          title={tool.label}
          style={{
            ...btnBase,
            ...(currentTool === tool.type ? btnActive : {}),
          }}
        >
          {tool.icon}
          {currentTool === tool.type && <span style={activeBar}/>}
        </button>
      ))}

      <div style={{ width: 32, height: 1, background: '#444', margin: '4px 0' }}/>

      <button
        onClick={onUndo}
        title="撤销"
        style={{ ...btnBase, ...(!canUndo ? btnDisabled : {}) }}
      >
        <UndoIcon/>
      </button>
      <button
        onClick={onRedo}
        title="重做"
        style={{ ...btnBase, ...(!canRedo ? btnDisabled : {}) }}
      >
        <RedoIcon/>
      </button>

      <div style={{ width: 32, height: 1, background: '#444', margin: '4px 0' }}/>

      <button
        onClick={onSave}
        title="保存"
        style={btnBase}
      >
        <SaveIcon/>
      </button>
    </div>
  );
};

export default ToolPanel;
