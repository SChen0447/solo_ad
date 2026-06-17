import React, { useState, useRef } from 'react';

interface ToolbarProps {
  onAddNode: () => void;
  onDeleteNode: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExportPNG: () => void;
  selectedNodeId: string | null;
}

interface ToolButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

const createRipple = (
  e: React.MouseEvent<HTMLButtonElement>,
  button: HTMLButtonElement
) => {
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;
  const ripple = document.createElement('span');
  ripple.style.position = 'absolute';
  ripple.style.borderRadius = '50%';
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.backgroundColor = 'rgba(224,231,255,0.4)';
  ripple.style.pointerEvents = 'none';
  ripple.style.animation = 'toolbar-ripple 0.6s ease-out forwards';
  ripple.style.transform = 'scale(0)';
  ripple.style.opacity = '1';
  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
};

const ToolButton: React.FC<{
  btn: ToolButton;
  onMouseDown?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}> = ({ btn, onMouseDown }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={btn.onClick}
      onMouseDown={onMouseDown}
      disabled={btn.disabled}
      title={btn.label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        border: 'none',
        backgroundColor: btn.danger
          ? 'rgba(239,68,68,0.15)'
          : 'rgba(224,231,255,0.08)',
        color: btn.disabled
          ? 'rgba(224,231,255,0.3)'
          : btn.danger
            ? '#f87171'
            : '#e0e7ff',
        cursor: btn.disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: hovered && !btn.disabled ? 'scale(1.08)' : 'scale(1)',
        boxShadow: hovered && !btn.disabled
          ? `0 4px 14px ${btn.danger ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)'}`
          : 'none',
        overflow: 'hidden',
      }}
    >
      {btn.icon}
      <span
        style={{
          position: 'absolute',
          bottom: '-24px',
          left: '50%',
          transform: hovered ? 'translateX(-50%)' : 'translateX(-50%) translateY(-4px)',
          opacity: hovered ? 1 : 0,
          transition: 'all 0.15s ease',
          fontSize: '11px',
          backgroundColor: 'rgba(26,26,46,0.95)',
          backdropFilter: 'blur(6px)',
          padding: '3px 8px',
          borderRadius: '6px',
          border: '1px solid rgba(224,231,255,0.1)',
          whiteSpace: 'nowrap',
          color: '#e0e7ff',
          pointerEvents: 'none',
          zIndex: 100,
        }}
      >
        {btn.label}
      </span>
    </button>
  );
};

const IconAdd = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconDelete = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const IconUndo = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
  </svg>
);

const IconRedo = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 15-6.7L21 13" />
  </svg>
);

const IconExport = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconMenu = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const IconClose = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconMindmap = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <circle cx="4" cy="6" r="2" />
    <circle cx="20" cy="6" r="2" />
    <circle cx="4" cy="18" r="2" />
    <circle cx="20" cy="18" r="2" />
    <line x1="9.5" y1="10.5" x2="5.5" y2="7.5" />
    <line x1="14.5" y1="10.5" x2="18.5" y2="7.5" />
    <line x1="9.5" y1="13.5" x2="5.5" y2="16.5" />
    <line x1="14.5" y1="13.5" x2="18.5" y2="16.5" />
  </svg>
);

const Toolbar: React.FC<ToolbarProps> = ({
  onAddNode,
  onDeleteNode,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExportPNG,
  selectedNodeId,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e, e.currentTarget);
  };

  const buttons: ToolButton[] = [
    { id: 'add', label: '添加节点 (Ctrl+N)', icon: IconAdd, onClick: onAddNode },
    {
      id: 'delete',
      label: '删除节点 (Del)',
      icon: IconDelete,
      onClick: onDeleteNode,
      disabled: !selectedNodeId,
      danger: true,
    },
    { id: 'undo', label: '撤销 (Ctrl+Z)', icon: IconUndo, onClick: onUndo, disabled: !canUndo },
    { id: 'redo', label: '重做 (Ctrl+Y)', icon: IconRedo, onClick: onRedo, disabled: !canRedo },
    { id: 'export', label: '导出 PNG', icon: IconExport, onClick: onExportPNG },
  ];

  return (
    <>
      <div
        ref={toolbarRef}
        style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(26,26,46,0.65)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(224,231,255,0.12)',
            borderRadius: '16px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingRight: '12px',
              borderRight: '1px solid rgba(224,231,255,0.1)',
              color: '#e0e7ff',
            }}
          >
            <div style={{ color: '#818cf8' }}>{IconMindmap}</div>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
              }}
              className="toolbar-title"
            >
              协作思维导图
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }} className="toolbar-buttons">
            {buttons.map(btn => (
              <ToolButton
                key={btn.id}
                btn={btn}
                onMouseDown={(e) => handleClick(e as unknown as React.MouseEvent<HTMLButtonElement>)}
              />
            ))}
          </div>

          <button
            className="toolbar-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            title="菜单"
            style={{
              display: 'none',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: 'rgba(224,231,255,0.08)',
              color: '#e0e7ff',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            {menuOpen ? IconClose : IconMenu}
          </button>
        </div>
      </div>

      <div
        className="mobile-menu"
        style={{
          position: 'absolute',
          top: '80px',
          left: '50%',
          transform: menuOpen ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-10px)',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
          transition: 'all 0.2s ease',
          zIndex: 999,
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(26,26,46,0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(224,231,255,0.12)',
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            maxWidth: '280px',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          {buttons.map(btn => (
            <button
              key={btn.id}
              onClick={(e) => {
                btn.onClick();
                setMenuOpen(false);
                createRipple(e, e.currentTarget);
              }}
              disabled={btn.disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: btn.danger
                  ? 'rgba(239,68,68,0.15)'
                  : 'rgba(224,231,255,0.08)',
                color: btn.disabled
                  ? 'rgba(224,231,255,0.3)'
                  : btn.danger
                    ? '#f87171'
                    : '#e0e7ff',
                cursor: btn.disabled ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.15s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {btn.icon}
              <span>{btn.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes toolbar-ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }

        @media (max-width: 768px) {
          .toolbar-buttons {
            display: none !important;
          }
          .toolbar-hamburger {
            display: flex !important;
          }
          .toolbar-title {
            font-size: 13px !important;
          }
        }

        @media (max-width: 480px) {
          .toolbar-title {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default Toolbar;
