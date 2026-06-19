import React, { useState } from 'react';
import type { StickyNoteColor } from '../shared/types';

interface ToolbarProps {
  currentColor: string;
  currentWidth: number;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  onAddNote: (color: StickyNoteColor) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onlineCount: number;
  isConnected: boolean;
}

const COLORS = [
  { name: '红', value: '#F44336' },
  { name: '蓝', value: '#2196F3' },
  { name: '绿', value: '#4CAF50' },
  { name: '黑', value: '#212121' },
  { name: '紫', value: '#9C27B0' }
];

const WIDTHS = [1, 3, 5, 8];

const NOTE_COLORS: { name: string; value: StickyNoteColor; bg: string }[] = [
  { name: '黄色', value: 'yellow', bg: '#FFF9C4' },
  { name: '粉色', value: 'pink', bg: '#FCE4EC' },
  { name: '蓝色', value: 'blue', bg: '#E3F2FD' }
];

const iconBtnStyle = (isActive: boolean): React.CSSProperties => ({
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  border: 'none',
  backgroundColor: isActive ? '#2196F3' : 'transparent',
  color: isActive ? 'white' : '#666',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  fontSize: '20px',
  userSelect: 'none'
});

const Toolbar: React.FC<ToolbarProps> = ({
  currentColor,
  currentWidth,
  onColorChange,
  onWidthChange,
  onAddNote,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  onlineCount,
  isConnected
}) => {
  const [showNoteDropdown, setShowNoteDropdown] = useState(false);
  const [selectedNoteColor, setSelectedNoteColor] = useState<StickyNoteColor>('yellow');

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '44px',
          backgroundColor: 'white',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="material-icons" style={{ color: '#2196F3', fontSize: '24px' }}>
            draw
          </span>
          <span style={{ fontWeight: 600, fontSize: '16px', color: '#333' }}>协作白板</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-icons" style={{ fontSize: '18px', color: '#666' }}>
              people
            </span>
            <span style={{ fontSize: '14px', color: '#555' }}>在线：{onlineCount}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#4CAF50' : '#F44336',
                animation: isConnected ? 'none' : 'blink 1s infinite'
              }}
            />
            <span style={{ fontSize: '14px', color: isConnected ? '#4CAF50' : '#F44336' }}>
              {isConnected ? '已连接' : '断线'}
            </span>
          </div>
        </div>
      </div>

      <div
        className="toolbar"
        style={{
          position: 'fixed',
          left: 0,
          top: '44px',
          bottom: 0,
          width: '60px',
          backgroundColor: 'white',
          borderRight: '1px solid #e0e0e0',
          boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 0',
          gap: '12px',
          zIndex: 90,
          overflowY: 'auto'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            paddingBottom: '12px',
            borderBottom: '1px solid #eee',
            width: '100%'
          }}
        >
          {COLORS.map((c) => (
            <button
              key={c.value}
              title={c.name}
              onClick={() => onColorChange(c.value)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: c.value,
                border: currentColor === c.value ? '3px solid #2196F3' : '2px solid #ddd',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: currentColor === c.value ? '0 2px 6px rgba(33,150,243,0.4)' : 'none',
                transform: currentColor === c.value ? 'scale(1.1)' : 'scale(1)',
                padding: 0
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.transform =
                  currentColor === c.value ? 'scale(1.1)' : 'scale(1)';
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            paddingBottom: '12px',
            borderBottom: '1px solid #eee',
            width: '100%'
          }}
        >
          {WIDTHS.map((w) => (
            <button
              key={w}
              title={`${w}px`}
              onClick={() => onWidthChange(w)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: currentWidth === w ? '#E3F2FD' : 'transparent',
                border: currentWidth === w ? '1px solid #2196F3' : '1px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                padding: 0
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = '#F5F5F5';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor =
                  currentWidth === w ? '#E3F2FD' : 'transparent';
              }}
            >
              <div
                style={{
                  width: `${w + 4}px`,
                  height: `${w + 4}px`,
                  borderRadius: '50%',
                  backgroundColor: '#333'
                }}
              />
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            title="添加便签"
            style={iconBtnStyle(false)}
            onClick={() => setShowNoteDropdown(!showNoteDropdown)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F5F5F5';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
            }}
          >
            <span className="material-icons">sticky_note_2</span>
          </button>

          {showNoteDropdown && (
            <div
              style={{
                position: 'absolute',
                left: '60px',
                top: 0,
                backgroundColor: 'white',
                borderRadius: '10px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                minWidth: '120px',
                zIndex: 200
              }}
            >
              <div style={{ fontSize: '12px', color: '#666', paddingBottom: '4px' }}>
                选择便签颜色
              </div>
              {NOTE_COLORS.map((nc) => (
                <button
                  key={nc.value}
                  onClick={() => {
                    setSelectedNoteColor(nc.value);
                    onAddNote(nc.value);
                    setShowNoteDropdown(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor:
                      selectedNoteColor === nc.value ? '#E3F2FD' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontSize: '13px',
                    color: '#333'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F5F5F5';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      selectedNoteColor === nc.value ? '#E3F2FD' : 'transparent';
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      backgroundColor: nc.bg,
                      border: '1px solid #ddd'
                    }}
                  />
                  {nc.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          title="撤销"
          disabled={!canUndo}
          style={{
            ...iconBtnStyle(false),
            opacity: canUndo ? 1 : 0.3,
            cursor: canUndo ? 'pointer' : 'not-allowed'
          }}
          onClick={onUndo}
          onMouseEnter={(e) => {
            if (canUndo) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F5F5F5';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
          onMouseDown={(e) => {
            if (canUndo) {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
            }
          }}
          onMouseUp={(e) => {
            if (canUndo) {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
            }
          }}
        >
          <span className="material-icons">undo</span>
        </button>

        <button
          title="重做"
          disabled={!canRedo}
          style={{
            ...iconBtnStyle(false),
            opacity: canRedo ? 1 : 0.3,
            cursor: canRedo ? 'pointer' : 'not-allowed'
          }}
          onClick={onRedo}
          onMouseEnter={(e) => {
            if (canRedo) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F5F5F5';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
          onMouseDown={(e) => {
            if (canRedo) {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
            }
          }}
          onMouseUp={(e) => {
            if (canRedo) {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
            }
          }}
        >
          <span className="material-icons">redo</span>
        </button>

        <div
          style={{
            width: '40px',
            height: '1px',
            backgroundColor: '#eee',
            margin: '4px 0'
          }}
        />

        <button
          title="清空画布"
          style={{
            ...iconBtnStyle(false),
            color: '#F44336'
          }}
          onClick={onClear}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFEBEE';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
          }}
        >
          <span className="material-icons">delete_sweep</span>
        </button>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @media (max-width: 768px) {
          .toolbar {
            top: auto !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            height: 64px !important;
            flex-direction: row !important;
            justify-content: center !important;
            padding: 0 8px !important;
            border-right: none !important;
            border-top: 1px solid #e0e0e0 !important;
            box-shadow: 0 -2px 8px rgba(0,0,0,0.06) !important;
            gap: 4px !important;
          }
          .toolbar > div {
            flex-direction: row !important;
            border-bottom: none !important;
            border-right: 1px solid #eee !important;
            padding: 0 12px !important;
            padding-bottom: 0 !important;
            width: auto !important;
            height: 100% !important;
            gap: 6px !important;
          }
          .toolbar > div:last-of-type {
            border-right: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default Toolbar;
