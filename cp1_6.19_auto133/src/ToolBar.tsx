import React, { useState } from 'react';
import { COLOR_PALETTE, StickyNoteColor } from './types';
import { socketClient } from './socketClient';
import { v4 as uuidv4 } from 'uuid';

interface ToolBarProps {
  currentColor: string;
  setCurrentColor: (color: string) => void;
  currentWidth: number;
  setCurrentWidth: (width: number) => void;
  onAddStickyNote: (x: number, y: number, color: StickyNoteColor) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onRestoreVersion: (version: number) => void;
  versions: { version: number; timestamp: number }[];
  userName: string;
  userColor: string;
}

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

type Tool = 'pen' | 'note';

export const ToolBar: React.FC<ToolBarProps> = ({
  currentColor,
  setCurrentColor,
  currentWidth,
  setCurrentWidth,
  onAddStickyNote,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onRestoreVersion,
  versions,
  userName,
  userColor
}) => {
  const [activeTool, setActiveTool] = useState<Tool>('pen');
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [isDraggingNote, setIsDraggingNote] = useState(false);
  const [noteColor, setNoteColor] = useState<StickyNoteColor>('yellow');

  const stickyColorMap: Record<StickyNoteColor, string> = {
    yellow: '#FFF8DC',
    pink: '#FFD1DC',
    blue: '#D6EAF8',
    green: '#D5F5E3'
  };

  const stickyBorderMap: Record<StickyNoteColor, string> = {
    yellow: '#F4D03F',
    pink: '#F5B7B1',
    blue: '#85C1E9',
    green: '#82E0AA'
  };

  const handleStickyDragStart = (e: React.DragEvent, color: StickyNoteColor) => {
    setIsDraggingNote(true);
    setNoteColor(color);
    e.dataTransfer.setData('text/plain', color);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleStickyDragEnd = () => {
    setIsDraggingNote(false);
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          width: 260,
          backgroundColor: 'rgba(255, 255, 255, 0.55)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 16,
          padding: 18,
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          border: '1px solid rgba(255,255,255,0.8)',
          zIndex: 1000,
          transition: `all 300ms ${EASE}`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: userColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              boxShadow: `0 2px 8px ${userColor}55`
            }}
          >
            {userName.slice(0, 1)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#95a5a6', marginBottom: 2 }}>当前用户</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2c3e50' }}>{userName}</div>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#7f8c8d', marginBottom: 10, letterSpacing: 0.5 }}>
            工具
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setActiveTool('pen')}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 10,
                border: activeTool === 'pen' ? '2px solid #3498DB' : '1px solid rgba(0,0,0,0.08)',
                backgroundColor: activeTool === 'pen' ? 'rgba(52,152,219,0.12)' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                transition: `all 250ms ${EASE}`
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={activeTool === 'pen' ? '#3498DB' : currentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <path d="M2 2l7.586 7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
              <span style={{ fontSize: 11, color: activeTool === 'pen' ? '#3498DB' : '#7f8c8d', fontWeight: 500 }}>画笔</span>
            </button>
            <button
              onClick={() => setActiveTool('note')}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 10,
                border: activeTool === 'note' ? '2px solid #3498DB' : '1px solid rgba(0,0,0,0.08)',
                backgroundColor: activeTool === 'note' ? 'rgba(52,152,219,0.12)' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                transition: `all 250ms ${EASE}`
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTool === 'note' ? '#3498DB' : '#F4D03F'} opacity="0.9">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                <path d="M5 3l4 4h10v-2c0-1.1-.9-2-2-2H5z" fill={activeTool === 'note' ? '#2980B9' : '#F39C12'} opacity="0.6" />
              </svg>
              <span style={{ fontSize: 11, color: activeTool === 'note' ? '#3498DB' : '#7f8c8d', fontWeight: 500 }}>便签</span>
            </button>
          </div>
        </div>

        {activeTool === 'pen' && (
          <>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#7f8c8d', marginBottom: 10, letterSpacing: 0.5 }}>
                颜色
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: 8,
                  position: 'relative'
                }}
              >
                {COLOR_PALETTE.map((color) => (
                  <div
                    key={color}
                    onMouseEnter={() => setHoveredColor(color)}
                    onMouseLeave={() => setHoveredColor(null)}
                    onClick={() => setCurrentColor(color)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: color,
                      border: currentColor === color
                        ? '3px solid #3498DB'
                        : (color === '#ffffff' ? '2px solid #e0e0e0' : '2px solid transparent'),
                      cursor: 'pointer',
                      transform: hoveredColor === color ? 'scale(1.3)' : (currentColor === color ? 'scale(1.15)' : 'scale(1)'),
                      transition: `all 200ms ${EASE}`,
                      boxShadow: currentColor === color
                        ? `0 4px 12px ${color}66, 0 0 0 2px rgba(52,152,219,0.2)`
                        : (hoveredColor === color
                          ? `0 6px 16px ${color}55`
                          : (color === '#ffffff' ? 'inset 0 0 0 1px #e0e0e0' : 'none')),
                      zIndex: hoveredColor === color ? 10 : (currentColor === color ? 5 : 1),
                      position: 'relative'
                    }}
                  >
                    {hoveredColor === color && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: -28,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: 'rgba(44,62,80,0.9)',
                          color: '#fff',
                          fontSize: 10,
                          padding: '4px 8px',
                          borderRadius: 6,
                          whiteSpace: 'nowrap',
                          pointerEvents: 'none',
                          zIndex: 100,
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)'
                        }}
                      >
                        {color}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#7f8c8d', letterSpacing: 0.5 }}>
                  粗细
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#3498DB',
                    backgroundColor: 'rgba(52,152,219,0.1)',
                    padding: '2px 8px',
                    borderRadius: 6
                  }}
                >
                  {currentWidth}px
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={currentWidth}
                  onChange={(e) => setCurrentWidth(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    outline: 'none',
                    background: `linear-gradient(to right, ${currentColor} 0%, ${currentColor} ${((currentWidth - 1) / 19) * 100}%, #e0e0e0 ${((currentWidth - 1) / 19) * 100}%, #e0e0e0 100%)`,
                    cursor: 'pointer'
                  }}
                />
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(0,0,0,0.06)'
                  }}
                >
                  <div
                    style={{
                      width: currentWidth,
                      height: currentWidth,
                      borderRadius: '50%',
                      backgroundColor: currentColor,
                      transition: `all 150ms ${EASE}`
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {activeTool === 'note' && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#7f8c8d', marginBottom: 10, letterSpacing: 0.5 }}>
              拖拽便签到画布
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {(['yellow', 'pink', 'blue', 'green'] as StickyNoteColor[]).map((c) => (
                <div
                  key={c}
                  draggable
                  onDragStart={(e) => handleStickyDragStart(e, c)}
                  onDragEnd={handleStickyDragEnd}
                  onClick={() => {
                    const canvas = document.querySelector('.canvas-container');
                    if (canvas) {
                      const rect = canvas.getBoundingClientRect();
                      onAddStickyNote(rect.width / 2 - 100, rect.height / 2 - 80, c);
                    }
                  }}
                  style={{
                    backgroundColor: stickyColorMap[c],
                    border: `1px solid ${stickyBorderMap[c]}`,
                    borderRadius: 10,
                    padding: '12px 10px',
                    minHeight: 60,
                    cursor: isDraggingNote && noteColor === c ? 'grabbing' : 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    color: '#7f8c8d',
                    fontWeight: 500,
                    transition: `all 200ms ${EASE}`,
                    transform: 'scale(1)',
                    userSelect: 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}
                  onMouseEnter={(e) => { if (!isDraggingNote) (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px) scale(1.02)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
                >
                  {c === 'yellow' ? '🟡 黄色' : c === 'pink' ? '🌸 粉色' : c === 'blue' ? '💙 蓝色' : '💚 绿色'}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 10, color: '#bdc3c7', textAlign: 'center' }}>
              点击创建或拖拽放置
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#7f8c8d', marginBottom: 10, letterSpacing: 0.5 }}>
            撤销 / 重做
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onUndo}
              disabled={!canUndo}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.06)',
                backgroundColor: canUndo ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.03)',
                cursor: canUndo ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                opacity: canUndo ? 1 : 0.4,
                transition: `all 200ms ${EASE}`
              }}
              onMouseEnter={(e) => { if (canUndo) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(52,152,219,0.08)'; }}
              onMouseLeave={(e) => { if (canUndo) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.8)'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7f8c8d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 3L3 13" />
              </svg>
              <span style={{ fontSize: 11, color: '#7f8c8d', fontWeight: 500 }}>撤销</span>
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.06)',
                backgroundColor: canRedo ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.03)',
                cursor: canRedo ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                opacity: canRedo ? 1 : 0.4,
                transition: `all 200ms ${EASE}`
              }}
              onMouseEnter={(e) => { if (canRedo) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(52,152,219,0.08)'; }}
              onMouseLeave={(e) => { if (canRedo) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.8)'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7f8c8d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 7v6h-6" />
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3L21 13" />
              </svg>
              <span style={{ fontSize: 11, color: '#7f8c8d', fontWeight: 500 }}>重做</span>
            </button>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowVersions(!showVersions)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.06)',
              backgroundColor: 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: `all 200ms ${EASE}`
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(52,152,219,0.08)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.8)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7f8c8d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ fontSize: 11, color: '#7f8c8d', fontWeight: 500 }}>历史版本</span>
            <span style={{ fontSize: 10, color: '#95a5a6', marginLeft: 4 }}>({versions.length})</span>
          </button>
          {showVersions && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                width: 240,
                maxHeight: 280,
                overflowY: 'auto',
                backgroundColor: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: 12,
                padding: 8,
                boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                border: '1px solid rgba(255,255,255,0.8)',
                zIndex: 1001
              }}
            >
              {versions.slice().reverse().map((v) => (
                <button
                  key={v.version}
                  onClick={() => {
                    onRestoreVersion(v.version);
                    setShowVersions(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: `all 150ms ${EASE}`
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(52,152,219,0.08)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2c3e50' }}>
                    版本 {v.version}
                  </span>
                  <span style={{ fontSize: 10, color: '#95a5a6' }}>
                    {new Date(v.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </button>
              ))}
              {versions.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#bdc3c7' }}>
                  暂无历史版本
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
