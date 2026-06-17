import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { Component, BoundingBox, ImageInfo } from '../types';

interface CanvasViewerProps {
  imageInfo: ImageInfo | null;
  components: Component[];
  onBoxSelect: (bbox: BoundingBox) => void;
  onClearImage: () => void;
}

interface SelectionState {
  isSelecting: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const DEFAULT_HIGHLIGHT_COLOR = 'rgba(59, 130, 246, 0.3)';
const DEFAULT_BORDER_COLOR = 'rgba(59, 130, 246, 0.8)';

const CanvasViewer: React.FC<CanvasViewerProps> = ({
  imageInfo,
  components,
  onBoxSelect,
  onClearImage
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);

  const hexToRgba = useCallback((hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (imageRef.current) {
      const img = imageRef.current;
      const containerWidth = containerRef.current?.clientWidth || 800;
      const containerHeight = containerRef.current?.clientHeight || 600;

      const scaleX = containerWidth / img.width;
      const scaleY = containerHeight / img.height;
      const newScale = Math.min(scaleX, scaleY, 1);
      setScale(newScale);

      const displayWidth = img.width * newScale;
      const displayHeight = img.height * newScale;
      const x = (containerWidth - displayWidth) / 2;
      const y = (containerHeight - displayHeight) / 2;
      setOffset({ x, y });

      canvas.width = containerWidth;
      canvas.height = containerHeight;

      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, x, y, displayWidth, displayHeight);

      components.forEach((comp) => {
        const compX = x + comp.x * newScale;
        const compY = y + comp.y * newScale;
        const compWidth = comp.width * newScale;
        const compHeight = comp.height * newScale;
        const compRadius = comp.borderRadius * newScale;

        ctx.fillStyle = hexToRgba(comp.color, 0.3);
        ctx.strokeStyle = hexToRgba(comp.color, 0.9);
        ctx.lineWidth = 2;

        if (compRadius > 0) {
          ctx.beginPath();
          ctx.roundRect(compX, compY, compWidth, compHeight, compRadius);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(compX, compY, compWidth, compHeight);
          ctx.strokeRect(compX, compY, compWidth, compHeight);
        }
      });

      if (selection?.isSelecting) {
        const selX = Math.min(selection.startX, selection.currentX);
        const selY = Math.min(selection.startY, selection.currentY);
        const selWidth = Math.abs(selection.currentX - selection.startX);
        const selHeight = Math.abs(selection.currentY - selection.startY);

        ctx.fillStyle = DEFAULT_HIGHLIGHT_COLOR;
        ctx.strokeStyle = DEFAULT_BORDER_COLOR;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.fillRect(selX, selY, selWidth, selHeight);
        ctx.strokeRect(selX, selY, selWidth, selHeight);
        ctx.setLineDash([]);
      }
    }
  }, [components, selection, hexToRgba]);

  useEffect(() => {
    if (imageInfo) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        drawCanvas();
      };
      img.src = imageInfo.url;
    } else {
      imageRef.current = null;
      drawCanvas();
    }
  }, [imageInfo]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    const handleResize = () => drawCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawCanvas]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageInfo || e.button !== 0) return;
    const coords = getCanvasCoords(e);
    setSelection({
      isSelecting: true,
      startX: coords.x,
      startY: coords.y,
      currentX: coords.x,
      currentY: coords.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selection?.isSelecting) return;
    const coords = getCanvasCoords(e);
    setSelection((prev) =>
      prev ? { ...prev, currentX: coords.x, currentY: coords.y } : null
    );
  };

  const handleMouseUp = () => {
    if (!selection?.isSelecting || !imageInfo) {
      setSelection(null);
      return;
    }

    const selX = Math.min(selection.startX, selection.currentX);
    const selY = Math.min(selection.startY, selection.currentY);
    const selWidth = Math.abs(selection.currentX - selection.startX);
    const selHeight = Math.abs(selection.currentY - selection.startY);

    if (selWidth < 5 || selHeight < 5) {
      setSelection(null);
      return;
    }

    const bbox: BoundingBox = {
      x: Math.round((selX - offset.x) / scale),
      y: Math.round((selY - offset.y) / scale),
      width: Math.round(selWidth / scale),
      height: Math.round(selHeight / scale)
    };

    onBoxSelect(bbox);
    setSelection(null);
  };

  const handleMouseLeave = () => {
    if (selection?.isSelecting) {
      handleMouseUp();
    }
  };

  if (!imageInfo) {
    return (
      <div className="canvas-placeholder">
        <div className="placeholder-content">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p>请上传设计稿开始标注</p>
          <span className="hint">支持 PNG / JPG 格式，最大 5MB</span>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas-container" ref={containerRef}>
      <div className="canvas-header">
        <div className="image-info">
          <span className="filename">{imageInfo.filename}</span>
          <span className="resolution">{imageInfo.width} × {imageInfo.height}</span>
        </div>
        <button className="clear-btn" onClick={onClearImage}>
          清除
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};

export default CanvasViewer;
