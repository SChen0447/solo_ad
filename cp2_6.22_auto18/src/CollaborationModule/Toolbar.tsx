import React, { useEffect } from 'react';
import type { ToolType } from '../types';

interface ToolbarProps {
  currentTool: ToolType;
  setCurrentTool: (tool: ToolType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleHistory: () => void;
  showHistory: boolean;
}

const buttonStyle = (isActive: boolean) => ({
  padding: '8px 16px',
  border: 'none',
  borderRadius: '6px',
  backgroundColor: isActive ? '#6366F1' : 'transparent',
  color: isActive ? '#FFFFFF' : '#475569',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  boxShadow: isActive ? '0 0 0 2px rgba(99, 102, 241, 0.3)' : 'none',
});

const ToolButton: React.FC<{
  tool: ToolType; currentTool: ToolType; setCurrentTool: (tool: ToolType) => void; icon: string; label: string;
}> = ({ tool, currentTool, setCurrentTool, icon, label }) => (
  <button
    style={buttonStyle(currentTool === tool)}
    onClick={() => setCurrentTool(tool)}
    onMouseEnter={(e) => {
      if (currentTool !== tool) {
        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.25)';
      }
    }}
    onMouseLeave={(e) => {
      if (currentTool !== tool) {
        e.currentTarget.style.boxShadow = 'none';
      }
    }}
  >
    <span style={{ fontSize: '16px' }}>{icon}</span>
    <span>{label}</span>
  </button>
);

const ActionButton: React.FC<{
  onClick: () => void; disabled: boolean; icon: string; label: string; title?: string;
}> = ({ onClick, disabled, icon, label, title }) => (
  <button
    style={{
      ...buttonStyle(false),
      opacity: disabled ? 0.4 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}
    onClick={onClick}
    disabled={disabled}
    title={title}
    onMouseEnter={(e) => {
      if (!disabled) {
        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.25)';
      }
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <span style={{ fontSize: '16px' }}>{icon}</span>
    <span>{label}</span>
  </button>
);

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  setCurrentTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onToggleHistory,
  showHistory,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
      } else if (e.ctrlKey && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        onRedo();
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        onRedo();
      } else if (e.key === 'Escape') {
        setCurrentTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, setCurrentTool]);

  return (
    <div
      style={{
        height: '56px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#1E293B',
            marginRight: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '24px' }}>📋</span>
          在线协作白板
        </div>
        <div style={{ width: '1px', height: '28px', backgroundColor: '#E2E8F0', margin: '0 8px' }} />
        <ToolButton tool="select" currentTool={currentTool} setCurrentTool={setCurrentTool} icon="🖱" label="选择" />
        <ToolButton tool="sticky" currentTool={currentTool} setCurrentTool={setCurrentTool} icon="🟨" label="便签" />
        <ToolButton tool="rectangle" currentTool={currentTool} setCurrentTool={setCurrentTool} icon="⬜" label="矩形" />
        <ToolButton tool="path" currentTool={currentTool} setCurrentTool={setCurrentTool} icon="✏️" label="手绘" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <ActionButton onClick={onUndo} disabled={!canUndo} icon="↩" label="撤销" title="撤销 (Ctrl+Z)" />
        <ActionButton onClick={onRedo} disabled={!canRedo} icon="↪" label="重做" title="重做 (Ctrl+Shift+Z)" />
        <div style={{ width: '1px', height: '28px', backgroundColor: '#E2E8F0', margin: '0 8px' }} />
        <button
          style={{
            ...buttonStyle(showHistory),
            backgroundColor: showHistory ? '#6366F1' : '#3B82F6',
            color: '#FFFFFF',
          }}
          onClick={onToggleHistory}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = showHistory ? '0 0 0 2px rgba(99, 102, 241, 0.3)' : 'none';
          }}
        >
          <span style={{ fontSize: '16px' }}>📜</span>
          <span>历史</span>
        </button>
      </div>
    </div>
  );
};
