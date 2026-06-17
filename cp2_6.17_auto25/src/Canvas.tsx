import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CanvasElement, CanvasView, DrawingElement, ImageElement, TextElement, Point, ContextMenuState, Tool } from './types';
import type { useCanvasState } from './useCanvasState';

interface CanvasProps {
  state: ReturnType<typeof useCanvasState>;
  activeTool: Tool;
  setActiveTool: (t: Tool) => void;
  brushColor: string;
  brushWidth: 2 | 4 | 6;
}

export const Canvas: React.FC<CanvasProps> = ({
  state,
  activeTool,
  setActiveTool,
  brushColor,
  brushWidth,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);

  const {
    elements,
    selectedId,
    setSelectedId,
    view,
    setViewOffset,
    setViewScale,
    startInertia,
    updateElement,
    deleteElement,
    duplicateElement,
    bringToFront,
    sendToBack,
    toggleLock,
    addDrawingElement,
  } = state;

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    elementId: null,
  });
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [showDragBorder, setShowDragBorder] = useState(false);
  const dragBorderTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [isResizing, setIsResizing] = useState(false);
  const [resizeTarget, setResizeTarget] = useState<string | null>(null);

  const isDrawingRef = useRef(false);
  const drawPointsRef = useRef<Point[]>([]);
  const spaceDownRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const viewStartRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const elemStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const velocityRef = useRef({ x: 0, y: 0 });
  const lastPanTimeRef = useRef(0);
  const lastPanPosRef = useRef({ x: 0, y: 0 });

  const fadeInAnimationsRef = useRef<Map<number, { ctx: CanvasRenderingContext2D; startTime: number; duration: number }>>(new Map());
  const fadeInRafRef = useRef<number>(0);
  const fadeInIdCounter = useRef(0);

  const runFadeInLoop = useCallback(() => {
    const now = performance.now();
    const anims = fadeInAnimationsRef.current;
    anims.forEach((anim, id) => {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      if (anim.ctx) {
        anim.ctx.globalAlpha = progress;
      }
      if (progress >= 1) {
        anims.delete(id);
      }
    });
    if (anims.size > 0) {
      fadeInRafRef.current = requestAnimationFrame(runFadeInLoop);
    }
  }, []);

  const startFadeIn = useCallback((ctx: CanvasRenderingContext2D, duration: number = 300) => {
    const id = fadeInIdCounter.current++;
    fadeInAnimationsRef.current.set(id, { ctx, startTime: performance.now(), duration });
    if (fadeInAnimationsRef.current.size === 1) {
      cancelAnimationFrame(fadeInRafRef.current);
      fadeInRafRef.current = requestAnimationFrame(runFadeInLoop);
    }
    return () => fadeInAnimationsRef.current.delete(id);
  }, [runFadeInLoop]);

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): Point => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: screenX, y: screenY };
      return {
        x: (screenX - rect.left - view.offsetX) / view.scale,
        y: (screenY - rect.top - view.offsetY) / view.scale,
      };
    },
    [view]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        spaceDownRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(fadeInRafRef.current);
    };
  }, []);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      let newScale = view.scale * zoomFactor;
      newScale = Math.max(0.2, Math.min(5, newScale));

      const newOffsetX = mouseX - (mouseX - view.offsetX) * (newScale / view.scale);
      const newOffsetY = mouseY - (mouseY - view.offsetY) * (newScale / view.scale);

      setViewScale(newScale, newOffsetX, newOffsetY);
    };

    const el = containerRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (el) el.removeEventListener('wheel', handleWheel);
    };
  }, [view, setViewScale]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 2 || (spaceDownRef.current && e.button === 0)) {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        viewStartRef.current = { x: view.offsetX, y: view.offsetY };
        lastPanPosRef.current = { x: e.clientX, y: e.clientY };
        lastPanTimeRef.current = Date.now();
        velocityRef.current = { x: 0, y: 0 };
        cancelAnimationFrame(inertiaRafRef.current);
        return;
      }

      if (activeTool === 'drawing' && e.button === 0) {
        isDrawingRef.current = true;
        const canvasPt = screenToCanvas(e.clientX, e.clientY);
        drawPointsRef.current = [canvasPt];
        const dCanvas = drawingCanvasRef.current;
        if (dCanvas) {
          const ctx = dCanvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, dCanvas.width, dCanvas.height);
            ctx.strokeStyle = brushColor;
            ctx.lineWidth = brushWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 0;
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              const sx = (canvasPt.x * view.scale + view.offsetX);
              const sy = (canvasPt.y * view.scale + view.offsetY);
              ctx.moveTo(sx - rect.left + rect.left, sy - rect.top + rect.top);
            }
            startFadeIn(ctx, 300);
          }
        }
        return;
      }

      if (e.button === 0) {
        const target = e.target as HTMLElement;
        const elementEl = target.closest('[data-element-id]');
        if (elementEl) {
          const id = elementEl.getAttribute('data-element-id')!;
          const el = elements.find((el) => el.id === id);
          if (el && !el.locked) {
            setSelectedId(id);
            setIsDragging(true);
            setDragTarget(id);
            setShowDragBorder(false);
            dragBorderTimerRef.current = setTimeout(() => setShowDragBorder(true), 150);
            dragStartRef.current = { x: e.clientX, y: e.clientY };
            elemStartRef.current = { x: el.x, y: el.y };
          } else {
            setSelectedId(id);
          }
        } else if (!target.closest('[data-handle]')) {
          setSelectedId(null);
          setContextMenu({ visible: false, x: 0, y: 0, elementId: null });
        }
      }
    },
    [activeTool, brushColor, brushWidth, elements, screenToCanvas, setSelectedId, view]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        const newOffX = viewStartRef.current.x + dx;
        const newOffY = viewStartRef.current.y + dy;

        const now = Date.now();
        const dt = now - lastPanTimeRef.current;
        if (dt > 0) {
          velocityRef.current = {
            x: (e.clientX - lastPanPosRef.current.x) / dt * 16,
            y: (e.clientY - lastPanPosRef.current.y) / dt * 16,
          };
        }
        lastPanTimeRef.current = now;
        lastPanPosRef.current = { x: e.clientX, y: e.clientY };

        setViewOffset(newOffX, newOffY);
        return;
      }

      if (isDrawingRef.current) {
        const canvasPt = screenToCanvas(e.clientX, e.clientY);
        drawPointsRef.current.push(canvasPt);
        const dCanvas = drawingCanvasRef.current;
        if (dCanvas) {
          const ctx = dCanvas.getContext('2d');
          if (ctx) {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = brushColor;
            ctx.lineWidth = brushWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            const prev = drawPointsRef.current[drawPointsRef.current.length - 2];
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect && prev) {
              const sx1 = prev.x * view.scale + view.offsetX - rect.left;
              const sy1 = prev.y * view.scale + view.offsetY - rect.top;
              const sx2 = canvasPt.x * view.scale + view.offsetX - rect.left;
              const sy2 = canvasPt.y * view.scale + view.offsetY - rect.top;
              ctx.beginPath();
              ctx.moveTo(sx1, sy1);
              ctx.lineTo(sx2, sy2);
              ctx.stroke();
            }
          }
        }
        return;
      }

      if (isDragging && dragTarget) {
        const dx = (e.clientX - dragStartRef.current.x) / view.scale;
        const dy = (e.clientY - dragStartRef.current.y) / view.scale;
        updateElement(dragTarget, {
          x: elemStartRef.current.x + dx,
          y: elemStartRef.current.y + dy,
        });
        return;
      }

      if (isResizing && resizeTarget) {
        const el = elements.find((el) => el.id === resizeTarget);
        if (!el) return;
        const startW = resizeStartRef.current.w;
        const startH = resizeStartRef.current.h;
        const dx = (e.clientX - resizeStartRef.current.x) / view.scale;
        let scaleRatio = (startW + dx) / startW;
        scaleRatio = Math.max(0.5, Math.min(2.0, scaleRatio));
        scaleRatio = Math.round(scaleRatio / 0.5) * 0.5;
        let newW = Math.round(startW * scaleRatio);
        let newH = Math.round(startH * scaleRatio);
        newW = Math.max(50, Math.min(300, newW));
        newH = Math.max(50, Math.min(300, newH));
        updateElement(resizeTarget, { width: newW, height: newH });
      }
    },
    [isDragging, dragTarget, isResizing, resizeTarget, elements, updateElement, view, screenToCanvas, brushColor, brushWidth, setViewOffset]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        startInertia(velocityRef.current.x, velocityRef.current.y);
        return;
      }

      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        const points = drawPointsRef.current;
        if (points.length > 1) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const p of points) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
          }
          const padding = brushWidth + 4;
          const bounds = {
            x: minX - padding,
            y: minY - padding,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2,
          };
          const relPoints = points.map((p) => ({
            x: p.x - bounds.x,
            y: p.y - bounds.y,
          }));
          addDrawingElement(relPoints, brushColor, brushWidth, bounds);
        }
        drawPointsRef.current = [];
        const dCanvas = drawingCanvasRef.current;
        if (dCanvas) {
          const ctx = dCanvas.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, dCanvas.width, dCanvas.height);
        }
        return;
      }

      setIsDragging(false);
      setDragTarget(null);
      setShowDragBorder(false);
      if (dragBorderTimerRef.current) clearTimeout(dragBorderTimerRef.current);
      setIsResizing(false);
      setResizeTarget(null);
    },
    [addDrawingElement, brushColor, brushWidth, startInertia]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      const elementEl = target.closest('[data-element-id]');
      if (elementEl) {
        const id = elementEl.getAttribute('data-element-id')!;
        setSelectedId(id);
        setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          elementId: id,
        });
      } else {
        setContextMenu({ visible: false, x: 0, y: 0, elementId: null });
      }
    },
    [setSelectedId]
  );

  const handleRotate = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const el = elements.find((el) => el.id === id);
      if (el) {
        updateElement(id, { rotation: (el.rotation + 45) % 360 });
      }
    },
    [elements, updateElement]
  );

  const handleResizeStart = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const el = elements.find((el) => el.id === id);
      if (el) {
        setIsResizing(true);
        setResizeTarget(id);
        resizeStartRef.current = { x: e.clientX, y: e.clientY, w: el.width, h: el.height };
      }
    },
    [elements]
  );

  const handleTextDoubleClick = useCallback(
    (id: string) => {
      setEditingTextId(id);
    },
    []
  );

  const handleTextBlur = useCallback(
    (id: string, newContent: string) => {
      updateElement(id, { content: newContent });
      setEditingTextId(null);
    },
    [updateElement]
  );

  const handleClick = useCallback(() => {
    if (contextMenu.visible) {
      setContextMenu({ visible: false, x: 0, y: 0, elementId: null });
    }
  }, [contextMenu.visible]);

  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  const renderElement = (el: CanvasElement) => {
    const isSelected = el.id === selectedId;
    const isEditing = editingTextId === el.id;

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: el.x * view.scale + view.offsetX,
      top: el.y * view.scale + view.offsetY,
      width: el.width * view.scale,
      height: el.height * view.scale,
      transform: `rotate(${el.rotation}deg)`,
      transformOrigin: 'center center',
      zIndex: el.zIndex,
      cursor: el.locked ? 'default' : 'move',
      transition: isResizing && resizeTarget === el.id
        ? 'width 0.1s ease, height 0.1s ease'
        : undefined,
    };

    const glowStyle: React.CSSProperties = isSelected
      ? {
          boxShadow: '0 0 4px 4px rgba(224,170,255,0.4), 0 0 8px 4px rgba(224,170,255,0)',
          animation: 'glowBreathe 0.5s ease-in-out infinite alternate',
        }
      : {};

    if (el.type === 'image') {
      const imgEl = el as ImageElement;
      return (
        <div
          key={el.id}
          data-element-id={el.id}
          style={{
            ...baseStyle,
            ...glowStyle,
            border: showDragBorder && dragTarget === el.id ? '2px dashed #ffd700' : 'none',
            borderRadius: 4,
            overflow: 'hidden',
            transition: showDragBorder && dragTarget === el.id
              ? 'border 0.15s ease'
              : isResizing && resizeTarget === el.id
              ? 'width 0.1s ease, height 0.1s ease'
              : 'box-shadow 0.3s ease',
          }}
          onContextMenu={handleContextMenu}
        >
          <img
            src={imgEl.src}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', userSelect: 'none', display: 'block' }}
            draggable={false}
          />
          {isSelected && !el.locked && (
            <>
              <div
                data-handle="rotate"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => handleRotate(el.id, e)}
                style={{
                  position: 'absolute',
                  top: -24,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#6c5ce7',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.2s ease',
                  zIndex: 10,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </div>
              <div
                data-handle="resize"
                onMouseDown={(e) => handleResizeStart(el.id, e)}
                style={{
                  position: 'absolute',
                  right: -6,
                  bottom: -6,
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: '#6c5ce7',
                  cursor: 'nwse-resize',
                  zIndex: 10,
                }}
              />
            </>
          )}
        </div>
      );
    }

    if (el.type === 'text') {
      const textEl = el as TextElement;
      return (
        <div
          key={el.id}
          data-element-id={el.id}
          style={{
            ...baseStyle,
            ...glowStyle,
            background: 'rgba(20,20,30,0.6)',
            borderRadius: 8,
            border: '1px solid #555',
            padding: '10px 12px',
            color: '#e0e0e0',
            fontFamily: "'PingFang SC', -apple-system, sans-serif",
            fontSize: textEl.fontSize * view.scale,
            fontWeight: textEl.fontWeight,
            fontStyle: textEl.fontStyle,
            lineHeight: 1.4,
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            transition: isResizing && resizeTarget === el.id
              ? 'width 0.1s ease, height 0.1s ease'
              : 'box-shadow 0.3s ease',
          }}
          onDoubleClick={() => handleTextDoubleClick(el.id)}
          onContextMenu={handleContextMenu}
        >
          {isEditing ? (
            <textarea
              autoFocus
              defaultValue={textEl.content}
              onBlur={(e) => handleTextBlur(el.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  handleTextBlur(el.id, textEl.content);
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#e0e0e0',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                fontWeight: 'inherit',
                fontStyle: 'inherit',
                lineHeight: 'inherit',
                resize: 'none',
                padding: 0,
              }}
            />
          ) : (
            textEl.content
          )}
          {isSelected && !el.locked && (
            <div
              data-handle="rotate"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => handleRotate(el.id, e)}
              style={{
                position: 'absolute',
                top: -24,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#6c5ce7',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </div>
          )}
        </div>
      );
    }

    if (el.type === 'drawing') {
      const drawEl = el as DrawingElement;
      return (
        <div
          key={el.id}
          data-element-id={el.id}
          style={{
            ...baseStyle,
            ...glowStyle,
            cursor: 'default',
            transition: 'box-shadow 0.3s ease',
          }}
          onContextMenu={handleContextMenu}
        >
          <svg
            width="100%"
            height="100%"
            style={{ overflow: 'visible', pointerEvents: 'none' }}
          >
            {drawEl.points.length > 1 && (
              <path
                d={drawEl.points
                  .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`)
                  .join(' ')}
                fill="none"
                stroke={drawEl.strokeColor}
                strokeWidth={drawEl.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  animation: 'drawFadeIn 0.3s ease-out forwards',
                }}
              />
            )}
          </svg>
        </div>
      );
    }

    return null;
  };

  const gridSize = 40;
  const gridPattern = `M ${gridSize} 0 L 0 0 0 ${gridSize}`;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        background: '#1a1a2e',
        cursor:
          spaceDownRef.current
            ? isPanningRef.current
              ? 'grabbing'
              : 'grab'
            : activeTool === 'drawing'
            ? 'crosshair'
            : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
    >
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <pattern
            id="gridPattern"
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${view.offsetX % (gridSize * view.scale)},${view.offsetY % (gridSize * view.scale)}) scale(${view.scale})`}
          >
            <path d={gridPattern} fill="none" stroke="#333340" strokeWidth={1 / view.scale} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gridPattern)" />
      </svg>

      {sortedElements.map(renderElement)}

      <canvas
        ref={drawingCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {contextMenu.visible && contextMenu.elementId && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'rgba(30,30,40,0.95)',
            borderRadius: 8,
            padding: '4px 0',
            minWidth: 140,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            zIndex: 2000,
            animation: 'contextMenuIn 0.15s ease forwards',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ContextMenuItem label="删除" onClick={() => { deleteElement(contextMenu.elementId!); setContextMenu({ visible: false, x: 0, y: 0, elementId: null }); }} />
          <ContextMenuItem label="复制" onClick={() => { duplicateElement(contextMenu.elementId!); setContextMenu({ visible: false, x: 0, y: 0, elementId: null }); }} />
          <ContextMenuItem label="置顶" onClick={() => { bringToFront(contextMenu.elementId!); setContextMenu({ visible: false, x: 0, y: 0, elementId: null }); }} />
          <ContextMenuItem label="置底" onClick={() => { sendToBack(contextMenu.elementId!); setContextMenu({ visible: false, x: 0, y: 0, elementId: null }); }} />
          <ContextMenuItem
            label={elements.find((el) => el.id === contextMenu.elementId)?.locked ? '解锁' : '锁定'}
            onClick={() => { toggleLock(contextMenu.elementId!); setContextMenu({ visible: false, x: 0, y: 0, elementId: null }); }}
          />
        </div>
      )}

      <style>{`
        @keyframes glowBreathe {
          0% { box-shadow: 0 0 4px 4px rgba(224,170,255,0.4), 0 0 8px 4px rgba(224,170,255,0); }
          100% { box-shadow: 0 0 8px 4px rgba(224,170,255,0.2), 0 0 16px 8px rgba(224,170,255,0); }
        }
        @keyframes drawFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes contextMenuIn {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

const ContextMenuItem: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <div
    onClick={onClick}
    style={{
      padding: '8px 16px',
      color: '#e0e0e0',
      fontSize: 13,
      cursor: 'pointer',
      transition: 'background 0.15s',
      fontFamily: "'PingFang SC', -apple-system, sans-serif",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(224,170,255,0.15)')}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
  >
    {label}
  </div>
);
