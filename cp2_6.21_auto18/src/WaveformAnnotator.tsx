import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { Note, Theme } from './types';
import { formatTime, clamp } from './utils';

interface WaveformAnnotatorProps {
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  notes: Note[];
  onSeek: (time: number) => void;
  onAddNote: (time: number, text: string) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  theme: Theme;
}

const WaveformAnnotator: React.FC<WaveformAnnotatorProps> = ({
  audioBuffer,
  currentTime,
  duration,
  notes,
  onSeek,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  theme,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(120);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteInputPosition, setNoteInputPosition] = useState({ x: 0, y: 0 });
  const [noteInputTime, setNoteInputTime] = useState(0);
  const [noteInputText, setNoteInputText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [showAssistLine, setShowAssistLine] = useState(false);
  const [assistLineX, setAssistLineX] = useState(0);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => a.time - b.time),
    [notes]
  );

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setCanvasWidth(width);
        const isMobile = window.innerWidth < 768;
        setCanvasHeight(isMobile ? 80 : 120);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer || canvasWidth === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);

    const bgColor = theme === 'dark' ? '#0F0F23' : '#F5F7FA';
    const waveColor = '#4A90D9';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const channelData = audioBuffer.getChannelData(0);
    const samples = canvasWidth * 2;
    const blockSize = Math.floor(channelData.length / samples);
    const filteredData: number[] = [];

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[i * blockSize + j] || 0);
      }
      filteredData.push(sum / blockSize);
    }

    const maxVal = Math.max(...filteredData, 0.01);
    const centerY = canvasHeight / 2;
    const amplitude = (canvasHeight * 0.8) / 2;

    ctx.beginPath();
    ctx.strokeStyle = waveColor;
    ctx.lineWidth = 1;

    for (let i = 0; i < canvasWidth; i++) {
      const dataIndex = i * 2;
      const val = (filteredData[dataIndex] || 0) / maxVal;
      const x = i;
      const y = centerY - val * amplitude;
      const yBottom = centerY + val * amplitude;

      ctx.moveTo(x, y);
      ctx.lineTo(x, yBottom);
    }

    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, 'rgba(74, 144, 217, 0.3)');
    gradient.addColorStop(0.5, 'rgba(74, 144, 217, 0.6)');
    gradient.addColorStop(1, 'rgba(74, 144, 217, 0.3)');

    ctx.fillStyle = gradient;
    for (let i = 0; i < canvasWidth; i++) {
      const dataIndex = i * 2;
      const val = (filteredData[dataIndex] || 0) / maxVal;
      const x = i;
      const yTop = centerY - val * amplitude;
      const yBottom = centerY + val * amplitude;
      ctx.fillRect(x, yTop, 1, yBottom - yTop);
    }
  }, [audioBuffer, canvasWidth, canvasHeight, theme]);

  const timeToX = useCallback(
    (time: number) => {
      if (duration <= 0) return 0;
      return (time / duration) * canvasWidth;
    },
    [duration, canvasWidth]
  );

  const xToTime = useCallback(
    (x: number) => {
      if (canvasWidth <= 0) return 0;
      return (x / canvasWidth) * duration;
    },
    [canvasWidth, duration]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !duration) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = xToTime(x);

      if (draggingNoteId) return;

      setNoteInputPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top + 10 });
      setNoteInputTime(time);
      setNoteInputText('');
      setEditingNoteId(null);
      setShowNoteInput(true);
    },
    [duration, xToTime, draggingNoteId]
  );

  const handleNoteSubmit = useCallback(() => {
    if (!noteInputText.trim()) {
      setShowNoteInput(false);
      return;
    }

    if (editingNoteId) {
      const note = notes.find((n) => n.id === editingNoteId);
      if (note) {
        onUpdateNote({ ...note, text: noteInputText, time: noteInputTime });
      }
    } else {
      onAddNote(noteInputTime, noteInputText);
    }

    setShowNoteInput(false);
    setNoteInputText('');
    setEditingNoteId(null);
  }, [noteInputText, noteInputTime, editingNoteId, notes, onAddNote, onUpdateNote]);

  const handleNoteKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleNoteSubmit();
      } else if (e.key === 'Escape') {
        setShowNoteInput(false);
        setNoteInputText('');
        setEditingNoteId(null);
      }
    },
    [handleNoteSubmit]
  );

  const handleNoteCardClick = useCallback(
    (note: Note, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingNoteId(note.id);
      setNoteInputText(note.text);
      setNoteInputTime(note.time);
      const x = timeToX(note.time);
      setNoteInputPosition({ x, y: canvasHeight + 10 });
      setShowNoteInput(true);
    },
    [timeToX, canvasHeight]
  );

  const handleNoteCardRightClick = useCallback(
    (note: Note, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDeletingNoteId(note.id);
      setTimeout(() => {
        onDeleteNote(note.id);
        setDeletingNoteId(null);
      }, 200);
    },
    [onDeleteNote]
  );

  const handleMarkerMouseDown = useCallback(
    (note: Note, e: React.MouseEvent) => {
      e.stopPropagation();
      setDraggingNoteId(note.id);
      setShowAssistLine(true);
      setAssistLineX(timeToX(note.time));
    },
    [timeToX]
  );

  useEffect(() => {
    if (!draggingNoteId) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = clamp(e.clientX - rect.left, 0, canvasWidth);
      setAssistLineX(x);

      const note = notes.find((n) => n.id === draggingNoteId);
      if (note) {
        const time = xToTime(x);
        onUpdateNote({ ...note, time });
      }
    };

    const handleMouseUp = () => {
      setDraggingNoteId(null);
      setShowAssistLine(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNoteId, canvasWidth, notes, xToTime, onUpdateNote]);

  const playheadX = timeToX(currentTime);

  return (
    <div style={styles.container} ref={containerRef}>
      <div style={styles.waveformWrapper}>
        <canvas
          ref={canvasRef}
          style={{
            ...styles.canvas,
            width: canvasWidth,
            height: canvasHeight,
          }}
          onClick={handleCanvasClick}
        />

        <div
          style={{
            ...styles.playhead,
            left: playheadX,
            height: canvasHeight,
          }}
        />

        {sortedNotes.map((note) => (
          <div
            key={note.id}
            onMouseDown={(e) => handleMarkerMouseDown(note, e)}
            style={{
              ...styles.noteMarker,
              left: timeToX(note.time),
              height: canvasHeight,
              cursor: draggingNoteId === note.id ? 'grabbing' : 'grab',
            }}
            title={`${formatTime(note.time)} - ${note.text}`}
          />
        ))}

        {showAssistLine && (
          <div
            style={{
              ...styles.assistLine,
              left: assistLineX,
              height: canvasHeight,
            }}
          />
        )}

        {showNoteInput && (
          <div
            style={{
              ...styles.noteInputWrapper,
              left: Math.min(
                Math.max(noteInputPosition.x - 100, 0),
                canvasWidth - 200
              ),
              top: Math.max(
                noteInputPosition.y - 80,
                10
              ),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.noteInputTimeLabel}>
              {formatTime(noteInputTime)}
            </div>
            <input
              type="text"
              value={noteInputText}
              onChange={(e) => setNoteInputText(e.target.value)}
              onKeyDown={handleNoteKeyDown}
              autoFocus
              placeholder="输入笔记内容..."
              style={styles.noteInput}
            />
            <div style={styles.noteInputActions}>
              <button
                onClick={() => {
                  setShowNoteInput(false);
                  setNoteInputText('');
                  setEditingNoteId(null);
                }}
                style={styles.cancelBtn}
              >
                取消
              </button>
              <button onClick={handleNoteSubmit} style={styles.saveBtn}>
                {editingNoteId ? '更新' : '添加'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={styles.notesContainer}>
        {sortedNotes.map((note) => (
          <div
            key={note.id}
            onClick={(e) => handleNoteCardClick(note, e)}
            onContextMenu={(e) => handleNoteCardRightClick(note, e)}
            style={{
              ...styles.noteCard,
              left: `${(note.time / Math.max(duration, 0.01)) * 100}%`,
              transform: 'translateX(-50%)',
              opacity: deletingNoteId === note.id ? 0 : 1,
              transformOrigin: 'center',
              transition: 'opacity 0.2s ease, transform 0.2s ease',
            }}
            className={deletingNoteId === note.id ? 'note-card-exit' : ''}
            title="点击编辑，右键删除"
          >
            <div style={styles.noteCardTime}>{formatTime(note.time)}</div>
            <div style={styles.noteCardText}>{note.text || '(空笔记)'}</div>
          </div>
        ))}
      </div>

      <div style={styles.timeLabels}>
        <span style={styles.timeLabel}>0:00</span>
        <span style={styles.timeLabel}>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '8px',
    padding: '16px',
    position: 'relative',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    borderBottom: '1px solid #2A2A40',
  },
  waveformWrapper: {
    position: 'relative',
    width: '100%',
    flexShrink: 0,
  },
  canvas: {
    display: 'block',
    borderRadius: '4px',
    cursor: 'crosshair',
  },
  playhead: {
    position: 'absolute',
    top: 0,
    width: '1px',
    backgroundColor: '#FF0000',
    pointerEvents: 'none',
    zIndex: 10,
  },
  noteMarker: {
    position: 'absolute',
    top: 0,
    width: '2px',
    backgroundColor: '#FF6B6B',
    border: 'none',
    pointerEvents: 'auto',
    zIndex: 5,
  },
  assistLine: {
    position: 'absolute',
    top: 0,
    width: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    pointerEvents: 'none',
    zIndex: 8,
  },
  noteInputWrapper: {
    position: 'absolute',
    width: '200px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '10px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  noteInputTimeLabel: {
    fontSize: '11px',
    color: '#666',
    fontFamily: 'monospace',
  },
  noteInput: {
    width: '100%',
    padding: '6px 8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#333',
    backgroundColor: '#fff',
  },
  noteInputActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '6px',
  },
  cancelBtn: {
    padding: '4px 10px',
    fontSize: '11px',
    borderRadius: '4px',
    backgroundColor: '#f0f0f0',
    color: '#666',
    border: 'none',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '4px 10px',
    fontSize: '11px',
    borderRadius: '4px',
    backgroundColor: '#4A90D9',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
  },
  notesContainer: {
    position: 'relative',
    width: '100%',
    minHeight: '80px',
    marginTop: '16px',
    flex: 1,
    overflowX: 'auto',
    overflowY: 'hidden',
  },
  noteCard: {
    position: 'absolute',
    width: '160px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '6px',
    padding: '8px 10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none',
  },
  noteCardTime: {
    fontSize: '11px',
    color: 'var(--accent-blue)',
    fontFamily: 'monospace',
    marginBottom: '4px',
  },
  noteCardText: {
    fontSize: '12px',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    lineHeight: '1.4',
  },
  timeLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
    flexShrink: 0,
  },
  timeLabel: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontFamily: 'monospace',
  },
};

export default WaveformAnnotator;
