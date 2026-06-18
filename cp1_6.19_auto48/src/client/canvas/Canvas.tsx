import { useRef, useState, useCallback, useEffect } from 'react';
import StickyNote from './StickyNote';
import { useAppStore } from '../store';
import type { StickyNote as StickyNoteType, User } from '../../types';
import { CANVAS, STYLES, ANIMATION } from '../../utils/constants';

interface CanvasProps {
  notes: StickyNoteType[];
  onCreateNote: (x: number, y: number) => void;
  onMoveNote: (note: StickyNoteType) => void;
  onUpdateNote: (note: StickyNoteType) => void;
  onDeleteNote: (noteId: string) => void;
  currentUser: User;
  onLongPressNote: (noteId: string) => void;
  voteEnded: boolean;
}

export default function Canvas({
  notes,
  onCreateNote,
  onMoveNote,
  onUpdateNote,
  onDeleteNote,
  currentUser,
  onLongPressNote,
  voteEnded,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const { selectedNoteId, setSelectedNoteId } = useAppStore();

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - offset.x) / zoom;
      const y = (e.clientY - rect.top - offset.y) / zoom;
      onCreateNote(x, y);
    },
    [onCreateNote, offset, zoom]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => {
      const newZoom = Math.max(CANVAS.MIN_ZOOM, Math.min(CANVAS.MAX_ZOOM, z * delta));
      return newZoom;
    });
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || e.target === e.currentTarget) {
        e.preventDefault();
        setIsPanning(true);
        setSelectedNoteId(null);
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          offsetX: offset.x,
          offsetY: offset.y,
        };
      }
    },
    [offset, setSelectedNoteId]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setOffset({
        x: panStartRef.current.offsetX + dx,
        y: panStartRef.current.offsetY + dy,
      });
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsPanning(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleNoteMove = useCallback(
    (noteId: string, x: number, y: number) => {
      const note = notes.find((n) => n.id === noteId);
      if (note) {
        onMoveNote({ ...note, x, y });
      }
    },
    [notes, onMoveNote]
  );

  return (
    <div
      ref={containerRef}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : 'default',
        background: `
          radial-gradient(circle at 25% 25%, rgba(15, 52, 96, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(44, 62, 80, 0.3) 0%, transparent 50%),
          ${STYLES.BG_MAIN}
        `,
        backgroundSize: '100% 100%',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isPanning ? 'none' : `transform ${ANIMATION.ZOOM_DURATION}ms ${ANIMATION.ZOOM_EASING}`,
          width: '10000px',
          height: '10000px',
          backgroundImage: `
            linear-gradient(rgba(44, 62, 80, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(44, 62, 80, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          willChange: 'transform',
        }}
      >
        {notes.map((note) => (
          <StickyNote
            key={note.id}
            note={note}
            isSelected={selectedNoteId === note.id}
            currentUser={currentUser}
            onMove={handleNoteMove}
            onUpdate={onUpdateNote}
            onDelete={onDeleteNote}
            onLongPress={() => onLongPressNote(note.id)}
            voteEnded={voteEnded}
          />
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          background: STYLES.BG_CARD,
          padding: '8px 14px',
          borderRadius: 8,
          fontSize: 12,
          color: STYLES.TEXT_PRIMARY,
          border: `1px solid ${STYLES.BORDER_DIVIDER}`,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <button
          onClick={() => setZoom((z) => Math.max(CANVAS.MIN_ZOOM, z * 0.8))}
          style={{ background: 'none', border: 'none', color: STYLES.TEXT_PRIMARY, cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
        >
          −
        </button>
        <span style={{ minWidth: 40, textAlign: 'center', fontFamily: 'monospace' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(CANVAS.MAX_ZOOM, z * 1.25))}
          style={{ background: 'none', border: 'none', color: STYLES.TEXT_PRIMARY, cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
        >
          +
        </button>
        <div style={{ width: 1, height: 16, background: STYLES.BORDER_DIVIDER }} />
        <button
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
          style={{ background: 'none', border: 'none', color: STYLES.TEXT_PRIMARY, cursor: 'pointer', fontSize: 12 }}
        >
          重置
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          fontSize: 11,
          color: '#64748b',
          lineHeight: 1.8,
        }}
      >
        <div>💡 双击画布创建便签</div>
        <div>🖱️ 滚轮缩放 · 中键/空白拖拽平移</div>
        <div>✍️ 长按便签发起投票</div>
      </div>
    </div>
  );
}
