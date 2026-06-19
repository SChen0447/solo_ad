import React, { useState, useRef, useEffect } from 'react';
import type { NoteCard as NoteCardType } from './types';
import { DEFAULT_CARD_WIDTH } from './types';

interface NoteCardProps {
  card: NoteCardType;
  isSelected: boolean;
  scale: number;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onColorCycle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Omit<NoteCardType, 'id'>>) => void;
  onDelete: (id: string) => void;
  onStartConnection: (id: string, startPos: { x: number; y: number }) => void;
  onConnectionDrag: (currentPos: { x: number; y: number }) => void;
  onEndConnection: (targetId: string | null) => void;
  onSelect: (id: string, additive: boolean) => void;
  onCardMouseDown: (e: React.MouseEvent, id: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  card,
  isSelected,
  scale,
  onPositionChange,
  onColorCycle,
  onUpdate,
  onDelete,
  onStartConnection,
  onConnectionDrag,
  onEndConnection,
  onSelect,
  onCardMouseDown,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editContent, setEditContent] = useState(card.content);
  const dragStartRef = useRef<{ x: number; y: number; cardX: number; cardY: number } | null>(null);
  const [cardHeight, setCardHeight] = useState(150);
  const [isNew, setIsNew] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsNew(false), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (cardRef.current) {
      setCardHeight(cardRef.current.offsetHeight);
    }
  }, [card.title, card.content]);

  useEffect(() => {
    setEditTitle(card.title);
    setEditContent(card.content);
  }, [card.title, card.content]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.connection-dot')) return;
    if ((e.target as HTMLElement).closest('.color-dot')) return;
    if ((e.target as HTMLElement).closest('.editable')) return;

    e.preventDefault();
    onSelect(card.id, e.ctrlKey || e.metaKey);
    onCardMouseDown(e, card.id);

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      cardX: card.position.x,
      cardY: card.position.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = (moveEvent.clientX - dragStartRef.current.x) / scale;
      const dy = (moveEvent.clientY - dragStartRef.current.y) / scale;
      onPositionChange(card.id, {
        x: dragStartRef.current.cardX + dx,
        y: dragStartRef.current.cardY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleConnectionStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const dotX = rect.left + rect.width - 20;
      const dotY = rect.top + rect.height - 20;
      onStartConnection(card.id, { x: dotX, y: dotY });
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      onConnectionDrag({ x: moveEvent.clientX, y: moveEvent.clientY });
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      const target = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      const cardElement = target?.closest('[data-card-id]');
      const targetId = cardElement ? (cardElement as HTMLElement).dataset.cardId : null;
      onEndConnection(targetId && targetId !== card.id ? targetId : null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleColorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onColorCycle(card.id);
  };

  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditingTitle(true);
    setEditTitle(card.title);
  };

  const handleContentDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditingContent(true);
    setEditContent(card.content);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (editTitle !== card.title) {
      onUpdate(card.id, { title: editTitle });
    }
  };

  const handleContentBlur = () => {
    setIsEditingContent(false);
    if (editContent !== card.content) {
      onUpdate(card.id, { content: editContent });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTitleBlur();
    }
    if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setEditTitle(card.title);
    }
  };

  const handleContentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditingContent(false);
      setEditContent(card.content);
    }
  };

  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    left: card.position.x,
    top: card.position.y,
    width: DEFAULT_CARD_WIDTH,
    height: 'auto',
    minHeight: 120,
    background: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 12,
    border: isSelected
      ? '2px solid #4A90D9'
      : '1px solid rgba(255, 255, 255, 0.6)',
    boxShadow: isSelected
      ? '0 8px 32px rgba(74, 144, 217, 0.25), 0 2px 8px rgba(0, 0, 0, 0.08)'
      : '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
    padding: '14px 14px 28px 14px',
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    zIndex: isSelected ? 100 : 10,
    transition: isDragging
      ? 'none'
      : 'box-shadow 0.2s ease, border-color 0.2s ease',
    animation: isNew ? 'cardPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : undefined,
  };

  return (
    <div
      ref={cardRef}
      data-card-id={card.id}
      style={cardStyle}
      onMouseDown={handleMouseDown}
    >
      <style>{`
        @keyframes cardPopIn {
          0% {
            transform: scale(0.8) translateY(10px);
            opacity: 0;
          }
          60% {
            transform: scale(1.02) translateY(-3px);
            opacity: 1;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        @keyframes glowFadeOut {
          0% {
            opacity: 0.8;
            filter: blur(8px);
            transform: scale(1);
          }
          100% {
            opacity: 0;
            filter: blur(20px);
            transform: scale(1.15);
          }
        }
        @keyframes breathing {
          0%, 100% {
            box-shadow: 0 8px 32px rgba(74, 144, 217, 0.25), 0 2px 8px rgba(0, 0, 0, 0.08);
          }
          50% {
            box-shadow: 0 8px 40px rgba(74, 144, 217, 0.45), 0 2px 12px rgba(74, 144, 217, 0.15);
          }
        }
      `}</style>
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            inset: -2,
            borderRadius: 14,
            border: '2px solid #4A90D9',
            animation: 'breathing 2s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {isNew && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 12,
            backgroundColor: card.color,
            opacity: 0.8,
            filter: 'blur(8px)',
            pointerEvents: 'none',
            zIndex: -1,
            animation: 'glowFadeOut 0.3s ease-out forwards',
          }}
        />
      )}

      <div
        className="color-dot"
        onClick={handleColorClick}
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          width: 14,
          height: 14,
          borderRadius: '50%',
          backgroundColor: card.color,
          cursor: 'pointer',
          transition: 'background-color 0.3s ease',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
          zIndex: 2,
        }}
        title="点击切换主题色"
      />

      <div
        style={{
          marginLeft: 24,
          marginBottom: 10,
        }}
      >
        {isEditingTitle ? (
          <input
            className="editable"
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            autoFocus
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: 4,
              padding: '2px 4px',
              fontSize: 14,
              fontWeight: 600,
              color: '#2C3E50',
              fontFamily: 'inherit',
            }}
          />
        ) : (
          <div
            onDoubleClick={handleTitleDoubleClick}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#2C3E50',
              lineHeight: 1.3,
              wordBreak: 'break-word',
              minHeight: 18,
            }}
          >
            {card.title || '无标题'}
          </div>
        )}
      </div>

      {isEditingContent ? (
        <textarea
          className="editable"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onBlur={handleContentBlur}
          onKeyDown={handleContentKeyDown}
          autoFocus
          style={{
            width: '100%',
            minHeight: 60,
            border: 'none',
            outline: 'none',
            resize: 'none',
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 4,
            padding: 4,
            fontSize: 12,
            lineHeight: 1.5,
            color: '#5D6D7E',
            fontFamily: 'inherit',
          }}
        />
      ) : (
        <div
          onDoubleClick={handleContentDoubleClick}
          style={{
            fontSize: 12,
            lineHeight: 1.5,
            color: '#5D6D7E',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            minHeight: 40,
          }}
        >
          {card.content || '双击编辑内容...'}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 8,
          right: 12,
          fontSize: 10,
          color: '#999',
        }}
      >
        {formatDate(card.createdAt)}
      </div>

      <div
        className="connection-dot"
        onMouseDown={handleConnectionStart}
        style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          width: 16,
          height: 16,
          borderRadius: '50%',
          backgroundColor: card.color,
          cursor: 'crosshair',
          border: '2px solid white',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          zIndex: 2,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.3)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.2)';
        }}
        title="拖拽创建连线"
      />
    </div>
  );
};

export default NoteCard;
