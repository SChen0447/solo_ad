import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DrawStroke, sendDrawStroke, sendUndo, onDrawStroke, onDrawUndo } from '../socket';

interface DrawingCanvasProps {
  isDrawer: boolean;
  width?: number;
  height?: number;
}

const PRESET_COLORS = [
  '#E74C3C', '#F39C12', '#F1C40F', '#2ECC71', '#3498DB', '#9B59B6',
];

const MAX_UNDO = 10;

const canvasStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '3px solid #D5D8DC',
  borderRadius: '8px',
  cursor: 'crosshair',
  touchAction: 'none',
};

const colorDotStyle = (color: string, active: boolean): React.CSSProperties => ({
  width: active ? '32px' : '28px',
  height: active ? '32px' : '28px',
  borderRadius: '50%',
  background: color,
  border: active ? '3px solid #2C3E50' : '2px solid transparent',
  cursor: 'pointer',
  transition: 'transform 0.2s, border 0.2s',
  boxSizing: 'border-box',
});

export default function DrawingCanvas({ isDrawer, width = 640, height = 480 }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }, []);

  const saveUndoState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack(prev => {
      const next = [...prev, imgData];
      return next.length > MAX_UNDO ? next.slice(-MAX_UNDO) : next;
    });
  }, []);

  const drawLine = useCallback((from: { x: number; y: number }, to: { x: number; y: number }, color: string, width: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }, []);

  const drawDot = useCallback((point: { x: number; y: number }, color: string, width: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, width / 2, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer) return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;
    saveUndoState();
    setIsDrawing(true);
    lastPointRef.current = point;
    drawDot(point, currentColor, lineWidth);
    const stroke: DrawStroke = {
      type: 'start',
      x: point.x,
      y: point.y,
      color: currentColor,
      width: lineWidth,
      timestamp: Date.now(),
    };
    sendDrawStroke(stroke);
  }, [isDrawer, currentColor, lineWidth, getCanvasPoint, saveUndoState, drawDot]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || !isDrawing) return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point || !lastPointRef.current) return;
    drawLine(lastPointRef.current, point, currentColor, lineWidth);
    const stroke: DrawStroke = {
      type: 'move',
      x: point.x,
      y: point.y,
      color: currentColor,
      width: lineWidth,
      timestamp: Date.now(),
    };
    sendDrawStroke(stroke);
    lastPointRef.current = point;
  }, [isDrawer, isDrawing, currentColor, lineWidth, getCanvasPoint, drawLine]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawer || !isDrawing) return;
    setIsDrawing(false);
    lastPointRef.current = null;
    const stroke: DrawStroke = {
      type: 'end',
      x: 0,
      y: 0,
      color: currentColor,
      width: lineWidth,
      timestamp: Date.now(),
    };
    sendDrawStroke(stroke);
  }, [isDrawer, isDrawing, currentColor, lineWidth]);

  const handleUndo = useCallback(() => {
    if (!isDrawer || undoStack.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const prev = undoStack[undoStack.length - 1];
    ctx.putImageData(prev, 0, 0);
    setUndoStack(s => s.slice(0, -1));
    sendUndo();
  }, [isDrawer, undoStack]);

  const remoteLastPointRef = useRef<{ x: number; y: number } | null>(null);
  const remoteColorRef = useRef<string>('#000000');
  const remoteWidthRef = useRef<number>(4);

  useEffect(() => {
    const unsub = onDrawStroke((stroke: DrawStroke) => {
      if (isDrawer) return;
      if (stroke.type === 'start') {
        remoteColorRef.current = stroke.color;
        remoteWidthRef.current = stroke.width;
        remoteLastPointRef.current = { x: stroke.x, y: stroke.y };
        drawDot({ x: stroke.x, y: stroke.y }, stroke.color, stroke.width);
      } else if (stroke.type === 'move') {
        if (remoteLastPointRef.current) {
          drawLine(remoteLastPointRef.current, { x: stroke.x, y: stroke.y }, remoteColorRef.current, remoteWidthRef.current);
        }
        remoteLastPointRef.current = { x: stroke.x, y: stroke.y };
      } else if (stroke.type === 'end') {
        remoteLastPointRef.current = null;
      }
    });
    return unsub;
  }, [isDrawer, drawDot, drawLine]);

  useEffect(() => {
    const unsub = onDrawUndo(() => {
      if (isDrawer) return;
    });
    return unsub;
  }, [isDrawer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          ...canvasStyle,
          cursor: isDrawer ? 'crosshair' : 'default',
          width: '100%',
          maxWidth: width,
          height: 'auto',
        }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />
      {isDrawer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 16px', background: '#FFFFFF15', borderRadius: '12px', border: '1px solid #FFFFFF30', backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {PRESET_COLORS.map(c => (
              <div
                key={c}
                style={colorDotStyle(c, currentColor === c)}
                onClick={() => setCurrentColor(c)}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              />
            ))}
            <div
              style={colorDotStyle('#000000', currentColor === '#000000')}
              onClick={() => setCurrentColor('#000000')}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#BDC3C7', fontSize: '12px' }}>细</span>
            <input
              type="range"
              min={2}
              max={12}
              value={lineWidth}
              onChange={e => setLineWidth(Number(e.target.value))}
              style={{
                width: '80px',
                accentColor: '#8E44AD',
                cursor: 'pointer',
              }}
            />
            <span style={{ color: '#BDC3C7', fontSize: '12px' }}>粗</span>
            <span style={{ color: '#FFFFFF', fontSize: '12px', minWidth: '28px' }}>{lineWidth}px</span>
          </div>
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              background: '#ECF0F1',
              color: '#2C3E50',
              fontSize: '16px',
              cursor: undoStack.length > 0 ? 'pointer' : 'not-allowed',
              opacity: undoStack.length > 0 ? 1 : 0.5,
              transition: 'transform 0.1s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            title="撤销"
          >
            ↩
          </button>
        </div>
      )}
    </div>
  );
}
