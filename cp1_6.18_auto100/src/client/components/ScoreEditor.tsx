import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MIDI_NOTES, getNoteColor, quantizeValue, isBlackKey, midiToNoteName } from '../types.js';
import { useStore } from '../store.js';
import { audioEngine } from '../audioEngine.js';
import type { Note as NoteType } from '../types.js';
import { wsManager } from '../wsManager.js';

const CELL_WIDTH = 60;
const CELL_HEIGHT = 22;
const LEFT_PAD = 56;

interface DraggingState {
  noteId: string;
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
}

const ScoreEditor: React.FC = () => {
  const tracks = useStore((s) => s.tracks);
  const currentTrackId = useStore((s) => s.currentTrackId);
  const quantize = useStore((s) => s.quantize);
  const isPlaying = useStore((s) => s.isPlaying);
  const playbackHead = useStore((s) => s.playbackHead);
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const addHighlightedPitch = useStore((s) => s.addHighlightedPitch);
  const removeHighlightedPitch = useStore((s) => s.removeHighlightedPitch);
  const justUpdatedNotes = useStore((s) => s.justUpdatedNotes);
  const markNoteJustUpdated = useStore((s) => s.markNoteJustUpdated);
  const setCursor = useCallback((c: { x: number; y: number } | null) => wsManager.setCursor(c), []);

  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === currentTrackId),
    [tracks, currentTrackId]
  );

  const notes = currentTrack?.notes || [];

  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [conflictNoteId, setConflictNoteId] = useState<string | null>(null);
  const [visibleBeatCount, setVisibleBeatCount] = useState(16);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth - LEFT_PAD;
        const count = Math.max(16, Math.ceil(w / CELL_WIDTH) + 4);
        setVisibleBeatCount(count);
      }
    };
    update();
    window.addEventListener('resize', update);
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      window.removeEventListener('resize', update);
      ro.disconnect();
    };
  }, []);

  const MIN_MIDI = MIDI_NOTES.MIN_MIDI;
  const MAX_MIDI = MIDI_NOTES.MAX_MIDI;
  const ROWS = MAX_MIDI - MIN_MIDI + 1;
  const totalHeight = ROWS * CELL_HEIGHT;

  const maxEndNote = useMemo(() => {
    return notes.reduce((m, n) => Math.max(m, n.start + n.duration), 0);
  }, [notes]);
  const totalBeats = Math.max(visibleBeatCount, Math.ceil(maxEndNote) + 4);

  const midiToRow = (midi: number) => MAX_MIDI - midi;

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCursor({ x, y });

      if (dragging && scrollRef.current) {
        const scrollRect = scrollRef.current.getBoundingClientRect();
        const cx = e.clientX - scrollRect.left + scrollRef.current.scrollLeft - LEFT_PAD;
        const cy = e.clientY - scrollRect.top + scrollRef.current.scrollTop;
        setDragging({ ...dragging, currentX: cx, currentY: cy });
      }
    },
    [dragging, setCursor]
  );

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      const state = useStore.getState();
      const tr = state.tracks.find((t) => t.id === state.currentTrackId);
      const currentNotes = tr?.notes || [];
      const draggedNote = currentNotes.find((n) => n.id === dragging.noteId);

      const snapX = quantizeValue(
        Math.max(0, dragging.currentX / CELL_WIDTH),
        quantize
      );
      const snapRow = Math.round(dragging.currentY / CELL_HEIGHT);
      const snapMidi = Math.max(MIN_MIDI, Math.min(MAX_MIDI, MAX_MIDI - snapRow));

      let finalStart = snapX;
      let finalPitch = snapMidi;
      let hasConflict = false;

      const others = currentNotes.filter((n) => n.id !== dragging.noteId);
      for (const other of others) {
        if (
          other.pitch === finalPitch &&
          finalStart < other.start + other.duration &&
          finalStart + (draggedNote?.duration || 1) > other.start
        ) {
          finalStart = quantizeValue(other.start + other.duration, quantize);
          hasConflict = true;
        }
      }

      if (draggedNote && (finalStart !== draggedNote.start || finalPitch !== draggedNote.pitch)) {
        updateNote(dragging.noteId, { start: finalStart, pitch: finalPitch });
        markNoteJustUpdated(dragging.noteId);
        if (finalPitch !== draggedNote.pitch) {
          audioEngine.playNote(finalPitch, 0.15, currentTrack?.type || 'piano');
        }
      }

      if (hasConflict) {
        setConflictNoteId(dragging.noteId);
        setTimeout(() => setConflictNoteId(null), 500);
      }
    }
    setDragging(null);
  }, [dragging, quantize, updateNote, markNoteJustUpdated, currentTrack?.type]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const startDrag = (note: NoteType, e: React.MouseEvent) => {
    if (isPlaying) return;
    e.stopPropagation();
    e.preventDefault();
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const rect = scrollEl.getBoundingClientRect();
    const startX = e.clientX - rect.left + scrollEl.scrollLeft - LEFT_PAD;
    const startY = e.clientY - rect.top + scrollEl.scrollTop;
    const noteX = note.start * CELL_WIDTH;
    const noteY = midiToRow(note.pitch) * CELL_HEIGHT;
    setDragging({
      noteId: note.id,
      offsetX: startX - noteX,
      offsetY: startY - noteY,
      currentX: noteX,
      currentY: noteY,
    });
  };

  const onNoteDoubleClick = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) return;
    deleteNote(noteId);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, []);

  const quantStepPx = CELL_WIDTH / quantize;

  const renderGrid = () => {
    const lines: React.ReactNode[] = [];
    for (let b = 0; b <= totalBeats; b++) {
      const x = LEFT_PAD + b * CELL_WIDTH;
      lines.push(
        <line
          key={`vb-${b}`}
          x1={x}
          y1={0}
          x2={x}
          y2={totalHeight}
          stroke={b % 4 === 0 ? '#2a3a5c' : '#1a2540'}
          strokeWidth={b % 4 === 0 ? 1 : 0.5}
        />
      );
    }
    for (let q = 0; q <= totalBeats * quantize; q++) {
      if (q % quantize === 0) continue;
      const x = LEFT_PAD + q * quantStepPx;
      lines.push(
        <line
          key={`q-${q}`}
          x1={x}
          y1={0}
          x2={x}
          y2={totalHeight}
          stroke="#1a2540"
          strokeWidth={0.3}
          strokeDasharray="2,3"
        />
      );
    }
    for (let r = 0; r <= ROWS; r++) {
      const midi = MAX_MIDI - r + 1;
      const isC = midi % 12 === 0;
      lines.push(
        <line
          key={`hl-${r}`}
          x1={LEFT_PAD}
          y1={r * CELL_HEIGHT}
          x2={LEFT_PAD + totalBeats * CELL_WIDTH}
          y2={r * CELL_HEIGHT}
          stroke={isC ? '#2a3a5c' : '#1a2540'}
          strokeWidth={isC ? 1 : 0.5}
        />
      );
    }
    for (let r = 0; r < ROWS; r++) {
      const midi = MAX_MIDI - r;
      if (!isBlackKey(midi)) continue;
      lines.push(
        <rect
          key={`bg-${r}`}
          x={LEFT_PAD}
          y={r * CELL_HEIGHT}
          width={totalBeats * CELL_WIDTH}
          height={CELL_HEIGHT}
          fill="rgba(255,255,255,0.015)"
        />
      );
    }
    return lines;
  };

  const renderNote = (note: NoteType) => {
    let x: number, y: number, w: number, h: number;
    if (dragging && dragging.noteId === note.id) {
      x = Math.max(0, dragging.currentX - dragging.offsetX);
      y = Math.max(0, Math.min(totalHeight - CELL_HEIGHT, dragging.currentY - dragging.offsetY));
      const snappedX = quantizeValue(x / CELL_WIDTH, quantize);
      const snapRow = Math.round(y / CELL_HEIGHT);
      x = snappedX * CELL_WIDTH;
      y = snapRow * CELL_HEIGHT;
    } else {
      x = note.start * CELL_WIDTH;
      y = midiToRow(note.pitch) * CELL_HEIGHT;
    }
    w = Math.max(CELL_WIDTH * 0.25, note.duration * CELL_WIDTH - 3);
    h = CELL_HEIGHT - 3;
    const color = getNoteColor(note.pitch);
    const isJustUpdated = justUpdatedNotes.has(note.id);
    const isConflict = conflictNoteId === note.id;

    return (
      <g key={note.id}>
        {dragging?.noteId === note.id && (
          <>
            <line
              x1={LEFT_PAD + x}
              y1={0}
              x2={LEFT_PAD + x}
              y2={totalHeight}
              stroke="rgba(120, 200, 255, 0.4)"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            <line
              x1={LEFT_PAD}
              y1={y}
              x2={LEFT_PAD + totalBeats * CELL_WIDTH}
              y2={y}
              stroke="rgba(120, 200, 255, 0.4)"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            <line
              x1={LEFT_PAD}
              y1={y + h + 3}
              x2={LEFT_PAD + totalBeats * CELL_WIDTH}
              y2={y + h + 3}
              stroke="rgba(120, 200, 255, 0.25)"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          </>
        )}
        <foreignObject x={LEFT_PAD + x} y={y} width={w + 3} height={h + 3}>
          <div
            onMouseDown={(e) => startDrag(note, e)}
            onDoubleClick={(e) => onNoteDoubleClick(note.id, e)}
            onMouseEnter={() => {
              if (!dragging && !isPlaying) {
                addHighlightedPitch(note.pitch);
                audioEngine.playNote(note.pitch, 0.1, currentTrack?.type || 'piano');
              }
            }}
            onMouseLeave={() => {
              if (!dragging) removeHighlightedPitch(note.pitch);
            }}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 6,
              background: color,
              boxShadow: `inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.3), 0 0 8px ${color}55`,
              border: `1px solid rgba(255,255,255,0.25)`,
              cursor: isPlaying ? 'not-allowed' : 'grab',
              transition: isJustUpdated ? 'box-shadow 0.3s ease' : 'none',
              animation: isConflict
                ? 'noteShake 0.45s ease'
                : isJustUpdated
                ? 'noteInsert 0.3s cubic-bezier(0.34,1.56,0.64,1)'
                : dragging?.noteId === note.id
                ? 'noteFloat 0.15s ease forwards'
                : 'none',
              transform: dragging?.noteId === note.id ? 'scale(1.02)' : undefined,
              opacity: isPlaying ? 0.9 : 1,
              pointerEvents: isPlaying ? 'none' : 'auto',
            }}
          />
        </foreignObject>
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        flex: 1,
        minHeight: 0,
        background: 'rgba(12, 18, 32, 0.6)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        @keyframes noteInsert {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes noteShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        @keyframes noteFloat {
          0% { filter: brightness(1); }
          100% { filter: brightness(1.15); }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .pitch-label {
          font-size: 10px;
          color: #8a9cbd;
          text-align: right;
          padding-right: 6px;
          pointer-events: none;
          user-select: none;
        }
      `}</style>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: LEFT_PAD + totalBeats * CELL_WIDTH,
            height: totalHeight,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: LEFT_PAD,
              height: totalHeight,
              background: 'rgba(10, 15, 28, 0.9)',
              zIndex: 3,
              borderRight: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {Array.from({ length: ROWS }, (_, r) => {
              const midi = MAX_MIDI - r;
              if (midi % 12 !== 0) return null;
              return (
                <div
                  key={`pl-${midi}`}
                  className="pitch-label"
                  style={{
                    position: 'absolute',
                    top: r * CELL_HEIGHT,
                    height: CELL_HEIGHT,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    borderTop: midi % 12 === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  }}
                >
                  {midiToNoteName(midi)}
                </div>
              );
            })}
          </div>

          <svg
            width={LEFT_PAD + totalBeats * CELL_WIDTH}
            height={totalHeight}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            {renderGrid()}
            {notes.map(renderNote)}
            <line
              x1={LEFT_PAD + playbackHead * CELL_WIDTH}
              y1={0}
              x2={LEFT_PAD + playbackHead * CELL_WIDTH}
              y2={totalHeight}
              stroke="#ffdd57"
              strokeWidth={2.5}
              strokeLinecap="round"
              style={{
                filter: 'drop-shadow(0 0 6px rgba(255, 221, 87, 0.8))',
                animation: isPlaying ? 'none' : 'cursorBlink 1.2s ease-in-out infinite',
              }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ScoreEditor;
