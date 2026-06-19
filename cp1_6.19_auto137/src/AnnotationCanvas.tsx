import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Annotation } from './types';

interface Props {
  imageUrl: string;
  annotations: Annotation[];
  selectedId: string | null;
  onAddAnnotation: (x: number, y: number, width: number, height: number) => void;
  onSelectAnnotation: (id: string | null) => void;
  onUpdateAnnotation: (annotation: Annotation) => void;
  animatingIds: Set<string>;
}

interface DrawState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface DragState {
  isDragging: boolean;
  annotationId: string;
  offsetX: number;
  offsetY: number;
}

const AnnotationCanvas: React.FC<Props> = ({
  imageUrl,
  annotations,
  selectedId,
  onAddAnnotation,
  onSelectAnnotation,
  onUpdateAnnotation,
  animatingIds
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [drawState, setDrawState] = useState<DrawState | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const ACCENT_COLOR = '#3b82f6';
  const ACCENT_ALPHA = 'rgba(59, 130, 246, 0.18)';
  const SELECTED_COLOR = '#06b6d4';
  const SELECTED_ALPHA = 'rgba(6, 182, 212, 0.2)';
  const HOVER_ALPHA = 'rgba(59, 130, 246, 0.28)';

  const getRelativeCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      const scaleX = imgSize.width / rect.width;
      const scaleY = imgSize.height / rect.height;
      return {
        x: Math.max(0, Math.min(imgSize.width, (clientX - rect.left) * scaleX)),
        y: Math.max(0, Math.min(imgSize.height, (clientY - rect.top) * scaleY))
      };
    },
    [imgSize]
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !imgLoaded || imgSize.width === 0) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayW = rect.width;
    const displayH = rect.height;

    if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
      canvas.width = displayW * dpr;
      canvas.height = displayH * dpr;
      canvas.style.width = `${displayW}px`;
      canvas.style.height = `${displayH}px`;
    }

    const scaleX = displayW / imgSize.width;
    const scaleY = displayH / imgSize.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, displayW, displayH);

    annotations.forEach((ann) => {
      const x = ann.x * scaleX;
      const y = ann.y * scaleY;
      const w = ann.width * scaleX;
      const h = ann.height * scaleY;
      const isSelected = ann.id === selectedId;
      const isHovered = ann.id === hoveredId;

      ctx.save();
      if (isSelected) {
        ctx.fillStyle = SELECTED_ALPHA;
        ctx.strokeStyle = SELECTED_COLOR;
        ctx.lineWidth = 2.5;
      } else if (isHovered) {
        ctx.fillStyle = HOVER_ALPHA;
        ctx.strokeStyle = ACCENT_COLOR;
        ctx.lineWidth = 2;
      } else {
        ctx.fillStyle = ACCENT_ALPHA;
        ctx.strokeStyle = ACCENT_COLOR;
        ctx.lineWidth = 2;
      }
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.fill();
      ctx.stroke();

      const labelText = ann.id;
      const labelPadX = 7;
      const labelPadY = 4;
      ctx.font = '500 11px "SF Mono", Consolas, Monaco, monospace';
      const labelW = ctx.measureText(labelText).width + labelPadX * 2;
      const labelH = 19;
      let labelX = x;
      let labelY = y - labelH - 4;

      if (labelY < 2) {
        labelY = y + 4;
      }
      if (labelX + labelW > displayW) {
        labelX = displayW - labelW - 2;
      }

      ctx.beginPath();
      const radius = 3;
      ctx.moveTo(labelX + radius, labelY);
      ctx.lineTo(labelX + labelW - radius, labelY);
      ctx.quadraticCurveTo(labelX + labelW, labelY, labelX + labelW, labelY + radius);
      ctx.lineTo(labelX + labelW, labelY + labelH - radius);
      ctx.quadraticCurveTo(labelX + labelW, labelY + labelH, labelX + labelW - radius, labelY + labelH);
      ctx.lineTo(labelX + radius, labelY + labelH);
      ctx.quadraticCurveTo(labelX, labelY + labelH, labelX, labelY + labelH - radius);
      ctx.lineTo(labelX, labelY + radius);
      ctx.quadraticCurveTo(labelX, labelY, labelX + radius, labelY);
      ctx.closePath();

      ctx.fillStyle = isSelected ? SELECTED_COLOR : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = isSelected ? SELECTED_COLOR : ACCENT_COLOR;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = isSelected ? '#ffffff' : ACCENT_COLOR;
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, labelX + labelPadX, labelY + labelH / 2 + 0.5);
      ctx.restore();
    });

    if (drawState && drawState.isDrawing) {
      const sx = drawState.startX * scaleX;
      const sy = drawState.startY * scaleY;
      const cx = drawState.currentX * scaleX;
      const cy = drawState.currentY * scaleY;
      const rx = Math.min(sx, cx);
      const ry = Math.min(sy, cy);
      const rw = Math.abs(cx - sx);
      const rh = Math.abs(cy - sy);

      if (rw > 3 && rh > 3) {
        ctx.save();
        ctx.fillStyle = ACCENT_ALPHA;
        ctx.strokeStyle = ACCENT_COLOR;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = 0;
        ctx.beginPath();
        ctx.rect(rx, ry, rw, rh);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        const sizeText = `${Math.round(rw / scaleX)}×${Math.round(rh / scaleY)}px`;
        ctx.save();
        ctx.font = '500 11px "SF Mono", Consolas, Monaco, monospace';
        const padX = 7,
          padY = 3;
        const tw = ctx.measureText(sizeText).width + padX * 2;
        const th = 18;
        let bx = rx + rw - tw - 6;
        let by = ry + rh + 6;
        if (by + th > displayH) by = ry - th - 6;
        if (bx < 2) bx = 2;

        ctx.fillStyle = 'rgba(30, 41, 59, 0.92)';
        ctx.beginPath();
        const r2 = 3;
        ctx.moveTo(bx + r2, by);
        ctx.lineTo(bx + tw - r2, by);
        ctx.quadraticCurveTo(bx + tw, by, bx + tw, by + r2);
        ctx.lineTo(bx + tw, by + th - r2);
        ctx.quadraticCurveTo(bx + tw, by + th, bx + tw - r2, by + th);
        ctx.lineTo(bx + r2, by + th);
        ctx.quadraticCurveTo(bx, by + th, bx, by + th - r2);
        ctx.lineTo(bx, by + r2);
        ctx.quadraticCurveTo(bx, by, bx + r2, by);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.textBaseline = 'middle';
        ctx.fillText(sizeText, bx + padX, by + th / 2 + 0.5);
        ctx.restore();
      }
    }

    rafRef.current = null;
  }, [annotations, selectedId, hoveredId, drawState, imgSize, imgLoaded]);

  const scheduleRender = useCallback(() => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(render);
    }
  }, [render]);

  useEffect(() => {
    scheduleRender();
  }, [scheduleRender]);

  useEffect(() => {
    const onResize = () => scheduleRender();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [scheduleRender]);

  const handleImageLoad = () => {
    const img = imgRef.current;
    if (img) {
      setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImgLoaded(true);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const { x, y } = getRelativeCoords(e.clientX, e.clientY);

    const clickedAnn = [...annotations].reverse().find((ann) => {
      return (
        x >= ann.x &&
        x <= ann.x + ann.width &&
        y >= ann.y &&
        y <= ann.y + ann.height
      );
    });

    if (clickedAnn) {
      onSelectAnnotation(clickedAnn.id);
      setDragState({
        isDragging: true,
        annotationId: clickedAnn.id,
        offsetX: x - clickedAnn.x,
        offsetY: y - clickedAnn.y
      });
    } else {
      onSelectAnnotation(null);
      setDrawState({
        isDrawing: true,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getRelativeCoords(e.clientX, e.clientY);

    if (drawState && drawState.isDrawing) {
      setDrawState((prev) => (prev ? { ...prev, currentX: x, currentY: y } : null));
      scheduleRender();
      return;
    }

    if (dragState && dragState.isDragging) {
      const ann = annotations.find((a) => a.id === dragState.annotationId);
      if (ann) {
        const newX = Math.max(0, Math.min(imgSize.width - ann.width, x - dragState.offsetX));
        const newY = Math.max(0, Math.min(imgSize.height - ann.height, y - dragState.offsetY));
        onUpdateAnnotation({ ...ann, x: newX, y: newY });
      }
      return;
    }

    const hovered = [...annotations].reverse().find((ann) => {
      return (
        x >= ann.x &&
        x <= ann.x + ann.width &&
        y >= ann.y &&
        y <= ann.y + ann.height
      );
    });
    if ((hovered?.id ?? null) !== hoveredId) {
      setHoveredId(hovered?.id ?? null);
      scheduleRender();
    }
  };

  const handleMouseUp = () => {
    if (drawState && drawState.isDrawing) {
      const x = Math.min(drawState.startX, drawState.currentX);
      const y = Math.min(drawState.startY, drawState.currentY);
      const w = Math.abs(drawState.currentX - drawState.startX);
      const h = Math.abs(drawState.currentY - drawState.startY);
      if (w >= 8 && h >= 8) {
        onAddAnnotation(x, y, w, h);
      }
      setDrawState(null);
    }
    if (dragState && dragState.isDragging) {
      setDragState(null);
    }
    scheduleRender();
  };

  const handleMouseLeave = () => {
    if (drawState?.isDrawing) {
      setDrawState(null);
    }
    if (dragState?.isDragging) {
      setDragState(null);
    }
    setHoveredId(null);
    scheduleRender();
  };

  return (
    <div className="canvas-container" ref={containerRef}>
      <img
        ref={imgRef}
        src={imageUrl}
        alt="设计截图"
        className="canvas-image"
        onLoad={handleImageLoad}
        draggable={false}
      />
      {imgLoaded && (
        <>
          <canvas ref={canvasRef} className="annotation-canvas" />
          <div
            ref={overlayRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              zIndex: 2
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 3
            }}
          >
            {annotations.map((ann) => {
              const rect = containerRef.current?.getBoundingClientRect();
              if (!rect || imgSize.width === 0) return null;
              const scaleX = rect.width / imgSize.width;
              const scaleY = rect.height / imgSize.height;
              const animating = animatingIds.has(ann.id);
              return (
                <div
                  key={ann.id}
                  className={`annotation-popup ${animating ? '' : ''}`}
                  style={{
                    left: ann.x * scaleX,
                    top: ann.y * scaleY,
                    width: ann.width * scaleX,
                    height: ann.height * scaleY,
                    animation: animating ? 'popupScale 0.2s ease-out' : undefined
                  }}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default AnnotationCanvas;
