import React, { useState, useRef, useEffect } from 'react';
import { StickyNoteData, StickyNoteColor, STICKY_COLORS, STICKY_BORDER_COLORS } from './types';
import { socketClient } from './socketClient';

interface StickyNoteProps {
  note: StickyNoteData;
  isEditing: boolean;
  onStartEdit: (id: string) => void;
  onEndEdit: (id: string) => void;
  onUpdate: (note: StickyNoteData) => void;
  onBringToFront: (id: string) => void;
  isRemoteDragging: boolean;
}

const COLOR_OPTIONS: StickyNoteColor[] = ['yellow', 'pink', 'blue', 'green'];
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

export const StickyNote: React.FC<StickyNoteProps> = ({
  note,
  isEditing,
  onStartEdit,
  onEndEdit,
  onUpdate,
  onBringToFront,
  isRemoteDragging
}) => {
  const [text, setText] = useState(note.text);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentX, setCurrentX] = useState(note.x);
  const [currentY, setCurrentY] = useState(note.y);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const userId = socketClient.getUserId();
  const isOwner = note.userId === userId;

  useEffect(() => {
    setText(note.text);
  }, [note.text]);

  useEffect(() => {
    if (!isDragging) {
      setCurrentX(note.x);
      setCurrentY(note.y);
    }
  }, [note.x, note.y, isDragging]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isOwner) return;
    if (isEditing) return;
    if ((e.target as HTMLElement).closest('.color-picker-wrapper')) return;
    if ((e.target as HTMLElement).closest('.delete-btn')) return;

    e.preventDefault();
    setIsDragging(true);
    onBringToFront(note.id);

    const rect = noteRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }

    trailRef.current = [];

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const canvas = document.querySelector('.canvas-container');
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();

      let newX = moveEvent.clientX - canvasRect.left - dragOffset.x;
      let newY = moveEvent.clientY - canvasRect.top - dragOffset.y;

      newX = Math.max(0, Math.min(newX, canvasRect.width - note.width));
      newY = Math.max(0, Math.min(newY, canvasRect.height - note.height));

      setCurrentX(newX);
      setCurrentY(newY);
      socketClient.noteMove(note.id, newX, newY);

      trailRef.current.push({ x: newX + note.width / 2, y: newY + note.height / 2 });
      if (trailRef.current.length > 15) trailRef.current.shift();
      socketClient.trailUpdate(note.id, [...trailRef.current]);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsDragging(false);
      const canvas = document.querySelector('.canvas-container');
      if (canvas) {
        const canvasRect = canvas.getBoundingClientRect();
        let finalX = upEvent.clientX - canvasRect.left - dragOffset.x;
        let finalY = upEvent.clientY - canvasRect.top - dragOffset.y;
        finalX = Math.max(0, Math.min(finalX, canvasRect.width - note.width));
        finalY = Math.max(0, Math.min(finalY, canvasRect.height - note.height));
        setCurrentX(finalX);
        setCurrentY(finalY);
        socketClient.noteMoveEnd(note.id, finalX, finalY);
        onUpdate({ ...note, x: finalX, y: finalY });
      }
      trailRef.current = [];
      socketClient.trailUpdate(note.id, []);

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isOwner) return;
    e.preventDefault();
    e.stopPropagation();
    onStartEdit(note.id);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value.slice(0, 200);
    setText(newText);
  };

  const handleTextBlur = () => {
    onUpdate({ ...note, text });
    socketClient.noteUpdate({ ...note, text });
    onEndEdit(note.id);
  };

  const handleColorChange = (color: StickyNoteColor) => {
    setShowColorPicker(false);
    onUpdate({ ...note, color });
    socketClient.noteUpdate({ ...note, color });
  };

  const handleDelete = () => {
    socketClient.noteDelete(note.id);
  };

  const bgColor = STICKY_COLORS[note.color];
  const borderColor = STICKY_BORDER_COLORS[note.color];

  return (
    <div
      ref={noteRef}
      style={{
        position: 'absolute',
        left: currentX,
        top: currentY,
        width: note.width,
        minHeight: note.height,
        backgroundColor: bgColor,
        borderRadius: 12,
        padding: '16px 14px 14px',
        boxShadow: isEditing
          ? `0 8px 32px rgba(0,0,0,0.18), 0 0 0 3px ${isOwner ? '#3498DB' : borderColor}`
          : '0 4px 20px rgba(0,0,0,0.1)',
        zIndex: note.zIndex,
        transform: isEditing ? 'scale(1.1)' : (isDragging || isRemoteDragging ? 'scale(1.03)' : 'scale(1)'),
        transition: isDragging || isRemoteDragging
          ? 'left 50ms linear, top 50ms linear'
          : `all 300ms ${EASE}`,
        cursor: isEditing ? 'text' : (isOwner ? (isDragging ? 'grabbing' : 'grab') : 'default'),
        border: isEditing && isOwner ? '2px solid #3498DB' : `1px solid ${borderColor}`,
        userSelect: isEditing ? 'text' : 'none',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {isOwner && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 4,
            opacity: isDragging ? 0.3 : 1,
            transition: `opacity 200ms ${EASE}`
          }}
        >
          <div className="color-picker-wrapper" style={{ position: 'relative' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: `2px solid ${borderColor}`,
                background: `conic-gradient(${STICKY_COLORS.yellow}, ${STICKY_COLORS.pink}, ${STICKY_COLORS.blue}, ${STICKY_COLORS.green}, ${STICKY_COLORS.yellow})`,
                cursor: 'pointer',
                padding: 0,
                transition: `transform 200ms ${EASE}`
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.15)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            />
            {showColorPicker && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 26,
                  right: 0,
                  display: 'flex',
                  gap: 6,
                  padding: 8,
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  borderRadius: 10,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  zIndex: 10000,
                  animation: 'fadeIn 200ms ease-out'
                }}
              >
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c}
                    onClick={() => handleColorChange(c)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: STICKY_COLORS[c],
                      border: `2px solid ${note.color === c ? '#3498DB' : STICKY_BORDER_COLORS[c]}`,
                      cursor: 'pointer',
                      padding: 0,
                      transition: `all 200ms ${EASE}`
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.2)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  />
                ))}
              </div>
            )}
          </div>
          <button
            className="delete-btn"
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(0,0,0,0.1)',
              color: '#e74c3c',
              fontSize: 12,
              lineHeight: 1,
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: `all 200ms ${EASE}`
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e74c3c';
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.6)';
              (e.currentTarget as HTMLButtonElement).style.color = '#e74c3c';
            }}
          >
            ×
          </button>
        </div>
      )}

      {isEditing && isOwner ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          onMouseDown={(e) => e.stopPropagation()}
          maxLength={200}
          style={{
            width: '100%',
            minHeight: note.height - 30,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            fontSize: 14,
            lineHeight: 1.6,
            color: '#2c3e50',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            cursor: 'text'
          }}
        />
      ) : (
        <div
          style={{
            fontFamily: 'inherit',
            fontSize: 14,
            lineHeight: 1.6,
            color: '#2c3e50',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            minHeight: note.height - 30
          }}
        >
          {note.text || <span style={{ color: 'rgba(0,0,0,0.3)' }}>双击编辑文字...</span>}
        </div>
      )}

      {!isEditing && (
        <div
          style={{
            marginTop: 10,
            textAlign: 'right',
            fontSize: 11,
            color: 'rgba(0,0,0,0.4)',
            pointerEvents: 'none'
          }}
        >
          {text.length}/200
        </div>
      )}
    </div>
  );
};
