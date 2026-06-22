import React, { useRef, useEffect, useState, useCallback } from 'react';
import gsap from 'gsap';
import type { StickyNote, Connection, Snapshot } from './App';

interface CanvasProps {
  notes: StickyNote[];
  connections: Connection[];
  userId: string;
  userColor: string;
  selectedNoteIds: Set<string>;
  onAddNote: (x: number, y: number, text: string) => void;
  onMoveNote: (id: string, x: number, y: number) => void;
  onUpdateNote: (note: Partial<StickyNote> & { id: string }) => void;
  onDeleteNote: (id: string) => void;
  onAddConnection: (fromId: string, toId: string) => void;
  onDeleteConnection: (id: string) => void;
  onToggleSelect: (noteId: string) => void;
  snapshots: Snapshot[];
  onSnapshotReplay: (state: Snapshot['state']) => void;
}

const NOTE_W = 200;
const NOTE_H = 140;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;

const PRESET_COLORS = [
  { name: '霓虹蓝', value: '#00e5ff' },
  { name: '青色', value: '#18ffff' },
  { name: '紫色', value: '#7c4dff' },
  { name: '橙色', value: '#ffab40' },
  { name: '粉色', value: '#ff4081' },
];

const Canvas: React.FC<CanvasProps> = ({
  notes,
  connections,
  selectedNoteIds,
  onAddNote,
  onMoveNote,
  onUpdateNote,
  onDeleteNote,
  onAddConnection,
  onDeleteConnection,
  onToggleSelect,
  snapshots,
  onSnapshotReplay,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOrigin, setPanOrigin] = useState({ x: 0, y: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [mouseWorld, setMouseWorld] = useState({ x: 0, y: 0 });
  const [activeSnapshotIdx, setActiveSnapshotIdx] = useState(-1);
  const [isReplaying, setIsReplaying] = useState(false);
  const [colorPickerForNoteId, setColorPickerForNoteId] = useState<string | null>(null);
  const [sliderDragging, setSliderDragging] = useState(false);
  const [sliderValue, setSliderValue] = useState(-1);

  const notePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const noteColorRefs = useRef<Map<string, { border: HTMLDivElement | null; bar: HTMLDivElement | null }>>(new Map());
  const prevColorsRef = useRef<Map<string, string>>(new Map());
  const elasticRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: sx, y: sy };
      return {
        x: (sx - rect.left - pan.x) / scale,
        y: (sy - rect.top - pan.y) / scale,
      };
    },
    [pan, scale]
  );

  useEffect(() => {
    notes.forEach((n) => {
      notePositionsRef.current.set(n.id, { x: n.x, y: n.y });
    });
  }, [notes]);

  useEffect(() => {
    const handleDocClick = () => {
      if (colorPickerForNoteId) {
        setColorPickerForNoteId(null);
      }
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, [colorPickerForNoteId]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * zoomFactor));
      const newPanX = mx - (mx - pan.x) * (newScale / scale);
      const newPanY = my - (my - pan.y) * (newScale / scale);
      setScale(newScale);
      setPan({ x: newPanX, y: newPanY });
    },
    [scale, pan]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
        setPanOrigin({ x: pan.x, y: pan.y });
        e.preventDefault();
      }
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const world = screenToWorld(e.clientX, e.clientY);
      setMouseWorld(world);

      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        setPan({ x: panOrigin.x + dx, y: panOrigin.y + dy });
        return;
      }

      if (draggingId) {
        const nx = world.x - dragOffset.x;
        const ny = world.y - dragOffset.y;
        setDragPos({ x: nx, y: ny });
        onMoveNote(draggingId, nx, ny);

        const dx = nx - elasticRef.current.x;
        const dy = ny - elasticRef.current.y;
        const stiffness = 0.35;
        elasticRef.current.x += dx * stiffness;
        elasticRef.current.y += dy * stiffness;
      }
    },
    [isPanning, panStart, panOrigin, draggingId, dragOffset, screenToWorld, onMoveNote]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    if (draggingId) {
      const note = notes.find((n) => n.id === draggingId);
      if (note) {
        const el = document.querySelector(`[data-note-id="${draggingId}"]`) as HTMLDivElement;
        if (el) {
          gsap.fromTo(
            el,
            { x: elasticRef.current.x, y: elasticRef.current.y, scale: 1.08 },
            {
              x: note.x,
              y: note.y,
              scale: 1,
              duration: 0.6,
              ease: 'elastic.out(1.2, 0.5)',
            }
          );
        }
      }
      setDraggingId(null);
    }
  }, [draggingId, notes]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const world = screenToWorld(e.clientX, e.clientY);
      const text = prompt('输入便签内容:');
      if (text && text.trim()) {
        onAddNote(world.x - NOTE_W / 2, world.y - NOTE_H / 2, text.trim());
      }
    },
    [screenToWorld, onAddNote]
  );

  const handleNoteMouseDown = useCallback(
    (e: React.MouseEvent, noteId: string) => {
      e.stopPropagation();
      if (e.altKey || e.button === 1) return;

      if (connectingFromId) {
        if (connectingFromId !== noteId) {
          onAddConnection(connectingFromId, noteId);
        }
        setConnectingFromId(null);
        return;
      }

      if (e.shiftKey) {
        onToggleSelect(noteId);
        return;
      }

      const world = screenToWorld(e.clientX, e.clientY);
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;

      setDraggingId(noteId);
      setDragOffset({ x: world.x - note.x, y: world.y - note.y });
      setDragPos({ x: note.x, y: note.y });
      elasticRef.current = { x: note.x, y: note.y };
    },
    [connectingFromId, notes, screenToWorld, onAddConnection, onToggleSelect]
  );

  const handleStartEdit = useCallback(
    (noteId: string) => {
      const note = notes.find((n) => n.id === noteId);
      if (note) {
        setEditingNoteId(noteId);
        setEditText(note.text);
      }
    },
    [notes]
  );

  const handleFinishEdit = useCallback(() => {
    if (editingNoteId && editText.trim()) {
      onUpdateNote({ id: editingNoteId, text: editText.trim() });
    }
    setEditingNoteId(null);
    setEditText('');
  }, [editingNoteId, editText, onUpdateNote]);

  const handleNoteColorChange = useCallback(
    (noteId: string, newColor: string) => {
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;

      const prevColor = note.color;
      prevColorsRef.current.set(noteId, prevColor);

      onUpdateNote({ id: noteId, color: newColor });
      setColorPickerForNoteId(null);

      requestAnimationFrame(() => {
        const refs = noteColorRefs.current.get(noteId);
        if (refs) {
          const gsapTargets = [];
          if (refs.border) gsapTargets.push(refs.border);
          if (refs.bar) gsapTargets.push(refs.bar);

          if (gsapTargets.length > 0) {
            gsap.fromTo(
              gsapTargets,
              {
                borderColor: prevColor,
                background: `linear-gradient(90deg, ${prevColor}, ${prevColor}88)`,
              },
              {
                borderColor: newColor,
                background: `linear-gradient(90deg, ${newColor}, ${newColor}88)`,
                duration: 0.3,
                ease: 'power2.out',
              }
            );

            if (refs.bar) {
              gsap.fromTo(
                refs.bar,
                { background: `linear-gradient(90deg, ${prevColor}, ${prevColor}88)` },
                {
                  background: `linear-gradient(90deg, ${newColor}, ${newColor}88)`,
                  duration: 0.3,
                  ease: 'power2.out',
                }
              );
            }
          }
        }
      });
    },
    [notes, onUpdateNote]
  );

  const handleConnectStart = useCallback((noteId: string) => {
    setConnectingFromId(noteId);
  }, []);

  const handleReplaySnapshot = useCallback(
    (idx: number) => {
      setActiveSnapshotIdx(idx);
      if (idx < 0 || idx >= snapshots.length) return;
      const snap = snapshots[idx];
      setIsReplaying(true);

      const prevPositions = new Map(notePositionsRef.current);
      onSnapshotReplay(snap.state);

      requestAnimationFrame(() => {
        snap.state.notes.forEach((targetNote) => {
          const prev = prevPositions.get(targetNote.id);
          if (prev && (prev.x !== targetNote.x || prev.y !== targetNote.y)) {
            const el = document.querySelector(`[data-note-id="${targetNote.id}"]`);
            if (el) {
              gsap.fromTo(
                el,
                { x: prev.x, y: prev.y },
                { x: targetNote.x, y: targetNote.y, duration: 0.5, ease: 'power2.out' }
              );
            }
          }
        });
        setTimeout(() => setIsReplaying(false), 600);
      });
    },
    [snapshots, onSnapshotReplay]
  );

  const getConnectionPath = useCallback(
    (conn: Connection) => {
      const from = notes.find((n) => n.id === conn.fromId);
      const to = notes.find((n) => n.id === conn.toId);
      if (!from || !to) return '';
      const x1 = from.x + NOTE_W / 2;
      const y1 = from.y + NOTE_H / 2;
      const x2 = to.x + NOTE_W / 2;
      const y2 = to.y + NOTE_H / 2;
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2 - 40;
      return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
    },
    [notes]
  );

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  const canvasStyle: React.CSSProperties = {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    cursor: isPanning ? 'grabbing' : connectingFromId ? 'crosshair' : 'default',
    background: `
      radial-gradient(circle at 50% 50%, rgba(0, 229, 255, 0.03) 0%, transparent 70%),
      linear-gradient(135deg, #0a0e1a 0%, #0d1525 50%, #0a0e1a 100%)
    `,
  };

  const transformStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    transformOrigin: '0 0',
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
    willChange: 'transform',
  };

  const gridStyle: React.CSSProperties = {
    position: 'absolute',
    top: -5000,
    left: -5000,
    width: 10000,
    height: 10000,
    backgroundImage: `
      radial-gradient(circle, rgba(0, 229, 255, 0.08) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
  };

  return (
    <div
      ref={containerRef}
      style={canvasStyle}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <div style={transformStyle}>
        <div style={gridStyle} />

        <svg
          style={{
            position: 'absolute',
            top: -5000,
            left: -5000,
            width: 10000,
            height: 10000,
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          <defs>
            <linearGradient id="connGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#18ffff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          {connections.map((conn) => {
            const path = getConnectionPath(conn);
            if (!path) return null;
            return (
              <g key={conn.id} style={{ cursor: 'pointer' }} pointerEvents="stroke">
                <path
                  d={path}
                  fill="none"
                  stroke="url(#connGradient)"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                  style={{ pointerEvents: 'stroke' }}
                  onClick={() => onDeleteConnection(conn.id)}
                />
              </g>
            );
          })}
          {connectingFromId && (() => {
            const from = notes.find((n) => n.id === connectingFromId);
            if (!from) return null;
            const x1 = from.x + NOTE_W / 2;
            const y1 = from.y + NOTE_H / 2;
            return (
              <line
                x1={x1}
                y1={y1}
                x2={mouseWorld.x}
                y2={mouseWorld.y}
                stroke="#00e5ff"
                strokeWidth={2}
                strokeDasharray="4 3"
                strokeLinecap="round"
                opacity={0.6}
              />
            );
          })()}
        </svg>

        {notes.map((note) => {
          const isDragging = draggingId === note.id;
          const isHovered = hoveredNoteId === note.id;
          const isSelected = selectedNoteIds.has(note.id);
          const isEditing = editingNoteId === note.id;
          const posX = isDragging ? elasticRef.current.x : note.x;
          const posY = isDragging ? elasticRef.current.y : note.y;

          const dragOffsetX = isDragging ? dragPos.x - elasticRef.current.x : 0;
          const dragOffsetY = isDragging ? dragPos.y - elasticRef.current.y : 0;
          const stretchX = 1 + Math.min(Math.abs(dragOffsetX) / 200, 0.15);
          const stretchY = 1 - Math.min(Math.abs(dragOffsetY) / 200, 0.1);
          const rotation = isDragging ? dragOffsetX * 0.08 : 0;

          const noteStyle: React.CSSProperties = {
            position: 'absolute',
            left: posX,
            top: posY,
            width: NOTE_W,
            height: NOTE_H,
            background: 'rgba(20, 30, 50, 0.65)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1.5px solid ${isSelected ? note.color : isHovered ? note.color + 'aa' : note.color + '44'}`,
            borderRadius: 12,
            boxShadow: isSelected
              ? '0 0 20px ' + note.color + '4d, 0 0 0 1px rgba(0, 229, 255, 0.3), 0 4px 16px rgba(0,0,0,0.3)'
              : '0 0 0 1px rgba(0, 229, 255, 0.15), 0 4px 16px rgba(0,0,0,0.3)',
            transform: isDragging ? `scaleX(${stretchX}) scaleY(${stretchY}) rotate(${rotation}deg)` : 'none',
            transformOrigin: 'center center',
            padding: '12px',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            transition: isDragging ? 'none' : 'box-shadow 0.2s, border-color 0.2s, transform 0.1s',
            zIndex: isDragging ? 100 : isSelected ? 50 : 1,
            overflow: 'hidden',
          };

          const colorBarStyle: React.CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${note.color}, ${note.color}88)`,
            borderRadius: '12px 12px 0 0',
          };

          const isColorPickerOpen = colorPickerForNoteId === note.id;

          const textStyle: React.CSSProperties = {
            color: '#e0e8f0',
            fontSize: 13,
            lineHeight: 1.5,
            wordBreak: 'break-word',
            height: '100%',
            overflow: 'auto',
          };

          return (
            <div
              key={note.id}
              data-note-id={note.id}
              style={noteStyle}
              onMouseDown={(e) => handleNoteMouseDown(e, note.id)}
              onMouseEnter={() => setHoveredNoteId(note.id)}
              onMouseLeave={() => setHoveredNoteId(null)}
              ref={(el) => {
                const current = noteColorRefs.current.get(note.id) || { border: null, bar: null };
                noteColorRefs.current.set(note.id, { ...current, border: el });
              }}
            >
              <div
                style={colorBarStyle}
                ref={(el) => {
                  const current = noteColorRefs.current.get(note.id) || { border: null, bar: null };
                  noteColorRefs.current.set(note.id, { ...current, bar: el });
                }}
              />
              {isEditing ? (
                <textarea
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={handleFinishEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) handleFinishEdit();
                    if (e.key === 'Escape') {
                      setEditingNoteId(null);
                      setEditText('');
                    }
                  }}
                  style={{
                    ...textStyle,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    width: '100%',
                    height: 'calc(100% - 6px)',
                    marginTop: 6,
                    color: '#e0e8f0',
                    fontFamily: 'inherit',
                  }}
                />
              ) : (
                <div style={{ ...textStyle, marginTop: 6 }}>{note.text}</div>
              )}

              {isHovered && !isEditing && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      display: 'flex',
                      gap: 4,
                    }}
                  >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(note.id);
                    }}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: '1px solid rgba(0,229,255,0.3)',
                      background: 'rgba(0,229,255,0.15)',
                      color: '#00e5ff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                    }}
                    title="编辑"
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                      setColorPickerForNoteId(isColorPickerOpen ? null : note.id);
                    }}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: '1px solid ' + note.color + '80',
                      background: note.color + '20',
                      color: note.color,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                    }}
                    title="标签颜色"
                  >
                    ◐
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnectStart(note.id);
                    }}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: '1px solid rgba(24,255,255,0.3)',
                      background: 'rgba(24,255,255,0.15)',
                      color: '#18ffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                    }}
                    title="连线"
                  >
                    ⟶
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNote(note.id);
                    }}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: '1px solid rgba(255,64,129,0.3)',
                      background: 'rgba(255,64,129,0.15)',
                      color: '#ff4081',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                    }}
                    title="删除"
                  >
                    ✕
                  </button>
                </div>
                {isColorPickerOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: 32,
                      right: 6,
                      background: 'rgba(12, 18, 32, 0.95)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(0, 229, 255, 0.2)',
                      borderRadius: 10,
                      padding: '8px',
                      display: 'flex',
                      gap: 6,
                      zIndex: 1000,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    }}
                  >
                    {PRESET_COLORS.map((colorOption) => (
                      <button
                        key={colorOption.value}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNoteColorChange(note.id, colorOption.value);
                        }}
                        title={colorOption.name}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          border: '2px solid ' + (note.color === colorOption.value ? colorOption.value : 'transparent'),
                          background: colorOption.value,
                          cursor: 'pointer',
                          transition: 'transform 0.15s, border-color 0.2s',
                          boxShadow: '0 2px 8px ' + colorOption.value + '40',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.15)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                        }}
                      />
                    ))}
                  </div>
                )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 320,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'rgba(10, 14, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 229, 255, 0.15)',
          borderRadius: 12,
          padding: '8px 16px',
        }}
      >
        <span style={{ fontSize: 11, color: '#00e5ff', whiteSpace: 'nowrap' }}>
          时序回溯
        </span>
        <input
          type="range"
          min={-1}
          max={snapshots.length - 1}
          value={sliderDragging ? sliderValue : activeSnapshotIdx}
          onMouseDown={() => {
            setSliderDragging(true);
            setSliderValue(activeSnapshotIdx);
          }}
          onMouseUp={() => {
            setSliderDragging(false);
            handleReplaySnapshot(sliderValue);
          }}
          onTouchStart={() => {
            setSliderDragging(true);
            setSliderValue(activeSnapshotIdx);
          }}
          onTouchEnd={() => {
            setSliderDragging(false);
            handleReplaySnapshot(sliderValue);
          }}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            setSliderValue(val);
          }}
          style={{
            flex: 1,
            accentColor: '#00e5ff',
            height: 4,
            cursor: 'pointer',
          }}
        />
        <span style={{ fontSize: 11, color: sliderDragging ? '#00e5ff' : '#8899aa', whiteSpace: 'nowrap', minWidth: 70, textAlign: 'center', fontWeight: sliderDragging ? 600 : 400, transition: 'all 0.2s' }}>
          {sliderDragging
            ? sliderValue >= 0 && snapshots[sliderValue]
              ? formatTime(snapshots[sliderValue].timestamp)
              : '当前状态'
            : activeSnapshotIdx >= 0 && snapshots[activeSnapshotIdx]
              ? formatTime(snapshots[activeSnapshotIdx].timestamp)
              : '当前状态'}
        </span>
        <button
          onClick={() => {
            setActiveSnapshotIdx(-1);
            if (snapshots.length > 0) {
              const latest = snapshots[snapshots.length - 1];
              onSnapshotReplay(latest.state);
            }
          }}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid rgba(0, 229, 255, 0.3)',
            background: 'rgba(0, 229, 255, 0.1)',
            color: '#00e5ff',
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          回到最新
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(10, 14, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 229, 255, 0.15)',
          borderRadius: 10,
          padding: '6px 12px',
          fontSize: 11,
          color: '#667788',
        }}
      >
        <span>缩放 {(scale * 100).toFixed(0)}%</span>
        <span>|</span>
        <span>双击添加 · Shift+点击选择 · Alt+拖拽平移</span>
      </div>

      {isReplaying && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 229, 255, 0.15)',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            borderRadius: 8,
            padding: '6px 16px',
            color: '#00e5ff',
            fontSize: 12,
          }}
        >
          回放中...
        </div>
      )}

      {connectingFromId && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(24, 255, 255, 0.15)',
            border: '1px solid rgba(24, 255, 255, 0.3)',
            borderRadius: 8,
            padding: '6px 16px',
            color: '#18ffff',
            fontSize: 12,
          }}
        >
          点击目标便签创建连线 · 点击空白取消
        </div>
      )}
    </div>
  );
};

export default Canvas;
