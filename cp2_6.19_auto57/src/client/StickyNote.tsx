import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { StickyNote as StickyNoteType, StickyNoteColor } from '../shared/types';

interface StickyNoteProps {
  note: StickyNoteType;
  scale: number;
  offsetX: number;
  offsetY: number;
  onUpdate: (note: StickyNoteType) => void;
  onDragEnd: (note: StickyNoteType) => void;
  onDelete: (id: string) => void;
  onChangeColor: (id: string, color: StickyNoteColor) => void;
}

const COLORS: Record<StickyNoteColor, string> = {
  yellow: '#FFF9C4',
  pink: '#FCE4EC',
  blue: '#E3F2FD'
};

const COLOR_CYCLE: StickyNoteColor[] = ['yellow', 'pink', 'blue'];

const StickyNote: React.FC<StickyNoteProps> = ({
  note,
  scale,
  offsetX,
  offsetY,
  onUpdate,
  onDragEnd,
  onDelete,
  onChangeColor
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localX, setLocalX] = useState(note.x);
  const [localY, setLocalY] = useState(note.y);
  const dragStart = useRef({ x: 0, y: 0, noteX: 0, noteY: 0 });
  const noteRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditContent(note.content);
    if (!isDragging) {
      setLocalX(note.x);
      setLocalY(note.y);
    }
  }, [note.content, note.x, note.y, isDragging]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const screenX = (isDragging ? localX : note.x) * scale + offsetX;
  const screenY = (isDragging ? localY : note.y) * scale + offsetY;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing || isDeleting) return;
      if ((e.target as HTMLElement).closest('.note-delete')) return;

      e.stopPropagation();
      setIsDragging(true);
      setLocalX(note.x);
      setLocalY(note.y);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        noteX: note.x,
        noteY: note.y
      };

      const handleMouseMove = (me: MouseEvent) => {
        const dx = (me.clientX - dragStart.current.x) / scale;
        const dy = (me.clientY - dragStart.current.y) / scale;
        setLocalX(dragStart.current.noteX + dx);
        setLocalY(dragStart.current.noteY + dy);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        const finalNote = {
          ...note,
          x: dragStart.current.noteX + (dragStart.current.noteX !== note.x ? 0 : (localX - note.x)),
          y: dragStart.current.noteY + (dragStart.current.noteY !== note.y ? 0 : (localY - note.y))
        };
        const realFinalNote = {
          ...note,
          x: localX,
          y: localY
        };
        onUpdate(realFinalNote);
        onDragEnd(realFinalNote);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [isEditing, isDeleting, note, scale, localX, localY, onUpdate, onDragEnd]
  );

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;
    setIsEditing(true);
  };

  const finishEditing = () => {
    setIsEditing(false);
    if (editContent !== note.content) {
      const updatedNote = { ...note, content: editContent };
      onUpdate(updatedNote);
      onDragEnd(updatedNote);
    }
  };

  const handleBlur = () => {
    finishEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEditing();
    } else if (e.key === 'Escape') {
      setEditContent(note.content);
      setIsEditing(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(note.id);
    }, 300);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentIdx = COLOR_CYCLE.indexOf(note.color);
    const nextColor = COLOR_CYCLE[(currentIdx + 1) % COLOR_CYCLE.length];
    onChangeColor(note.id, nextColor);
  };

  return (
    <div
      ref={noteRef}
      className="sticky-note"
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      style={{
        position: 'absolute',
        left: `${screenX}px`,
        top: `${screenY}px`,
        width: `${120 * scale}px`,
        height: `${80 * scale}px`,
        backgroundColor: COLORS[note.color],
        borderRadius: `${8 * scale}px`,
        boxShadow: isDragging
          ? `${4 * scale}px ${8 * scale}px ${16 * scale}px rgba(0,0,0,0.3)`
          : `${2 * scale}px ${4 * scale}px ${8 * scale}px rgba(0,0,0,0.15)`,
        cursor: isEditing ? 'text' : isDragging ? 'grabbing' : 'grab',
        padding: `${6 * scale}px ${8 * scale}px ${6 * scale}px ${8 * scale}px`,
        fontSize: `${12 * scale}px`,
        color: '#333',
        transform: isDeleting
          ? 'scale(0)'
          : isDragging
          ? `translateY(${-4 * scale}px)`
          : 'translateY(0)',
        transition: isDeleting
          ? 'transform 0.3s ease, background-color 0.3s ease'
          : 'box-shadow 0.2s ease, transform 0.2s ease, background-color 0.3s ease',
        userSelect: 'none',
        overflow: 'hidden',
        zIndex: isDragging ? 1000 : 10
      }}
    >
      <button
        className="note-delete"
        onClick={handleDelete}
        style={{
          position: 'absolute',
          top: `${2 * scale}px`,
          right: `${2 * scale}px`,
          width: `${16 * scale}px`,
          height: `${16 * scale}px`,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'rgba(0,0,0,0.1)',
          color: '#666',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${10 * scale}px`,
          lineHeight: 1,
          padding: 0,
          opacity: 0.7,
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(244,67,54,0.8)';
          (e.target as HTMLButtonElement).style.color = 'white';
          (e.target as HTMLButtonElement).style.opacity = '1';
          (e.target as HTMLButtonElement).style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(0,0,0,0.1)';
          (e.target as HTMLButtonElement).style.color = '#666';
          (e.target as HTMLButtonElement).style.opacity = '0.7';
          (e.target as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        ×
      </button>

      <div
        style={{
          position: 'absolute',
          top: `${4 * scale}px`,
          left: `${6 * scale}px`,
          fontSize: `${14 * scale}px`,
          color: '#888',
          opacity: 0.7
        }}
      >
        ✉
      </div>

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            resize: 'none',
            fontSize: `${12 * scale}px`,
            fontFamily: 'inherit',
            color: '#333',
            lineHeight: 1.4,
            padding: `${14 * scale}px 0 0 0`,
            margin: 0
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            paddingTop: `${14 * scale}px`,
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: 1.4
          }}
        >
          {note.content || (
            <span style={{ color: '#999', fontStyle: 'italic' }}>双击编辑...</span>
          )}
        </div>
      )}
    </div>
  );
};

export default StickyNote;
