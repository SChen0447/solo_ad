import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore, calculateVoteScore } from '../store';
import type { StickyNote as StickyNoteType, User } from '../../types';
import { STYLES, ANIMATION } from '../../utils/constants';

interface StickyNoteProps {
  note: StickyNoteType;
  isSelected: boolean;
  currentUser: User;
  onMove: (noteId: string, x: number, y: number) => void;
  onUpdate: (note: StickyNoteType) => void;
  onDelete: (noteId: string) => void;
  onLongPress: () => void;
  voteEnded: boolean;
}

export default function StickyNote({
  note,
  isSelected,
  onMove,
  onUpdate,
  onDelete,
  onLongPress,
  voteEnded,
}: StickyNoteProps) {
  const { setSelectedNoteId, setActiveVoteNoteId } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [text, setText] = useState(note.text);
  const dragRef = useRef({ startX: 0, startY: 0, noteX: 0, noteY: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didDrag = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(note.text);
  }, [note.text]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing) return;
      e.stopPropagation();
      setSelectedNoteId(note.id);
      didDrag.current = false;

      longPressTimer.current = setTimeout(() => {
        if (!didDrag.current && !voteEnded) {
          onLongPress();
          setActiveVoteNoteId(note.id);
        }
      }, 600);

      setIsDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        noteX: note.x,
        noteY: note.y,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        const dx = (ev.clientX - dragRef.current.startX) / 1;
        const dy = (ev.clientY - dragRef.current.startY) / 1;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          didDrag.current = true;
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }
        onMove(note.id, dragRef.current.noteX + dx, dragRef.current.noteY + dy);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [note.id, note.x, note.y, isEditing, onMove, setSelectedNoteId, onLongPress, setActiveVoteNoteId, voteEnded]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (didDrag.current) return;
      if (!isEditing && !voteEnded) {
        setIsEditing(true);
      }
    },
    [isEditing, voteEnded]
  );

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const trimmed = text.trim();
    if (trimmed !== note.text) {
      onUpdate({ ...note, text: trimmed });
    }
  }, [text, note, onUpdate]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(note.id);
    },
    [note.id, onDelete]
  );

  const vote = note.vote;
  let voteDisplay: React.ReactNode = null;

  if (vote) {
    const voteCount = Object.keys(vote.votes).length;
    if (vote.type === 'approve') {
      const approves = Object.values(vote.votes).filter((v) => v === 1).length;
      const rejects = Object.values(vote.votes).filter((v) => v === -1).length;
      const total = approves + rejects || 1;
      voteDisplay = (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 4, fontSize: 11, marginBottom: 4 }}>
            <span style={{ color: '#27ae60' }}>👍 {approves}</span>
            <span style={{ color: '#e74c3c' }}>👎 {rejects}</span>
          </div>
          <div style={{ height: 6, background: 'rgba(0,0,0,0.2)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
            <div
              style={{
                height: '100%',
                background: '#27ae60',
                width: `${(approves / total) * 100}%`,
                transition: `width ${ANIMATION.VOTE_UPDATE_DURATION}ms`,
              }}
            />
            <div
              style={{
                height: '100%',
                background: '#e74c3c',
                width: `${(rejects / total) * 100}%`,
                transition: `width ${ANIMATION.VOTE_UPDATE_DURATION}ms`,
              }}
            />
          </div>
        </div>
      );
    } else if (vote.type === 'stars') {
      const score = voteCount > 0 ? Object.values(vote.votes).reduce((a, b) => a + b, 0) / voteCount : 0;
      voteDisplay = (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 16, letterSpacing: 1 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} style={{ color: i <= Math.round(score) ? '#f39c12' : 'rgba(0,0,0,0.2)' }}>
                ★
              </span>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>
            {score.toFixed(1)} ({voteCount}人)
          </div>
        </div>
      );
    } else if (vote.type === 'priority') {
      const avg = voteCount > 0 ? Object.values(vote.votes).reduce((a, b) => a + b, 0) / voteCount : 0;
      voteDisplay = (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, marginBottom: 4, color: 'rgba(0,0,0,0.7)' }}>
            优先级: {avg.toFixed(1)}/5 ({voteCount}人)
          </div>
          <div style={{ height: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #3498db, #9b59b6)',
                width: `${(avg / 5) * 100}%`,
                transition: `width ${ANIMATION.VOTE_UPDATE_DURATION}ms`,
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      );
    }
  }

  if (voteEnded && vote) {
    const score = calculateVoteScore(note);
    voteDisplay = (
      <div
        style={{
          marginTop: 8,
          padding: '4px 8px',
          background: 'rgba(0,0,0,0.15)',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 700,
          textAlign: 'center',
          color: '#1a1a2e',
        }}
      >
        得分: {score.toFixed(2)}
      </div>
    );
  }

  return (
    <div
      className="note-enter"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left: note.x,
        top: note.y,
        width: STYLES.NOTE_WIDTH,
        minHeight: STYLES.NOTE_HEIGHT,
        background: note.color,
        borderRadius: STYLES.NOTE_BORDER_RADIUS,
        boxShadow: hovered ? STYLES.NOTE_SHADOW_HOVER : STYLES.NOTE_SHADOW,
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: `box-shadow ${ANIMATION.HOVER_DURATION}ms, transform ${ANIMATION.HOVER_DURATION}ms`,
        padding: 14,
        cursor: isDragging ? 'grabbing' : 'grab',
        border: isSelected ? `2px dashed ${STYLES.SELECTED_BORDER}` : '2px solid transparent',
        boxSizing: 'border-box',
        zIndex: isDragging || isSelected ? 10 : 1,
        userSelect: 'none',
      }}
    >
      {(isSelected || hovered) && (
        <button
          onClick={handleDelete}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 15,
            height: 15,
            borderRadius: '50%',
            background: STYLES.DELETE_BTN,
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      )}

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, STYLES.NOTE_MAX_LENGTH))}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setText(note.text);
              setIsEditing(false);
            }
          }}
          style={{
            width: '100%',
            height: 110,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: 13,
            color: '#1a1a2e',
            fontWeight: 500,
            lineHeight: 1.5,
            fontFamily: 'inherit',
          }}
          maxLength={STYLES.NOTE_MAX_LENGTH}
        />
      ) : (
        <div
          style={{
            fontSize: 13,
            color: '#1a1a2e',
            fontWeight: 500,
            lineHeight: 1.5,
            minHeight: 110,
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        >
          {note.text || <span style={{ opacity: 0.4 }}>点击输入想法...</span>}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 10,
          color: 'rgba(0,0,0,0.5)',
          marginTop: 4,
        }}
      >
        <span>{STYLES.NOTE_MAX_LENGTH - note.text.length} 字</span>
        {!vote && !voteEnded && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onLongPress();
              setActiveVoteNoteId(note.id);
            }}
            style={{ cursor: 'pointer', opacity: hovered ? 1 : 0.5 }}
          >
            🗳️ 投票
          </span>
        )}
      </div>

      {voteDisplay}
    </div>
  );
}
