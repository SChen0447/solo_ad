import React, { useRef, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Stroke,
  StickyNoteData,
  StickyNoteColor,
  User,
  RemoteCursor,
  TrailPoint,
  Point
} from './types';
import { socketClient } from './socketClient';
import { ToolBar } from './ToolBar';
import { StickyNote } from './StickyNote';

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

export const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const dprRef = useRef(1);

  const [initialized, setInitialized] = useState(false);
  const [userName, setUserName] = useState('');
  const [userColor, setUserColor] = useState('');
  const [currentColor, setCurrentColor] = useState('#1a1a1a');
  const [currentWidth, setCurrentWidth] = useState(4);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [notes, setNotes] = useState<StickyNoteData[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [versions, setVersions] = useState<{ version: number; timestamp: number }[]>([]);
  const [remoteTrails, setRemoteTrails] = useState<Map<string, TrailPoint[]>>(new Map());
  const [remoteDraggingNotes, setRemoteDraggingNotes] = useState<Set<string>>(new Set());

  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const undoStackRef = useRef<{ strokes: Stroke[]; notes: StickyNoteData[] }[]>([]);
  const redoStackRef = useRef<{ strokes: Stroke[]; notes: StickyNoteData[] }[]>([]);
  const lastBroadcastRef = useRef(0);
  const cursorTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const addToUndoStack = useCallback(() => {
    undoStackRef.current.push({
      strokes: JSON.parse(JSON.stringify(strokes)),
      notes: JSON.parse(JSON.stringify(notes))
    });
    if (undoStackRef.current.length > 50) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
  }, [strokes, notes]);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) {
      if (stroke.points.length === 1) {
        const p = stroke.points[0];
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = stroke.color;
        ctx.beginPath();
        ctx.arc(p.x + p.jitterX, p.y + p.jitterY, stroke.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      return;
    }

    const totalPoints = stroke.points.length;

    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < totalPoints; i++) {
      const prev = stroke.points[i - 1];
      const curr = stroke.points[i];

      const fadeStart = Math.max(0, totalPoints - 12);
      let alpha = 1;
      let widthScale = 1;

      if (i >= fadeStart) {
        const fadeProgress = (i - fadeStart) / (totalPoints - fadeStart);
        alpha = 1 - fadeProgress * 0.85;
        widthScale = 1 - fadeProgress * 0.6;
      }

      alpha = Math.min(alpha, curr.alpha);

      ctx.globalAlpha = alpha;
      ctx.lineWidth = stroke.width * widthScale;
      ctx.beginPath();
      ctx.moveTo(prev.x + prev.jitterX, prev.y + prev.jitterY);
      ctx.lineTo(curr.x + curr.jitterX, curr.y + curr.jitterY);
      ctx.stroke();
    }

    ctx.restore();
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach(stroke => drawStroke(ctx, stroke));

    if (currentStrokeRef.current) {
      drawStroke(ctx, currentStrokeRef.current);
    }
  }, [strokes, drawStroke]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const w = container.clientWidth;
    const h = container.clientHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    setCanvasSize({ width: w, height: h });
    redrawCanvas();
  }, [redrawCanvas]);

  const createJitteredPoint = (x: number, y: number, progress: number): Point => {
    const jitterAmount = currentWidth > 8 ? 1.5 : currentWidth > 4 ? 1 : 0.6;
    return {
      x,
      y,
      jitterX: (Math.random() - 0.5) * jitterAmount,
      jitterY: (Math.random() - 0.5) * jitterAmount,
      alpha: progress > 0.85 ? 1 - (progress - 0.85) * 4 : 1
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (editingNoteId) return;
    if (e.button !== 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isDrawingRef.current = true;
    const strokeId = uuidv4();

    const stroke: Stroke = {
      id: strokeId,
      points: [createJitteredPoint(x, y, 0)],
      color: currentColor,
      width: currentWidth,
      userId: socketClient.getUserId(),
      version: 0
    };

    currentStrokeRef.current = stroke;
    socketClient.strokeStart(stroke);
    lastBroadcastRef.current = Date.now();
    redrawCanvas();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (initialized) {
      socketClient.cursorMove(x, y);
    }

    if (!isDrawingRef.current || !currentStrokeRef.current) return;

    const stroke = currentStrokeRef.current;
    const lastPt = stroke.points[stroke.points.length - 1];
    const dist = Math.sqrt((x - lastPt.x) ** 2 + (y - lastPt.y) ** 2);

    if (dist < 1.5) return;

    const point = createJitteredPoint(x, y, 0);
    stroke.points.push(point);

    const now = Date.now();
    if (now - lastBroadcastRef.current > 16) {
      socketClient.strokeContinue(stroke.id, [point]);
      lastBroadcastRef.current = now;
    }

    redrawCanvas();
  };

  const handleMouseUp = () => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;

    const stroke = currentStrokeRef.current;

    const lastBatch = stroke.points.slice(stroke.points.length - Math.min(20, stroke.points.length));
    if (lastBatch.length > 0) {
      socketClient.strokeContinue(stroke.id, lastBatch);
    }

    socketClient.strokeEnd(stroke.id);

    addToUndoStack();
    setStrokes(prev => [...prev, stroke]);

    isDrawingRef.current = false;
    currentStrokeRef.current = null;
    redrawCanvas();
  };

  const handleUndo = () => {
    if (undoStackRef.current.length === 0) return;

    redoStackRef.current.push({
      strokes: JSON.parse(JSON.stringify(strokes)),
      notes: JSON.parse(JSON.stringify(notes))
    });

    const prev = undoStackRef.current.pop()!;

    if (strokes.length > prev.strokes.length) {
      const removedStroke = strokes[strokes.length - 1];
      if (removedStroke && removedStroke.userId === socketClient.getUserId()) {
        socketClient.strokeUndo(removedStroke.id);
      }
    }

    setStrokes(prev.strokes);
    setNotes(prev.notes);
  };

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;

    undoStackRef.current.push({
      strokes: JSON.parse(JSON.stringify(strokes)),
      notes: JSON.parse(JSON.stringify(notes))
    });

    const next = redoStackRef.current.pop()!;
    setStrokes(next.strokes);
    setNotes(next.notes);
  };

  const handleAddStickyNote = (x: number, y: number, color: StickyNoteColor) => {
    addToUndoStack();
    const note: StickyNoteData = {
      id: uuidv4(),
      x,
      y,
      width: 200,
      height: 160,
      text: '',
      color,
      userId: socketClient.getUserId(),
      zIndex: Date.now(),
      version: 0
    };
    socketClient.noteCreate(note);
    setNotes(prev => [...prev, note]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const color = e.dataTransfer.getData('text/plain') as StickyNoteColor;
    if (!color) return;

    const container = canvasContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left - 100;
    const y = e.clientY - rect.top - 80;
    handleAddStickyNote(x, y, color);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleNoteUpdate = (updatedNote: StickyNoteData) => {
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
  };

  const handleBringToFront = (noteId: string) => {
    setNotes(prev => {
      const maxZ = Math.max(...prev.map(n => n.zIndex), 0);
      return prev.map(n => n.id === noteId ? { ...n, zIndex: maxZ + 1 } : n);
    });
  };

  const handleRestoreVersion = async (version: number) => {
    try {
      await fetch(`/api/restore/${version}`, { method: 'POST' });
    } catch (e) {
      console.error('恢复版本失败:', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const data = await socketClient.connect();
        setUserName(data.userName);
        setUserColor(data.userColor);
        setStrokes(data.canvasState.strokes);
        setNotes(data.canvasState.notes);
        setUsers(data.users);
        setInitialized(true);

        const res = await fetch('/api/versions');
        const verData = await res.json();
        setVersions(verData);
      } catch (err) {
        console.error('连接失败:', err);
      }
    };
    init();

    return () => {
      socketClient.disconnect();
    };
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const handleUserJoined = (user: User) => {
      setUsers(prev => {
        if (prev.find(u => u.id === user.id)) return prev;
        return [...prev, user];
      });
    };

    const handleUserLeft = (userId: string) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setRemoteCursors(prev => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    };

    const handleStrokeStart = (data: { stroke: Stroke; userId: string }) => {
      if (data.userId === socketClient.getUserId()) return;
      setStrokes(prev => {
        if (prev.find(s => s.id === data.stroke.id)) return prev;
        return [...prev, data.stroke];
      });
    };

    const handleStrokeContinue = (data: { strokeId: string; points: Point[]; userId: string }) => {
      if (data.userId === socketClient.getUserId()) return;
      setStrokes(prev => prev.map(s =>
        s.id === data.strokeId
          ? { ...s, points: [...s.points, ...data.points] }
          : s
      ));
    };

    const handleStrokeUndo = (data: { strokeId: string; userId: string }) => {
      setStrokes(prev => prev.filter(s => s.id !== data.strokeId));
    };

    const handleNoteCreate = (data: { note: StickyNoteData; userId: string }) => {
      if (data.userId === socketClient.getUserId()) return;
      setNotes(prev => {
        if (prev.find(n => n.id === data.note.id)) return prev;
        return [...prev, data.note];
      });
    };

    const handleNoteUpdate = (data: { note: StickyNoteData; userId: string }) => {
      if (data.userId === socketClient.getUserId()) return;
      setNotes(prev => prev.map(n =>
        n.id === data.note.id ? { ...n, ...data.note } : n
      ));
    };

    const handleNoteMove = (data: { noteId: string; x: number; y: number; userId: string }) => {
      if (data.userId === socketClient.getUserId()) return;
      setRemoteDraggingNotes(prev => new Set(prev).add(data.noteId));
      setNotes(prev => prev.map(n =>
        n.id === data.noteId ? { ...n, x: data.x, y: data.y } : n
      ));
    };

    const handleNoteMoveEnd = (data: { noteId: string; x: number; y: number; userId: string }) => {
      if (data.userId === socketClient.getUserId()) return;
      setRemoteDraggingNotes(prev => {
        const s = new Set(prev);
        s.delete(data.noteId);
        return s;
      });
      setNotes(prev => prev.map(n =>
        n.id === data.noteId ? { ...n, x: data.x, y: data.y } : n
      ));
    };

    const handleNoteDelete = (data: { noteId: string; userId: string }) => {
      setNotes(prev => prev.filter(n => n.id !== data.noteId));
    };

    const handleCursorMove = (data: { x: number; y: number; userId: string }) => {
      if (data.userId === socketClient.getUserId()) return;

      setRemoteCursors(prev => {
        const next = new Map(prev);
        next.set(data.userId, {
          userId: data.userId,
          x: data.x,
          y: data.y,
          lastSeen: Date.now()
        });
        return next;
      });

      const existing = cursorTimeoutRef.current.get(data.userId);
      if (existing) clearTimeout(existing);
      const timeout = setTimeout(() => {
        setRemoteCursors(prev => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
      }, 3000);
      cursorTimeoutRef.current.set(data.userId, timeout);
    };

    const handleTrailUpdate = (data: { elementId: string; trail: TrailPoint[]; userId: string }) => {
      if (data.userId === socketClient.getUserId()) return;
      setRemoteTrails(prev => {
        const next = new Map(prev);
        if (data.trail.length === 0) {
          next.delete(data.elementId);
        } else {
          next.set(data.elementId, data.trail);
        }
        return next;
      });
    };

    const handleCanvasRestored = (data: { strokes: Stroke[]; notes: StickyNoteData[]; version: number }) => {
      setStrokes(data.strokes);
      setNotes(data.notes);
      undoStackRef.current = [];
      redoStackRef.current = [];
    };

    socketClient.on('user-joined', handleUserJoined as (...args: unknown[]) => void);
    socketClient.on('user-left', handleUserLeft as (...args: unknown[]) => void);
    socketClient.on('stroke-start', handleStrokeStart as (...args: unknown[]) => void);
    socketClient.on('stroke-continue', handleStrokeContinue as (...args: unknown[]) => void);
    socketClient.on('stroke-undo', handleStrokeUndo as (...args: unknown[]) => void);
    socketClient.on('note-create', handleNoteCreate as (...args: unknown[]) => void);
    socketClient.on('note-update', handleNoteUpdate as (...args: unknown[]) => void);
    socketClient.on('note-move', handleNoteMove as (...args: unknown[]) => void);
    socketClient.on('note-move-end', handleNoteMoveEnd as (...args: unknown[]) => void);
    socketClient.on('note-delete', handleNoteDelete as (...args: unknown[]) => void);
    socketClient.on('cursor-move', handleCursorMove as (...args: unknown[]) => void);
    socketClient.on('trail-update', handleTrailUpdate as (...args: unknown[]) => void);
    socketClient.on('canvas-restored', handleCanvasRestored as (...args: unknown[]) => void);

    return () => {
      socketClient.off('user-joined', handleUserJoined as (...args: unknown[]) => void);
      socketClient.off('user-left', handleUserLeft as (...args: unknown[]) => void);
      socketClient.off('stroke-start', handleStrokeStart as (...args: unknown[]) => void);
      socketClient.off('stroke-continue', handleStrokeContinue as (...args: unknown[]) => void);
      socketClient.off('stroke-undo', handleStrokeUndo as (...args: unknown[]) => void);
      socketClient.off('note-create', handleNoteCreate as (...args: unknown[]) => void);
      socketClient.off('note-update', handleNoteUpdate as (...args: unknown[]) => void);
      socketClient.off('note-move', handleNoteMove as (...args: unknown[]) => void);
      socketClient.off('note-move-end', handleNoteMoveEnd as (...args: unknown[]) => void);
      socketClient.off('note-delete', handleNoteDelete as (...args: unknown[]) => void);
      socketClient.off('cursor-move', handleCursorMove as (...args: unknown[]) => void);
      socketClient.off('trail-update', handleTrailUpdate as (...args: unknown[]) => void);
      socketClient.off('canvas-restored', handleCanvasRestored as (...args: unknown[]) => void);
    };
  }, []);

  const sortedNotes = [...notes].sort((a, b) => a.zIndex - b.zIndex);

  if (!initialized) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 20
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: '4px solid #3498DB',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ fontSize: 14, color: '#7f8c8d', fontWeight: 500 }}>连接到协作服务器...</div>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #3498DB;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(52,152,219,0.3);
          transition: all 150ms ${EASE};
        }
        input[type=range]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        input[type=range]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #3498DB;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(52,152,219,0.3);
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.25); }
      `}</style>

      <ToolBar
        currentColor={currentColor}
        setCurrentColor={setCurrentColor}
        currentWidth={currentWidth}
        setCurrentWidth={setCurrentWidth}
        onAddStickyNote={handleAddStickyNote}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStackRef.current.length > 0}
        canRedo={redoStackRef.current.length > 0}
        onRestoreVersion={handleRestoreVersion}
        versions={versions}
        userName={userName}
        userColor={userColor}
      />

      <div
        ref={canvasContainerRef}
        className="canvas-container"
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          right: 300,
          bottom: 20,
          backgroundColor: 'rgba(255, 255, 255, 0.35)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
          overflow: 'hidden'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => { if (editingNoteId) setEditingNoteId(null); }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            cursor: editingNoteId ? 'default' : 'crosshair'
          }}
        />

        {sortedNotes.map(note => (
          <div key={note.id} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto' }}>
              <StickyNote
                note={note}
                isEditing={editingNoteId === note.id}
                onStartEdit={setEditingNoteId}
                onEndEdit={() => setEditingNoteId(null)}
                onUpdate={handleNoteUpdate}
                onBringToFront={handleBringToFront}
                isRemoteDragging={remoteDraggingNotes.has(note.id)}
              />
            </div>
            {remoteTrails.get(note.id) && remoteTrails.get(note.id)!.length > 1 && (
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: canvasSize.width,
                  height: canvasSize.height,
                  pointerEvents: 'none'
                }}
              >
                <polyline
                  fill="none"
                  stroke="rgba(52, 152, 219, 0.4)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={remoteTrails.get(note.id)!.map(p => `${p.x},${p.y}`).join(' ')}
                  style={{
                    strokeDasharray: '8 4',
                    animation: 'dash 0.6s linear infinite'
                  }}
                />
                <defs>
                  <style>{`
                    @keyframes dash { to { stroke-dashoffset: -12; } }
                  `}</style>
                </defs>
              </svg>
            )}
          </div>
        ))}

        {Array.from(remoteCursors.values()).map(cursor => {
          const user = users.find(u => u.id === cursor.userId);
          if (!user) return null;
          const age = Date.now() - cursor.lastSeen;
          const opacity = age > 2000 ? Math.max(0.3, 1 - (age - 2000) / 1000) : 1;
          return (
            <div
              key={cursor.userId}
              style={{
                position: 'absolute',
                left: cursor.x,
                top: cursor.y,
                pointerEvents: 'none',
                opacity,
                transition: 'opacity 300ms ease-out',
                zIndex: 99999
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                style={{
                  transform: 'translate(-2px, -2px)',
                  filter: `drop-shadow(0 2px 4px ${user.color}66)`
                }}
              >
                <path
                  d="M3 3l7.5 18 2.5-7.5L20.5 11 3 3z"
                  fill={user.color}
                  stroke="#fff"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  top: 22,
                  left: 14,
                  backgroundColor: user.color,
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  whiteSpace: 'nowrap',
                  boxShadow: `0 2px 8px ${user.color}55`
                }}
              >
                {user.name}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 24,
          left: 28,
          backgroundColor: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 16,
          padding: '10px 14px 10px 12px',
          border: '1px solid rgba(255,255,255,0.8)',
          boxShadow: '0 6px 24px rgba(0,0,0,0.06)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        {users.map(user => (
          <div
            key={user.id}
            style={{ position: 'relative' }}
            onMouseEnter={() => setHoveredUser(user.id)}
            onMouseLeave={() => setHoveredUser(null)}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                backgroundColor: user.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                boxShadow: `0 2px 8px ${user.color}55`,
                border: user.id === socketClient.getUserId() ? '2px solid #fff' : 'none',
                transition: `transform 200ms ${EASE}`,
                cursor: 'pointer',
                transform: hoveredUser === user.id ? 'scale(1.18) translateY(-2px)' : 'scale(1)',
                zIndex: hoveredUser === user.id ? 10 : 1
              }}
            >
              {user.name.slice(0, 1)}
            </div>
            {hoveredUser === user.id && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 42,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(44,62,80,0.92)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '6px 10px',
                  borderRadius: 8,
                  whiteSpace: 'nowrap',
                  animation: 'fadeIn 180ms ease-out',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)'
                }}
              >
                {user.name}
                {user.id === socketClient.getUserId() && (
                  <span style={{ opacity: 0.6, marginLeft: 4 }}>(你)</span>
                )}
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    border: '5px solid transparent',
                    borderTopColor: 'rgba(44,62,80,0.92)'
                  }}
                />
              </div>
            )}
          </div>
        ))}
        <div
          style={{
            width: 1,
            height: 22,
            backgroundColor: 'rgba(0,0,0,0.08)',
            margin: '0 4px'
          }}
        />
        <div
          style={{
            fontSize: 11,
            color: '#7f8c8d',
            fontWeight: 500,
            paddingRight: 4
          }}
        >
          {users.length} 在线
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          top: 28,
          left: 32,
          zIndex: 1000,
          pointerEvents: 'none'
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: '#2c3e50', letterSpacing: 0.3 }}>
          🎨 协作白板
        </div>
        <div style={{ fontSize: 11, color: '#95a5a6', marginTop: 4, marginLeft: 2 }}>
          实时协作 · 共 {strokes.length} 条笔迹 · 共 {notes.length} 张便签
        </div>
      </div>
    </div>
  );
};
