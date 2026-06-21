import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Panel, Size, GRID_SIZE } from '../../types';

type ResizeDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface PanelComponentProps {
  panel: Panel;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDoubleClick: (id: string) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  onSizeChange: (id: string, width: number, height: number) => void;
  onPositionAndSizeChange: (id: string, x: number, y: number, width: number, height: number) => void;
  canvasSize: Size;
  showWarning: boolean;
  children?: React.ReactNode;
}

const MIN_WIDTH = 100;
const MIN_HEIGHT = 80;
const HANDLE_SIZE = 8;

const handleCursors: Record<ResizeDirection, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize'
};

const PanelComponent: React.FC<PanelComponentProps> = ({
  panel,
  isSelected,
  onSelect,
  onDoubleClick,
  onPositionChange,
  onSizeChange,
  onPositionAndSizeChange,
  canvasSize,
  showWarning,
  children
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [hoveredHandle, setHoveredHandle] = useState<ResizeDirection | null>(null);

  const dragStateRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    panelStartX: number;
    panelStartY: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    panelStartX: 0,
    panelStartY: 0
  });

  const resizeStateRef = useRef<{
    isResizing: boolean;
    direction: ResizeDirection;
    startX: number;
    startY: number;
    startPanelX: number;
    startPanelY: number;
    startWidth: number;
    startHeight: number;
  }>({
    isResizing: false,
    direction: 'se',
    startX: 0,
    startY: 0,
    startPanelX: 0,
    startPanelY: 0,
    startWidth: 0,
    startHeight: 0
  });

  const snapToGrid = useCallback((value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.handle) return;
    e.stopPropagation();
    onSelect(panel.id);
    dragStateRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      panelStartX: panel.x,
      panelStartY: panel.y
    };
  }, [panel.id, panel.x, panel.y, onSelect]);

  const handleResizeStart = useCallback((e: React.MouseEvent, direction: ResizeDirection) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(panel.id);
    resizeStateRef.current = {
      isResizing: true,
      direction,
      startX: e.clientX,
      startY: e.clientY,
      startPanelX: panel.x,
      startPanelY: panel.y,
      startWidth: panel.width,
      startHeight: panel.height
    };
  }, [panel.id, panel.x, panel.y, panel.width, panel.height, onSelect]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragStateRef.current.isDragging) {
        const dx = e.clientX - dragStateRef.current.startX;
        const dy = e.clientY - dragStateRef.current.startY;
        let newX = dragStateRef.current.panelStartX + dx;
        let newY = dragStateRef.current.panelStartY + dy;

        newX = snapToGrid(newX);
        newY = snapToGrid(newY);

        const clampedX = Math.max(40, Math.min(newX, canvasSize.width - panel.width - 40));
        const clampedY = Math.max(40, Math.min(newY, canvasSize.height - panel.height - 40));
        onPositionChange(panel.id, clampedX, clampedY);
      }

      if (resizeStateRef.current.isResizing) {
        const { direction, startX, startY, startPanelX, startPanelY, startWidth, startHeight } = resizeStateRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newX = startPanelX;
        let newY = startPanelY;
        let newWidth = startWidth;
        let newHeight = startHeight;

        if (direction.includes('e')) {
          newWidth = startWidth + dx;
        }
        if (direction.includes('w')) {
          const snappedDx = snapToGrid(dx);
          const potentialWidth = startWidth - snappedDx;
          if (potentialWidth >= MIN_WIDTH) {
            newWidth = potentialWidth;
            newX = startPanelX + snappedDx;
          } else {
            newWidth = MIN_WIDTH;
            newX = startPanelX + startWidth - MIN_WIDTH;
          }
        }
        if (direction.includes('s')) {
          newHeight = startHeight + dy;
        }
        if (direction.includes('n')) {
          const snappedDy = snapToGrid(dy);
          const potentialHeight = startHeight - snappedDy;
          if (potentialHeight >= MIN_HEIGHT) {
            newHeight = potentialHeight;
            newY = startPanelY + snappedDy;
          } else {
            newHeight = MIN_HEIGHT;
            newY = startPanelY + startHeight - MIN_HEIGHT;
          }
        }

        if (direction.includes('e')) {
          newWidth = Math.max(MIN_WIDTH, snapToGrid(newWidth));
        }
        if (direction.includes('s')) {
          newHeight = Math.max(MIN_HEIGHT, snapToGrid(newHeight));
        }

        const maxWidth = canvasSize.width - newX - 40;
        const maxHeight = canvasSize.height - newY - 40;
        newWidth = Math.min(newWidth, Math.max(MIN_WIDTH, maxWidth));
        newHeight = Math.min(newHeight, Math.max(MIN_HEIGHT, maxHeight));
        newX = Math.max(40, newX);
        newY = Math.max(40, newY);

        const posChanged = newX !== startPanelX || newY !== startPanelY;
        const sizeChanged = newWidth !== startWidth || newHeight !== startHeight;

        if (posChanged && sizeChanged) {
          onPositionAndSizeChange(panel.id, newX, newY, newWidth, newHeight);
        } else if (posChanged) {
          onPositionChange(panel.id, newX, newY);
        } else if (sizeChanged) {
          onSizeChange(panel.id, newWidth, newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      if (dragStateRef.current.isDragging) {
        dragStateRef.current.isDragging = false;
      }
      if (resizeStateRef.current.isResizing) {
        resizeStateRef.current.isResizing = false;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [panel.id, panel.width, panel.height, canvasSize, onPositionChange, onSizeChange, onPositionAndSizeChange, snapToGrid]);

  const renderHandle = (direction: ResizeDirection, top: string | number, left: string | number, transform: string) => {
    const isHovered = hoveredHandle === direction;

    return (
      <div
        data-handle={direction}
        onMouseDown={(e) => handleResizeStart(e, direction)}
        onMouseEnter={() => setHoveredHandle(direction)}
        onMouseLeave={() => setHoveredHandle(null)}
        title={`${direction} 方向调整大小`}
        style={{
          position: 'absolute',
          top,
          left,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          borderRadius: '50%',
          backgroundColor: isHovered ? '#1976D2' : 'rgba(25, 118, 210, 0.4)',
          border: '1.5px solid #FFFFFF',
          boxShadow: isHovered ? '0 0 4px rgba(25, 118, 210, 0.6)' : 'none',
          cursor: handleCursors[direction],
          transform: `translate(-50%, -50%) ${transform}`,
          transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
          zIndex: 10,
          opacity: isSelected ? 1 : 0,
          pointerEvents: isSelected ? 'auto' : 'none'
        }}
      />
    );
  };

  return (
    <div
      ref={panelRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(panel.id);
      }}
      style={{
        position: 'absolute',
        left: panel.x,
        top: panel.y,
        width: panel.width,
        height: panel.height,
        backgroundColor: panel.backgroundColor,
        border: `${panel.borderWidth}px solid ${showWarning ? '#FF1744' : panel.borderColor}`,
        borderRadius: 6,
        cursor: 'move',
        boxShadow: isSelected ? '0 0 0 3px rgba(25, 118, 210, 0.3)' : 'none',
        transition: 'box-shadow 0.1s ease',
        overflow: 'visible',
        userSelect: 'none',
        willChange: 'left, top, width, height'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 6,
          fontSize: 11,
          color: '#999',
          fontWeight: 600,
          pointerEvents: 'none',
          zIndex: 1
        }}
      >
        #{panel.order + 1}
      </div>

      {children}

      {renderHandle('nw', 0, 0, '')}
      {renderHandle('n', 0, '50%', '')}
      {renderHandle('ne', 0, '100%', '')}
      {renderHandle('e', '50%', '100%', '')}
      {renderHandle('se', '100%', '100%', '')}
      {renderHandle('s', '100%', '50%', '')}
      {renderHandle('sw', '100%', 0, '')}
      {renderHandle('w', '50%', 0, '')}
    </div>
  );
};

export default React.memo(PanelComponent);
