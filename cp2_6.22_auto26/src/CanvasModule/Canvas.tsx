import React, { useRef, useCallback, useMemo } from 'react';
import { useWhiteboardStore } from '@/store';
import { useCanvasInteraction } from '@/CanvasModule/useCanvasInteraction';
import CanvasElementComponent from '@/CanvasModule/CanvasElement';
import type { CanvasElement } from '@/types';

const GRID_SIZE = 40;
const SNAP_THRESHOLD = 15;

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const cp1x = points[i].x;
    const cp1y = points[i].y;
    const cp2x = (points[i].x + points[i + 1].x) / 2;
    const cp2y = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${cp1x} ${cp1y} ${cp2x} ${cp2y}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function computeSnapLines(
  elements: CanvasElement[],
  selectedId: string | null
): { x: number; y: number }[] {
  if (!selectedId) return [];
  const selected = elements.find(e => e.id === selectedId);
  if (!selected) return [];

  const lines: { x: number; y: number }[] = [];
  const sCx = selected.x + selected.width / 2;
  const sCy = selected.y + selected.height / 2;

  for (const el of elements) {
    if (el.id === selectedId) continue;
    if (el.type === 'path') continue;

    const eCx = el.x + el.width / 2;
    const eCy = el.y + el.height / 2;

    if (Math.abs(sCx - eCx) < SNAP_THRESHOLD) {
      lines.push({ x: eCx, y: 0 });
    }
    if (Math.abs(sCy - eCy) < SNAP_THRESHOLD) {
      lines.push({ x: 0, y: eCy });
    }
    if (Math.abs(selected.x - el.x) < SNAP_THRESHOLD) {
      lines.push({ x: el.x, y: 0 });
    }
    if (Math.abs(selected.y - el.y) < SNAP_THRESHOLD) {
      lines.push({ x: 0, y: el.y });
    }
    if (Math.abs(selected.x + selected.width - (el.x + el.width)) < SNAP_THRESHOLD) {
      lines.push({ x: el.x + el.width, y: 0 });
    }
    if (Math.abs(selected.y + selected.height - (el.y + el.height)) < SNAP_THRESHOLD) {
      lines.push({ x: 0, y: el.y + el.height });
    }
  }
  return lines;
}

const Canvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const elements = useWhiteboardStore(s => s.elements);
  const offset = useWhiteboardStore(s => s.offset);
  const zoom = useWhiteboardStore(s => s.zoom);
  const selectedId = useWhiteboardStore(s => s.selectedId);
  const tool = useWhiteboardStore(s => s.tool);
  const drawing = useWhiteboardStore(s => s.drawing);
  const deleteElement = useWhiteboardStore(s => s.deleteElement);
  const updateElement = useWhiteboardStore(s => s.updateElement);
  const setSelectedId = useWhiteboardStore(s => s.setSelectedId);

  const { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, drawingPoints } =
    useCanvasInteraction(containerRef);

  const snapLines = useMemo(() => computeSnapLines(elements, selectedId), [elements, selectedId]);

  const handleSelect = useCallback(
    (id: string) => setSelectedId(id),
    [setSelectedId]
  );

  const handleDelete = useCallback(
    (id: string) => deleteElement(id),
    [deleteElement]
  );

  const handleTextChange = useCallback(
    (id: string, text: string) => updateElement(id, { text }),
    [updateElement]
  );

  const cursorStyle = (() => {
    if (tool === 'path') return 'crosshair';
    if (tool === 'sticky' || tool === 'rectangle') return 'copy';
    return 'default';
  })();

  const gridPatternId = 'gridPattern';
  const gridPatternSize = GRID_SIZE;

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        background: '#F8FAFC',
        cursor: cursorStyle,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      <svg
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      >
        <defs>
          <pattern
            id={gridPatternId}
            width={gridPatternSize}
            height={gridPatternSize}
            patternUnits="userSpaceOnUse"
            x={offset.x % (gridPatternSize * zoom)}
            y={offset.y % (gridPatternSize * zoom)}
            width={gridPatternSize * zoom}
            height={gridPatternSize * zoom}
          >
            <path
              d={`M ${gridPatternSize * zoom} 0 L 0 0 0 ${gridPatternSize * zoom}`}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth={1}
            />
          </pattern>
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx={2} dy={2} stdDeviation={4} floodColor="#000000" floodOpacity={0.2} />
          </filter>
        </defs>

        <rect width="100%" height="100%" fill={`url(#${gridPatternId})`} />

        <g transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`}>
          {elements.map(el => (
            <CanvasElementComponent
              key={el.id}
              element={el}
              isSelected={selectedId === el.id}
              onSelect={handleSelect}
              onDelete={handleDelete}
              onTextChange={handleTextChange}
              zoom={zoom}
            />
          ))}

          {drawing && drawingPoints.length >= 2 && (
            <path
              d={buildSmoothPath(drawingPoints)}
              fill="none"
              stroke="#6366F1"
              strokeWidth={3}
              opacity={0.85}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {snapLines.map((line, i) => {
            if (line.x !== 0) {
              return (
                <line
                  key={`snap-${i}`}
                  x1={line.x}
                  y1={-10000}
                  x2={line.x}
                  y2={10000}
                  stroke="#10B981"
                  strokeWidth={1 / zoom}
                  strokeDasharray="4 4"
                  opacity={0.8}
                />
              );
            }
            if (line.y !== 0) {
              return (
                <line
                  key={`snap-${i}`}
                  x1={-10000}
                  y1={line.y}
                  x2={10000}
                  y2={line.y}
                  stroke="#10B981"
                  strokeWidth={1 / zoom}
                  strokeDasharray="4 4"
                  opacity={0.8}
                />
              );
            }
            return null;
          })}
        </g>

        <text
          x={12}
          y={20}
          fontSize={11}
          fill="#94A3B8"
          fontFamily="monospace"
        >
          {Math.round(zoom * 100)}%
        </text>
      </svg>
    </div>
  );
};

export default Canvas;
