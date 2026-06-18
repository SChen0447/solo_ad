import React, { useState, useRef, useCallback, useEffect } from 'react';
import { BorderStyle, LayoutMode } from './Toolbar';

export interface ImageItem {
  id: string;
  thumbnail: string;
  original: string;
}

interface PuzzleCanvasProps {
  images: ImageItem[];
  backgroundColor: string;
  borderStyle: BorderStyle;
  layoutMode: LayoutMode;
  onImagesReorder: (images: ImageItem[]) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

const CANVAS_WIDTH = 1000;
const CELL_SIZE = 100;

const PuzzleCanvas: React.FC<PuzzleCanvasProps> = ({
  images,
  backgroundColor,
  borderStyle,
  layoutMode,
  onImagesReorder,
  canvasRef
}) => {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  const gap = layoutMode === 'compact' ? 8 : 20;
  const cellsPerRow = Math.floor((CANVAS_WIDTH + gap) / (CELL_SIZE + gap));
  const rowCount = Math.max(1, Math.ceil(images.length / cellsPerRow));
  const canvasHeight = rowCount * CELL_SIZE + (rowCount + 1) * gap;

  const getImageBorderStyle = (): React.CSSProperties => {
    switch (borderStyle) {
      case 'white':
        return {
          border: '2px solid #ffffff',
          borderRadius: '8px'
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

  const getCellPosition = useCallback(
    (index: number) => {
      const col = index % cellsPerRow;
      const row = Math.floor(index / cellsPerRow);
      return {
        x: gap + col * (CELL_SIZE + gap),
        y: gap + row * (CELL_SIZE + gap)
      };
    },
    [cellsPerRow, gap]
  );

  const getIndexFromPosition = useCallback(
    (x: number, y: number) => {
      if (!containerRef.current) return null;
      
      const rect = containerRef.current.getBoundingClientRect();
      const localX = x - rect.left;
      const localY = y - rect.top;
      
      if (localX < 0 || localX > CANVAS_WIDTH || localY < 0 || localY > canvasHeight) {
        return null;
      }
      
      const col = Math.floor((localX - gap / 2) / (CELL_SIZE + gap));
      const row = Math.floor((localY - gap / 2) / (CELL_SIZE + gap));
      
      const clampedCol = Math.max(0, Math.min(col, cellsPerRow - 1));
      const clampedRow = Math.max(0, Math.min(row, rowCount - 1));
      
      const index = clampedRow * cellsPerRow + clampedCol;
      return Math.min(index, images.length - 1);
    },
    [cellsPerRow, gap, rowCount, canvasHeight, images.length]
  );

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, index: number) => {
      e.preventDefault();
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      setDraggingIndex(index);
      setDragPosition({ x: clientX, y: clientY });
      setTargetIndex(index);
    },
    []
  );

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (draggingIndex === null) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      animationRef.current = requestAnimationFrame(() => {
        setDragPosition({ x: clientX, y: clientY });
        const newTargetIndex = getIndexFromPosition(clientX, clientY);
        if (newTargetIndex !== null && newTargetIndex !== targetIndex) {
          setTargetIndex(newTargetIndex);
        }
      });
    },
    [draggingIndex, targetIndex, getIndexFromPosition]
  );

  const handleDragEnd = useCallback(() => {
    if (draggingIndex !== null && targetIndex !== null && draggingIndex !== targetIndex) {
      const newImages = [...images];
      const [removed] = newImages.splice(draggingIndex, 1);
      newImages.splice(targetIndex, 0, removed);
      onImagesReorder(newImages);
    }
    
    setDraggingIndex(null);
    setTargetIndex(null);
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, [draggingIndex, targetIndex, images, onImagesReorder]);

  useEffect(() => {
    if (draggingIndex !== null) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [draggingIndex, handleDragMove, handleDragEnd]);

  const getDisplayIndex = (originalIndex: number): number => {
    if (draggingIndex === null || targetIndex === null) {
      return originalIndex;
    }
    
    if (originalIndex === draggingIndex) {
      return targetIndex;
    }
    
    if (draggingIndex < targetIndex) {
      if (originalIndex > draggingIndex && originalIndex <= targetIndex) {
        return originalIndex - 1;
      }
    } else {
      if (originalIndex >= targetIndex && originalIndex < draggingIndex) {
        return originalIndex + 1;
      }
    }
    
    return originalIndex;
  };

  return (
    <div className="canvas-wrapper">
      <div
        ref={(el) => {
          containerRef.current = el;
          if (typeof canvasRef === 'function') {
            canvasRef(el);
          } else if (canvasRef && el) {
            (canvasRef as React.MutableRefObject<HTMLDivElement>).current = el;
          }
        }}
        className="puzzle-canvas"
        style={{
          width: CANVAS_WIDTH,
          minHeight: canvasHeight,
          backgroundColor: backgroundColor,
          transition: 'background-color 0.4s ease-out'
        }}
      >
        {images.length === 0 ? (
          <div className="empty-state">
            <p>点击上方上传按钮添加图片</p>
            <p className="hint">支持 JPG/PNG 格式，单张不超过 5MB</p>
          </div>
        ) : (
          images.map((image, index) => {
            const displayIndex = getDisplayIndex(index);
            const position = getCellPosition(displayIndex);
            const isDragging = draggingIndex === index;
            
            return (
              <div
                key={image.id}
                className={`image-cell ${isDragging ? 'dragging' : ''}`}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  left: position.x,
                  top: position.y,
                  transition: isDragging ? 'none' : 'all 0.3s ease-out',
                  opacity: isDragging ? 0.5 : 1,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  zIndex: isDragging ? 100 : 1,
                  ...getImageBorderStyle()
                }}
                onMouseDown={(e) => handleDragStart(e, index)}
                onTouchStart={(e) => handleDragStart(e, index)}
              >
                <img src={image.thumbnail} alt="" draggable={false} />
              </div>
            );
          })
        )}
        
        {draggingIndex !== null && (
          <div
            className="drag-ghost"
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              left: dragPosition.x - CELL_SIZE / 2,
              top: dragPosition.y - CELL_SIZE / 2,
              pointerEvents: 'none',
              ...getImageBorderStyle()
            }}
          >
            <img src={images[draggingIndex]?.thumbnail} alt="" draggable={false} />
          </div>
        )}
      </div>

      <style>{`
        .canvas-wrapper {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 20px;
          overflow: auto;
        }

        .puzzle-canvas {
          position: relative;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .empty-state {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          color: #9ca3af;
        }

        .empty-state p {
          margin: 8px 0;
          font-size: 16px;
        }

        .empty-state .hint {
          font-size: 14px;
          color: #d1d5db;
        }

        .image-cell {
          position: absolute;
          overflow: hidden;
          user-select: none;
          touch-action: none;
          box-sizing: border-box;
        }

        .image-cell img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          pointer-events: none;
        }

        .image-cell.dragging {
          pointer-events: none;
        }

        .drag-ghost {
          position: fixed;
          opacity: 0.8;
          z-index: 1000;
          overflow: hidden;
          box-sizing: border-box;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }

        .drag-ghost img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        @media (max-width: 1024px) {
          .canvas-wrapper {
            padding: 12px;
          }

          .puzzle-canvas {
            transform: scale(0.7);
            transform-origin: top center;
          }
        }
      `}</style>
    </div>
  );
};

export default PuzzleCanvas;
