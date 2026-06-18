import { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCanvasStore } from './store';
import { wsManager } from './websocket';
import type { Point, DrawElement, CanvasElement, StickyNoteElement } from './types';

const GRID_SIZE = 30;
const GRID_COLOR = '#e8e8e8';
const BG_COLOR = '#f8f9fa';
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

function screenToWorld(
  screenX: number,
  screenY: number,
  offsetX: number,
  offsetY: number,
  scale: number
): Point {
  return {
    x: (screenX - offsetX) / scale,
    y: (screenY - offsetY) / scale,
  };
}

function isElementInViewport(
  el: CanvasElement,
  offsetX: number,
  offsetY: number,
  scale: number,
  width: number,
  height: number,
  padding: number = 100
): boolean {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  if (el.type === 'stroke') {
    for (const p of el.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const t = el.thickness;
    minX -= t; minY -= t; maxX += t; maxY += t;
  } else if (el.type === 'sticky' || el.type === 'image') {
    minX = el.x;
    minY = el.y;
    maxX = el.x + el.width;
    maxY = el.y + el.height;
  }

  const sx1 = minX * scale + offsetX - padding;
  const sy1 = minY * scale + offsetY - padding;
  const sx2 = maxX * scale + offsetX + padding;
  const sy2 = maxY * scale + offsetY + padding;

  return sx2 >= 0 && sy2 >= 0 && sx1 <= width && sy1 <= height;
}

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const [, forceRerender] = useState(0);

  const {
    elements,
    viewport,
    setViewport,
    currentTool,
    brushColor,
    brushThickness,
    currentUser,
    setIsPanning,
    findUser,
    activeStickyId,
    setActiveStickyId,
    updateSticky,
    addOrUpdateStroke,
    setElements,
  } = useCanvasStore();

  const stateRef = useRef({
    isDrawing: false,
    isPanning: false,
    isDraggingSticky: false,
    dragStickyId: '' as string,
    dragOffsetX: 0,
    dragOffsetY: 0,
    spacePressed: false,
    currentStrokeId: '' as string,
    currentPoints: [] as Point[],
    lastPanX: 0,
    lastPanY: 0,
    debounceTimer: 0 as number,
  });

  const getCanvasSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return { width: window.innerWidth, height: window.innerHeight };
    return { width: container.clientWidth, height: container.clientHeight };
  }, []);

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, width, height);

      const { offsetX, offsetY, scale } = useCanvasStore.getState().viewport;
      const scaledGrid = GRID_SIZE * scale;

      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 0.5;

      const startX = ((-offsetX) % scaledGrid + scaledGrid) % scaledGrid;
      const startY = ((-offsetY) % scaledGrid + scaledGrid) % scaledGrid;

      ctx.beginPath();
      for (let x = startX; x <= width; x += scaledGrid) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = startY; y <= height; y += scaledGrid) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    },
    []
  );

  const renderStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: DrawElement) => {
    if (stroke.points.length < 1) return;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, stroke.thickness / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color;
      ctx.fill();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = getCanvasSize();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawGrid(ctx, width, height);

    const { viewport: vp, elements: els } = useCanvasStore.getState();
    ctx.save();
    ctx.translate(vp.offsetX, vp.offsetY);
    ctx.scale(vp.scale, vp.scale);

    const useVirtual = els.length > 200;
    for (const el of els) {
      if (useVirtual && !isElementInViewport(el, vp.offsetX, vp.offsetY, vp.scale, width, height)) {
        continue;
      }
      if (el.type === 'stroke') {
        renderStroke(ctx, el);
      }
    }
    ctx.restore();

    animRef.current = 0;
  }, [drawGrid, getCanvasSize, renderStroke]);

  const scheduleRender = useCallback(() => {
    if (!animRef.current) {
      animRef.current = requestAnimationFrame(render);
    }
  }, [render]);

  useEffect(() => {
    scheduleRender();
  }, [elements, viewport, scheduleRender]);

  useEffect(() => {
    const handleResize = () => scheduleRender();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [scheduleRender]);

  const broadcastStroke = useCallback((id: string, points: Point[], color: string, thickness: number) => {
    const s = stateRef.current;
    if (s.debounceTimer) clearTimeout(s.debounceTimer);
    s.debounceTimer = window.setTimeout(() => {
      wsManager.sendStroke({ id, points, color, thickness });
    }, 50);
  }, []);

  const getMousePos = (e: React.MouseEvent | MouseEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const s = stateRef.current;
    const { offsetX, offsetY, scale } = useCanvasStore.getState().viewport;
    const pos = getMousePos(e);
    const world = screenToWorld(pos.x, pos.y, offsetX, offsetY, scale);

    if (s.spacePressed || currentTool === 'pan') {
      s.isPanning = true;
      s.lastPanX = e.clientX;
      s.lastPanY = e.clientY;
      setIsPanning(true);
      return;
    }

    if (currentTool === 'brush') {
      s.isDrawing = true;
      s.currentStrokeId = uuidv4();
      s.currentPoints = [world];
      const stroke: DrawElement = {
        id: s.currentStrokeId,
        type: 'stroke',
        points: s.currentPoints,
        color: brushColor,
        thickness: brushThickness,
        userId: currentUser?.id || '',
        lastModifiedBy: currentUser?.id || '',
        modifiedAt: Date.now(),
      };
      addOrUpdateStroke(stroke);
      broadcastStroke(s.currentStrokeId, s.currentPoints, brushColor, brushThickness);
    } else if (currentTool === 'sticky') {
      wsManager.sendAddSticky(world.x, world.y, '新便签');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const s = stateRef.current;
    const { offsetX, offsetY, scale } = useCanvasStore.getState().viewport;
    const pos = getMousePos(e);
    const world = screenToWorld(pos.x, pos.y, offsetX, offsetY, scale);

    if (s.isPanning) {
      const dx = e.clientX - s.lastPanX;
      const dy = e.clientY - s.lastPanY;
      s.lastPanX = e.clientX;
      s.lastPanY = e.clientY;
      setViewport({ offsetX: offsetX + dx, offsetY: offsetY + dy });
      return;
    }

    if (s.isDraggingSticky && s.dragStickyId) {
      const el = useCanvasStore.getState().elements.find(e => e.id === s.dragStickyId) as StickyNoteElement | undefined;
      if (el && el.type === 'sticky') {
        const newX = world.x - s.dragOffsetX;
        const newY = world.y - s.dragOffsetY;
        const updated: StickyNoteElement = { ...el, x: newX, y: newY, lastModifiedBy: currentUser?.id || '', modifiedAt: Date.now() };
        updateSticky(updated);
        wsManager.sendUpdateSticky({ id: el.id, x: newX, y: newY });
      }
      return;
    }

    if (s.isDrawing && s.currentStrokeId) {
      s.currentPoints = [...s.currentPoints, world];
      const stroke: DrawElement = {
        id: s.currentStrokeId,
        type: 'stroke',
        points: s.currentPoints,
        color: brushColor,
        thickness: brushThickness,
        userId: currentUser?.id || '',
        lastModifiedBy: currentUser?.id || '',
        modifiedAt: Date.now(),
      };
      addOrUpdateStroke(stroke);
      broadcastStroke(s.currentStrokeId, s.currentPoints, brushColor, brushThickness);
    }
  };

  const handleMouseUp = () => {
    const s = stateRef.current;
    if (s.isPanning) {
      s.isPanning = false;
      setIsPanning(false);
    }
    if (s.isDrawing) {
      s.isDrawing = false;
      wsManager.sendStroke({
        id: s.currentStrokeId,
        points: s.currentPoints,
        color: brushColor,
        thickness: brushThickness,
      });
      s.currentStrokeId = '';
      s.currentPoints = [];
    }
    if (s.isDraggingSticky) {
      s.isDraggingSticky = false;
      s.dragStickyId = '';
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const { offsetX, offsetY, scale } = useCanvasStore.getState().viewport;
    const pos = getMousePos(e as unknown as React.MouseEvent);

    const zoomIntensity = 0.0015;
    const delta = -e.deltaY * zoomIntensity;
    let newScale = scale * (1 + delta);
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    const ratio = newScale / scale;
    const newOffsetX = pos.x - (pos.x - offsetX) * ratio;
    const newOffsetY = pos.y - (pos.y - offsetY) * ratio;

    setViewport({ offsetX: newOffsetX, offsetY: newOffsetY, scale: newScale });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        stateRef.current.spacePressed = true;
        forceRerender((x) => x + 1);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        stateRef.current.spacePressed = false;
        forceRerender((x) => x + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const cursorStyle = stateRef.current.spacePressed || currentTool === 'pan'
    ? (stateRef.current.isPanning ? 'grabbing' : 'grab')
    : currentTool === 'brush'
    ? 'crosshair'
    : currentTool === 'sticky'
    ? 'copy'
    : 'default';

  const { viewport: vp } = useCanvasStore.getState();
  const { width, height } = getCanvasSize();
  const useVirtual = elements.length > 200;

  const stickyElements = elements.filter((el) => {
    if (el.type !== 'sticky' && el.type !== 'image') return false;
    if (useVirtual) return isElementInViewport(el, vp.offsetX, vp.offsetY, vp.scale, width, height);
    return true;
  });

  const startDragSticky = (id: string, worldX: number, worldY: number, elX: number, elY: number) => {
    const s = stateRef.current;
    s.isDraggingSticky = true;
    s.dragStickyId = id;
    s.dragOffsetX = worldX - elX;
    s.dragOffsetY = worldY - elY;
    setActiveStickyId(null);
  };

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{ cursor: cursorStyle }}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        className="canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {stickyElements.map((el) => {
        const left = el.x * vp.scale + vp.offsetX;
        const top = el.y * vp.scale + vp.offsetY;
        const w = el.width * vp.scale;
        const h = el.height * vp.scale;
        const modifier = findUser(el.lastModifiedBy);

        if (el.type === 'sticky') {
          const isActive = activeStickyId === el.id;
          return (
            <div
              key={el.id}
              className="sticky-note"
              style={{
                left,
                top,
                width: w,
                height: h,
                zIndex: isActive ? 50 : 10,
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                const { offsetX, offsetY, scale } = useCanvasStore.getState().viewport;
                const rect = containerRef.current!.getBoundingClientRect();
                const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                const world = screenToWorld(pos.x, pos.y, offsetX, offsetY, scale);
                startDragSticky(el.id, world.x, world.y, el.x, el.y);
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                if (!stateRef.current.isDraggingSticky) {
                  setActiveStickyId(el.id);
                }
              }}
            >
              {modifier && (
                <div
                  className="element-avatar"
                  style={{ background: modifier.color }}
                  title={modifier.nickname}
                >
                  {modifier.nickname.slice(0, 1)}
                </div>
              )}
              {isActive ? (
                <textarea
                  className="sticky-input"
                  autoFocus
                  value={el.text}
                  onMouseDown={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const text = e.target.value;
                    const updated = { ...el, text, lastModifiedBy: currentUser?.id || '', modifiedAt: Date.now() };
                    updateSticky(updated);
                  }}
                  onBlur={() => {
                    wsManager.sendUpdateSticky({ id: el.id, text: el.text });
                    setActiveStickyId(null);
                  }}
                  placeholder="输入内容..."
                />
              ) : (
                <div className="sticky-text">{el.text || '点击编辑'}</div>
              )}
            </div>
          );
        }

        if (el.type === 'image') {
          return (
            <div
              key={el.id}
              className="image-element"
              style={{
                left,
                top,
                width: w,
                height: h,
              }}
            >
              {modifier && (
                <div
                  className="element-avatar"
                  style={{ background: modifier.color }}
                  title={modifier.nickname}
                >
                  {modifier.nickname.slice(0, 1)}
                </div>
              )}
              <img src={el.dataUrl} alt="" draggable={false} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
