import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useWhiteboardStore } from '@/store/useWhiteboardStore';
import type { Note, NoteColor } from '@/types';
import { Mail, X } from 'lucide-react';

const NOTE_BG: Record<NoteColor, string> = {
  yellow: '#FEF08A',
  pink: '#FBCFE8',
  lightblue: '#BAE6FD',
};

interface StickyNoteProps {
  note: Note;
}

export function StickyNote({ note }: StickyNoteProps) {
  const { moveNote, editNote, deleteNote, changeNoteColor } = useWhiteboardStore();
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [deleting, setDeleting] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (editing) return;
    e.preventDefault();
    const canvasWrapper = document.querySelector('.whiteboard-canvas-wrapper');
    if (!canvasWrapper) return;
    const canvasRect = canvasWrapper.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - canvasRect.left - note.x,
      y: e.clientY - canvasRect.top - note.y,
    });
    setDragging(true);
  }, [editing, note.x, note.y]);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      const canvasWrapper = document.querySelector('.whiteboard-canvas-wrapper');
      if (!canvasWrapper) return;
      const canvasRect = canvasWrapper.getBoundingClientRect();
      const x = e.clientX - canvasRect.left - dragOffset.x;
      const y = e.clientY - canvasRect.top - dragOffset.y;
      moveNote(note.id, x, y);
    };
    const handleUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, dragOffset, note.id, moveNote]);

  const handleDoubleClick = useCallback(() => {
    setEditing(true);
  }, []);

  const handleEditComplete = useCallback(() => {
    if (inputRef.current) {
      editNote(note.id, inputRef.current.value);
    }
    setEditing(false);
  }, [note.id, editNote]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditComplete();
    }
  }, [handleEditComplete]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    setTimeout(() => deleteNote(note.id), 300);
  }, [note.id, deleteNote]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu(true);
  }, []);

  useEffect(() => {
    if (!showContextMenu) return;
    const close = () => setShowContextMenu(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [showContextMenu]);

  return (
    <div
      ref={noteRef}
      className={`sticky-note ${dragging ? 'dragging' : ''} ${deleting ? 'deleting' : ''}`}
      style={{
        left: note.x,
        top: note.y,
        backgroundColor: NOTE_BG[note.color],
        transition: deleting
          ? 'transform 0.3s ease-in, opacity 0.3s ease-in'
          : dragging
            ? 'box-shadow 0.15s ease, transform 0.15s ease'
            : 'background-color 0.3s ease, box-shadow 0.15s ease, transform 0.15s ease',
      }}
      onMouseDown={handleDragStart}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <div className="sticky-note-icon">
        <Mail size={12} />
      </div>
      {editing ? (
        <textarea
          ref={inputRef}
          className="sticky-note-input"
          defaultValue={note.text}
          onBlur={handleEditComplete}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <div className="sticky-note-text">
          {note.text || ''}
        </div>
      )}
      <button
        className="sticky-note-delete"
        onClick={handleDelete}
        onMouseDown={e => e.stopPropagation()}
      >
        <X size={10} />
      </button>
      {showContextMenu && (
        <div className="sticky-note-context-menu" onClick={e => e.stopPropagation()}>
          <div className="context-menu-label">切换颜色</div>
          {(Object.entries(NOTE_BG) as [NoteColor, string][]).map(([color, hex]) => (
            <button
              key={color}
              className={`context-color-btn ${note.color === color ? 'selected' : ''}`}
              style={{ backgroundColor: hex }}
              onClick={() => { changeNoteColor(note.id, color); setShowContextMenu(false); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
