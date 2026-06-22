import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Move, GripVertical } from 'lucide-react';
import { ImageItem, FilterParams } from '@/types';
import { eventBus } from '@/utils/EventBus';

interface ColorPreviewProps {
  images: ImageItem[];
  currentImageIndex: number;
  params: FilterParams;
  processedPreviewUrl: string | null;
  onImageIndexChange: (index: number) => void;
  onParamsChange?: (params: FilterParams) => void;
}

export const ColorPreview: React.FC<ColorPreviewProps> = ({
  images,
  currentImageIndex,
  params,
  processedPreviewUrl,
  onImageIndexChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const lastPanPos = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  const currentImage = images[currentImageIndex];

  const handleMouseDownOnDivider = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleTouchStartOnDivider = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      if (containerRef.current && isDragging) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSplitPosition(percentage);
      }
      rafRef.current = null;
    });
  }, [isDragging]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !containerRef.current || e.touches.length === 0) return;
    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      if (containerRef.current && isDragging && e.touches.length > 0) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSplitPosition(percentage);
      }
      rafRef.current = null;
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(0.5, Math.min(3, prev + delta)));
  }, []);

  const handleMouseDownOnImage = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    lastPanPos.current = { x: e.clientX, y: e.clientY };
  }, [zoom]);

  const handleMouseMovePanning = useCallback((e: MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - lastPanPos.current.x;
    const dy = e.clientY - lastPanPos.current.y;
    setPanOffset((prev) => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));
    lastPanPos.current = { x: e.clientX, y: e.clientY };
  }, [isPanning]);

  const handleMouseUpPanning = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMovePanning);
      window.addEventListener('mouseup', handleMouseUpPanning);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMovePanning);
      window.removeEventListener('mouseup', handleMouseUpPanning);
    };
  }, [isPanning, handleMouseMovePanning, handleMouseUpPanning]);

  useEffect(() => {
    if (zoom <= 1) {
      setPanOffset({ x: 0, y: 0 });
    }
  }, [zoom]);

  const handleRotate = useCallback(() => {
    if (!currentImage) return;
    const newRotation = (currentImage.rotation + 90) % 360;
    eventBus.emit('IMAGE_ROTATED', { imageId: currentImage.id, rotation: newRotation });
  }, [currentImage]);

  const handleZoomIn = () => setZoom((prev) => Math.min(3, prev + 0.25));
  const handleZoomOut = () => {
    setZoom((prev) => {
      const newZoom = Math.max(0.5, prev - 0.25);
      if (newZoom <= 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  if (images.length === 0) {
    return (
      <div className="color-preview empty">
        <div className="preview-placeholder">
          <GripVertical size={48} />
          <p>上传图片后可在此预览效果</p>
        </div>
      </div>
    );
  }

  const imageTransform = `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`;
  const cursor = zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default';

  return (
    <div className="color-preview">
      <div className="preview-toolbar">
        <div className="image-navigation">
          {images.length > 1 && (
            <div className="image-tabs">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  className={`image-tab ${idx === currentImageIndex ? 'active' : ''}`}
                  onClick={() => onImageIndexChange(idx)}
                >
                  <img src={img.url} alt={img.name} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="zoom-controls">
          <button
            className="control-btn"
            onClick={handleZoomOut}
            title="缩小"
          >
            <ZoomOut size={18} />
          </button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button
            className="control-btn"
            onClick={handleZoomIn}
            title="放大"
          >
            <ZoomIn size={18} />
          </button>
          <button
            className="control-btn"
            onClick={handleRotate}
            title="顺时针旋转90°"
          >
            <RotateCw size={18} />
          </button>
          {zoom > 1 && (
            <span className="pan-hint">
              <Move size={14} />
              拖拽平移
            </span>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="preview-container"
        onWheel={handleWheel}
        style={{ cursor }}
      >
        <div
          className="image-wrapper original"
          style={{ clipPath: `inset(0 ${100 - splitPosition}% 0 0)` }}
        >
          <div
            className="image-inner"
            style={{ transform: imageTransform, cursor }}
            onMouseDown={handleMouseDownOnImage}
          >
            <img
              src={currentImage?.url}
              alt="原图"
              draggable={false}
              style={{ transform: `rotate(${currentImage?.rotation || 0}deg)` }}
            />
          </div>
          <div className="image-label">原图</div>
        </div>

        <div
          className="image-wrapper processed"
          style={{ clipPath: `inset(0 0 0 ${splitPosition}%)` }}
        >
          <div
            className="image-inner"
            style={{ transform: imageTransform, cursor }}
            onMouseDown={handleMouseDownOnImage}
          >
            <img
              src={processedPreviewUrl || currentImage?.url}
              alt="处理后"
              draggable={false}
              style={{ transform: `rotate(${currentImage?.rotation || 0}deg)` }}
            />
          </div>
          <div className="image-label">处理后</div>
        </div>

        <div
          className={`divider-line ${isDragging ? 'dragging' : ''}`}
          style={{ left: `${splitPosition}%` }}
          onMouseDown={handleMouseDownOnDivider}
          onTouchStart={handleTouchStartOnDivider}
        >
          <div className="divider-track" />
          <div className="divider-handle">
            <div className="handle-grip">
              <GripVertical size={12} />
            </div>
          </div>
        </div>
      </div>

      <div className="params-display">
        <div className="param-item">
          <span className="param-label">亮度</span>
          <span className="param-value">{params.brightness > 0 ? '+' : ''}{params.brightness}</span>
        </div>
        <div className="param-item">
          <span className="param-label">对比度</span>
          <span className="param-value">{params.contrast > 0 ? '+' : ''}{params.contrast}</span>
        </div>
        <div className="param-item">
          <span className="param-label">色相</span>
          <span className="param-value">{params.hueRotate}°</span>
        </div>
        <div className="param-item">
          <span className="param-label">饱和度</span>
          <span className="param-value">{params.saturation}%</span>
        </div>
      </div>
    </div>
  );
};
