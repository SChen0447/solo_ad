import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { CompareMode } from '../types';

interface Props {
  imageA: string | null;
  imageB: string | null;
  compareMode: CompareMode;
  opacity: number;
  onOpacityChange: (v: number) => void;
  scale: number;
  offsetX: number;
  offsetY: number;
  onScaleChange: (s: number) => void;
  onOffsetChange: (x: number, y: number) => void;
  canvasRef?: React.Ref<HTMLCanvasElement>;
}

const ComparisonView: React.FC<Props> = ({
  imageA,
  imageB,
  compareMode,
  opacity,
  onOpacityChange,
  scale,
  offsetX,
  offsetY,
  onScaleChange,
  onOffsetChange,
  canvasRef: externalCanvasRef,
}) => {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalCanvasRef || internalRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const imgARef = useRef<HTMLImageElement | null>(null);
  const imgBRef = useRef<HTMLImageElement | null>(null);
  const [splitPos, setSplitPos] = useState(0.5);
  const isDraggingSplit = useRef(false);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const spacePressed = useRef(false);
  const animFrameRef = useRef<number>(0);

  const loadImages = useCallback(() => {
    if (!imageA) { imgARef.current = null; }
    if (!imageB) { imgBRef.current = null; }
    if (imageA) {
      const img = new Image();
      img.onload = () => { imgARef.current = img; draw(); };
      img.src = imageA;
    }
    if (imageB) {
      const img = new Image();
      img.onload = () => { imgBRef.current = img; draw(); };
      img.src = imageB;
    }
  }, [imageA, imageB]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    if (compareMode === 'opacity') {
      if (imgBRef.current) {
        ctx.globalAlpha = 1 - opacity;
        drawFitted(ctx, imgBRef.current, cw, ch);
      }
      if (imgARef.current) {
        ctx.globalAlpha = opacity;
        drawFitted(ctx, imgARef.current, cw, ch);
      }
      ctx.globalAlpha = 1;
    } else {
      const splitX = (splitPos * cw) / scale;
      if (imgARef.current) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, splitX, ch / scale);
        ctx.clip();
        drawFitted(ctx, imgARef.current, cw, ch);
        ctx.restore();
      }
      if (imgBRef.current) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(splitX, 0, (cw / scale) - splitX, ch / scale);
        ctx.clip();
        drawFitted(ctx, imgBRef.current, cw, ch);
        ctx.restore();
      }
    }

    ctx.restore();
  }, [compareMode, opacity, splitPos, scale, offsetX, offsetY, canvasRef]);

  const drawFitted = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, cw: number, ch: number) => {
    const imgRatio = img.width / img.height;
    const canvasRatio = cw / ch;
    let dw: number, dh: number, dx: number, dy: number;
    if (imgRatio > canvasRatio) {
      dw = cw / scale;
      dh = (cw / scale) / imgRatio;
      dx = 0;
      dy = ((ch / scale) - dh) / 2;
    } else {
      dh = ch / scale;
      dw = ch / scale * imgRatio;
      dx = ((cw / scale) - dw) / 2;
      dy = 0;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  };

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        spacePressed.current = true;
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = 'grab';
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePressed.current = false;
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = 'default';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [canvasRef]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(3, Math.max(0.5, scale * delta));
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const newX = mx - (mx - offsetX) * (newScale / scale);
    const newY = my - (my - offsetY) * (newScale / scale);
    onScaleChange(newScale);
    onOffsetChange(newX, newY);
  }, [scale, offsetX, offsetY, onScaleChange, onOffsetChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (spacePressed.current) {
      isPanning.current = true;
      panStart.current = { x: e.clientX - offsetX, y: e.clientY - offsetY };
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = 'grabbing';
      return;
    }
    if (compareMode === 'split') {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const splitX = splitPos * rect.width;
      if (Math.abs(mx - splitX) < 20) {
        isDraggingSplit.current = true;
      }
    }
  }, [compareMode, splitPos, offsetX, offsetY, canvasRef]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      const nx = e.clientX - panStart.current.x;
      const ny = e.clientY - panStart.current.y;
      onOffsetChange(nx, ny);
      return;
    }
    if (isDraggingSplit.current) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const newSplit = Math.max(0.05, Math.min(0.95, mx / rect.width));
      setSplitPos(newSplit);
    }
  }, [onOffsetChange]);

  const handleMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = spacePressed.current ? 'grab' : 'default';
    }
    isDraggingSplit.current = false;
  }, [canvasRef]);

  return (
    <div
      ref={containerRef}
      className="canvas-area"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} />
      </div>

      <div className="zoom-indicator">{Math.round(scale * 100)}%</div>

      {compareMode === 'opacity' && (
        <div className="opacity-slider-container">
          <span className="opacity-label">A</span>
          <input
            type="range"
            className="opacity-slider"
            min={0}
            max={100}
            value={Math.round(opacity * 100)}
            onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
          />
          <span className="opacity-label">B</span>
          <span className="opacity-label" style={{ minWidth: 40 }}>{Math.round(opacity * 100)}%</span>
        </div>
      )}

      {compareMode === 'split' && (
        <div
          className="split-line"
          style={{ left: `${splitPos * 100}%` }}
        />
      )}

      {!imageA && !imageB && (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <p>上传插画图片开始对比</p>
        </div>
      )}
    </div>
  );
};

export default ComparisonView;
