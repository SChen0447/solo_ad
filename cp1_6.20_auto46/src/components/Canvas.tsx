import React, { useRef, useEffect, useState, useCallback } from 'react';
import { usePixel, CANVAS_SIZE } from '../store/pixelStore';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const CELL_BASE = 30;

interface CanvasProps {
  showFrameInfo?: boolean;
  readOnly?: boolean;
}

const Canvas: React.FC<CanvasProps> = ({ showFrameInfo = true, readOnly = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, dispatch } = usePixel();
  const { frames, currentFrameIndex, zoom, currentColor } = state;
  const currentFrame = frames[currentFrameIndex];
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [glowPixel, setGlowPixel] = useState<{ x: number; y: number } | null>(null);

  const canvasSize = CANVAS_SIZE * CELL_BASE * zoom;

  const getGridLineWidth = useCallback(() => {
    if (zoom >= 2) return 1;
    if (zoom >= 1) return 0.5;
    return 0.3;
  }, [zoom]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentFrame) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = CELL_BASE * zoom;
    const lineWidth = getGridLineWidth();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < CANVAS_SIZE; y++) {
      for (let x = 0; x < CANVAS_SIZE; x++) {
        const color = currentFrame.pixels[y * CANVAS_SIZE + x];
        if (color && color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    if (glowPixel) {
      const gradient = ctx.createRadialGradient(
        glowPixel.x * cellSize + cellSize / 2,
        glowPixel.y * cellSize + cellSize / 2,
        0,
        glowPixel.x * cellSize + cellSize / 2,
        glowPixel.y * cellSize + cellSize / 2,
        cellSize
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(
        glowPixel.x * cellSize - cellSize / 2,
        glowPixel.y * cellSize - cellSize / 2,
        cellSize * 2,
        cellSize * 2
      );
    }

    ctx.strokeStyle = '#999';
    ctx.lineWidth = lineWidth;

    for (let i = 0; i <= CANVAS_SIZE; i++) {
      const pos = i * cellSize;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(canvas.width, pos);
      ctx.stroke();
    }
  }, [currentFrame, zoom, getGridLineWidth, glowPixel]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getPixelPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const cellSize = CELL_BASE * zoom;
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      return { x, y };
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    
    const pos = getPixelPos(e);
    if (!pos) return;

    const isRightClick = e.button === 2;
    setIsDrawing(true);
    setIsErasing(isRightClick);

    const color = isRightClick ? 'transparent' : currentColor;
    dispatch({ type: 'SET_PIXEL', x: pos.x, y: pos.y, color });
    
    if (!isRightClick) {
      setGlowPixel(pos);
      setTimeout(() => setGlowPixel(null), 100);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    if (!isDrawing) return;

    const pos = getPixelPos(e);
    if (!pos) return;

    const color = isErasing ? 'transparent' : currentColor;
    dispatch({ type: 'SET_PIXEL', x: pos.x, y: pos.y, color });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsErasing(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));
    dispatch({ type: 'SET_ZOOM', zoom: Number(newZoom.toFixed(1)) });
  };

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        overflow: 'auto',
        padding: '20px',
      }}
    >
      {showFrameInfo && (
        <div
          style={{
            position: 'absolute',
            top: '30px',
            left: '30px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            zIndex: 10,
          }}
        >
          帧 {currentFrameIndex + 1}/{frames.length} · {currentFrame?.delay || 100}ms
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        style={{
          cursor: readOnly ? 'default' : 'crosshair',
          borderRadius: '4px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
};

export default Canvas;
