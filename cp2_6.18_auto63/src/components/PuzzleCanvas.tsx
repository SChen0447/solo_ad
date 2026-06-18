import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { processImageFile, validateImageFile } from '../utils/imageHelper';

export interface ImageItem {
  id: string;
  thumbnail: string;
  original: string;
}

export type BorderStyle = 'none' | 'white' | 'gray-dashed';
export type LayoutMode = 'compact' | 'loose';

interface PuzzleCanvasProps {
  images: ImageItem[];
  backgroundColor: string;
  borderStyle: BorderStyle;
  layoutMode: LayoutMode;
  onImagesChange: (images: ImageItem[]) => void;
  canvasRef?: React.MutableRefObject<HTMLDivElement | null>;
}

const CANVAS_WIDTH = 1000;
const CELL_SIZE = 100;

const PuzzleCanvas: React.FC<PuzzleCanvasProps> = ({
  images,
  backgroundColor,
  borderStyle,
  layoutMode,
  onImagesChange,
  canvasRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [uploadError, setUploadError] = useState<string | null>(null);

  const gap = layoutMode === 'compact' ? 8 : 20;
  const cellsPerRow = Math.floor((CANVAS_WIDTH + gap) / (CELL_SIZE + gap));

  const gridPositions = useMemo(() => {
    return images.map((_, index) => {
      const row = Math.floor(index / cellsPerRow);
      const col = index % cellsPerRow;
      return {
        x: col * (CELL_SIZE + gap),
        y: row * (CELL_SIZE + gap),
      };
    });
  }, [images.length, cellsPerRow, gap]);

  const canvasHeight = useMemo(() => {
    if (images.length === 0) return 400;
    const rows = Math.ceil(images.length / cellsPerRow);
    return rows * (CELL_SIZE + gap) - gap + 60;
  }, [images.length, cellsPerRow, gap]);

  const getBorderCss = useCallback(() => {
    switch (borderStyle) {
      case 'white':
        return {
          border: '2px solid #ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        };
      case 'gray-dashed':
        return {
          border: '1px dashed #9ca3af',
          borderRadius: '8px',
        };
      default:
        return {
          border: 'none',
          borderRadius: '4px',
        };
    }
  }, [borderStyle]);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setUploadError(`${file.name}: ${validation.error}`);
        continue;
      }
      validFiles.push(file);
    }

    try {
      const processed = await Promise.all(
        validFiles.map(async (file) => {
          const result = await processImageFile(file);
          return {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...result,
          };
        })
      );
      onImagesChange([...images, ...processed]);
    } catch (err) {
      setUploadError('图片处理失败，请重试');
    }
  }, [images, onImagesChange]);

  const handleDragStart = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setDraggingIndex(index);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDragPosition({
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  useEffect(() => {
    if (draggingIndex === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (draggingIndex === null || !containerRef.current) {
        setDraggingIndex(null);
        setDragPosition(null);
        return;
      }

      const canvasRect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - canvasRect.left - 30 - dragOffset.x + CELL_SIZE / 2;
      const y = e.clientY - canvasRect.top - 30 - dragOffset.y + CELL_SIZE / 2;

      if (x < 0 || y < 0 || x > CANVAS_WIDTH) {
        setDraggingIndex(null);
        setDragPosition(null);
        return;
      }

      const col = Math.floor(x / (CELL_SIZE + gap));
      const row = Math.floor(y / (CELL_SIZE + gap));
      let targetIndex = row * cellsPerRow + col;
      targetIndex = Math.max(0, Math.min(targetIndex, images.length - 1));

      if (targetIndex !== draggingIndex) {
        const newImages = [...images];
        const [removed] = newImages.splice(draggingIndex, 1);
        newImages.splice(targetIndex, 0, removed);
        onImagesChange(newImages);
      }

      setDraggingIndex(null);
      setDragPosition(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingIndex, dragOffset, cellsPerRow, gap, images, onImagesChange]);

  const borderCss = getBorderCss();

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div
        ref={(el) => {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          if (canvasRef) {
            canvasRef.current = el;
          }
        }}
        style={{
          width: CANVAS_WIDTH,
          maxWidth: '100%',
          backgroundColor,
          transition: 'background-color 0.4s ease-out',
          borderRadius: '12px',
          padding: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: CANVAS_WIDTH - 60,
            height: canvasHeight - 60,
            transition: 'height 0.5s ease-out',
          }}
        >
          {images.length === 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
                cursor: 'pointer',
                border: '2px dashed #d1d5db',
                borderRadius: '12px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.color = '#3b82f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.color = '#9ca3af';
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p style={{ marginTop: '12px', fontSize: '14px' }}>点击上传图片或拖拽图片到此处</p>
              <p style={{ marginTop: '4px', fontSize: '12px', opacity: 0.7 }}>支持 JPG/PNG，单张不超过 5MB</p>
            </div>
          )}

          {images.map((image, index) => {
            const isDragging = draggingIndex === index;
            const pos = gridPositions[index];

            if (isDragging && dragPosition) {
              return (
                <div
                  key={image.id}
                  style={{
                    position: 'fixed',
                    left: dragPosition.x - dragOffset.x,
                    top: dragPosition.y - dragOffset.y,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    opacity: 0.7,
                    zIndex: 1000,
                    pointerEvents: 'none',
                    ...borderCss,
                    overflow: 'hidden',
                    cursor: 'grabbing',
                  }}
                >
                  <img
                    src={image.thumbnail}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    draggable={false}
                  />
                </div>
              );
            }

            return (
              <div
                key={image.id}
                onMouseDown={(e) => handleDragStart(e, index)}
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.y,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  ...borderCss,
                  overflow: 'hidden',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  opacity: isDragging ? 0.3 : 1,
                  transition: isDragging ? 'none' : 'left 0.3s ease-out, top 0.3s ease-out',
                  userSelect: 'none',
                  zIndex: isDragging ? 10 : 1,
                }}
              >
                <img
                  src={image.thumbnail}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    pointerEvents: 'none',
                  }}
                  draggable={false}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newImages = images.filter((_, i) => i !== index);
                    onImagesChange(newImages);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(239,68,68,0.9)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFileSelect(e.target.files);
          e.target.value = '';
        }}
      />

      <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'background-color 0.2s, transform 0.1s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          + 添加图片
        </button>
        {uploadError && (
          <span style={{ color: '#ef4444', fontSize: '13px' }}>{uploadError}</span>
        )}
        {images.length > 0 && (
          <span style={{ color: '#6b7280', fontSize: '13px' }}>
            共 {images.length} 张图片，可拖拽调整顺序
          </span>
        )}
      </div>
    </div>
  );
};

export default PuzzleCanvas;
