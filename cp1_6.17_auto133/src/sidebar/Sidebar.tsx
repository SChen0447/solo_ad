import React, { useState } from 'react';
import type { CustomLine, Star } from '../utils/types';

interface SidebarProps {
  customLines: CustomLine[];
  stars: Star[];
  onUpdateLine: (id: string, newName: string) => void;
  onDeleteLine: (id: string) => void;
  onEnterLineMode: () => void;
  lineEditingMode: boolean;
  onExitLineMode: () => void;
  exportButton: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({
  customLines,
  stars,
  onUpdateLine,
  onDeleteLine,
  onEnterLineMode,
  lineEditingMode,
  onExitLineMode,
  exportButton,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const getStarName = (id: string) => stars.find(s => s.id === id)?.name || id;

  const startEdit = (line: CustomLine) => {
    setEditingId(line.id);
    setEditValue(line.name);
  };

  const submitEdit = () => {
    if (editingId) {
      const v = editValue.trim();
      if (v) onUpdateLine(editingId, v);
      setEditingId(null);
    }
  };

  return (
    <aside style={{
      width: 280,
      flexShrink: 0,
      height: '100%',
      background: 'linear-gradient(180deg, #0b0e2a 0%, #1a2040 100%)',
      borderLeft: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      color: '#fff',
      fontFamily: '"Noto Serif SC", "Cinzel", serif',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '20px 18px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '0 0 18px 18px',
        background: 'linear-gradient(180deg, rgba(26,32,64,0.9), rgba(11,14,42,0.7))',
      }}>
        <div style={{
          fontFamily: '"Cinzel", serif',
          fontSize: 10,
          letterSpacing: 4,
          opacity: 0.45,
          marginBottom: 4,
        }}>
          CONSTELLATIONS
        </div>
        <div style={{
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: 2,
          marginBottom: 14,
        }}>
          自定义连线
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={lineEditingMode ? onExitLineMode : onEnterLineMode}
            style={{
              flex: 1,
              padding: '9px 0',
              background: lineEditingMode
                ? 'linear-gradient(135deg, rgba(255,200,80,0.3), rgba(255,150,60,0.25))'
                : 'linear-gradient(135deg, rgba(255,158,196,0.22), rgba(255,179,107,0.22))',
              border: `1px solid ${lineEditingMode ? 'rgba(255,220,120,0.55)' : 'rgba(255,180,200,0.35)'}`,
              borderRadius: 8,
              color: lineEditingMode ? '#ffdd88' : '#ffd2df',
              fontFamily: '"Noto Serif SC", serif',
              fontSize: 12.5,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {lineEditingMode ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                取消模式
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                新建连线
              </>
            )}
          </button>
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 12px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {customLines.length === 0 ? (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.35)',
            fontSize: 12.5,
            lineHeight: 1.8,
            border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: 10,
            marginTop: 8,
          }}>
            <div style={{ fontFamily: '"Cinzel", serif', fontSize: 11, letterSpacing: 2, opacity: 0.6, marginBottom: 6 }}>NO LINES YET</div>
            点击上方按钮新建连线，<br/>连接任意两颗恒星创建<br/>属于你的星空故事 ✦
          </div>
        ) : (
          customLines.map((line, idx) => (
            <div
              key={line.id}
              style={{
                padding: '12px 12px 11px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                transition: 'all 0.2s',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.065)';
                e.currentTarget.style.borderColor = 'rgba(180,200,255,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: 12,
                fontSize: 10,
                fontFamily: '"Cinzel", serif',
                letterSpacing: 1.5,
                opacity: 0.35,
                transform: 'translateY(-50%)',
                background: 'rgba(26,32,64,0.95)',
                padding: '0 6px',
              }}>
                #{String(idx + 1).padStart(2, '0')}
              </div>

              {editingId === line.id ? (
                <form onSubmit={(e) => { e.preventDefault(); submitEdit(); }} style={{ marginTop: 2 }}>
                  <input
                    autoFocus
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={submitEdit}
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,220,120,0.5)',
                      borderRadius: 5,
                      color: '#ffdd88',
                      fontFamily: '"Noto Serif SC", serif',
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </form>
              ) : (
                <div style={{
                  fontFamily: '"Noto Serif SC", "Cinzel", serif',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  marginBottom: 7,
                  marginTop: 2,
                  letterSpacing: 1,
                }}>
                  {line.name}
                </div>
              )}

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11.5,
                color: 'rgba(255,255,255,0.55)',
                fontFamily: '"Noto Serif SC", serif',
                marginBottom: 10,
              }}>
                <span style={{
                  padding: '2px 7px',
                  background: 'rgba(180,200,255,0.1)',
                  borderRadius: 4,
                  border: '1px solid rgba(180,200,255,0.15)',
                  color: '#c8d8ff',
                }}>{getStarName(line.fromStarId)}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                <span style={{
                  padding: '2px 7px',
                  background: 'rgba(180,200,255,0.1)',
                  borderRadius: 4,
                  border: '1px solid rgba(180,200,255,0.15)',
                  color: '#c8d8ff',
                }}>{getStarName(line.toStarId)}</span>
              </div>

              <div style={{
                display: 'flex',
                gap: 6,
                paddingTop: 8,
                borderTop: '1px solid rgba(255,255,255,0.05)',
              }}>
                <button
                  onClick={() => startEdit(line)}
                  title="编辑"
                  style={{
                    flex: 1,
                    padding: '5px 0',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    color: 'rgba(255,255,255,0.75)',
                    cursor: 'pointer',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(107,179,255,0.18)'; e.currentTarget.style.borderColor = 'rgba(107,179,255,0.45)'; e.currentTarget.style.color = '#b8d8ff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  编辑
                </button>
                <button
                  onClick={() => onDeleteLine(line.id)}
                  title="删除"
                  style={{
                    flex: 1,
                    padding: '5px 0',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    color: 'rgba(255,255,255,0.75)',
                    cursor: 'pointer',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,100,100,0.18)'; e.currentTarget.style.borderColor = 'rgba(255,120,120,0.45)'; e.currentTarget.style.color = '#ffb0b0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{
        padding: '14px 14px 18px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(0deg, rgba(11,14,42,0.95), rgba(26,32,64,0.5))',
      }}>
        {exportButton}
      </div>
    </aside>
  );
};
