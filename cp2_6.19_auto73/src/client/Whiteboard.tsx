import React, { useCallback, useRef, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useWhiteboardStore } from '@/store/useWhiteboardStore';
import { Toolbar } from '@/client/Toolbar';
import { StickyNote } from '@/client/StickyNote';
import type { Point, Stroke, Shape, ShapeType } from '@/types';

function buildPathD(points: Point[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    d += ` L ${points[1].x} ${points[1].y}`;
    return d;
  }
  d += ` Q ${points[0].x + (points[1].x - points[0].x) / 3} ${points[0].y + (points[1].y - points[0].y) / 3} ${(points[0].x + points[1].x) / 2} ${(points[0].y + points[1].y) / 2}`;
  for (let i = 1; i < points.length - 1; i++) {
    const cpX = points[i].x;
    const cpY = points[i].y;
    const endX = (points[i].x + points[i + 1].x) / 2;
    const endY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${cpX} ${cpY} ${endX} ${endY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function shapeRect(shape: Shape): { x: number; y: number; w: number; h: number } {
  return {
    x: Math.min(shape.startX, shape.endX),
    y: Math.min(shape.startY, shape.endY),
    w: Math.abs(shape.endX - shape.startX),
    h: Math.abs(shape.endY - shape.startY),
  };
}

function ShapeRenderer({ shape }: { shape: Shape }) {
  const r = shapeRect(shape);
  if (r.w <= 0 || r.h <= 0) return null;

  if (shape.type === 'rect') {
    return (
      <rect
        key={shape.id}
        x={r.x}
        y={r.y}
        width={r.w}
        height={r.h}
        fill={shape.color}
        fillOpacity={0.3}
        stroke={shape.color}
        strokeWidth={shape.width}
      />
    );
  }

  return (
    <ellipse
      key={shape.id}
      cx={r.x + r.w / 2}
      cy={r.y + r.h / 2}
      rx={r.w / 2}
      ry={r.h / 2}
      fill={shape.color}
      fillOpacity={0.3}
      stroke={shape.color}
      strokeWidth={shape.width}
    />
  );
}

function ShapePreview({
  shapeType, startX, startY, endX, endY, color, width,
}: {
  shapeType: ShapeType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  width: number;
}) {
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const w = Math.abs(endX - startX);
  const h = Math.abs(endY - startY);
  if (w <= 0 || h <= 0) return null;

  if (shapeType === 'rect') {
    return (
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="none"
        stroke={color}
        strokeWidth={Math.max(width, 2)}
        strokeDasharray="6 4"
      />
    );
  }

  return (
    <ellipse
      cx={x + w / 2}
      cy={y + h / 2}
      rx={w / 2}
      ry={h / 2}
      fill="none"
      stroke={color}
      strokeWidth={Math.max(width, 2)}
      strokeDasharray="6 4"
    />
  );
}

export function Whiteboard() {
  const {
    strokes, shapes, notes, penColor, penWidth, drawingMode,
    connected, userCount, fading,
    addStroke, addShape, connect,
  } = useWhiteboardStore();

  const svgRef = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState(false);

  const currentPoints = useRef<Point[]>([]);
  const [currentPath, setCurrentPath] = useState('');

  const shapeStart = useRef<Point>({ x: 0, y: 0 });
  const [shapeEnd, setShapeEnd] = useState<Point | null>(null);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const panning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });

  useEffect(() => { connect(); }, []);

  const screenToCanvas = useCallback((clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      panning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      panOrigin.current = { ...pan };
      return;
    }
    if (e.button !== 0) return;
    const pt = screenToCanvas(e.clientX, e.clientY);

    if (drawingMode === 'pen') {
      currentPoints.current = [pt];
      setCurrentPath(`M ${pt.x} ${pt.y}`);
      setDrawing(true);
    } else {
      shapeStart.current = pt;
      setShapeEnd(pt);
      setDrawing(true);
    }
  }, [screenToCanvas, pan, drawingMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (panning.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({
        x: panOrigin.current.x + dx,
        y: panOrigin.current.y + dy,
      });
      return;
    }
    if (!drawing) return;
    const pt = screenToCanvas(e.clientX, e.clientY);

    if (drawingMode === 'pen') {
      currentPoints.current.push(pt);
      setCurrentPath(buildPathD(currentPoints.current));
    } else {
      setShapeEnd(pt);
    }
  }, [drawing, screenToCanvas, drawingMode]);

  const handleMouseUp = useCallback(() => {
    if (panning.current) {
      panning.current = false;
      return;
    }
    if (!drawing) return;
    setDrawing(false);

    if (drawingMode === 'pen') {
      if (currentPoints.current.length >= 2) {
        const stroke: Stroke = {
          id: uuidv4(),
          points: [...currentPoints.current],
          color: penColor,
          width: penWidth,
        };
        addStroke(stroke);
      }
      currentPoints.current = [];
      setCurrentPath('');
    } else {
      const end = shapeEnd;
      if (end) {
        const dx = Math.abs(end.x - shapeStart.current.x);
        const dy = Math.abs(end.y - shapeStart.current.y);
        if (dx >= 2 || dy >= 2) {
          const shape: Shape = {
            id: uuidv4(),
            type: drawingMode as ShapeType,
            startX: shapeStart.current.x,
            startY: shapeStart.current.y,
            endX: end.x,
            endY: end.y,
            color: penColor,
            width: penWidth,
          };
          addShape(shape);
        }
      }
      setShapeEnd(null);
    }
  }, [drawing, drawingMode, penColor, penWidth, addStroke, addShape]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * delta, 0.1), 5);
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const scale = newZoom / zoom;
    setPan(prev => ({
      x: mx - scale * (mx - prev.x),
      y: my - scale * (my - prev.y),
    }));
    setZoom(newZoom);
  }, [zoom]);

  const showPreview = drawing && (drawingMode === 'rect' || drawingMode === 'circle') && shapeEnd;

  return (
    <div className="whiteboard-layout">
      <header className="whiteboard-header">
        <span className="header-title">协作白板</span>
        <div className="header-right">
          <span className="user-count">👤 {userCount} 在线</span>
          <span className={`connection-dot ${connected ? 'connected' : 'disconnected'}`} />
        </div>
      </header>
      <Toolbar />
      <div className="whiteboard-canvas-wrapper">
        <div
          className={`whiteboard-canvas ${fading ? 'canvas-fading' : ''}`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <svg
            ref={svgRef}
            className="whiteboard-svg"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <defs>
              <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#c8ddf0" strokeWidth="0.3" />
              </pattern>
            </defs>
            <rect width="10000" height="10000" x="-5000" y="-5000" fill="#f0f0f0" />
            <rect width="10000" height="10000" x="-5000" y="-5000" fill="url(#grid)" />
            {strokes.map(stroke => (
              <path
                key={stroke.id}
                d={buildPathD(stroke.points)}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
            {shapes.map(shape => (
              <ShapeRenderer key={shape.id} shape={shape} />
            ))}
            {drawing && drawingMode === 'pen' && currentPath && (
              <path
                d={currentPath}
                stroke={penColor}
                strokeWidth={penWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.7}
              />
            )}
            {showPreview && (
              <ShapePreview
                shapeType={drawingMode as ShapeType}
                startX={shapeStart.current.x}
                startY={shapeStart.current.y}
                endX={shapeEnd!.x}
                endY={shapeEnd!.y}
                color={penColor}
                width={penWidth}
              />
            )}
          </svg>
          <div className="notes-layer">
            {notes.map(note => (
              <StickyNote key={note.id} note={note} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
