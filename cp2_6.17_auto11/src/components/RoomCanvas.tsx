import React, { useRef, useState, useCallback, useEffect, memo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useDrop } from '../hooks/useDragDrop';
import { snapToGrid, GRID_SIZE, WALL_THICKNESS, getFloorPattern, isInRoomBounds } from '../modules/roomConfig';
import { PRESET_COLORS, applyColorTransition } from '../modules/colorManager';
import type { RoomLayout, FurnitureItem, Wall, DragData } from '../types';

interface RoomCanvasProps {
  layout: RoomLayout;
  furniture: FurnitureItem[];
  wallColors: Record<string, string>;
  onWallClick: (wallId: string, element: HTMLElement) => void;
  onFurnitureAdd: (furniture: FurnitureItem) => void;
  onFurnitureMove: (id: string, x: number, y: number) => void;
  onFurnitureDelete: (id: string) => void;
  activeWallId: string | null;
  isTransitioning: boolean;
}

const FurnitureBlock = memo(function FurnitureBlock({
  item,
  onDelete,
  onMouseDown,
}: {
  item: FurnitureItem;
  onDelete: () => void;
  onMouseDown: (e: React.MouseEvent, offsetX: number, offsetY: number) => void;
}) {
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    onMouseDown(e, offsetX, offsetY);
  };

  return (
    <div
      className="furniture-item"
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        backgroundColor: item.color,
        borderRadius: '2px',
        cursor: 'grab',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transform: `rotate(${item.rotation}deg)`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease',
        willChange: 'transform',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const touch = e.touches[0];
        const offsetX = touch.clientX - rect.left;
        const offsetY = touch.clientY - rect.top;
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true,
        });
        onMouseDown(mouseEvent as unknown as React.MouseEvent, offsetX, offsetY);
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#fff',
          fontSize: '11px',
          fontWeight: 500,
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {item.name}
      </span>
      <button
        className="delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{
          position: 'absolute',
          top: '-8px',
          left: '-8px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#e74c3c',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '12px',
          lineHeight: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          transform: 'scale(0.8)',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        🗑
      </button>
    </div>
  );
});

const WallElement = memo(function WallElement({
  wall,
  color,
  isActive,
  onClick,
}: {
  wall: Wall;
  color: string;
  isActive: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyColorTransition(ref.current, color, 300);
  }, [color]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: wall.x,
        top: wall.y,
        width: wall.width,
        height: wall.height,
        backgroundColor: color,
        cursor: 'pointer',
        transition: 'filter 0.2s ease, transform 0.2s ease',
        border: isActive ? '2px solid #8b5e3c' : 'none',
        boxSizing: 'border-box',
        boxShadow: isActive ? '0 0 10px rgba(139, 94, 60, 0.5)' : 'none',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.filter = 'brightness(1.05)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = 'brightness(1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    />
  );
});

export const RoomCanvas: React.FC<RoomCanvasProps> = ({
  layout,
  furniture,
  wallColors,
  onWallClick,
  onFurnitureAdd,
  onFurnitureMove,
  onFurnitureDelete,
  activeWallId,
  isTransitioning,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragData, setDragData] = useState<DragData | null>(null);
  const [movingFurnitureId, setMovingFurnitureId] = useState<string | null>(null);
  const [moveOffset, setMoveOffset] = useState({ x: 0, y: 0 });

  const handleDrop = useCallback(
    (data: DragData, position: { x: number; y: number }) => {
      if (data.type === 'furniture') {
        const x = snapToGrid(position.x - data.furniture.width / 2);
        const y = snapToGrid(position.y - data.furniture.height / 2);

        if (isInRoomBounds(x, y, data.furniture.width, data.furniture.height, layout)) {
          const newFurniture: FurnitureItem = {
            id: uuidv4(),
            ...data.furniture,
            x,
            y,
          };
          onFurnitureAdd(newFurniture);
        }
      } else if (data.type === 'move') {
        const x = snapToGrid(position.x - data.offsetX);
        const y = snapToGrid(position.y - data.offsetY);

        const item = furniture.find((f) => f.id === data.furnitureId);
        if (item && isInRoomBounds(x, y, item.width, item.height, layout)) {
          onFurnitureMove(data.furnitureId, x, y);
        }
      }
      setDragPosition(null);
      setDragData(null);
      setMovingFurnitureId(null);
    },
    [layout, furniture, onFurnitureAdd, onFurnitureMove]
  );

  const handleDragOver = useCallback((position: { x: number; y: number }) => {
    setDragPosition(position);
  }, []);

  const { isDragOver } = useDrop(canvasRef, {
    onDrop: handleDrop,
    onDragOver: handleDragOver,
  });

  useEffect(() => {
    const handleDndStart = (e: Event) => {
      const customEvent = e as CustomEvent<DragData>;
      setDragData(customEvent.detail);
    };
    document.addEventListener('dnd:start', handleDndStart as EventListener);
    return () => {
      document.removeEventListener('dnd:start', handleDndStart as EventListener);
    };
  }, []);

  const handleFurnitureMouseDown = useCallback(
    (itemId: string, e: React.MouseEvent, offsetX: number, offsetY: number) => {
      e.preventDefault();
      e.stopPropagation();
      setMovingFurnitureId(itemId);
      setMoveOffset({ x: offsetX, y: offsetY });

      const item = furniture.find((f) => f.id === itemId);
      if (item) {
        const dragData: DragData = {
          type: 'move',
          furnitureId: itemId,
          offsetX,
          offsetY,
        };
        const event = new CustomEvent<DragData>('dnd:start', {
          detail: dragData,
          bubbles: true,
        });
        e.currentTarget.dispatchEvent(event);
      }
    },
    [furniture]
  );

  const handleWallClick = useCallback(
    (wallId: string, e: React.MouseEvent) => {
      const element = e.currentTarget as HTMLElement;
      onWallClick(wallId, element);
    },
    [onWallClick]
  );

  const renderGrid = () => {
    const lines = [];
    for (let x = 0; x <= layout.canvasWidth; x += GRID_SIZE) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={layout.canvasHeight}
          stroke="#e0e0e0"
          strokeWidth="0.5"
        />
      );
    }
    for (let y = 0; y <= layout.canvasHeight; y += GRID_SIZE) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={layout.canvasWidth}
          y2={y}
          stroke="#e0e0e0"
          strokeWidth="0.5"
        />
      );
    }
    return lines;
  };

  const floorPattern = getFloorPattern(layout.floor);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        ref={canvasRef}
        style={{
          position: 'relative',
          width: layout.canvasWidth,
          height: layout.canvasHeight,
          backgroundColor: '#fdfaf6',
          border: '3px solid #666666',
          borderRadius: '4px',
          overflow: 'hidden',
          opacity: isTransitioning ? 0 : 1,
          transition: 'opacity 0.5s ease',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        }}
        onMouseEnter={(e) => {
          const items = e.currentTarget.querySelectorAll('.furniture-item');
          items.forEach((item) => {
            const deleteBtn = item.querySelector('.delete-btn') as HTMLElement;
            if (deleteBtn) {
              deleteBtn.style.opacity = '1';
              deleteBtn.style.transform = 'scale(1)';
            }
          });
        }}
        onMouseLeave={(e) => {
          const items = e.currentTarget.querySelectorAll('.furniture-item');
          items.forEach((item) => {
            const deleteBtn = item.querySelector('.delete-btn') as HTMLElement;
            if (deleteBtn) {
              deleteBtn.style.opacity = '0';
              deleteBtn.style.transform = 'scale(0.8)';
            }
          });
        }}
      >
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {renderGrid()}
        </svg>

        <div
          style={{
            position: 'absolute',
            left: WALL_THICKNESS,
            top: WALL_THICKNESS,
            right: WALL_THICKNESS,
            bottom: WALL_THICKNESS,
            background: floorPattern,
            backgroundSize: layout.floor === 'tile' ? '50px 50px' : 'auto',
          }}
        />

        {layout.walls.map((wall) => (
          <WallElement
            key={wall.id}
            wall={wall}
            color={wallColors[wall.id] || wall.color}
            isActive={activeWallId === wall.id}
            onClick={(e) => handleWallClick(wall.id, e)}
          />
        ))}

        <div
          style={{
            position: 'absolute',
            left: layout.windowPosition.x,
            top: layout.windowPosition.y,
            width: layout.windowPosition.width,
            height: layout.windowPosition.orientation === 'horizontal' ? '6px' : WALL_THICKNESS,
            backgroundColor: '#87ceeb',
            border: '2px solid #666666',
            boxSizing: 'border-box',
          }}
        />

        {furniture.map((item) => (
          <FurnitureBlock
            key={item.id}
            item={item}
            onDelete={() => onFurnitureDelete(item.id)}
            onMouseDown={(e, offsetX, offsetY) => handleFurnitureMouseDown(item.id, e, offsetX, offsetY)}
          />
        ))}

        {isDragOver && dragPosition && dragData && dragData.type === 'furniture' && (
          <div
            style={{
              position: 'absolute',
              left: snapToGrid(dragPosition.x - dragData.furniture.width / 2),
              top: snapToGrid(dragPosition.y - dragData.furniture.height / 2),
              width: dragData.furniture.width,
              height: dragData.furniture.height,
              backgroundColor: dragData.furniture.color,
              borderRadius: '2px',
              opacity: 0.5,
              pointerEvents: 'none',
              border: '2px dashed #8b5e3c',
            }}
          />
        )}

        {isDragOver && dragPosition && dragData && dragData.type === 'move' && movingFurnitureId && (
          (() => {
            const item = furniture.find((f) => f.id === movingFurnitureId);
            if (!item) return null;
            return (
              <div
                style={{
                  position: 'absolute',
                  left: snapToGrid(dragPosition.x - moveOffset.x),
                  top: snapToGrid(dragPosition.y - moveOffset.y),
                  width: item.width,
                  height: item.height,
                  backgroundColor: item.color,
                  borderRadius: '2px',
                  opacity: 0.5,
                  pointerEvents: 'none',
                  border: '2px dashed #8b5e3c',
                }}
              />
            );
          })()
        )}
      </div>
    </div>
  );
};
