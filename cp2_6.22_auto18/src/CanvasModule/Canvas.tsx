import React, { useMemo } from 'react';
import { CanvasElementComponent } from './CanvasElement';
import { useCanvasInteraction } from './useCanvasInteraction';
import type { CanvasElement as CanvasElementType, ToolType, SnapLine } from '../types';

interface CanvasProps {
  elements: CanvasElementType[];
  setElements: React.Dispatch<React.SetStateAction<CanvasElementType[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  currentTool: ToolType;
  onHistoryPush: (elements: CanvasElementType[], action: string) => void;
  isTransitioning: boolean;
}

export const Canvas: React.FC<CanvasProps> = ({
  elements,
  setElements,
  selectedId,
  setSelectedId,
  currentTool,
  onHistoryPush,
  isTransitioning,
}) => {
  const {
    canvasRef,
    viewportX,
    viewportY,
    scale,
    snapLines,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    deleteElement,
    updateElement,
    currentPathPoints,
    tempRectangle,
    smoothPath,
  } = useCanvasInteraction({
    elements,
    setElements,
    selectedId,
    setSelectedId,
    currentTool,
    onHistoryPush,
  });

  const gridSize = 40;

  const gridBackground = useMemo(() => {
    return `
      linear-gradient(to right, #E2E8F0 1px, transparent 1px),
      linear-gradient(to bottom, #E2E8F0 1px, transparent 1px)
    `;
  }, []);

  const renderSnapLines = () => {
    return snapLines.map((line: SnapLine, index: number) => {
      if (line.type === 'vertical') {
        return (
          <div
            key={`v-${index}`}
            style={{
              position: 'absolute',
              left: line.position,
              top: -10000,
              width: '1px',
              height: 20000,
              borderLeft: '1px dashed #10B981',
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          />
        );
      } else {
        return (
          <div
            key={`h-${index}`}
            style={{
              position: 'absolute',
              left: -10000,
              top: line.position,
              width: 20000,
              height: '1px',
              borderTop: '1px dashed #10B981',
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          />
        );
      }
    });
  };

  const renderCurrentPath = () => {
    if (currentPathPoints.length < 2) return null;
    const pathD = smoothPath(currentPathPoints);
    return (
      <svg
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          pointerEvents: 'none',
          zIndex: 10000,
          overflow: 'visible',
        }}
      >
        <path
          d={pathD}
          fill="none"
          stroke="#6366F1"
          strokeWidth={3}
          strokeOpacity={0.85}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const renderTempRectangle = () => {
    if (!tempRectangle || tempRectangle.width <= 0 || tempRectangle.height <= 0) return null;
    return (
      <div
        style={{
          position: 'absolute',
          left: tempRectangle.x,
          top: tempRectangle.y,
          width: tempRectangle.width,
          height: tempRectangle.height,
          backgroundColor: 'rgba(219, 234, 254, 0.5)',
          border: '1px dashed #3B82F6',
          pointerEvents: 'none',
          zIndex: 10000,
        }}
      />
    );
  };

  const sortedElements = useMemo(() => {
    return [...elements].sort((a, b) => a.zIndex - b.zIndex);
  }, [elements]);

  return (
    <div
      ref={canvasRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#F8FAFC',
        backgroundImage: gridBackground,
        backgroundSize: `${gridSize * scale}px ${gridSize * scale}px`,
        backgroundPosition: `${viewportX}px ${viewportY}px`,
        overflow: 'hidden',
        cursor:
          currentTool === 'select'
            ? 'grab'
            : currentTool === 'path'
            ? 'crosshair'
            : currentTool === 'rectangle'
            ? 'crosshair'
            : 'pointer',
        userSelect: 'none',
        opacity: isTransitioning ? 0 : 1,
        transition: 'opacity 0.2s ease',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        style={{
          position: 'absolute',
          left: viewportX,
          top: viewportY,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          width: '100%',
          height: '100%',
        }}
      >
        {sortedElements.map((element) => (
          <CanvasElementComponent
            key={element.id}
            element={element}
            isSelected={selectedId === element.id}
            onDelete={deleteElement}
            onUpdate={updateElement}
            smoothPath={smoothPath}
          />
        ))}
        {renderSnapLines()}
        {renderCurrentPath()}
        {renderTempRectangle()}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#64748B',
          border: '1px solid #E2E8F0',
          fontFamily: 'monospace',
        }}
      >
        缩放: {Math.round(scale * 100)}%
      </div>
    </div>
  );
};
