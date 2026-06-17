import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { LineData, Point, PublishLineRequest } from '../types';

interface CanvasProps {
  color: string;
  brushSize: number;
  localLines: PublishLineRequest[];
  onLineComplete: (line: PublishLineRequest) => void;
  serverLines: LineData[];
  onLikeLine: (lineId: string) => void;
  isTimeTravelMode: boolean;
  timeTravelLines: LineData[];
}

interface ViewState {
  x: number;
  y: number;
  scale: number;
}

const DAMPING = 0.85;
const MIN_SCALE = 0.1;
const MAX_SCALE = 10;
const FADE_IN_DURATION = 500;

export const Canvas: React.FC<CanvasProps> = ({
  color,
  brushSize,
  localLines,
  onLineComplete,
  serverLines,
  onLikeLine,
  isTimeTravelMode,
  timeTravelLines,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<ViewState>({ x: 0, y: 0, scale: 1 });
  const targetViewRef = useRef<ViewState>({ x: 0, y: 0, scale: 1 });
  const isDraggingRef = useRef(false);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const currentLineRef = useRef<Point[]>([]);
  const animationFrameRef = useRef<number>(0);
  const [likedLinePopup, setLikedLinePopup] = useState<{
    line: LineData;
    x: number;
    y: number;
  } | null>(null);
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  const lineFadeStartRef = useRef<Map<string, number>>(new Map());
  const lastPinchDistanceRef = useRef<number>(0);
  const touchStartRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const zoomHideTimeoutRef = useRef<number | null>(null);
  const isPinchingRef = useRef(false);

  const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
    const view = viewRef.current;
    return {
      x: (screenX - view.x) / view.scale,
      y: (screenY - view.y) / view.scale,
    };
  }, []);

  const drawLine = useCallback(
    (ctx: CanvasRenderingContext2D, points: Point[], color: string, size: number, opacity = 1) => {
      if (points.length < 2) return;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const progress = i / points.length;
        const pressureOpacity = 0.3 + 0.7 * Math.sin(progress * Math.PI);
        ctx.globalAlpha = opacity * pressureOpacity;
        ctx.lineWidth = size * (0.7 + 0.3 * pressureOpacity);
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }

      ctx.restore();
    },
    []
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const view = viewRef.current;
    const displayLines = isTimeTravelMode ? timeTravelLines : serverLines;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);

    const now = performance.now();

    localLines.forEach((line) => {
      drawLine(ctx, line.points, line.color, line.size, 1);
    });

    if (isDrawingRef.current && currentLineRef.current.length > 0) {
      drawLine(ctx, currentLineRef.current, color, brushSize, 1);
    }

    displayLines.forEach((line) => {
      let opacity = 1;
      const fadeStart = lineFadeStartRef.current.get(line.id);
      if (fadeStart !== undefined) {
        const elapsed = now - fadeStart;
        if (elapsed < FADE_IN_DURATION) {
          opacity = elapsed / FADE_IN_DURATION;
        } else {
          lineFadeStartRef.current.delete(line.id);
        }
      }
      drawLine(ctx, line.points, line.color, line.size, opacity);
    });

    ctx.restore();
  }, [localLines, serverLines, color, brushSize, drawLine, isTimeTravelMode, timeTravelLines]);

  const animate = useCallback(() => {
    const view = viewRef.current;
    const target = targetViewRef.current;

    view.x += (target.x - view.x) * (1 - DAMPING);
    view.y += (target.y - view.y) * (1 - DAMPING);
    view.scale += (target.scale - view.scale) * (1 - DAMPING);

    render();
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [render]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  useEffect(() => {
    serverLines.forEach((line) => {
      if (!lineFadeStartRef.current.has(line.id)) {
        lineFadeStartRef.current.set(line.id, performance.now());
      }
    });
  }, [serverLines]);

  useEffect(() => {
    resizeCanvas();
    animationFrameRef.current = requestAnimationFrame(animate);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [animate, resizeCanvas]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const worldPoint = screenToWorld(screenX, screenY);

      if (e.shiftKey) {
        isDraggingRef.current = true;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      const displayLines = isTimeTravelMode ? timeTravelLines : serverLines;
      const hitLine = findLineAtPoint(displayLines, worldPoint, brushSize);

      if (hitLine && !isTimeTravelMode) {
        setLikedLinePopup({
          line: hitLine,
          x: screenX,
          y: screenY,
        });
        return;
      }

      setLikedLinePopup(null);

      isDrawingRef.current = true;
      currentLineRef.current = [{ ...worldPoint, pressure: 1 }];
    },
    [screenToWorld, isTimeTravelMode, timeTravelLines, serverLines, brushSize]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      if (isDraggingRef.current) {
        const dx = e.clientX - lastPosRef.current.x;
        const dy = e.clientY - lastPosRef.current.y;
        targetViewRef.current.x += dx;
        targetViewRef.current.y += dy;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (isDrawingRef.current) {
        const worldPoint = screenToWorld(screenX, screenY);
        currentLineRef.current.push(worldPoint);
      }
    },
    [screenToWorld]
  );

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }

    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      if (currentLineRef.current.length > 1) {
        onLineComplete({
          points: [...currentLineRef.current],
          color,
          size: brushSize,
        });
      }
      currentLineRef.current = [];
    }
  }, [color, brushSize, onLineComplete]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const oldScale = targetViewRef.current.scale;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale * zoomFactor));

      const worldX = (mouseX - targetViewRef.current.x) / oldScale;
      const worldY = (mouseY - targetViewRef.current.y) / oldScale;

      targetViewRef.current.scale = newScale;
      targetViewRef.current.x = mouseX - worldX * newScale;
      targetViewRef.current.y = mouseY - worldY * newScale;
    },
    []
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      touchStartRef.current.clear();

      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
        isDraggingRef.current = true;
        isPinchingRef.current = true;
        isDrawingRef.current = false;
        setShowZoomIndicator(true);
        if (zoomHideTimeoutRef.current) {
          clearTimeout(zoomHideTimeoutRef.current);
        }
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const screenX = touch.clientX - rect.left;
        const screenY = touch.clientY - rect.top;
        const worldPoint = screenToWorld(screenX, screenY);

        isDrawingRef.current = true;
        currentLineRef.current = [{ ...worldPoint, pressure: 1 }];
      }
    },
    [screenToWorld]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (e.touches.length === 2 && lastPinchDistanceRef.current > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const zoomFactor = distance / lastPinchDistanceRef.current;

        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        const oldScale = targetViewRef.current.scale;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale * zoomFactor));

        const worldX = (centerX - targetViewRef.current.x) / oldScale;
        const worldY = (centerY - targetViewRef.current.y) / oldScale;

        targetViewRef.current.scale = newScale;
        targetViewRef.current.x = centerX - worldX * newScale;
        targetViewRef.current.y = centerY - worldY * newScale;

        setZoomPercent(Math.round(newScale * 100));

        lastPinchDistanceRef.current = distance;
        return;
      }

      if (e.touches.length === 1 && isDrawingRef.current) {
        const touch = e.touches[0];
        const screenX = touch.clientX - rect.left;
        const screenY = touch.clientY - rect.top;
        const worldPoint = screenToWorld(screenX, screenY);
        currentLineRef.current.push(worldPoint);
      }
    },
    [screenToWorld]
  );

  const handleTouchEnd = useCallback(() => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      if (currentLineRef.current.length > 1) {
        onLineComplete({
          points: [...currentLineRef.current],
          color,
          size: brushSize,
        });
      }
      currentLineRef.current = [];
    }

    if (isPinchingRef.current) {
      isPinchingRef.current = false;
      if (zoomHideTimeoutRef.current) {
        clearTimeout(zoomHideTimeoutRef.current);
      }
      zoomHideTimeoutRef.current = window.setTimeout(() => {
        setShowZoomIndicator(false);
      }, 2000);
    }

    lastPinchDistanceRef.current = 0;
    isDraggingRef.current = false;
  }, [color, brushSize, onLineComplete]);

  const handleLikeClick = useCallback(() => {
    if (likedLinePopup) {
      onLikeLine(likedLinePopup.line.id);
      setLikedLinePopup(null);
    }
  }, [likedLinePopup, onLikeLine]);

  const handleCanvasClick = useCallback(() => {
    setLikedLinePopup(null);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #f5f0e8 0%, #ebe4d8 100%)',
        cursor: isDrawingRef.current ? 'crosshair' : 'grab',
        overflow: 'hidden',
        touchAction: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleCanvasClick}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />

      {likedLinePopup && (
        <div
          style={{
            position: 'absolute',
            left: likedLinePopup.x,
            top: likedLinePopup.y - 50,
            transform: 'translateX(-50%)',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '8px 16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 100,
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleLikeClick();
          }}
        >
          <span style={{ fontSize: '18px', cursor: 'pointer' }}>❤️</span>
          <span style={{ fontSize: '14px', color: '#5D4E37', fontWeight: 500 }}>
            {likedLinePopup.line.likes}
          </span>
          <span style={{ fontSize: '12px', color: '#8B7355' }}>
            {likedLinePopup.line.user_id}
          </span>
        </div>
      )}

      {showZoomIndicator && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '25%',
            transform: 'translateX(-50%)',
            background: 'rgba(93, 78, 55, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: 24,
            padding: '10px 24px',
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
            zIndex: 120,
            pointerEvents: 'none',
            animation: 'zoomFadeIn 0.2s ease',
          }}
        >
          🔍 {zoomPercent}%
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes zoomFadeIn {
          from { opacity: 0; transform: translateX(-50%) scale(0.9); }
          to { opacity: 1; transform: translateX(-50%) scale(1); }
        }
      `}</style>
    </div>
  );
};

function findLineAtPoint(lines: LineData[], point: Point, threshold: number): LineData | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    for (const p of line.points) {
      const dx = p.x - point.x;
      const dy = p.y - point.y;
      if (dx * dx + dy * dy < (threshold + line.size) * (threshold + line.size)) {
        return line;
      }
    }
  }
  return null;
}
