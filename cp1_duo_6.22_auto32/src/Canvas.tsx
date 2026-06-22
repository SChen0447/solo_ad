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
  onDrawEnd: () => void;
  onElementAdd: (el: WhiteboardElement) => void;
  onElementUpdate: (id: string, updates: Partial<WhiteboardElement>) => void;
  onCursorMove: (point: Point) => void;
  restoring: boolean;
}

const Canvas: React.FC<CanvasProps> = ({
  elements, setElements, users, currentUser,
  tool, color, size,
  onDrawStart, onDrawContinue, onDrawEnd,
  onElementAdd, onElementUpdate, onCursorMove,
  restoring,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<DrawPath | null>(null);
  const [drawingUsers, setDrawingUsers] = useState<Map<string, DrawPath>>(new Map());

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const [lineFrom, setLineFrom] = useState<string | null>(null);
  const [lineHover, setLineHover] = useState<string | null>(null);

  const [remoteCursors, setRemoteCursors] = useState<Map<string, Point>>(new Map());

  useEffect(() => {
    const map = new Map<string, Point>();
    users.forEach((u) => {
      if (u.id !== currentUser?.id) map.set(u.id, u.cursor);
    });
    setRemoteCursors(map);
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
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
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
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }, []);

  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: DrawPath, erase: boolean = false) => {
    if (path.points.length < 1) return;
    ctx.save();
    ctx.strokeStyle = erase ? '#e8e8e8' : path.color;
    ctx.lineWidth = erase ? path.size * 3 : path.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
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
    ctx.beginPath();
    const p1 = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
    const p2 = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
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

    drawGrid(ctx, canvas.width, canvas.height);

    const lines = elements.filter((e) => e.type === 'line') as ConnectionLine[];
    lines.forEach((l) => drawLineBetweenStickies(ctx, l));

    const paths = elements.filter((e) => e.type === 'path') as DrawPath[];
    paths.forEach((p) => drawPath(ctx, p, tool === 'eraser' && false));

    drawingUsers.forEach((p) => drawPath(ctx, p));

    if (currentPathRef.current) drawPath(ctx, currentPathRef.current);
  }, [elements, drawingUsers, drawGrid, drawPath, drawLineBetweenStickies, tool]);

  useEffect(() => {
    let raf: number;
    const loop = () => {
      render();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [render]);

  useEffect(() => {
    if (restoring) {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.transition = 'opacity 0.5s';
        canvas.style.opacity = '0';
        setTimeout(() => { canvas.style.opacity = '1'; }, 250);
        setTimeout(() => { canvas.style.transition = ''; }, 500);
      }
    }
  }, [restoring]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (editingId) return;
    const point = getCanvasPoint(e);

    if (tool === 'brush' || tool === 'eraser') {
      isDrawingRef.current = true;
      const path: DrawPath = {
        id: uuidv4(),
        type: 'path',
        points: [point],
        color: tool === 'eraser' ? '#e8e8e8' : color,
        size: tool === 'eraser' ? size * 3 : size,
        userId: currentUser?.id || '',
      };
      currentPathRef.current = path;
      onDrawStart(path);
    } else if (tool === 'sticky') {
      const sticky: StickyNote = {
        id: uuidv4(),
        type: 'sticky',
        x: point.x - 80,
        y: point.y - 50,
        width: 180,
        height: 120,
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
            color: color,
            userId: currentUser?.id || '',
          };
          onElementAdd(line);
          setLineFrom(null);
        }
      }
    }
  };

  const findStickyAt = (point: Point): StickyNote | null => {
    const stickies = [...elements.filter((e) => e.type === 'sticky') as StickyNote[]].reverse();
    for (const s of stickies) {
      if (point.x >= s.x && point.x <= s.x + s.width && point.y >= s.y && point.y <= s.y + s.height) {
        return s;
      }
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e);
    onCursorMove(point);

    if (isDrawingRef.current && currentPathRef.current) {
      currentPathRef.current.points.push(point);
      onDrawContinue(currentPathRef.current.id, point);
    }

    if (draggingId) {
      const el = elements.find((e) => e.id === draggingId) as StickyNote | undefined;
      if (el) {
        onElementUpdate(draggingId, {
          x: point.x - dragOffset.x,
          y: point.y - dragOffset.y,
        } as Partial<StickyNote>);
      }
    }

    if (resizingId && resizeStart) {
      const el = elements.find((e) => e.id === resizingId) as StickyNote | undefined;
      if (el) {
        onElementUpdate(resizingId, {
          width: Math.max(100, resizeStart.w + (point.x - resizeStart.x)),
          height: Math.max(80, resizeStart.h + (point.y - resizeStart.y)),
        } as Partial<StickyNote>);
      }
    }

    if (tool === 'line' && lineFrom) {
      const sticky = findStickyAt(point);
      setLineHover(sticky && sticky.id !== lineFrom ? sticky.id : null);
    }
  };

  const handleMouseUp = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      if (currentPathRef.current) {
        setElements((prev) => [...prev, currentPathRef.current!]);
        currentPathRef.current = null;
      }
      onDrawEnd();
    }
    setDraggingId(null);
    setResizingId(null);
    setResizeStart(null);
  };

  useEffect(() => {
    const socket = (window as any).__socket;
    if (!socket) return;
    const handlers: Record<string, any> = {
      'draw:start': (data: { element: DrawPath }) => {
        if (data.element.userId !== currentUser?.id) {
          setDrawingUsers((prev) => new Map(prev).set(data.element.userId, { ...data.element, points: [...data.element.points] }));
        }
      },
      'draw:continue': (data: { id: string; point: Point; userId?: string }) => {
        setDrawingUsers((prev) => {
          const next = new Map(prev);
          for (const [uid, p] of next) {
            if (p.id === data.id) {
              next.set(uid, { ...p, points: [...p.points, data.point] });
              break;
            }
          }
          return next;
        });
      },
      'draw:end': (data: { id: string }) => {
        setDrawingUsers((prev) => {
          const next = new Map(prev);
          for (const [uid, p] of next) {
            if (p.id === data.id) {
              next.delete(uid);
              break;
            }
          }
          return next;
        });
      },
    };
    Object.entries(handlers).forEach(([evt, fn]) => socket.on(evt, fn));
    return () => Object.entries(handlers).forEach(([evt, fn]) => socket.off(evt, fn));
  }, [currentUser]);

  const remoteUsers = users.filter((u) => u.id !== currentUser?.id);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', cursor: getCursor(tool) }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      {(elements.filter((e) => e.type === 'sticky') as StickyNote[]).map((s) => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            width: s.width,
            height: s.height,
            background: s.color + '33',
            border: `2px solid ${s.color}`,
            borderRadius: 8,
            padding: 10,
            boxShadow: selectedId === s.id ? '0 4px 16px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.1)',
            boxSizing: 'border-box',
            outline: lineFrom === s.id ? '3px dashed #ff4757' : lineHover === s.id ? '3px dashed #2ed573' : 'none',
            transition: 'box-shadow 0.2s',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (tool === 'select') {
              setSelectedId(s.id);
              setDraggingId(s.id);
              const p = getCanvasPoint(e as any);
              setDragOffset({ x: p.x - s.x, y: p.y - s.y });
            } else if (tool === 'line') {
              if (lineFrom === null) setLineFrom(s.id);
              else if (lineFrom !== s.id) {
                const line: ConnectionLine = {
                  id: uuidv4(), type: 'line', fromId: lineFrom, toId: s.id,
                  color: color, userId: currentUser?.id || '',
                };
                onElementAdd(line);
                setLineFrom(null);
              }
            }
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditingId(s.id);
          }}
        >
          {editingId === s.id ? (
            <textarea
              autoFocus
              defaultValue={s.content}
              placeholder="输入便签内容，支持：**粗体** *斜体* - 列表"
              onBlur={(e) => {
                onElementUpdate(s.id, { content: e.target.value } as Partial<StickyNote>);
                setEditingId(null);
              }}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                resize: 'none',
                fontSize: 14,
                fontFamily: 'inherit',
                color: '#2c2c54',
              }}
            />
          ) : (
            <div style={{
              fontSize: 14, color: '#2c2c54', wordBreak: 'break-word',
              overflow: 'hidden', height: '100%', lineHeight: 1.4,
            }}
              dangerouslySetInnerHTML={{ __html: formatStickyContent(s.content) }}
            />
          )}
          {selectedId === s.id && editingId !== s.id && (
            <div
              style={{
                position: 'absolute',
                right: -4,
                bottom: -4,
                width: 14,
                height: 14,
                background: s.color,
                cursor: 'se-resize',
                borderRadius: 3,
                border: '2px solid #fff',
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                const p = getCanvasPoint(e as any);
                setResizingId(s.id);
                setResizeStart({ x: p.x, y: p.y, w: s.width, h: s.height });
              }}
            />
          )}
        </div>
      ))}

      {remoteUsers.map((u) => (
        <div
          key={u.id}
          style={{
            position: 'absolute',
            left: u.cursor.x,
            top: u.cursor.y,
            pointerEvents: 'none',
            transition: 'left 0.05s linear, top 0.05s linear',
            zIndex: 200,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={u.color} style={{ display: 'block' }}>
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" stroke="#fff" strokeWidth="1" />
          </svg>
          <div style={{
            marginTop: -4,
            marginLeft: 12,
            background: u.color,
            color: '#fff',
            padding: '2px 8px',
            borderRadius: 10,
            fontSize: 11,
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}>{u.name}</div>
        </div>
      ))}

      {lineFrom && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#2c2c54', color: '#f7f1e3', padding: '8px 16px', borderRadius: 20,
          fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 300,
        }}>
          选择目标便签完成连线，或点击空白取消
          <button
            onClick={(e) => { e.stopPropagation(); setLineFrom(null); }}
            style={{
              marginLeft: 12, background: '#ff4757', border: 'none', color: '#fff',
              padding: '2px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 12,
            }}
          >取消</button>
        </div>
      )}
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

function formatStickyContent(text: string): string {
  let html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li style="margin-left: 16px;">$1</li>')
    .replace(/\n/g, '<br/>');
  return html;
}

export default Canvas;
