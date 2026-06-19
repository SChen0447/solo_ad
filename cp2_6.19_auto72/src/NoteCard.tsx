import { useState, useRef, useEffect, useCallback } from 'react';
import type { NoteCard as NoteCardType } from './types';

interface NoteCardProps {
  card: NoteCardType;
  selected: boolean;
  isNew: boolean;
  onSelect: (e: React.MouseEvent, id: string) => void;
  onDragStart: (e: React.MouseEvent, id: string) => void;
  onContentChange: (id: string, title: string, content: string) => void;
  onColorCycle: (id: string) => void;
  onConnectionStart: (e: React.MouseEvent, id: string) => void;
  onSizeChange: (id: string, width: number, height: number) => void;
  zoom: number;
}

const NoteCard = ({
  card,
  selected,
  isNew,
  onSelect,
  onDragStart,
  onContentChange,
  onColorCycle,
  onConnectionStart,
  onSizeChange,
  zoom,
}: NoteCardProps) => {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editContent, setEditContent] = useState(card.content);
  const cardRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (measureRef.current) {
      const w = measureRef.current.offsetWidth;
      const h = measureRef.current.offsetHeight;
      if (Math.abs(w - card.width) > 2 || Math.abs(h - card.height) > 2) {
        onSizeChange(card.id, w, h);
      }
    }
  }, [card.title, card.content, card.id, card.width, card.height, onSizeChange]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(card.title);
    setEditContent(card.content);
    setEditing(true);
  }, [card.title, card.content]);

  const handleEditBlur = useCallback(() => {
    if (editing) {
      setEditing(false);
      onContentChange(card.id, editTitle || '无标题笔记', editContent);
    }
  }, [editing, editTitle, editContent, card.id, onContentChange]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditing(false);
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (editing) return;
    if (e.button === 0) {
      onSelect(e, card.id);
      onDragStart(e, card.id);
    }
  }, [editing, onSelect, onDragStart, card.id]);

  const handleColorClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onColorCycle(card.id);
  }, [card.id, onColorCycle]);

  const handleConnectorMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onConnectionStart(e, card.id);
  }, [card.id, onConnectionStart]);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: card.position.x,
    top: card.position.y,
    width: card.width,
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
    padding: '14px 14px 10px 14px',
    cursor: editing ? 'text' : 'grab',
    userSelect: editing ? 'text' : 'none',
    transformOrigin: 'center center',
    animation: isNew ? 'floaty 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
    transition: 'box-shadow 0.3s ease, border 0.3s ease',
  };

  if (selected) {
    baseStyle.border = '2px solid #4A90D9';
    baseStyle.animation = 'breathe 2s ease-in-out infinite';
  }

  return (
    <>
      <div
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          width: card.width,
          padding: '14px 14px 10px 14px',
          pointerEvents: 'none',
          left: -99999,
          top: 0,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: '#2C3E50', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
          {editing ? editTitle : card.title}
        </div>
        <div style={{ fontSize: 13, color: '#5a6573', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap', minHeight: 20 }}>
          {editing ? editContent : card.content}
        </div>
        <div style={{ height: 28, marginTop: 10 }} />
      </div>

      <div
        ref={cardRef}
        data-card-id={card.id}
        style={baseStyle}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        <div
          onClick={handleColorClick}
          title="点击切换主题色"
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            width: 14,
            height: 14,
            borderRadius: '50%',
            backgroundColor: card.color,
            cursor: 'pointer',
            transition: 'background-color 0.3s ease, transform 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            zIndex: 2,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          }}
        />

        <div style={{ paddingLeft: 22 }}>
          {editing ? (
            <>
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleEditBlur}
                onKeyDown={handleEditKeyDown}
                style={{
                  width: '100%',
                  fontSize: 15,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: '#2C3E50',
                  background: 'rgba(74, 144, 217, 0.08)',
                  border: '1px solid #4A90D9',
                  borderRadius: 6,
                  padding: '4px 8px',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onBlur={handleEditBlur}
                onKeyDown={handleEditKeyDown}
                style={{
                  width: '100%',
                  fontSize: 13,
                  color: '#5a6573',
                  lineHeight: 1.5,
                  minHeight: 60,
                  background: 'rgba(74, 144, 217, 0.04)',
                  border: '1px solid rgba(74, 144, 217, 0.3)',
                  borderRadius: 6,
                  padding: '6px 8px',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: '#2C3E50',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  minHeight: 22,
                }}
              >
                {card.title}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: '#5a6573',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  minHeight: 20,
                  maxHeight: 300,
                  overflowY: 'auto',
                }}
              >
                {card.content || <span style={{ color: '#b0b8c4', fontStyle: 'italic' }}>（双击编辑内容）</span>}
              </div>
            </>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 10,
            paddingTop: 8,
            borderTop: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: '#9aa3b2',
            }}
          >
            {formatDate(card.createdAt)}
          </span>
          <div
            onMouseDown={handleConnectorMouseDown}
            title="拖拽以连接其他卡片"
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: card.color,
              border: '2px solid #fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              cursor: 'crosshair',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.35)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }}
          />
        </div>
      </div>
    </>
  );
};

export default NoteCard;
