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
  x: number;
  y: number;
  width: number;
  height: number;
  isVertical: boolean;
  distance: number;
}

interface SnapInfo {
  snapped: boolean;
  x: number; y: number;
  checkX: number; checkY: number;
}

const FurnitureBlock = memo(function FurnitureBlock({
  item,
  isAnimating,
  onDelete,
  onMouseDown,
}: {
  item: FurnitureItem;
  isAnimating: boolean;
  onDelete: () => void;
  onMouseDown: (e: React.MouseEvent, el: HTMLElement, offsetX: number, offsetY: number) => void;
}) {
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAnimating) return;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    onMouseDown(e, el, offsetX, offsetY);
  };

  return (
    <div
      className="furniture-item"
      data-furniture-id={item.id}
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        backgroundColor: item.color,
        borderRadius: '2px',
        cursor: isAnimating ? 'default' : 'grab',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transform: `rotate(${item.rotation}deg)`,
        transformOrigin: 'center center',
        transition: 'left 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.15s ease, filter 0.2s ease',
        willChange: 'transform, left, top',
        userSelect: 'none',
        zIndex: 1,
        pointerEvents: isAnimating ? 'none' : 'auto',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={(e) => {
        if (isAnimating) return;
        const el = e.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const touch = e.touches[0];
        const offsetX = touch.clientX - rect.left;
        const offsetY = touch.clientY - rect.top;
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true,
        });
        onMouseDown(mouseEvent as unknown as React.MouseEvent, el, offsetX, offsetY);
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

const applyFurnitureDragStyles = (el: HTMLElement) => {
  el.dataset.origTransform = el.style.transform;
  el.dataset.origBoxShadow = el.style.boxShadow;
  el.dataset.origZIndex = el.style.zIndex;
  el.dataset.origOpacity = el.style.opacity;
  el.style.transform = `${el.dataset.origTransform || ''} scale(1.05)`;
  el.style.boxShadow = '0 12px 28px rgba(0,0,0,0.35)';
  el.style.zIndex = '50';
  el.style.opacity = '0.85';
  el.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease';
};

const restoreFurnitureDragStyles = (el: HTMLElement) => {
  el.style.transform = el.dataset.origTransform || '';
  el.style.boxShadow = el.dataset.origBoxShadow || '';
  el.style.zIndex = el.dataset.origZIndex || '';
  el.style.opacity = el.dataset.origOpacity || '';
  el.style.transition = '';
  delete el.dataset.origTransform;
  delete el.dataset.origBoxShadow;
  delete el.dataset.origZIndex;
  delete el.dataset.origOpacity;
};

const computeAlignmentGuides = (
  dragX: number,
  dragY: number,
  dragW: number,
  dragH: number,
  furniture: FurnitureItem[],
  excludeId: string | null
): GuideLine | null => {
  let closest: GuideLine | null = null;
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

    const candidates: { dist: number; isVertical: boolean; pos: number; start: number; end: number }[] = [];

    candidates.push({ dist: Math.abs(dragLeft - fLeft), isVertical: true, pos: fLeft, start: Math.min(fTop, dragTop) - 5, end: Math.max(fBottom, dragBottom) + 5 });
    candidates.push({ dist: Math.abs(dragLeft - fRight), isVertical: true, pos: fRight, start: Math.min(fTop, dragTop) - 5, end: Math.max(fBottom, dragBottom) + 5 });
    candidates.push({ dist: Math.abs(dragRight - fLeft), isVertical: true, pos: fLeft, start: Math.min(fTop, dragTop) - 5, end: Math.max(fBottom, dragBottom) + 5 });
    candidates.push({ dist: Math.abs(dragRight - fRight), isVertical: true, pos: fRight, start: Math.min(fTop, dragTop) - 5, end: Math.max(fBottom, dragBottom) + 5 });
    candidates.push({ dist: Math.abs(dragTop - fTop), isVertical: false, pos: fTop, start: Math.min(fLeft, dragLeft) - 5, end: Math.max(fRight, dragRight) + 5 });
    candidates.push({ dist: Math.abs(dragTop - fBottom), isVertical: false, pos: fBottom, start: Math.min(fLeft, dragLeft) - 5, end: Math.max(fRight, dragRight) + 5 });
    candidates.push({ dist: Math.abs(dragBottom - fTop), isVertical: false, pos: fTop, start: Math.min(fLeft, dragLeft) - 5, end: Math.max(fRight, dragRight) + 5 });
    candidates.push({ dist: Math.abs(dragBottom - fBottom), isVertical: false, pos: fBottom, start: Math.min(fLeft, dragLeft) - 5, end: Math.max(fRight, dragRight) + 5 });
    candidates.push({ dist: Math.abs(dragCenterX - fCenterX), isVertical: true, pos: fCenterX, start: Math.min(fTop, dragTop) - 5, end: Math.max(fBottom, dragBottom) + 5 });
    candidates.push({ dist: Math.abs(dragCenterY - fCenterY), isVertical: false, pos: fCenterY, start: Math.min(fLeft, dragLeft) - 5, end: Math.max(fRight, dragRight) + 5 });

    for (const c of candidates) {
      if (c.dist <= ALIGN_THRESHOLD) {
        if (!closest || c.dist < closest.distance) {
          if (c.isVertical) {
            closest = {
              x: c.pos,
              y: c.start,
              width: 1,
              height: c.end - c.start,
              isVertical: true,
              distance: c.dist,
            };
          } else {
            closest = {
              x: c.start,
              y: c.pos,
              width: c.end - c.start,
              height: 1,
              isVertical: false,
              distance: c.dist,
            };
          }
        }
      }
    }
  }

  return closest;
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
  const [guides, setGuides] = useState<GuideLine | null>(null);
  const [wallSnap, setWallSnap] = useState<SnapInfo | null>(null);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [snappedIds, setSnappedIds] = useState<Set<string>>(new Set());

  const draggingElementRef = useRef<HTMLElement | null>(null);
  const dropGhostRef = useRef<HTMLDivElement>(null);
  const dropAnimTimerRef = useRef<number | null>(null);
  const dropAnimRef = useRef<number | null>(null);

  const isSnappedToWall = useCallback((x: number, y: number, w: number, h: number): boolean => {
    const leftWall = WALL_THICKNESS;
    const rightWall = layout.canvasWidth - WALL_THICKNESS;
    const topWall = WALL_THICKNESS;
    const bottomWall = layout.canvasHeight - WALL_THICKNESS;
    return (
      Math.abs(x - leftWall) < 1 ||
      Math.abs(rightWall - (x + w)) < 1 ||
      Math.abs(y - topWall) < 1 ||
      Math.abs(bottomWall - (y + h)) < 1
    );
  }, [layout]);

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

    const newGuide = computeAlignmentGuides(x, y, dims.w, dims.h, furniture,
      dragData.type === 'move' ? dragData.furnitureId : null);
    setGuides(newGuide);

    return { x, y, dims };
  }, [dragData, moveOffset, layout, furniture, getDragDimensions]);

  const handleDrop = useCallback(
    (data: DragData, position: { x: number; y: number }) => {
      if (draggingElementRef.current) {
        restoreFurnitureDragStyles(draggingElementRef.current);
        draggingElementRef.current = null;
      }

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
        setGuides(null);
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

      setDragPosition(null);
      setGuides(null);
      setWallSnap(null);

      if (data.type === 'move') {
        const furnitureId = data.furnitureId;
        setAnimatingIds(prev => {
          const next = new Set(prev);
          next.add(furnitureId);
          return next;
        });

        const el = canvasRef.current?.querySelector(`[data-furniture-id="${furnitureId}"]`) as HTMLElement | null;
        if (el) {
          el.style.transition = 'none';
          el.style.left = `${fromX}px`;
          el.style.top = `${fromY}px`;
          void el.offsetWidth;
          el.style.transition = '';
        }

        onFurnitureMove(furnitureId, toX, toY);

        if (dropAnimTimerRef.current) {
          window.clearTimeout(dropAnimTimerRef.current);
        }
        dropAnimTimerRef.current = window.setTimeout(() => {
          setAnimatingIds(prev => {
            const next = new Set(prev);
            next.delete(furnitureId);
            return next;
          });
          dropAnimTimerRef.current = null;
        }, DROP_ANIMATION_MS);
      } else {
        const color = data.furniture.color;
        const ghost = dropGhostRef.current;
        if (ghost) {
          ghost.style.display = 'block';
          ghost.style.left = `${fromX}px`;
          ghost.style.top = `${fromY}px`;
          ghost.style.width = `${dims.w}px`;
          ghost.style.height = `${dims.h}px`;
          ghost.style.backgroundColor = color;
          ghost.style.transition = 'none';
          void ghost.offsetWidth;
          ghost.style.transition = 'left 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          requestAnimationFrame(() => {
            ghost.style.left = `${toX}px`;
            ghost.style.top = `${toY}px`;
          });
        }

        if (dropAnimTimerRef.current) {
          window.clearTimeout(dropAnimTimerRef.current);
        }
        dropAnimTimerRef.current = window.setTimeout(() => {
          if (ghost) {
            ghost.style.display = 'none';
          }
          if (isInRoomBounds(toX, toY, dims.w, dims.h, layout)) {
            const newFurniture: FurnitureItem = {
              id: uuidv4(),
              ...data.furniture,
              x: toX,
              y: toY,
            };
            onFurnitureAdd(newFurniture);
          }
          dropAnimTimerRef.current = null;
        }, DROP_ANIMATION_MS);
      }

      setDragData(null);
      setMovingFurnitureId(null);
      setOriginalPosition(null);
    },
    [layout, furniture, onFurnitureAdd, onFurnitureMove]
  );

  useEffect(() => {
    return () => {
      if (dropAnimTimerRef.current) {
        window.clearTimeout(dropAnimTimerRef.current);
      }
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
    (itemId: string, e: React.MouseEvent, el: HTMLElement, offsetX: number, offsetY: number) => {
      if (animatingIds.has(itemId)) return;
      e.preventDefault();
      e.stopPropagation();

      applyFurnitureDragStyles(el);
      draggingElementRef.current = el;

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
        el.dispatchEvent(event);
      }
    },
    [furniture, animatingIds]
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

        {guides && (
          <div
            style={{
              position: 'absolute',
              left: guides.x,
              top: guides.y,
              width: guides.width,
              height: guides.height,
              backgroundColor: '#8b5e3c',
              pointerEvents: 'none',
              zIndex: 20,
            }}
          />
        )}

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
            isAnimating={animatingIds.has(item.id)}
            onDelete={() => onFurnitureDelete(item.id)}
            onMouseDown={(e, el, ox, oy) => handleFurnitureMouseDown(item.id, e, el, ox, oy)}
          />
        ))}

        {furniture.filter(item =>
          item.id !== movingFurnitureId && isSnappedToWall(item.x, item.y, item.width, item.height)
        ).map((item) => (
          <div
            key={`snap-${item.id}`}
            style={{
              position: 'absolute',
              left: item.x + item.width / 2 - 8,
              top: item.y + item.height / 2 - 8,
              width: '16px',
              height: '16px',
              fontSize: '16px',
              fontWeight: 700,
              color: '#4caf50',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 5,
              lineHeight: 1,
              textShadow: '0 0 4px rgba(255,255,255,0.8)',
            }}
          >
            ✓
          </div>
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
              left: computedDrag.x + computedDrag.dims.w / 2 - 8,
              top: computedDrag.y + computedDrag.dims.h / 2 - 8,
              width: '16px',
              height: '16px',
              fontSize: '16px',
              fontWeight: 700,
              color: '#4caf50',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 100,
              lineHeight: 1,
              textShadow: '0 0 4px rgba(255,255,255,0.8)',
            }}
          >
            ✓
          </div>
        )}

        <div
          ref={dropGhostRef}
          style={{
            position: 'absolute',
            display: 'none',
            borderRadius: '2px',
            opacity: 0.85,
            pointerEvents: 'none',
            boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
            zIndex: 60,
          }}
        />

        <style>{`
        `}</style>
      </div>
    </div>
  );
};
