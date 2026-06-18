import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, ImagePlus } from 'lucide-react';
import { processImage, validateImageFile } from '../utils/imageHelper';

export interface ImageItem {
  id: string;
  thumbnail: string;
  original: string;
}

export type BorderStyle = 'none' | 'white-solid' | 'gray-dashed';
export type LayoutMode = 'compact' | 'loose';

interface PuzzleCanvasProps {
  images: ImageItem[];
  backgroundColor: string;
  borderStyle: BorderStyle;
  layoutMode: LayoutMode;
  onImagesChange: (images: ImageItem[]) => void;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
}

const CELL_SIZE = 100;
const CANVAS_WIDTH = 1000;
const COMPACT_GAP = 8;
const LOOSE_GAP = 20;

const PuzzleCanvas: React.FC<PuzzleCanvasProps> = ({
  images,
  backgroundColor,
  borderStyle,
  layoutMode,
  onImagesChange,
  canvasRef: externalRef
}) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const canvasRef = externalRef || internalRef;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gap = layoutMode === 'compact' ? COMPACT_GAP : LOOSE_GAP;
  const cellsPerRow = Math.floor((CANVAS_WIDTH + gap) / (CELL_SIZE + gap));
  const actualCellSize = (CANVAS_WIDTH - gap * (cellsPerRow - 1)) / cellsPerRow;

  const getPosition = useCallback((index: number) => {
    const row = Math.floor(index / cellsPerRow);
    const col = index % cellsPerRow;
    return {
      x: col * (actualCellSize + gap),
      y: row * (actualCellSize + gap)
    };
  }, [cellsPerRow, actualCellSize, gap]);

  const totalRows = Math.max(1, Math.ceil(images.length / cellsPerRow));
  const canvasHeight = totalRows * actualCellSize + (totalRows - 1) * gap;

  const getBorderStyle = () => {
    switch (borderStyle) {
      case 'white-solid':
        return {
          border: '2px solid #ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        };
      case 'gray-dashed':
        return {
          border: '1px dashed #9ca3af',
          borderRadius: '8px'
        };
      default:
        return {
          border: 'none',
          borderRadius: '4px'
        };
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);

    const newImages: ImageItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setError(`${file.name}: ${validation.error}`);
        continue;
      }
      try {
        const processed = await processImage(file);
        newImages.push({
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
          thumbnail: processed.thumbnail,
          original: processed.original
        });
      } catch (err) {
        setError(`处理图片 ${file.name} 时出错`);
      }
    }

    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages]);
    }
    setUploading(false);
  };

  const handleRemoveImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onImagesChange(images.filter(img => img.id !== id));
  };

  const findDropIndex = (x: number, y: number): number => {
    if (!canvasRef.current) return images.length;
    const rect = canvasRef.current.getBoundingClientRect();
    const relativeX = x - rect.left;
    const relativeY = y - rect.top;

    const col = Math.round(relativeX / (actualCellSize + gap));
    const row = Math.round(relativeY / (actualCellSize + gap));
    const clampedCol = Math.max(0, Math.min(cellsPerRow - 1, col));
    const clampedRow = Math.max(0, row);

    let index = clampedRow * cellsPerRow + clampedCol;
    index = Math.min(Math.max(0, index), images.length);

    return index;
  };

  const handleMouseDown = (e: React.MouseEvent, imageId: string, index: number) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    setDraggingId(imageId);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDragPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });

    const startIndex = index;
    let lastDropIndex = startIndex;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      requestAnimationFrame(() => {
        setDragPosition({
          x: moveEvent.clientX - (canvasRef.current?.getBoundingClientRect().left || 0) - dragOffset.x,
          y: moveEvent.clientY - (canvasRef.current?.getBoundingClientRect().top || 0) - dragOffset.y
        });

        const dropIndex = findDropIndex(moveEvent.clientX, moveEvent.clientY);
        if (dropIndex !== lastDropIndex) {
          lastDropIndex = dropIndex;
          const currentIndex = images.findIndex(img => img.id === imageId);
          if (currentIndex !== -1) {
            const newImages = [...images];
            const [removed] = newImages.splice(currentIndex, 1);
            const targetIndex = dropIndex > currentIndex ? dropIndex - 1 : dropIndex;
            newImages.splice(targetIndex, 0, removed);
            onImagesChange(newImages);
          }
        }
      });
    };

    const handleMouseUp = () => {
      setDraggingId(null);
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent, imageId: string, index: number) => {
    const touch = e.touches[0];
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    setDraggingId(imageId);
    setIsDragging(true);
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });

    let lastDropIndex = index;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      moveEvent.preventDefault();
      const moveTouch = moveEvent.touches[0];
      requestAnimationFrame(() => {
        setDragPosition({
          x: moveTouch.clientX - (canvasRef.current?.getBoundingClientRect().left || 0) - dragOffset.x,
          y: moveTouch.clientY - (canvasRef.current?.getBoundingClientRect().top || 0) - dragOffset.y
        });

        const dropIndex = findDropIndex(moveTouch.clientX, moveTouch.clientY);
        if (dropIndex !== lastDropIndex) {
          lastDropIndex = dropIndex;
          const currentIndex = images.findIndex(img => img.id === imageId);
          if (currentIndex !== -1) {
            const newImages = [...images];
            const [removed] = newImages.splice(currentIndex, 1);
            const targetIndex = dropIndex > currentIndex ? dropIndex - 1 : dropIndex;
            newImages.splice(targetIndex, 0, removed);
            onImagesChange(newImages);
          }
        }
      });
    };

    const handleTouchEnd = () => {
      setDraggingId(null);
      setIsDragging(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  useEffect(() => {
    setError(null);
  }, [images]);

  return (
    <div className="puzzle-canvas-wrapper">
      <div
        className="puzzle-upload-area"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFileSelect(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <div className="upload-trigger">
          <Upload size={20} />
          <span>{uploading ? '上传中...' : '点击或拖拽上传图片'}</span>
          <span className="upload-hint">(JPG/PNG, 单张≤5MB)</span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div
        ref={canvasRef}
        className="puzzle-canvas"
        style={{
          backgroundColor,
          width: `${CANVAS_WIDTH}px`,
          height: `${canvasHeight}px`,
          transition: 'background-color 0.4s ease-out',
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      >
        {images.length === 0 && (
          <div className="empty-state">
            <ImagePlus size={48} color="#9ca3af" />
            <p>上传图片开始拼贴创作</p>
          </div>
        )}

        {images.map((image, index) => {
          const pos = getPosition(index);
          const isDragging = draggingId === image.id;

          return (
            <div
              key={image.id}
              className={`puzzle-image ${isDragging ? 'dragging' : ''}`}
              style={{
                position: isDragging ? 'fixed' : 'absolute',
                left: isDragging ? undefined : `${pos.x}px`,
                top: isDragging ? undefined : `${pos.y}px`,
                width: `${actualCellSize}px`,
                height: `${actualCellSize}px`,
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: isDragging ? 9999 : 1,
                opacity: isDragging ? 0.6 : 1,
                transform: isDragging
                  ? `translate(${dragPosition.x}px, ${dragPosition.y}px) scale(1.05)`
                  : undefined,
                transition: isDragging
                  ? 'opacity 0.15s ease-out, transform 0.15s ease-out'
                  : 'left 0.3s ease-out, top 0.3s ease-out',
                userSelect: 'none',
                touchAction: 'none',
                ...getBorderStyle()
              }}
              onMouseDown={(e) => handleMouseDown(e, image.id, index)}
              onTouchStart={(e) => handleTouchStart(e, image.id, index)}
            >
              <img
                src={image.thumbnail}
                alt=""
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 'inherit'
                }}
              />
              <button
                className="remove-btn"
                onClick={(e) => handleRemoveImage(image.id, e)}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        .puzzle-canvas-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .puzzle-upload-area {
          width: 100%;
          max-width: 1000px;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.3s ease-out;
          background: #fafafa;
        }

        .puzzle-upload-area:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .upload-trigger {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #6b7280;
          font-size: 14px;
        }

        .upload-trigger span:first-of-type {
          color: #374151;
          font-weight: 500;
        }

        .upload-hint {
          font-size: 12px;
          color: #9ca3af;
        }

        .error-message {
          color: #ef4444;
          font-size: 13px;
          padding: 8px 12px;
          background: #fef2f2;
          border-radius: 6px;
          border: 1px solid #fecaca;
        }

        .empty-state {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #9ca3af;
        }

        .empty-state p {
          font-size: 14px;
          margin: 0;
        }

        .puzzle-image {
          box-sizing: border-box;
          overflow: hidden;
          background: #e5e7eb;
        }

        .puzzle-image.dragging {
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
        }

        .remove-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease-out;
          z-index: 2;
        }

        .puzzle-image:hover .remove-btn {
          opacity: 1;
        }

        .remove-btn:hover {
          background: rgba(239, 68, 68, 0.9);
        }

        @media (max-width: 1024px) {
          .puzzle-canvas {
            transform: scale(0.85);
            transform-origin: top center;
            margin-bottom: -100px;
          }
        }
      `}</style>
    </div>
  );
};

export default PuzzleCanvas;
