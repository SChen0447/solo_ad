import React, { useRef, useState, useCallback, useEffect, memo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useDrop } from '../hooks/useDragDrop';
import { snapToGrid, GRID_SIZE, WALL_THICKNESS, getFloorPattern, isInRoomBounds } from '../modules/roomConfig';
import { applyColorTransition } from '../modules/colorManager';
import type { RoomLayout, FurnitureItem, Wall, DragData } from '../types';

const ALIGN_THRESHOLD = 20;
const WALL_SNAP_THRESHOLD = 15;
const DROP_ANIMATION_MS = 150;

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

interface GuideLine {
  x1: number; y1: number; x2: number; y2: number;
  furnitureId: string;
}

interface SnapInfo {
  snapped: boolean;
  x: number; y: number;
  checkX: number; checkY: number;
}

const FurnitureBlock = memo(function FurnitureBlock({
  item,
  isBeingDragged,
  onDelete,
  onMouseDown,
}: {
  item: FurnitureItem;
  isBeingDragged: boolean;
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
        boxShadow: isBeingDragged
          ? '0 10px 24px rgba(0,0,0,0.35)'
          : '0 2px 4px rgba(0,0,0,0.2)',
        transform: `rotate(${item.rotation}deg) scale(${isBeingDragged ? 1.05 : 1})`,
        transformOrigin: 'center center',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.2s ease, opacity 0.15s ease',
        willChange: 'transform',
        userSelect: 'none',
        opacity: isBeingDragged ? 0.35 : 1,
        zIndex: isBeingDragged ? 2 : 1,
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

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const computeAlignmentGuides = (
  dragX: number,
  dragY: number,
  dragW: number,
  dragH: number,
  furniture: FurnitureItem[],
  excludeId: string | null
): GuideLine[] => {
  const guides: GuideLine[] = [];
  const dragLeft = dragX;
  const dragRight = dragX + dragW;
  const dragTop = dragY;
  const dragBottom = dragY + dragH;
  const dragCenterX = dragX + dragW / 2;
  const dragCenterY = dragY + dragH / 2;

  for (const item of furniture) {
    if (excludeId && item.id === excludeId) continue;
    const fLeft = item.x;
    const fRight = item.x + item.width;
    const fTop = item.y;
    const fBottom = item.y + item.height;
    const fCenterX = item.x + item.width / 2;
    const fCenterY = item.y + item.height / 2;

    const edges: { dist: number; type: string; gx1: number; gy1: number; gx2: number; gy2: number }[] = [];

    edges.push({ dist: Math.abs(dragLeft - fLeft), type: 'left-left', gx1: fLeft, gy1: Math.min(fTop, dragTop) - 5, gx2: fLeft, gy2: Math.max(fBottom, dragBottom) + 5 });
    edges.push({ dist: Math.abs(dragLeft - fRight), type: 'left-right', gx1: fRight, gy1: Math.min(fTop, dragTop) - 5, gx2: fRight, gy2: Math.max(fBottom, dragBottom) + 5 });
    edges.push({ dist: Math.abs(dragRight - fLeft), type: 'right-left', gx1: fLeft, gy1: Math.min(fTop, dragTop) - 5, gx2: fLeft, gy2: Math.max(fBottom, dragBottom) + 5 });
    edges.push({ dist: Math.abs(dragRight - fRight), type: 'right-right', gx1: fRight, gy1: Math.min(fTop, dragTop) - 5, gx2: fRight, gy2: Math.max(fBottom, dragBottom) + 5 });
    edges.push({ dist: Math.abs(dragTop - fTop), type: 'top-top', gx1: Math.min(fLeft, dragLeft) - 5, gy1: fTop, gx2: Math.max(fRight, dragRight) + 5, gy2: fTop });
    edges.push({ dist: Math.abs(dragTop - fBottom), type: 'top-bottom', gx1: Math.min(fLeft, dragLeft) - 5, gy1: fBottom, gx2: Math.max(fRight, dragRight) + 5, gy2: fBottom });
    edges.push({ dist: Math.abs(dragBottom - fTop), type: 'bottom-top', gx1: Math.min(fLeft, dragLeft) - 5, gy1: fTop, gx2: Math.max(fRight, dragRight) + 5, gy2: fTop });
    edges.push({ dist: Math.abs(dragBottom - fBottom), type: 'bottom-bottom', gx1: Math.min(fLeft, dragLeft) - 5, gy1: fBottom, gx2: Math.max(fRight, dragRight) + 5, gy2: fBottom });
    edges.push({ dist: Math.abs(dragCenterX - fCenterX), type: 'centerX', gx1: fCenterX, gy1: Math.min(fTop, dragTop) - 5, gx2: fCenterX, gy2: Math.max(fBottom, dragBottom) + 5 });
    edges.push({ dist: Math.abs(dragCenterY - fCenterY), type: 'centerY', gx1: Math.min(fLeft, dragLeft) - 5, gy1: fCenterY, gx2: Math.max(fRight, dragRight) + 5, gy2: fCenterY });

    for (const edge of edges) {
      if (edge.dist <= ALIGN_THRESHOLD) {
        guides.push({
          x1: edge.gx1,
          y1: edge.gy1,
          x2: edge.gx2,
          y2: edge.gy2,
          furnitureId: item.id,
        });
      }
    }
  }

  return guides;
};

const computeWallSnap = (
  x: number,
  y: number,
  w: number,
  h: number,
  layout: RoomLayout
): SnapInfo => {
  const leftWall = WALL_THICKNESS;
  const rightWall = layout.canvasWidth - WALL_THICKNESS;
  const topWall = WALL_THICKNESS;
  const bottomWall = layout.canvasHeight - WALL_THICKNESS;

  let snapped = false;
  let nx = x;
  let ny = y;
  let checkX = -1;
  let checkY = -1;

  if (x - leftWall <= WALL_SNAP_THRESHOLD && x - leftWall > -WALL_SNAP_THRESHOLD) {
    nx = leftWall;
    snapped = true;
    checkX = nx + 8;
    checkY = y + h / 2;
  } else if (rightWall - (x + w) <= WALL_SNAP_THRESHOLD && rightWall - (x + w) > -WALL_SNAP_THRESHOLD) {
    nx = rightWall - w;
    snapped = true;
    checkX = nx + w - 20;
    checkY = y + h / 2;
  }

  if (y - topWall <= WALL_SNAP_THRESHOLD && y - topWall > -WALL_SNAP_THRESHOLD) {
    ny = topWall;
    snapped = true;
    checkX = x + w / 2;
    checkY = ny + 8;
  } else if (bottomWall - (y + h) <= WALL_SNAP_THRESHOLD && bottomWall - (y + h) > -WALL_SNAP_THRESHOLD) {
    ny = bottomWall - h;
    snapped = true;
    checkX = x + w / 2;
    checkY = ny + h - 20;
  }

  return { snapped, x: nx, y: ny, checkX, checkY };
};

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
  const [originalPosition, setOriginalPosition] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [guides, setGuides] = useState<GuideLine[]>([]);
  const [wallSnap, setWallSnap] = useState<SnapInfo | null>(null);

  const [dropAnimState, setDropAnimState] = useState<{
    running: boolean;
    data: DragData | null;
    fromX: number; fromY: number;
    toX: number; toY: number;
    w: number; h: number;
    color: string;
    startTime: number;
  } | null>(null);
  const dropAnimRef = useRef<number | null>(null);

  const getDragDimensions = useCallback((): { w: number; h: number } | null => {
    if (!dragData) return null;
    if (dragData.type === 'furniture') {
      return { w: dragData.furniture.width, h: dragData.furniture.height };
    } else {
      const item = furniture.find(f => f.id === dragData.furnitureId);
      return item ? { w: item.width, h: item.height } : null;
    }
  }, [dragData, furniture]);

  const getDragColor = useCallback((): string => {
    if (!dragData) return '#8b7355';
    if (dragData.type === 'furniture') return dragData.furniture.color;
    const item = furniture.find(f => f.id === dragData.furnitureId);
    return item?.color ?? '#8b7355';
  }, [dragData, furniture]);

  const computeDragXY = useCallback((pos: { x: number; y: number }) => {
    if (!dragData) return null;
    const dims = getDragDimensions();
    if (!dims) return null;

    let baseX: number, baseY: number;
    if (dragData.type === 'furniture') {
      baseX = pos.x - dims.w / 2;
      baseY = pos.y - dims.h / 2;
    } else {
      baseX = pos.x - moveOffset.x;
      baseY = pos.y - moveOffset.y;
    }

    let x = snapToGrid(baseX);
    let y = snapToGrid(baseY);

    const snap = computeWallSnap(x, y, dims.w, dims.h, layout);
    if (snap.snapped) {
      x = snap.x;
      y = snap.y;
      setWallSnap(snap);
    } else {
      setWallSnap(null);
    }

    if (!isInRoomBounds(x, y, dims.w, dims.h, layout)) {
      const padding = WALL_THICKNESS;
      x = Math.max(padding, Math.min(x, layout.canvasWidth - padding - dims.w));
      y = Math.max(padding, Math.min(y, layout.canvasHeight - padding - dims.h));
    }

    const newGuides = computeAlignmentGuides(x, y, dims.w, dims.h, furniture,
      dragData.type === 'move' ? dragData.furnitureId : null);
    setGuides(newGuides);

    return { x, y, dims };
  }, [dragData, moveOffset, layout, furniture, getDragDimensions]);

  const handleDrop = useCallback(
    (data: DragData, position: { x: number; y: number }) => {
      const dims = data.type === 'furniture'
        ? { w: data.furniture.width, h: data.furniture.height }
        : (() => {
            const it = furniture.find(f => f.id === data.furnitureId);
            return it ? { w: it.width, h: it.height } : null;
          })();
      if (!dims) {
        setDragPosition(null);
        setDragData(null);
        setMovingFurnitureId(null);
        setOriginalPosition(null);
        setGuides([]);
        setWallSnap(null);
        return;
      }

      let fromX: number, fromY: number;
      if (data.type === 'furniture') {
        fromX = snapToGrid(position.x - dims.w / 2);
        fromY = snapToGrid(position.y - dims.h / 2);
      } else {
        fromX = snapToGrid(position.x - (data as Extract<DragData, { type: 'move' }>).offsetX);
        fromY = snapToGrid(position.y - (data as Extract<DragData, { type: 'move' }>).offsetY);
      }

      const snap = computeWallSnap(fromX, fromY, dims.w, dims.h, layout);
      let toX = snap.snapped ? snap.x : fromX;
      let toY = snap.snapped ? snap.y : fromY;

      if (!isInRoomBounds(toX, toY, dims.w, dims.h, layout)) {
        const padding = WALL_THICKNESS;
        toX = Math.max(padding, Math.min(toX, layout.canvasWidth - padding - dims.w));
        toY = Math.max(padding, Math.min(toY, layout.canvasHeight - padding - dims.h));
      }

      const color = data.type === 'furniture'
        ? data.furniture.color
        : (furniture.find(f => f.id === data.furnitureId)?.color ?? '#8b7355');

      setDragPosition(null);
      setGuides([]);
      setWallSnap(null);
      setDropAnimState({
        running: true,
        data,
        fromX, fromY,
        toX, toY,
        w: dims.w, h: dims.h,
        color,
        startTime: performance.now(),
      });

      const animate = (now: number) => {
        setDropAnimState(prev => {
          if (!prev) return null;
          const elapsed = now - prev.startTime;
          const progress = Math.min(1, elapsed / DROP_ANIMATION_MS);
          const eased = easeOutCubic(progress);
          if (progress < 1) {
            dropAnimRef.current = requestAnimationFrame(animate);
            return { ...prev };
          }
          dropAnimRef.current = null;
          const d = prev.data!;
          if (d.type === 'furniture') {
            if (isInRoomBounds(prev.toX, prev.toY, prev.w, prev.h, layout)) {
              const newFurniture: FurnitureItem = {
                id: uuidv4(),
                ...d.furniture,
                x: prev.toX,
                y: prev.toY,
              };
              onFurnitureAdd(newFurniture);
            }
          } else {
            if (isInRoomBounds(prev.toX, prev.toY, prev.w, prev.h, layout)) {
              onFurnitureMove(d.furnitureId, prev.toX, prev.toY);
            }
          }
          return null;
        });
      };
      dropAnimRef.current = requestAnimationFrame(animate);

      setDragData(null);
      setMovingFurnitureId(null);
      setOriginalPosition(null);
    },
    [layout, furniture, onFurnitureAdd, onFurnitureMove]
  );

  useEffect(() => {
    return () => {
      if (dropAnimRef.current) cancelAnimationFrame(dropAnimRef.current);
    };
  }, []);

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
      const data = customEvent.detail;
      setDragData(data);
      if (data.type === 'move') {
        const item = furniture.find(f => f.id === data.furnitureId);
        if (item) {
          setOriginalPosition({ x: item.x, y: item.y, w: item.width, h: item.height });
        }
      }
    };
    document.addEventListener('dnd:start', handleDndStart as EventListener);
    return () => {
      document.removeEventListener('dnd:start', handleDndStart as EventListener);
    };
  }, [furniture]);

  const handleFurnitureMouseDown = useCallback(
    (itemId: string, e: React.MouseEvent, offsetX: number, offsetY: number) => {
      e.preventDefault();
      e.stopPropagation();
      setMovingFurnitureId(itemId);
      setMoveOffset({ x: offsetX, y: offsetY });

      const item = furniture.find((f) => f.id === itemId);
      if (item) {
        setOriginalPosition({ x: item.x, y: item.y, w: item.width, h: item.height });
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

  const computedDrag = dragPosition && dragData ? computeDragXY(dragPosition) : null;

  const dropAnimProgress = dropAnimState ? easeOutCubic(
    Math.min(1, (performance.now() - dropAnimState.startTime) / DROP_ANIMATION_MS)
  ) : 0;

  const dropAnimX = dropAnimState
    ? dropAnimState.fromX + (dropAnimState.toX - dropAnimState.fromX) * dropAnimProgress
    : 0;
  const dropAnimY = dropAnimState
    ? dropAnimState.fromY + (dropAnimState.toY - dropAnimState.fromY) * dropAnimProgress
    : 0;

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
          {guides.map((g, i) => (
            <line
              key={`guide-${i}`}
              x1={g.x1}
              y1={g.y1}
              x2={g.x2}
              y2={g.y2}
              stroke="#2563eb"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              opacity="0.85"
            />
          ))}
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

        {originalPosition && (
          <div
            style={{
              position: 'absolute',
              left: originalPosition.x,
              top: originalPosition.y,
              width: originalPosition.w,
              height: originalPosition.h,
              border: '2px dashed #9ca3af',
              borderRadius: '2px',
              backgroundColor: 'rgba(156, 163, 175, 0.12)',
              pointerEvents: 'none',
              boxSizing: 'border-box',
            }}
          />
        )}

        {furniture.map((item) => (
          <FurnitureBlock
            key={item.id}
            item={item}
            isBeingDragged={movingFurnitureId === item.id}
            onDelete={() => onFurnitureDelete(item.id)}
            onMouseDown={(e, offsetX, offsetY) => handleFurnitureMouseDown(item.id, e, offsetX, offsetY)}
          />
        ))}

        {isDragOver && computedDrag && (
          <div
            style={{
              position: 'absolute',
              left: computedDrag.x,
              top: computedDrag.y,
              width: computedDrag.dims.w,
              height: computedDrag.dims.h,
              backgroundColor: getDragColor(),
              borderRadius: '2px',
              opacity: 0.55,
              pointerEvents: 'none',
              border: '2px dashed #8b5e3c',
              boxShadow: '0 12px 28px rgba(0,0,0,0.3)',
              transform: 'scale(1.03)',
              transformOrigin: 'center center',
              zIndex: 50,
            }}
          />
        )}

        {wallSnap && wallSnap.snapped && computedDrag && (
          <div
            style={{
              position: 'absolute',
              left: wallSnap.checkX - 10,
              top: wallSnap.checkY - 10,
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              color: 'white',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              boxShadow: '0 2px 6px rgba(34, 197, 94, 0.5)',
              zIndex: 100,
              animation: 'snapPulse 0.6s ease-in-out infinite',
            }}
          >
            ✓
          </div>
        )}

        {dropAnimState && (
          <div
            style={{
              position: 'absolute',
              left: dropAnimX,
              top: dropAnimY,
              width: dropAnimState.w,
              height: dropAnimState.h,
              backgroundColor: dropAnimState.color,
              borderRadius: '2px',
              opacity: 0.85,
              pointerEvents: 'none',
              boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
              zIndex: 60,
            }}
          />
        )}

        <style>{`
          @keyframes snapPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.15); opacity: 0.85; }
          }
        `}</style>
      </div>
    </div>
  );
};
