import React from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { ToolType } from '../types';

const tools: { type: ToolType; label: string; icon: JSX.Element }[] = [
  {
    type: 'select',
    label: '选择',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
      </svg>
    ),
  },
  {
    type: 'pen',
    label: '画笔',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
  },
  {
    type: 'rectangle',
    label: '矩形',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
      </svg>
    ),
  },
  {
    type: 'circle',
    label: '圆形',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    type: 'text',
    label: '文本',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    ),
  },
  {
    type: 'sticky',
    label: '便签',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z" />
        <polyline points="14 3 14 10 21 10" />
      </svg>
    ),
  },
  {
    type: 'icon',
    label: '图标库',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <circle cx="17.5" cy="17.5" r="3.5" />
      </svg>
    ),
  },
];

const Toolbar: React.FC = () => {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setTool = useCanvasStore((s) => s.setTool);

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 48,
        bottom: 0,
        width: 60,
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8,
        boxShadow: 'var(--shadow-soft)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: 8,
        zIndex: 20,
      }}
    >
      {tools.map((tool) => {
        const isActive = activeTool === tool.type;
        return (
          <button
            key={tool.type}
            title={tool.label}
            onClick={() => setTool(tool.type)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isActive ? 'var(--primary)' : '#6b7280',
              border: 'none',
              position: 'relative',
              transition: 'all 0.15s ease',
              transform: isActive ? 'scale(1.05)' : 'scale(1)',
              background: isActive ? 'var(--primary-soft)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'var(--primary-soft)';
                (e.currentTarget as HTMLButtonElement).style.transform =
                  'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'transparent';
                (e.currentTarget as HTMLButtonElement).style.transform =
                  'scale(1)';
              }
            }}
          >
            {tool.icon}
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  bottom: -4,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 20,
                  height: 2,
                  borderRadius: 2,
                  background: 'var(--primary)',
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Toolbar;
