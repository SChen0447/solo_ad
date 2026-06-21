import React, { useCallback, useEffect, useRef } from 'react';
import { Panel, Size } from '../../types';

interface PanelComponentProps {
  panel: Panel;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDoubleClick: (id: string) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  onSizeChange: (id: string, width: number, height: number) => void;
  canvasSize: Size;
  showWarning: boolean;
  children?: React.ReactNode;
}

const PanelComponent: React.FC<PanelComponentProps> = ({
  panel,
  isSelected,
  onSelect,
  onDoubleClick,
  onPositionChange,
  onSizeChange,
  canvasSize,
  showWarning,
  children
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
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
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  }>({
    isResizing: false,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0
  });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.resize === 'true') return;
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

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(panel.id);
    resizeStateRef.current = {
      isResizing: true,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: panel.width,
      startHeight: panel.height
    };
  }, [panel.id, panel.width, panel.height, onSelect]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragStateRef.current.isDragging) {
        const dx = e.clientX - dragStateRef.current.startX;
        const dy = e.clientY - dragStateRef.current.startY;
        const newX = dragStateRef.current.panelStartX + dx;
        const newY = dragStateRef.current.panelStartY + dy;
        const clampedX = Math.max(40, Math.min(newX, canvasSize.width - panel.width - 40));
        const clampedY = Math.max(40, Math.min(newY, canvasSize.height - panel.height - 40));
        onPositionChange(panel.id, clampedX, clampedY);
      }

      if (resizeStateRef.current.isResizing) {
        const dx = e.clientX - resizeStateRef.current.startX;
        const dy = e.clientY - resizeStateRef.current.startY;
        const newWidth = Math.max(60, resizeStateRef.current.startWidth + dx);
        const newHeight = Math.max(60, resizeStateRef.current.startHeight + dy);
        onSizeChange(panel.id, newWidth, newHeight);
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
  }, [panel.id, panel.width, panel.height, canvasSize, onPositionChange, onSizeChange]);

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
        willChange: 'transform'
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
          pointerEvents: 'none'
        }}
      >
        #{panel.order + 1}
      </div>

      {children}

      <div
        data-resize="true"
        onMouseDown={handleResizeStart}
        title="拖动调整大小"
        style={{
          position: 'absolute',
          right: -1,
          bottom: -1,
          width: 16,
          height: 16,
          cursor: 'nwse-resize',
          background: isSelected ? '#1976D2' : '#CCC',
          borderRadius: '0 0 6px 0',
          opacity: isSelected ? 1 : 0.6,
          borderTop: `1px solid ${panel.borderColor}`,
          borderLeft: `1px solid ${panel.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: 8,
            height: 2,
            backgroundColor: '#FFF',
            boxShadow: '0 3px 0 #FFF',
            borderRadius: 1,
            transform: 'translate(-1px, -2px) rotate(-45deg)'
          }}
        />
      </div>
    </div>
  );
};

export default React.memo(PanelComponent);
