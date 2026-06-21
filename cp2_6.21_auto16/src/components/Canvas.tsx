import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import ElementRenderer from './ElementRenderer';
import type {
  CanvasElement,
  PenElement,
  StickyElement,
  TextElement,
  IconElement,
} from '../types';
import {
  GRID_SIZE,
  SNAP_THRESHOLD,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_TRANSITION_MS,
} from '../types';

const iconOptions = ['star', 'heart', 'arrow'];

const genId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function snapToGrid(value: number): number {
  const mod = value % GRID_SIZE;
  if (mod < SNAP_THRESHOLD) return value - mod;
  if (mod > GRID_SIZE - SNAP_THRESHOLD) return value + (GRID_SIZE - mod);
  return value;
}

function snapSize(value: number): number {
  return Math.max(20, Math.round(value / GRID_SIZE) * GRID_SIZE || GRID_SIZE);
}

const Canvas: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isDraggingElement, setIsDraggingElement] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSmoothing, setIsSmoothing] = useState(true);
  const [iconPickerPos, setIconPickerPos] = useState<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const elementDragStart = useRef<{ x: number; y: number; ex: number; ey: number } | null>(null);
  const drawingPoints = useRef<{ x: number; y: number }[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const activeTool = useCanvasStore((s) => s.activeTool);
  const elements = useCanvasStore((s) => s.elements);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const zoom = useCanvasStore((s) => s.zoom);
  const offsetX = useCanvasStore((s) => s.offsetX);
  const offsetY = useCanvasStore((s) => s.offsetY);
  const setView = useCanvasStore((s) => s.setView);
  const setViewImmediate = useCanvasStore((s) => s.setViewImmediate);
  const addElement = useCanvasStore((s) => s.addElement);
  const selectElement = useCanvasStore((s) => s.selectElement);
  const setEditing = useCanvasStore((s) => s.setEditing);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const snapshot = useCanvasStore((s) => s.snapshot);

  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - offsetX) / zoom,
        y: (clientY - rect.top - offsetY) / zoom,
      };
    },
    [offsetX, offsetY, zoom]
  );

  const markNew = (id: string) => {
    setNewIds((prev) => {
      const n = new Set(prev);
      n.add(id);
      return n;
    });
    setTimeout(() => {
      setNewIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }, 300);
  };

  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as SVGElement;
    if (target.closest('[data-element]')) return;

    if (activeTool === 'icon') {
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      setIconPickerPos({ x, y });
      return;
    }

    if (activeTool === 'select' || activeTool === 'pen') {
      if (activeTool === 'select') {
        selectElement(null);
        setIsDraggingCanvas(true);
        dragStart.current = {
          x: e.clientX,
          y: e.clientY,
          ox: offsetX,
          oy: offsetY,
        };
        setIsSmoothing(false);
      } else if (activeTool === 'pen') {
        snapshot();
        const { x, y } = screenToCanvas(e.clientX, e.clientY);
        drawingPoints.current = [{ x, y }];
        setIsDrawing(true);
      }
    } else {
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      let placedX = x;
      let placedY = y;
      if (activeTool === 'rectangle' || activeTool === 'circle') {
        placedX = snapToGrid(x);
        placedY = snapToGrid(y);
      }
      createShapeElement(activeTool, placedX, placedY);
    }
  };

  const createShapeElement = (
    type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'icon',
    x: number,
    y: number,
    iconName?: string
  ) => {
    snapshot();
    const base = {
      id: genId(),
      color: '#1f2937',
      strokeWidth: 2,
      createdAt: Date.now(),
    };
    let el: CanvasElement;
    switch (type) {
      case 'rectangle':
        el = {
          ...base,
          type: 'rectangle',
          x,
          y,
          width: snapSize(100),
          height: snapSize(70),
          fill: '#ffffff',
        };
        break;
      case 'circle':
        el = {
          ...base,
          type: 'circle',
          x,
          y,
          width: snapSize(90),
          height: snapSize(90),
          fill: '#ffffff',
        };
        break;
      case 'text':
        el = {
          ...base,
          type: 'text',
          x,
          y,
          width: 150,
          height: 32,
          content: '双击编辑',
          fontSize: 16,
        } as TextElement;
        break;
      case 'sticky':
        el = {
          ...base,
          type: 'sticky',
          x,
          y,
          width: 180,
          height: 140,
          content: '新便签',
          fill: '#FEF3C7',
        } as StickyElement;
        break;
      case 'icon':
        el = {
          ...base,
          type: 'icon',
          x,
          y,
          width: 48,
          height: 48,
          iconName: iconName || 'star',
          color: '#2563EB',
        } as IconElement;
        break;
    }
    addElement(el);
    markNew(el.id);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDraggingCanvas && dragStart.current) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setViewImmediate(
          zoom,
          dragStart.current.ox + dx,
          dragStart.current.oy + dy
        );
      }
      if (isDraggingElement && elementDragStart.current) {
        const id = isDraggingElement;
        const el = elements.find((e2) => e2.id === id);
        if (!el) return;
        const { x, y } = screenToCanvas(e.clientX, e.clientY);
        let nx = elementDragStart.current.ex + (x - elementDragStart.current.x);
        let ny = elementDragStart.current.ey + (y - elementDragStart.current.y);
        if (el.type === 'rectangle' || el.type === 'circle') {
          nx = snapToGrid(nx);
          ny = snapToGrid(ny);
        }
        const existing = elements.find((e2) => e2.id === id);
        if (existing && (existing.x !== nx || existing.y !== ny)) {
          updateElement(id, { x: nx, y: ny });
        }
      }
      if (isDrawing) {
        const { x, y } = screenToCanvas(e.clientX, e.clientY);
        drawingPoints.current.push({ x, y });
        if (svgRef.current) {
          const temp = svgRef.current.querySelector('#temp-draw-path');
          if (temp && drawingPoints.current.length > 1) {
            const d = drawingPoints.current
              .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
              .join(' ');
            (temp as SVGPathElement).setAttribute('d', d);
          }
        }
      }
    },
    [
      isDraggingCanvas,
      isDraggingElement,
      isDrawing,
      zoom,
      elements,
      screenToCanvas,
      setViewImmediate,
      updateElement,
    ]
  );

  const handleMouseUp = useCallback(() => {
    if (isDraggingCanvas) {
      setIsDraggingCanvas(false);
      dragStart.current = null;
      requestAnimationFrame(() => setIsSmoothing(true));
    }
    if (isDraggingElement) {
      setIsDraggingElement(null);
      elementDragStart.current = null;
    }
    if (isDrawing) {
      setIsDrawing(false);
      if (drawingPoints.current.length >= 2) {
        const pts = drawingPoints.current;
        const minX = Math.min(...pts.map((p) => p.x));
        const minY = Math.min(...pts.map((p) => p.y));
        const maxX = Math.max(...pts.map((p) => p.x));
        const maxY = Math.max(...pts.map((p) => p.y));
        const penEl: PenElement = {
          id: genId(),
          type: 'pen',
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          color: '#1f2937',
          strokeWidth: 2,
          createdAt: Date.now(),
          points: pts,
        };
        const addEl = useCanvasStore.getState().addElement;
        addEl(penEl);
        markNew(penEl.id);
      }
      drawingPoints.current = [];
      if (svgRef.current) {
        const temp = svgRef.current.querySelector('#temp-draw-path');
        if (temp) (temp as SVGPathElement).setAttribute('d', '');
      }
    }
  }, [isDraggingCanvas, isDraggingElement, isDrawing]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
    const ratio = newZoom / zoom;
    const newOffsetX = mouseX - (mouseX - offsetX) * ratio;
    const newOffsetY = mouseY - (mouseY - offsetY) * ratio;
    setIsSmoothing(true);
    setView(newZoom, newOffsetX, newOffsetY);
  };

  const handleElementMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (activeTool === 'select') {
      selectElement(id);
      const el = elements.find((x) => x.id === id);
      if (el) {
        const { x, y } = screenToCanvas(e.clientX, e.clientY);
        elementDragStart.current = { x, y, ex: el.x, ey: el.y };
        snapshot();
        setIsDraggingElement(id);
      }
    }
  };

  const handleElementDoubleClick = (id: string) => {
    const el = elements.find((x) => x.id === id);
    if (!el) return;
    if (el.type === 'text' || el.type === 'sticky') {
      setEditing(id);
    }
  };

  const selectIcon = (iconName: string) => {
    if (!iconPickerPos) return;
    createShapeElement('icon', iconPickerPos.x, iconPickerPos.y, iconName);
    setIconPickerPos(null);
  };

  const gridLines: JSX.Element[] = [];
  if (containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const startX = Math.floor(-offsetX / zoom / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(-offsetY / zoom / GRID_SIZE) * GRID_SIZE;
    const cols = Math.ceil(w / zoom / GRID_SIZE) + 2;
    const rows = Math.ceil(h / zoom / GRID_SIZE) + 2;
    for (let i = 0; i < cols; i++) {
      const gx = startX + i * GRID_SIZE;
      gridLines.push(
        <line
          key={`v${gx}`}
          x1={gx}
          y1={startY - GRID_SIZE}
          x2={gx}
          y2={startY + (rows + 1) * GRID_SIZE}
          stroke="#D0D4D8"
          strokeWidth={0.5 / zoom}
          style={{ pointerEvents: 'none' }}
        />
      );
    }
    for (let j = 0; j < rows; j++) {
      const gy = startY + j * GRID_SIZE;
      gridLines.push(
        <line
          key={`h${gy}`}
          x1={startX - GRID_SIZE}
          y1={gy}
          x2={startX + (cols + 1) * GRID_SIZE}
          y2={gy}
          stroke="#D0D4D8"
          strokeWidth={0.5 / zoom}
          style={{ pointerEvents: 'none' }}
        />
      );
    }
  }

  const cursorStyle =
    activeTool === 'select'
      ? isDraggingCanvas
        ? 'grabbing'
        : 'default'
      : 'crosshair';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: 60,
        top: 48,
        right: 0,
        bottom: 0,
        background: '#F0F2F5',
        overflow: 'hidden',
        cursor: cursorStyle,
      }}
      onMouseDown={handleMouseDownCanvas}
      onWheel={handleWheel}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      >
        <defs>
          <style>{`
            .world-group {
              transition: transform ${isSmoothing ? ZOOM_TRANSITION_MS + 'ms' : '0ms'} cubic-bezier(0.4, 0, 0.2, 1);
            }
          `}</style>
        </defs>
        <g
          className="world-group"
          transform={`translate(${offsetX}, ${offsetY}) scale(${zoom})`}
        >
          {gridLines}
          {elements.map((el) => (
            <g key={el.id} data-element={el.id}>
              <ElementRenderer
                element={el}
                isSelected={selectedId === el.id}
                onMouseDown={handleElementMouseDown}
                onDoubleClick={handleElementDoubleClick}
                isNew={newIds.has(el.id)}
              />
            </g>
          ))}
          {isDrawing && (
            <path
              id="temp-draw-path"
              fill="none"
              stroke="#1f2937"
              strokeWidth={2 / zoom}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>
      </svg>
      {iconPickerPos && (
        <div
          style={{
            position: 'absolute',
            left: offsetX + iconPickerPos.x * zoom,
            top: offsetY + iconPickerPos.y * zoom,
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: 10,
            padding: 8,
            boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
            display: 'flex',
            gap: 6,
            zIndex: 40,
          }}
        >
          {iconOptions.map((name) => (
            <button
              key={name}
              onClick={() => selectIcon(name)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#F3F4F6',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'var(--primary-soft)';
                (e.currentTarget as HTMLButtonElement).style.transform =
                  'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  '#F3F4F6';
                (e.currentTarget as HTMLButtonElement).style.transform =
                  'scale(1)';
              }}
            >
              {name === 'star' && '⭐'}
              {name === 'heart' && '❤️'}
              {name === 'arrow' && '➡️'}
            </button>
          ))}
          <button
            onClick={() => setIconPickerPos(null)}
            style={{
              width: 28,
              height: 36,
              borderRadius: 8,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default Canvas;
