import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface Note {
  id: string;
  title: string;
  content: string;
  creator: string;
  x: number;
  y: number;
  likes: number;
  createdAt: number;
}

interface StickyNoteProps {
  note: Note;
  isNew?: boolean;
  onPositionChange: (id: string, x: number, y: number) => void;
  onLike: (id: string) => void;
  boardRef: React.RefObject<HTMLDivElement>;
  isSorting: boolean;
  sortIndex?: number;
}

const NOTE_WIDTH = 240;
const NOTE_HEIGHT = 160;

const StickyNote: React.FC<StickyNoteProps> = ({
  note,
  isNew = false,
  onPositionChange,
  onLike,
  boardRef,
  isSorting,
  sortIndex
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(isNew);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: note.x, y: note.y });

  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => setIsAnimating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  useEffect(() => {
    if (!isDragging && !isSorting) {
      currentPos.current = { x: note.x, y: note.y };
    }
  }, [note.x, note.y, isDragging, isSorting]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isSorting) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = noteRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  }, [isSorting]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!boardRef.current) return;
      const boardRect = boardRef.current.getBoundingClientRect();
      let newX = e.clientX - boardRect.left - dragOffset.current.x;
      let newY = e.clientY - boardRect.top - dragOffset.current.y;

      newX = Math.max(0, Math.min(newX, boardRect.width - NOTE_WIDTH));
      newY = Math.max(0, Math.min(newY, boardRect.height - NOTE_HEIGHT));

      currentPos.current = { x: newX, y: newY };
      if (noteRef.current) {
        noteRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onPositionChange(note.id, currentPos.current.x, currentPos.current.y);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, note.id, onPositionChange, boardRef]);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLikeAnimating(true);
    onLike(note.id);
    setTimeout(() => setLikeAnimating(false), 200);
  };

  const getTransform = () => {
    if (isSorting && sortIndex !== undefined && boardRef.current) {
      const boardRect = boardRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        const mobileX = (boardRect.width - NOTE_WIDTH) / 2;
        const mobileY = sortIndex * (NOTE_HEIGHT + 20) + 20;
        return `translate(${mobileX}px, ${mobileY}px)`;
      } else {
        const columns = Math.floor((boardRect.width - 40) / (NOTE_WIDTH + 20));
        const col = sortIndex % columns;
        const row = Math.floor(sortIndex / columns);
        const sortedX = 20 + col * (NOTE_WIDTH + 20);
        const sortedY = 20 + row * (NOTE_HEIGHT + 20);
        return `translate(${sortedX}px, ${sortedY}px)`;
      }
    }
    return `translate(${currentPos.current.x}px, ${currentPos.current.y}px)`;
  };

  const getTransition = () => {
    if (isDragging) return 'none';
    if (isSorting) return 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    if (isAnimating) return 'transform 0.4s ease-out, opacity 0.4s ease-out';
    return 'transform 0.3s ease, box-shadow 0.2s ease';
  };

  const getInitialTransform = () => {
    if (isNew && boardRef.current) {
      const boardRect = boardRef.current.getBoundingClientRect();
      return `translate(${boardRect.width}px, ${boardRect.height}px)`;
    }
    return `translate(${note.x}px, ${note.y}px)`;
  };

  return (
    <div
      ref={noteRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        width: NOTE_WIDTH,
        height: NOTE_HEIGHT,
        borderRadius: 4,
        backgroundColor: '#fef3c7',
        padding: 16,
        boxShadow: isDragging
          ? '0 12px 24px rgba(0,0,0,0.2)'
          : '0 4px 12px rgba(0,0,0,0.1)',
        cursor: isSorting ? 'default' : 'grab',
        opacity: isDragging ? 0.7 : 1,
        transition: getTransition(),
        transform: isAnimating ? getInitialTransform() : getTransform(),
        zIndex: isDragging ? 1000 : 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: '#6b7280',
          marginBottom: 8,
          fontWeight: 500
        }}
      >
        {note.creator}
      </div>
      {note.title && (
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#374151',
            marginBottom: 6,
            lineHeight: 1.3
          }}
        >
          {note.title}
        </div>
      )}
      <div
        style={{
          fontSize: 14,
          color: '#374151',
          lineHeight: 1.4,
          flex: 1,
          overflow: 'hidden',
          wordBreak: 'break-word'
        }}
      >
        {note.content}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginTop: 8,
          gap: 4
        }}
      >
        <span
          onClick={handleLike}
          style={{
            fontSize: 13,
            color: '#ef4444',
            cursor: 'pointer',
            userSelect: 'none',
            transform: likeAnimating ? 'scale(1.2)' : 'scale(1)',
            transition: 'transform 0.2s ease-out',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          ❤️
          <span style={{ fontSize: 12, color: '#374151' }}>{note.likes}</span>
        </span>
      </div>
    </div>
  );
};

export default StickyNote;
