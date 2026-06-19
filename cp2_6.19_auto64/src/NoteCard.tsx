import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NoteCard as NoteCardType } from './types';

interface NoteCardProps {
  card: NoteCardType;
  isSelected: boolean;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onColorChange: (id: string) => void;
  onStartConnection: (sourceId: string, startPos: { x: number; y: number }) => void;
  onUpdateConnectionStart: (pos: { x: number; y: number }) => void;
  onEndConnection: (targetId: string) => void;
  onUpdateCardContent: (id: string, updates: Partial<NoteCardType>) => void;
  onHeightUpdate: (id: string, height: number) => void;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({
  card,
  isSelected,
  onPositionChange,
  onColorChange,
  onStartConnection,
  onUpdateConnectionStart,
  onEndConnection,
  onUpdateCardContent,
  onHeightUpdate,
  onMouseDown
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editContent, setEditContent] = useState(card.content);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (cardRef.current) {
      onHeightUpdate(card.id, cardRef.current.offsetHeight);
    }
  }, [card.content, card.title, card.id, onHeightUpdate]);

  const handleCardMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).dataset.role === 'connection-dot') return;
      if ((e.target as HTMLElement).dataset.role === 'color-dot') return;
      if (isEditingTitle || isEditingContent) return;

      onMouseDown(e, card.id);

      setIsDragging(true);
      const rect = cardRef.current?.getBoundingClientRect();
      if (rect) {
        dragOffset.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      }

      e.stopPropagation();
    },
    [card.id, isEditingTitle, isEditingContent, onMouseDown]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      onPositionChange(card.id, { x: newX, y: newY });
    },
    [isDragging, card.id, onPositionChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleConnectionDotMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const startPos = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      onStartConnection(card.id, startPos);

      const handleMove = (ev: MouseEvent) => {
        onUpdateConnectionStart({ x: ev.clientX, y: ev.clientY });
      };

      const handleUp = (ev: MouseEvent) => {
        const target = document.elementFromPoint(ev.clientX, ev.clientY);
        const targetCard = target?.closest('[data-card-id]') as HTMLElement;
        if (targetCard) {
          const targetId = targetCard.dataset.cardId;
          if (targetId && targetId !== card.id) {
            onEndConnection(targetId);
          } else {
            onEndConnection('');
          }
        } else {
          onEndConnection('');
        }
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    },
    [card.id, onStartConnection, onUpdateConnectionStart, onEndConnection]
  );

  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(card.title);
    setIsEditingTitle(true);
  };

  const handleContentDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditContent(card.content);
    setIsEditingContent(true);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (editTitle !== card.title) {
      onUpdateCardContent(card.id, { title: editTitle });
    }
  };

  const handleContentBlur = () => {
    setIsEditingContent(false);
    if (editContent !== card.content) {
      onUpdateCardContent(card.id, { content: editContent });
    }
  };

  return (
    <div
      ref={cardRef}
      data-card-id={card.id}
      onMouseDown={handleCardMouseDown}
      style={{
        position: 'absolute',
        left: card.position.x,
        top: card.position.y,
        width: card.width || 220,
        minHeight: 120,
        padding: '16px',
        paddingBottom: '28px',
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
        zIndex: isDragging ? 1000 : isSelected ? 100 : 10,
        animation: 'cardBounceIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}
    >
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            inset: -3,
            borderRadius: '14px',
            border: '2px solid #4A90D9',
            animation: 'breathing 2s ease-in-out infinite',
            pointerEvents: 'none'
          }}
        />
      )}

      <div
        data-role="color-dot"
        onClick={(e) => {
          e.stopPropagation();
          onColorChange(card.id);
        }}
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: card.color,
          cursor: 'pointer',
          transition: 'background-color 0.3s ease',
          boxShadow: '0 0 0 2px rgba(255,255,255,0.8), 0 1px 4px rgba(0,0,0,0.15)'
        }}
      />

      <div style={{ paddingLeft: 16 }}>
        {isEditingTitle ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleBlur();
            }}
            style={{
              width: '100%',
              fontSize: 15,
              fontWeight: 600,
              color: '#2C3E50',
              border: '1px solid #4A90D9',
              outline: 'none',
              padding: '2px 4px',
              borderRadius: 4,
              background: 'white',
              marginBottom: 8
            }}
          />
        ) : (
          <div
            onDoubleClick={handleTitleDoubleClick}
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#2C3E50',
              marginBottom: 8,
              wordBreak: 'break-word',
              lineHeight: 1.4,
              cursor: 'text'
            }}
          >
            {card.title || '无标题'}
          </div>
        )}

        {isEditingContent ? (
          <textarea
            autoFocus
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleContentBlur}
            style={{
              width: '100%',
              minHeight: 60,
              fontSize: 13,
              color: '#5A6C7D',
              border: '1px solid #4A90D9',
              outline: 'none',
              padding: '4px',
              borderRadius: 4,
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              background: 'white'
            }}
          />
        ) : (
          <div
            onDoubleClick={handleContentDoubleClick}
            style={{
              fontSize: 13,
              color: '#5A6C7D',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              cursor: 'text'
            }}
          >
            {card.content || '双击编辑内容...'}
          </div>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 8,
          right: 12,
          fontSize: 11,
          color: '#9AA5B1',
          fontWeight: 400
        }}
      >
        {card.createdAt}
      </div>

      <div
        data-role="connection-dot"
        onMouseDown={handleConnectionDotMouseDown}
        style={{
          position: 'absolute',
          bottom: -6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 14,
          height: 14,
          borderRadius: '50%',
          backgroundColor: card.color,
          border: '3px solid white',
          cursor: 'crosshair',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          transition: 'transform 0.2s ease',
          zIndex: 50
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'translateX(-50%) scale(1.3)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'translateX(-50%) scale(1)';
        }}
      />
    </div>
  );
};

export default NoteCard;
