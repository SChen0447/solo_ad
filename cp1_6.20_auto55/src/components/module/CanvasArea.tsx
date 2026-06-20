import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { UIComponent, OnlineUser, ComponentTemplate } from '../../types';
import { snapToGrid, clamp } from '../../api';

interface CanvasAreaProps {
  components: UIComponent[];
  selectedComponentId: string | null;
  onSelectComponent: (id: string | null) => void;
  onUpdateComponent: (id: string, updates: Partial<UIComponent>) => void;
  onAddFromTemplate: (template: ComponentTemplate, x: number, y: number) => void;
  onlineUsers: OnlineUser[];
  currentUserId: string;
  onCursorMove: (x: number, y: number) => void;
}

const GRID_SIZE = 20;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const SNAP_DURATION = 150;

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  components,
  selectedComponentId,
  onSelectComponent,
  onUpdateComponent,
  onAddFromTemplate,
  onlineUsers,
  currentUserId,
  onCursorMove,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; compX: number; compY: number } | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const [droppingId, setDroppingId] = useState<string | null>(null);
  const animatingRef = useRef<number | null>(null);
  const lastCursorUpdateRef = useRef(0);
  const cursorThrottleRef = useRef(0);

  const animateZoomTo = useCallback((targetZoom: number) => {
    if (animatingRef.current) {
      cancelAnimationFrame(animatingRef.current);
    }
    const startZoom = zoom;
    const startTime = performance.now();
    const duration = 200;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress * (2 - progress);
      const current = startZoom + (targetZoom - startZoom) * eased;
      setZoom(current);
      if (progress < 1) {
        animatingRef.current = requestAnimationFrame(animate);
      }
    };
    animatingRef.current = requestAnimationFrame(animate);
  }, [zoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const targetZoom = clamp(zoom + delta, MIN_ZOOM, MAX_ZOOM);
    animateZoomTo(targetZoom);
  }, [zoom, animateZoomTo]);

  const zoomIn = () => animateZoomTo(clamp(zoom + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
  const zoomOut = () => animateZoomTo(clamp(zoom - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
  const resetZoom = () => animateZoomTo(1);

  const handleWrapperMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (e.target === wrapperRef.current || e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-grid')) {
      onSelectComponent(null);
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (cursorThrottleRef.current) return;
    const now = performance.now();
    if (now - lastCursorUpdateRef.current < 33) {
      cursorThrottleRef.current = requestAnimationFrame(() => {
        cursorThrottleRef.current = 0;
      });
      return;
    }
    lastCursorUpdateRef.current = now;
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (rect) {
      const canvasX = (e.clientX - rect.left - pan.x) / zoom;
      const canvasY = (e.clientY - rect.top - pan.y) / zoom;
      onCursorMove(canvasX, canvasY);
    }
  }, [pan, zoom, onCursorMove]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  useEffect(() => {
    const handleMouseUp = () => {
      if (isPanning) setIsPanning(false);
      if (draggingId) {
        setDroppingId(draggingId);
        setTimeout(() => setDroppingId(null), 200);
        setDraggingId(null);
        dragStartRef.current = null;
      }
      if (resizingId) {
        setResizingId(null);
        resizeStartRef.current = null;
      }
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
      }
      if (draggingId && dragStartRef.current) {
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (!rect) return;
        const dx = (e.clientX - dragStartRef.current.x) / zoom;
        const dy = (e.clientY - dragStartRef.current.y) / zoom;
        const targetX = snapToGrid(dragStartRef.current.compX + dx);
        const targetY = snapToGrid(dragStartRef.current.compY + dy);
        onUpdateComponent(draggingId, { x: targetX, y: targetY });
      }
      if (resizingId && resizeStartRef.current) {
        const dx = (e.clientX - resizeStartRef.current.x) / zoom;
        const dy = (e.clientY - resizeStartRef.current.y) / zoom;
        const targetW = Math.max(40, snapToGrid(resizeStartRef.current.width + dx));
        const targetH = Math.max(40, snapToGrid(resizeStartRef.current.height + dy));
        onUpdateComponent(resizingId, { width: targetW, height: targetH });
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isPanning, draggingId, resizingId, zoom, onUpdateComponent]);

  const handleComponentMouseDown = (e: React.MouseEvent, comp: UIComponent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    onSelectComponent(comp.id);
    setDraggingId(comp.id);
    dragStartRef.current = { x: e.clientX, y: e.clientY, compX: comp.x, compY: comp.y };
  };

  const handleResizeMouseDown = (e: React.MouseEvent, comp: UIComponent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setResizingId(comp.id);
    resizeStartRef.current = { x: e.clientX, y: e.clientY, width: comp.width, height: comp.height };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = snapToGrid((e.clientX - rect.left - pan.x) / zoom);
    const y = snapToGrid((e.clientY - rect.top - pan.y) / zoom);

    const templateData = e.dataTransfer.getData('application/template');
    if (templateData) {
      try {
        const template = JSON.parse(templateData) as ComponentTemplate;
        onAddFromTemplate(template, x, y);
      } catch {
        /* ignore */
      }
    }
  };

  const renderComponent = (comp: UIComponent) => {
    const style: React.CSSProperties = {
      left: comp.x,
      top: comp.y,
      width: comp.width,
      height: comp.height,
      backgroundColor: comp.styles.backgroundColor,
      color: comp.styles.color,
      borderRadius: comp.styles.borderRadius,
      fontSize: comp.styles.fontSize,
      fontWeight: comp.styles.fontWeight as React.CSSProperties['fontWeight'],
      border: comp.styles.border,
      padding: comp.styles.padding,
      margin: comp.styles.margin,
      boxShadow: comp.styles.boxShadow,
      opacity: comp.styles.opacity ? parseFloat(comp.styles.opacity) : undefined,
    };

    const isSelected = selectedComponentId === comp.id;
    const isDragging = draggingId === comp.id;
    const isDropping = droppingId === comp.id;

    return (
      <div
        key={comp.id}
        className={`canvas-component ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isDropping ? 'dropping' : ''}`}
        style={style}
        onMouseDown={(e) => handleComponentMouseDown(e, comp)}
      >
        <div className="component-preview">
          {comp.type === 'Button' && <span>{comp.props.text || '按钮'}</span>}
          {comp.type === 'Input' && (
            <span style={{ opacity: 0.5, width: '100%', textAlign: 'left', paddingLeft: 12 }}>
              {comp.props.placeholder || '请输入...'}
            </span>
          )}
          {comp.type === 'Card' && (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              {comp.props.title && (
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{comp.props.title}</div>
              )}
              <div style={{ flex: 1, opacity: 0.5, fontSize: 12 }}>卡片内容区域</div>
            </div>
          )}
          {comp.type === 'Modal' && (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              {comp.props.title && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{comp.props.title}</div>
                  {comp.props.showClose && <span style={{ fontSize: 20, cursor: 'pointer' }}>×</span>}
                </div>
              )}
              <div style={{ flex: 1, opacity: 0.5, fontSize: 12 }}>模态框内容区域</div>
            </div>
          )}
          {!['Button', 'Input', 'Card', 'Modal'].includes(comp.type) && <span>{comp.name}</span>}
        </div>
        {isSelected && (
          <div
            className="canvas-component-resize-handle"
            onMouseDown={(e) => handleResizeMouseDown(e, comp)}
          />
        )}
      </div>
    );
  };

  const renderGrid = () => {
    const width = 4000;
    const height = 3000;
    const scaledGrid = GRID_SIZE * zoom;
    const gridCountX = Math.ceil(width / scaledGrid) + 1;
    const gridCountY = Math.ceil(height / scaledGrid) + 1;

    return (
      <svg
        className="canvas-grid"
        width={width}
        height={height}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
      >
        <defs>
          <pattern id="smallGrid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
            <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#313244" strokeWidth="0.5" />
          </pattern>
          <pattern id="grid" width={GRID_SIZE * 5} height={GRID_SIZE * 5} patternUnits="userSpaceOnUse">
            <rect width={GRID_SIZE * 5} height={GRID_SIZE * 5} fill="url(#smallGrid)" />
            <path d={`M ${GRID_SIZE * 5} 0 L 0 0 0 ${GRID_SIZE * 5}`} fill="none" stroke="#45475a" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    );
  };

  return (
    <div
      className="canvas-wrapper"
      ref={wrapperRef}
      onWheel={handleWheel}
      onMouseDown={handleWrapperMouseDown}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ cursor: isPanning ? 'grabbing' : 'default' }}
    >
      {renderGrid()}
      <div
        ref={canvasRef}
        className="canvas"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {components.map(renderComponent)}
      </div>

      {onlineUsers
        .filter((u) => u.userId !== currentUserId)
        .map((user) => (
          <div
            key={user.userId}
            className="canvas-cursor"
            style={{
              left: pan.x + user.x * zoom,
              top: pan.y + user.y * zoom,
              transform: `scale(${1 / zoom})`,
              transformOrigin: '0 0',
            }}
          >
            <div className="canvas-cursor-dot" style={{ backgroundColor: user.color }} />
            <div className="canvas-cursor-label" style={{ backgroundColor: user.color }}>
              {user.username}
            </div>
          </div>
        ))}

      <div className="canvas-zoom-controls">
        <button className="zoom-btn" onClick={zoomOut} title="缩小">
          −
        </button>
        <span className="zoom-value">{Math.round(zoom * 100)}%</span>
        <button className="zoom-btn" onClick={zoomIn} title="放大">
          +
        </button>
        <button className="zoom-btn" onClick={resetZoom} title="重置" style={{ fontSize: 11 }}>
          100%
        </button>
      </div>
    </div>
  );
};

export default CanvasArea;
