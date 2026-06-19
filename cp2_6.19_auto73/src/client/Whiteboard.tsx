import React, { useCallback, useRef, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useWhiteboardStore } from '@/store/useWhiteboardStore';
import { Toolbar } from '@/client/Toolbar';
import { StickyNote } from '@/client/StickyNote';
import type { Point, Stroke } from '@/types';

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

export function Whiteboard() {
  const {
    strokes, notes, penColor, penWidth, connected, userCount, fading,
    addStroke, connect,
  } = useWhiteboardStore();

  const svgRef = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState(false);
  const currentPoints = useRef<Point[]>([]);
  const [currentPath, setCurrentPath] = useState('');

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
    currentPoints.current = [pt];
    setDrawing(true);
    setCurrentPath(`M ${pt.x} ${pt.y}`);
  }, [screenToCanvas, pan]);

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
    currentPoints.current.push(pt);
    setCurrentPath(buildPathD(currentPoints.current));
  }, [drawing, screenToCanvas]);

  const handleMouseUp = useCallback(() => {
    if (panning.current) {
      panning.current = false;
      return;
    }
    if (!drawing) return;
    setDrawing(false);
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
  }, [drawing, penColor, penWidth, addStroke]);

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
            {drawing && currentPath && (
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
