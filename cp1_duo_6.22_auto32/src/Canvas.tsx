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

const GRID_SIZE = 20;
const GRID_COLOR = '#d0d0d0';
const GRID_BG = '#e8e8e8';

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

  const editAreaRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const rafRef = useRef<number>(0);
  const lastCursorMoveRef = useRef<number>(0);

  const remoteUsers = users.filter((u) => u.id !== currentUser?.id);
  const stickies = elements.filter((e) => e.type === 'sticky') as StickyNote[];

  const getCanvasPoint = useCallback((e: React.MouseEvent | MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width) / dpr,
      y: (e.clientY - rect.top) * (canvas.height / rect.height) / dpr,
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
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = GRID_BG;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;

    for (let x = 0; x <= w; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }, []);

  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: DrawPath) => {
    if (path.points.length < 1) return;
    ctx.save();
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (path.color === GRID_BG) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = path.size * 2;
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    if (path.points.length === 1) {
      const p = path.points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, path.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = path.color;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        const xc = (path.points[i].x + path.points[i - 1].x) / 2;
        const yc = (path.points[i].y + path.points[i - 1].y) / 2;
        ctx.quadraticCurveTo(path.points[i - 1].x, path.points[i - 1].y, xc, yc);
      }
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  const drawLineBetweenStickies = useCallback((ctx: CanvasRenderingContext2D, line: ConnectionLine) => {
    const from = stickies.find((s) => s.id === line.fromId);
    const to = stickies.find((s) => s.id === line.toId);
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
  }, [stickies]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const container = containerRef.current;
    if (!container) return;
    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [render]);

  useEffect(() => {
    if (restoring && containerRef.current) {
      const container = containerRef.current;
      container.style.transition = 'opacity 0.5s ease-in-out';
      container.style.opacity = '0';

      setTimeout(() => {
        container.style.opacity = '1';
      }, 20);

      setTimeout(() => {
        container.style.transition = '';
      }, 520);
    }
  }, [restoring]);

  const findStickyAt = useCallback((point: Point): StickyNote | null => {
    for (let i = stickies.length - 1; i >= 0; i--) {
      const s = stickies[i];
      if (point.x >= s.x && point.x <= s.x + s.width && point.y >= s.y && point.y <= s.y + s.height) {
        return s;
      }
    }
    return null;
  }, [stickies]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (editingId) return;
    const point = getCanvasPoint(e);

    if (tool === 'brush' || tool === 'eraser') {
      isDrawingRef.current = true;
      const path: DrawPath = {
        id: uuidv4(),
        type: 'path',
        points: [point],
        color: tool === 'eraser' ? GRID_BG : color,
        size: size,
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

    const now = Date.now();
    if (now - lastCursorMoveRef.current > 30) {
      onCursorMove(point);
      lastCursorMoveRef.current = now;
    }

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
      const editEl = editAreaRefs.current[s.id];
      if (editEl) {
        editEl.focus();
        const range = document.createRange();
        range.selectNodeContents(editEl);
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }, 50);
  }, []);

  const handleEditBlur = useCallback((stickyId: string) => {
    const editEl = editAreaRefs.current[stickyId];
    if (editEl) {
      const content = editEl.innerHTML;
      if (content === '<br>' || content === '') {
        onElementUpdate(stickyId, { content: '' } as Partial<StickyNote>);
        setElements((prev) =>
          prev.map((el) => {
            if (el.id === stickyId && el.type === 'sticky') {
              return { ...el, content: '' } as StickyNote;
            }
            return el;
          })
        );
      } else {
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
    }
    setEditingId(null);
  }, [onElementUpdate, setElements]);

  const execCommand = useCallback((command: string, stickyId: string) => {
    document.execCommand(command, false, null);
    const editEl = editAreaRefs.current[stickyId];
    if (editEl) editEl.focus();
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
        const author = users.find((u) => u.id === s.userId);

        return (
          <div
            key={s.id}
            className="sticky-note"
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              width: s.width,
              height: s.height,
              background: s.color + '18',
              border: `2px solid ${s.color}`,
              borderRadius: 10,
              padding: 0,
              boxShadow: isSelected
                ? `0 6px 20px rgba(0,0,0,0.25), 0 0 0 3px ${s.color}44`
                : '0 2px 8px rgba(0,0,0,0.1)',
              boxSizing: 'border-box',
              outline: isLineSource
                ? '3px dashed #ff4757'
                : isLineTarget
                ? '3px dashed #2ed573'
                : 'none',
              outlineOffset: '2px',
              transition: 'box-shadow 0.2s ease, outline 0.15s ease',
              zIndex: isEditing ? 60 : isSelected ? 50 : 10,
              display: 'flex',
              flexDirection: 'column',
              backdropFilter: 'blur(2px)',
            }}
            onMouseDown={(e) => handleStickyMouseDown(e, s)}
            onDoubleClick={(e) => handleStickyDoubleClick(e, s)}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '5px 10px', borderBottom: `1px solid ${s.color}33`,
              background: s.color + '14', borderRadius: '8px 8px 0 0',
              flexShrink: 0, cursor: 'move',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: s.color,
                  boxShadow: '0 0 4px ' + s.color + 'aa',
                }} />
                <span style={{
                  fontSize: 10, color: '#888', maxWidth: 100,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {author?.name || '匿名用户'}
                </span>
              </div>
              {isSelected && !isEditing && (
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleDeleteSticky(s.id); }}
                  style={{
                    background: '#ff4757', border: 'none', color: '#fff',
                    borderRadius: 5, cursor: 'pointer', fontSize: 11,
                    padding: '2px 7px', lineHeight: 1.4, fontWeight: 600,
                    transition: 'transform 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  title="删除便签"
                >✕</button>
              )}
              {!isSelected && !isEditing && <div style={{ width: 26 }} />}
            </div>

            {isEditing && (
              <div style={{
                display: 'flex', gap: 3, padding: '4px 8px',
                borderBottom: `1px solid ${s.color}22`,
                flexShrink: 0, background: s.color + '0a',
              }}>
                {[
                  { cmd: 'bold', label: 'B', title: '加粗 (Ctrl+B)', style: { fontWeight: 'bold' } },
                  { cmd: 'italic', label: 'I', title: '斜体 (Ctrl+I)', style: { fontStyle: 'italic' } },
                  { cmd: 'insertUnorderedList', label: '•', title: '列表', style: {} },
                ].map((b) => (
                  <button
                    key={b.cmd}
                    title={b.title}
                    onMouseDown={(e) => { e.preventDefault(); execCommand(b.cmd, s.id); }}
                    style={{
                      width: 26, height: 24, borderRadius: 5,
                      background: s.color + '22', border: 'none',
                      color: '#2c2c54', cursor: 'pointer', fontSize: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s',
                      ...b.style,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = s.color + '44'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = s.color + '22'; }}
                  >{b.label}</button>
                ))}
              </div>
            )}

            <div style={{ flex: 1, overflow: 'auto', padding: '8px 10px', minHeight: 0 }}>
              {isEditing ? (
                <div
                  ref={(el) => { editAreaRefs.current[s.id] = el; }}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={() => handleEditBlur(s.id)}
                  dangerouslySetInnerHTML={{ __html: s.content || '' }}
                  style={{
                    outline: 'none', fontSize: 13, color: '#2c2c54',
                    lineHeight: 1.6, wordBreak: 'break-word',
                    minHeight: 40,
                  }}
                />
              ) : (
                <div
                  style={{
                    fontSize: 13, color: '#2c2c54', wordBreak: 'break-word',
                    lineHeight: 1.6, overflow: 'hidden',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: s.content
                      ? s.content
                      : '<span style="color:#aaa;font-size:12px">双击编辑内容...</span>'
                  }}
                />
              )}
            </div>

            {isSelected && !isEditing && (
              <div
                className="resize-handle"
                style={{
                  position: 'absolute', right: -6, bottom: -6,
                  width: 16, height: 16, background: s.color,
                  cursor: 'se-resize', borderRadius: 4,
                  border: '2px solid #fff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                  transition: 'transform 0.15s',
                }}
                onMouseDown={(e) => handleResizeHandleMouseDown(e, s)}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              />
            )}
          </div>
        );
      })}

      {remoteUsers.map((u) => (
        <div
          key={u.id}
          className="remote-cursor"
          style={{
            position: 'absolute',
            left: u.cursor.x,
            top: u.cursor.y,
            pointerEvents: 'none',
            zIndex: 250,
            transition: 'left 0.08s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.08s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            willChange: 'left, top',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={u.color}
            style={{
              display: 'block',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))',
            }}
          >
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" stroke="#fff" strokeWidth="1.5" />
          </svg>
          <div style={{
            marginTop: -2, marginLeft: 16,
            background: u.color, color: '#fff',
            padding: '3px 9px', borderRadius: 12,
            fontSize: 11, fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            maxWidth: 140,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: 0.3,
          }}>
            {u.name}
          </div>
        </div>
      ))}

      {lineFrom && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #2c2c54, #40407a)',
          color: '#f7f1e3', padding: '10px 18px', borderRadius: 24,
          fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          zIndex: 300,
          display: 'flex', alignItems: 'center', gap: 10,
          fontWeight: 500,
        }}>
          <span>🎯 点击目标便签完成连线</span>
          <button
            onClick={(e) => { e.stopPropagation(); setLineFrom(null); }}
            style={{
              background: '#ff4757', border: 'none', color: '#fff',
              padding: '4px 12px', borderRadius: 16, cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              transition: 'transform 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >取消</button>
        </div>
      )}

      <style>{`
        .canvas-container canvas {
          image-rendering: crisp-edges;
        }
        .sticky-note ul {
          margin: 4px 0;
          padding-left: 20px;
        }
        .sticky-note li {
          margin: 2px 0;
        }
        .sticky-note strong {
          font-weight: 700;
        }
        .sticky-note em {
          font-style: italic;
        }
        .remote-cursor {
          animation: cursorPulse 2s ease-in-out infinite;
        }
        @keyframes cursorPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.95; }
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
