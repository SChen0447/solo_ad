import { useEffect, useRef, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { useSymbolWallStore } from '../store';
import { updateSymbols as calculateSymbolUpdates } from '../physics';
import type { Symbol } from '../types';

const colorToCss = (c: { r: number; g: number; b: number }): string =>
  `rgb(${c.r}, ${c.g}, ${c.b})`;

const snapToGrid = (value: number, gridSize: number): number => {
  return Math.round(value / gridSize) * gridSize;
};

const drawGrid = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  gridSize: number,
  opacity: number
) => {
  ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= width; x += gridSize) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
  }
  ctx.stroke();
};

const drawSymbol = (ctx: CanvasRenderingContext2D, s: Symbol) => {
  ctx.fillStyle = colorToCss(s.color);
  ctx.beginPath();
  switch (s.shape) {
    case 'circle':
      ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
      break;
    case 'triangle': {
      const size = 8;
      ctx.moveTo(s.x, s.y - size / Math.sqrt(3));
      ctx.lineTo(s.x - size / 2, s.y + size / (2 * Math.sqrt(3)));
      ctx.lineTo(s.x + size / 2, s.y + size / (2 * Math.sqrt(3)));
      ctx.closePath();
      break;
    }
    case 'diamond': {
      const dx = 5;
      const dy = 5;
      ctx.moveTo(s.x, s.y - dy);
      ctx.lineTo(s.x + dx, s.y);
      ctx.lineTo(s.x, s.y + dy);
      ctx.lineTo(s.x - dx, s.y);
      ctx.closePath();
      break;
    }
    case 'star': {
      const outerRadius = 6;
      const innerRadius = outerRadius * 0.4;
      const spikes = 5;
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const px = s.x + Math.cos(angle) * radius;
        const py = s.y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
  }
  ctx.fill();
};

const drawRipple = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number
) => {
  const maxRadius = 40;
  const radius = maxRadius * progress;
  const opacity = 0.6 * (1 - progress);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.lineWidth = 2;
  ctx.stroke();
};

const SymbolWall = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const isDraggingRef = useRef(false);
  const lastDragPosRef = useRef<{ x: number; y: number } | null>(null);

  const {
    symbols,
    ripples,
    physicsParams,
    canvasState,
    addSymbol,
    addRipple,
    removeRipple,
    setPhysicsParams,
    setCanvasSize,
    updateSymbols,
    reset,
  } = useSymbolWallStore();

  const { backgroundColor, gridSize, gridOpacity, width, height } = canvasState;
  const { gravity, elasticity, blendThreshold } = physicsParams;

  const handleResize = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const w = Math.max(320, rect.width);
    const h = rect.height;
    setCanvasSize(w, h);
  }, [setCanvasSize]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    let lastFrameTime = 0;
    const frameInterval = 1000 / 30;
    const rippleDuration = 600;

    const loop = (time: number) => {
      const delta = time - lastFrameTime;
      if (delta >= frameInterval) {
        lastFrameTime = time - (delta % frameInterval);

        const updated = calculateSymbolUpdates(symbols, physicsParams, canvasState);
        if (
          updated.length !== symbols.length ||
          updated.some((s, i) => s !== symbols[i])
        ) {
          updateSymbols(updated);
        }
      }

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      if (!isExporting) {
        drawGrid(ctx, width, height, gridSize, gridOpacity);
      }

      for (const s of symbols) {
        drawSymbol(ctx, s);
      }

      const now = performance.now();
      for (const r of ripples) {
        const elapsed = now - r.startTime;
        if (elapsed >= rippleDuration) {
          removeRipple(r.id);
        } else {
          const progress = elapsed / rippleDuration;
          drawRipple(ctx, r.x, r.y, progress);
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [
    symbols,
    ripples,
    physicsParams,
    canvasState,
    backgroundColor,
    width,
    height,
    gridSize,
    gridOpacity,
    updateSymbols,
    removeRipple,
    isExporting,
  ]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const placeSymbolAt = (x: number, y: number) => {
    const gx = snapToGrid(x, gridSize);
    const gy = snapToGrid(y, gridSize);
    addSymbol(gx, gy);
    addRipple(gx, gy);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    const { x, y } = getCanvasCoords(e);
    lastDragPosRef.current = { x, y };
    placeSymbolAt(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const { x, y } = getCanvasCoords(e);
    const last = lastDragPosRef.current;
    if (!last) {
      lastDragPosRef.current = { x, y };
      return;
    }
    const dist = Math.sqrt((x - last.x) ** 2 + (y - last.y) ** 2);
    if (dist >= gridSize) {
      placeSymbolAt(x, y);
      lastDragPosRef.current = { x, y };
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    lastDragPosRef.current = null;
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    lastDragPosRef.current = null;
  };

  const handleExport = async () => {
    if (!containerRef.current) return;
    setIsExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = 'symbol-wall.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="symbol-wall-container">
      <div
        ref={containerRef}
        className="canvas-wrapper"
        style={{ visibility: isExporting ? 'hidden' : 'visible' }}
      >
        <canvas
          ref={canvasRef}
          className="symbol-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>
      {isExporting && (
        <div className="canvas-wrapper export-overlay">
          <canvas
            ref={(el) => {
              if (el && canvasRef.current) {
                const ctx = el.getContext('2d');
                const srcCtx = canvasRef.current.getContext('2d');
                if (ctx && srcCtx) {
                  el.width = canvasRef.current.width;
                  el.height = canvasRef.current.height;
                  ctx.drawImage(canvasRef.current, 0, 0);
                }
              }
            }}
            className="symbol-canvas"
          />
        </div>
      )}
      <div className="control-bar">
        <div className="slider-group">
          <label>
            <span className="slider-label">重力强度: {gravity.toFixed(1)}</span>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={gravity}
              onChange={(e) => setPhysicsParams({ gravity: parseFloat(e.target.value) })}
            />
          </label>
          <label>
            <span className="slider-label">弹性系数: {elasticity.toFixed(2)}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={elasticity}
              onChange={(e) =>
                setPhysicsParams({ elasticity: parseFloat(e.target.value) })
              }
            />
          </label>
          <label>
            <span className="slider-label">混合阈值: {blendThreshold.toFixed(0)}px</span>
            <input
              type="range"
              min="5"
              max="20"
              step="1"
              value={blendThreshold}
              onChange={(e) =>
                setPhysicsParams({ blendThreshold: parseFloat(e.target.value) })
              }
            />
          </label>
        </div>
        <div className="button-group">
          <button className="glass-button" onClick={reset}>
            重置
          </button>
          <button className="glass-button" onClick={handleExport}>
            导出PNG
          </button>
        </div>
      </div>
    </div>
  );
};

export default SymbolWall;
