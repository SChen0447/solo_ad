import React, { useRef, useEffect, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { WhiteboardElement, DrawPath, StickyNote, ConnectionLine, Point, User, Tool } from './types';

interface CanvasProps {
  elements: WhiteboardElement[];
  setElements: React.Dispatch<React.SetStateAction<WhiteboardElement[]>>;
  users: User[];
  currentUser: User | null;
  tool: Tool;
  color: string;
  size: number;
  onDrawStart: (el: WhiteboardElement) => void;
  onDrawContinue: (id: string, point: Point) => void;
  onDrawEnd: (id: string) => void;
  onElementAdd: (el: WhiteboardElement) => void;
  onElementUpdate: (id: string, updates: Partial<WhiteboardElement>) => void;
  onElementRemove: (id: string) => void;
  onCursorMove: (point: Point) => void;
  restoring: boolean;
}

const Canvas: React.FC<CanvasProps> = ({
  elements, setElements, users, currentUser,
  tool, color, size,
  onDrawStart, onDrawContinue, onDrawEnd,
  onElementAdd, onElementUpdate, onElementRemove,
  onCursorMove, restoring,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const currentPathIdRef = useRef<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [lineFrom, setLineFrom] = useState<string | null>(null);
  const [lineHover, setLineHover] = useState<string | null>(null);

  const [cursorPositions, setCursorPositions] = useState<Record<string, Point>>({});

  const editAreaRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const pendingRenderRef = useRef(false);

  useEffect(() => {
    const updated: Record<string, Point> = {};
    users.forEach((u) => {
      if (u.id !== currentUser?.id) {
        updated[u.id] = u.cursor;
      }
    });
    setCursorPositions(updated);
  }, [users, currentUser]);

  const getCanvasPoint = useCallback((e: React.MouseEvent | MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
    pendingRenderRef.current = true;
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }
  }, []);

  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: DrawPath) => {
    if (path.points.length < 1) return;
    ctx.save();
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = path.color === '#e8e8e8' ? 'destination-out' : 'source-over';
    if (path.color === '#e8e8e8') {
      ctx.lineWidth = path.size * 2;
    }
    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    if (path.points.length === 1) {
      ctx.lineTo(path.points[0].x + 0.1, path.points[0].y + 0.1);
    } else {
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }, []);

  const drawLineBetweenStickies = useCallback((ctx: CanvasRenderingContext2D, line: ConnectionLine) => {
    const from = elements.find((e) => e.id === line.fromId) as StickyNote | undefined;
    const to = elements.find((e) => e.id === line.toId) as StickyNote | undefined;
    if (!from || !to) return;
    ctx.save();
    ctx.strokeStyle = line.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    const p1 = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
    const p2 = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    ctx.fillStyle = line.color;
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p2.x - 10 * Math.cos(angle - 0.4), p2.y - 10 * Math.sin(angle - 0.4));
    ctx.lineTo(p2.x - 10 * Math.cos(angle + 0.4), p2.y - 10 * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [elements]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    drawGrid(ctx, w, h);

    const lines = elements.filter((e) => e.type === 'line') as ConnectionLine[];
    lines.forEach((l) => drawLineBetweenStickies(ctx, l));

    const paths = elements.filter((e) => e.type === 'path') as DrawPath[];
    paths.forEach((p) => drawPath(ctx, p));

    ctx.restore();
  }, [elements, drawGrid, drawPath, drawLineBetweenStickies]);

  useEffect(() => {
    if (pendingRenderRef.current || true) {
      pendingRenderRef.current = false;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(render);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [render]);

  useEffect(() => {
    if (restoring) {
      const container = containerRef.current;
      if (container) {
        container.style.transition = 'opacity 0.5s ease';
        container.style.opacity = '0';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            container.style.opacity = '1';
          });
        });
        setTimeout(() => {
          container.style.transition = '';
        }, 520);
      }
    }
  }, [restoring]);

  const findStickyAt = useCallback((point: Point): StickyNote | null => {
    const stickies = [...elements.filter((e) => e.type === 'sticky') as StickyNote[]].reverse();
    for (const s of stickies) {
      if (point.x >= s.x && point.x <= s.x + s.width && point.y >= s.y && point.y <= s.y + s.height) {
        return s;
      }
    }
    return null;
  }, [elements]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (editingId) return;
    const point = getCanvasPoint(e);

    if (tool === 'brush' || tool === 'eraser') {
      isDrawingRef.current = true;
      const path: DrawPath = {
        id: uuidv4(),
        type: 'path',
        points: [point],
        color: tool === 'eraser' ? '#e8e8e8' : color,
        size: tool === 'eraser' ? size * 2 : size,
        userId: currentUser?.id || '',
      };
      currentPathIdRef.current = path.id;
      setElements((prev) => [...prev, path]);
      onDrawStart(path);
    } else if (tool === 'sticky') {
      const sticky: StickyNote = {
        id: uuidv4(),
        type: 'sticky',
        x: point.x - 90,
        y: point.y - 60,
        width: 200,
        height: 140,
        content: '',
        color: color,
        userId: currentUser?.id || '',
      };
      onElementAdd(sticky);
      setEditingId(sticky.id);
    } else if (tool === 'select') {
      const sticky = findStickyAt(point);
      if (sticky) {
        setSelectedId(sticky.id);
        setDraggingId(sticky.id);
        setDragOffset({ x: point.x - sticky.x, y: point.y - sticky.y });
      } else {
        setSelectedId(null);
      }
    } else if (tool === 'line') {
      const sticky = findStickyAt(point);
      if (sticky) {
        if (lineFrom === null) {
          setLineFrom(sticky.id);
        } else if (lineFrom !== sticky.id) {
          const line: ConnectionLine = {
            id: uuidv4(),
            type: 'line',
            fromId: lineFrom,
            toId: sticky.id,
            color: '#706fd3',
            userId: currentUser?.id || '',
          };
          onElementAdd(line);
          setLineFrom(null);
        }
      } else {
        setLineFrom(null);
      }
    }
  }, [tool, color, size, currentUser, editingId, lineFrom, getCanvasPoint, findStickyAt, onDrawStart, onElementAdd, setElements]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const point = getCanvasPoint(e);
    onCursorMove(point);

    if (isDrawingRef.current && currentPathIdRef.current) {
      setElements((prev) =>
        prev.map((el) => {
          if (el.id === currentPathIdRef.current && el.type === 'path') {
            return { ...el, points: [...(el as DrawPath).points, point] } as DrawPath;
          }
          return el;
        })
      );
      onDrawContinue(currentPathIdRef.current, point);
    }

    if (draggingId) {
      const newX = point.x - dragOffset.x;
      const newY = point.y - dragOffset.y;
      onElementUpdate(draggingId, { x: newX, y: newY } as Partial<StickyNote>);
      setElements((prev) =>
        prev.map((el) => {
          if (el.id === draggingId && el.type === 'sticky') {
            return { ...el, x: newX, y: newY } as StickyNote;
          }
          return el;
        })
      );
    }

    if (resizingId && resizeStart) {
      const newW = Math.max(120, resizeStart.w + (point.x - resizeStart.x));
      const newH = Math.max(80, resizeStart.h + (point.y - resizeStart.y));
      onElementUpdate(resizingId, { width: newW, height: newH } as Partial<StickyNote>);
      setElements((prev) =>
        prev.map((el) => {
          if (el.id === resizingId && el.type === 'sticky') {
            return { ...el, width: newW, height: newH } as StickyNote;
          }
          return el;
        })
      );
    }

    if (tool === 'line' && lineFrom) {
      const sticky = findStickyAt(point);
      setLineHover(sticky && sticky.id !== lineFrom ? sticky.id : null);
    }
  }, [getCanvasPoint, onCursorMove, onDrawContinue, draggingId, dragOffset, resizingId, resizeStart, onElementUpdate, setElements, tool, lineFrom, findStickyAt]);

  const handleMouseUp = useCallback(() => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      const pathId = currentPathIdRef.current;
      currentPathIdRef.current = null;
      if (pathId) {
        onDrawEnd(pathId);
      }
    }
    setDraggingId(null);
    setResizingId(null);
    setResizeStart(null);
  }, [onDrawEnd]);

  const handleStickyMouseDown = useCallback((e: React.MouseEvent, s: StickyNote) => {
    e.stopPropagation();
    if (tool === 'select') {
      setSelectedId(s.id);
      setDraggingId(s.id);
      const point = getCanvasPoint(e);
      setDragOffset({ x: point.x - s.x, y: point.y - s.y });
    } else if (tool === 'line') {
      if (lineFrom === null) {
        setLineFrom(s.id);
      } else if (lineFrom !== s.id) {
        const line: ConnectionLine = {
          id: uuidv4(), type: 'line', fromId: lineFrom, toId: s.id,
          color: '#706fd3', userId: currentUser?.id || '',
        };
        onElementAdd(line);
        setLineFrom(null);
      }
    }
  }, [tool, lineFrom, currentUser, getCanvasPoint, onElementAdd]);

  const handleStickyDoubleClick = useCallback((e: React.MouseEvent, s: StickyNote) => {
    e.stopPropagation();
    setEditingId(s.id);
    setTimeout(() => {
      if (editAreaRef.current) {
        editAreaRef.current.focus();
      }
    }, 50);
  }, []);

  const handleEditBlur = useCallback((stickyId: string) => {
    if (editAreaRef.current) {
      const content = editAreaRef.current.innerHTML;
      onElementUpdate(stickyId, { content } as Partial<StickyNote>);
      setElements((prev) =>
        prev.map((el) => {
          if (el.id === stickyId && el.type === 'sticky') {
            return { ...el, content } as StickyNote;
          }
          return el;
        })
      );
    }
    setEditingId(null);
  }, [onElementUpdate, setElements]);

  const handleRichTextCommand = useCallback((command: string) => {
    document.execCommand(command, false);
    editAreaRef.current?.focus();
  }, []);

  const handleResizeHandleMouseDown = useCallback((e: React.MouseEvent, s: StickyNote) => {
    e.stopPropagation();
    const point = getCanvasPoint(e);
    setResizingId(s.id);
    setResizeStart({ x: point.x, y: point.y, w: s.width, h: s.height });
  }, [getCanvasPoint]);

  const handleDeleteSticky = useCallback((id: string) => {
    onElementRemove(id);
    setElements((prev) => prev.filter((e) => e.id !== id));
    setSelectedId(null);
    setEditingId(null);
  }, [onElementRemove, setElements]);

  const remoteUsers = users.filter((u) => u.id !== currentUser?.id);

  const stickies = elements.filter((e) => e.type === 'sticky') as StickyNote[];

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{
        position: 'relative', width: '100%', height: '100%',
        overflow: 'hidden', cursor: getCursor(tool),
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      {stickies.map((s) => {
        const isSelected = selectedId === s.id;
        const isEditing = editingId === s.id;
        const isLineSource = lineFrom === s.id;
        const isLineTarget = lineHover === s.id;

        return (
          <div
            key={s.id}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              width: s.width,
              height: s.height,
              background: s.color + '22',
              border: `2px solid ${s.color}`,
              borderRadius: 8,
              padding: 0,
              boxShadow: isSelected
                ? `0 4px 16px rgba(0,0,0,0.25), 0 0 0 1px ${s.color}`
                : '0 2px 6px rgba(0,0,0,0.1)',
              boxSizing: 'border-box',
              outline: isLineSource
                ? '3px dashed #ff4757'
                : isLineTarget
                ? '3px dashed #2ed573'
                : 'none',
              outlineOffset: '2px',
              transition: 'box-shadow 0.2s, outline 0.2s',
              zIndex: isEditing ? 50 : isSelected ? 40 : 10,
              display: 'flex',
              flexDirection: 'column',
            }}
            onMouseDown={(e) => handleStickyMouseDown(e, s)}
            onDoubleClick={(e) => handleStickyDoubleClick(e, s)}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '4px 8px', borderBottom: `1px solid ${s.color}44`,
              background: s.color + '11', borderRadius: '6px 6px 0 0',
              flexShrink: 0,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: s.color,
              }} />
              <span style={{ fontSize: 10, color: '#888', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {users.find((u) => u.id === s.userId)?.name || ''}
              </span>
              {isSelected && !isEditing && (
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleDeleteSticky(s.id); }}
                  style={{
                    background: '#ff4757', border: 'none', color: '#fff',
                    borderRadius: 4, cursor: 'pointer', fontSize: 10,
                    padding: '1px 6px', lineHeight: '16px',
                  }}
                >✕</button>
              )}
              {!isSelected && !isEditing && <div style={{ width: 22 }} />}
            </div>

            {isEditing && (
              <div style={{ display: 'flex', gap: 2, padding: '3px 6px', borderBottom: `1px solid ${s.color}33`, flexShrink: 0 }}>
                {[
                  { cmd: 'bold', icon: 'B', style: { fontWeight: 'bold' } },
                  { cmd: 'italic', icon: 'I', style: { fontStyle: 'italic' } },
                  { cmd: 'insertUnorderedList', icon: '•', style: {} },
                ].map((b) => (
                  <button
                    key={b.cmd}
                    onMouseDown={(e) => { e.preventDefault(); handleRichTextCommand(b.cmd); }}
                    style={{
                      width: 24, height: 24, borderRadius: 4,
                      background: 'rgba(112,111,211,0.15)', border: 'none',
                      color: '#2c2c54', cursor: 'pointer', fontSize: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      ...b.style,
                    }}
                  >{b.icon}</button>
                ))}
              </div>
            )}

            <div style={{ flex: 1, overflow: 'auto', padding: '6px 8px', minHeight: 0 }}>
              {isEditing ? (
                <div
                  ref={editAreaRef}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={() => handleEditBlur(s.id)}
                  dangerouslySetInnerHTML={{ __html: s.content || '' }}
                  style={{
                    outline: 'none', fontSize: 13, color: '#2c2c54',
                    lineHeight: 1.5, wordBreak: 'break-word',
                    minHeight: 30,
                  }}
                />
              ) : (
                <div
                  style={{
                    fontSize: 13, color: '#2c2c54', wordBreak: 'break-word',
                    lineHeight: 1.5, overflow: 'hidden',
                  }}
                  dangerouslySetInnerHTML={{ __html: s.content || '<span style="color:#aaa">双击编辑...</span>' }}
                />
              )}
            </div>

            {isSelected && !isEditing && (
              <div
                style={{
                  position: 'absolute', right: -6, bottom: -6,
                  width: 14, height: 14, background: s.color,
                  cursor: 'se-resize', borderRadius: 3,
                  border: '2px solid #fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
                onMouseDown={(e) => handleResizeHandleMouseDown(e, s)}
              />
            )}
          </div>
        );
      })}

      {remoteUsers.map((u) => {
        const pos = cursorPositions[u.id] || u.cursor;
        return (
          <div
            key={u.id}
            className="remote-cursor"
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              pointerEvents: 'none',
              zIndex: 200,
              transition: 'left 0.06s linear, top 0.06s linear',
              willChange: 'left, top',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={u.color} style={{ display: 'block', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }}>
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" stroke="#fff" strokeWidth="1" />
            </svg>
            <div style={{
              marginTop: -2, marginLeft: 14,
              background: u.color, color: '#fff',
              padding: '2px 8px', borderRadius: 10,
              fontSize: 10, fontWeight: 500,
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{u.name}</div>
          </div>
        );
      })}

      {lineFrom && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#2c2c54', color: '#f7f1e3', padding: '8px 16px', borderRadius: 20,
          fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.25)', zIndex: 300,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>点击目标便签完成连线</span>
          <button
            onClick={(e) => { e.stopPropagation(); setLineFrom(null); }}
            style={{
              background: '#ff4757', border: 'none', color: '#fff',
              padding: '3px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 12,
            }}
          >取消</button>
        </div>
      )}

      <style>{`
        .canvas-container canvas {
          image-rendering: auto;
        }
      `}</style>
    </div>
  );
};

function getCursor(tool: Tool): string {
  switch (tool) {
    case 'brush': return 'crosshair';
    case 'eraser': return 'cell';
    case 'sticky': return 'copy';
    case 'select': return 'default';
    case 'line': return 'pointer';
    default: return 'default';
  }
}

export default Canvas;
