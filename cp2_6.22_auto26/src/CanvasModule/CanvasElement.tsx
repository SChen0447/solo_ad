import React, { useCallback, useRef, useEffect, useState } from 'react';
import type { CanvasElement } from '@/types';

interface CanvasElementProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
  zoom: number;
}

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

interface DeleteButtonProps {
  cx: number;
  cy: number;
  r: number;
  visible: boolean;
  onClick: (e: React.MouseEvent) => void;
}

const DeleteButton: React.FC<DeleteButtonProps> = ({ cx, cy, r, visible, onClick }) => {
  const [displayOpacity, setDisplayOpacity] = useState(0);
  const fadeRef = useRef<number>(0);

  useEffect(() => {
    if (fadeRef.current) {
      cancelAnimationFrame(fadeRef.current);
    }
    const start = performance.now();
    const startOpacity = displayOpacity;
    const targetOpacity = visible ? 1 : 0;
    const duration = 200;

    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayOpacity(startOpacity + (targetOpacity - startOpacity) * eased);
      if (t < 1) {
        fadeRef.current = requestAnimationFrame(step);
      }
    };

    fadeRef.current = requestAnimationFrame(step);

    return () => {
      if (fadeRef.current) {
        cancelAnimationFrame(fadeRef.current);
      }
    };
  }, [visible]);

  if (displayOpacity <= 0 && !visible) {
    return null;
  }

  return (
    <g
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      opacity={displayOpacity}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="#EF4444"
      />
      <line
        x1={cx - r * 0.45}
        y1={cy - r * 0.45}
        x2={cx + r * 0.45}
        y2={cy + r * 0.45}
        stroke="white"
        strokeWidth={r * 0.33}
        strokeLinecap="round"
      />
      <line
        x1={cx + r * 0.45}
        y1={cy - r * 0.45}
        x2={cx - r * 0.45}
        y2={cy + r * 0.45}
        stroke="white"
        strokeWidth={r * 0.33}
        strokeLinecap="round"
      />
    </g>
  );
};

const CanvasElementComponent: React.FC<CanvasElementProps> = ({
  element,
  isSelected,
  onSelect,
  onDelete,
  onTextChange,
  zoom,
}) => {
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [animScale, setAnimScale] = useState(1);
  const [animOpacity, setAnimOpacity] = useState(1);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const delAnimRef = useRef<number>(0);
  const hoverTimeoutRef = useRef<number>(0);

  useEffect(() => {
    if (editing && textRef.current) {
      textRef.current.focus();
      textRef.current.select();
    }
  }, [editing]);

  const triggerDeleteAnimation = useCallback(() => {
    if (deleting) return;
    setDeleting(true);
    setHovered(false);

    if (delAnimRef.current) {
      cancelAnimationFrame(delAnimRef.current);
    }

    const start = performance.now();
    const duration = 150;

    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimScale(1 - 0.5 * eased);
      setAnimOpacity(1 - eased);
      if (t < 1) {
        delAnimRef.current = requestAnimationFrame(step);
      } else {
        onDelete(element.id);
      }
    };

    delAnimRef.current = requestAnimationFrame(step);
  }, [deleting, element.id, onDelete]);

  const handleEnterHitArea = useCallback(() => {
    if (deleting) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = 0;
    }
    setHovered(true);
  }, [deleting]);

  const handleLeaveHitArea = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      setHovered(false);
    }, 50);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (deleting) return;
      if (editing) return;
      e.stopPropagation();
      onSelect(element.id);
    },
    [deleting, editing, element.id, onSelect]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (deleting) return;
      e.stopPropagation();
      if (element.type === 'sticky') {
        setEditing(true);
      }
    },
    [deleting, element.type]
  );

  const handleTextBlur = useCallback(() => {
    setEditing(false);
    if (textRef.current) {
      onTextChange(element.id, textRef.current.value);
    }
  }, [element.id, onTextChange]);

  const handleTextKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditing(false);
      }
      e.stopPropagation();
    },
    []
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      triggerDeleteAnimation();
    },
    [triggerDeleteAnimation]
  );

  const shouldShowDelete = !deleting && (hovered || isSelected);

  const transformOriginX = element.x + element.width / 2;
  const transformOriginY = element.y + element.height / 2;

  const deleteCx = element.x + element.width - 8;
  const deleteCy = element.y + 8;
  const deleteR = 9 / Math.max(zoom, 0.5);

  if (element.type === 'path') {
    const pathPoints = element.points;
    let pathBBoxMinX = Infinity;
    let pathBBoxMinY = Infinity;
    let pathBBoxMaxX = -Infinity;
    let pathBBoxMaxY = -Infinity;
    for (const p of pathPoints) {
      pathBBoxMinX = Math.min(pathBBoxMinX, element.x + p.x);
      pathBBoxMinY = Math.min(pathBBoxMinY, element.y + p.y);
      pathBBoxMaxX = Math.max(pathBBoxMaxX, element.x + p.x);
      pathBBoxMaxY = Math.max(pathBBoxMaxY, element.y + p.y);
    }
    if (pathBBoxMinX === Infinity) {
      pathBBoxMinX = element.x;
      pathBBoxMinY = element.y;
      pathBBoxMaxX = element.x + element.width;
      pathBBoxMaxY = element.y + element.height;
    }

    const hitPadding = 16;
    const hitX = pathBBoxMinX - hitPadding;
    const hitY = pathBBoxMinY - hitPadding;
    const hitW = (pathBBoxMaxX - pathBBoxMinX) + hitPadding * 2;
    const hitH = (pathBBoxMaxY - pathBBoxMinY) + hitPadding * 2;

    const pathCx = pathBBoxMaxX - 8;
    const pathCy = pathBBoxMinY + 8;
    const pathCenterX = (pathBBoxMinX + pathBBoxMaxX) / 2;
    const pathCenterY = (pathBBoxMinY + pathBBoxMaxY) / 2;

    return (
      <g
        opacity={animOpacity}
        transform={
          animScale !== 1
            ? `translate(${pathCenterX}, ${pathCenterY}) scale(${animScale}) translate(${-pathCenterX}, ${-pathCenterY})`
            : undefined
        }
        pointerEvents={deleting ? 'none' : 'auto'}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x={hitX}
          y={hitY}
          width={hitW}
          height={hitH}
          fill="transparent"
          style={{ pointerEvents: 'fill' }}
          onMouseEnter={handleEnterHitArea}
          onMouseLeave={handleLeaveHitArea}
          onClick={handleClick}
        />
        <path
          d={buildSmoothPath(pathPoints)}
          transform={`translate(${element.x}, ${element.y})`}
          fill="none"
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          opacity={element.opacity}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pointerEvents: 'none' }}
        />
        {isSelected && !deleting && (
          <path
            d={buildSmoothPath(pathPoints)}
            transform={`translate(${element.x}, ${element.y})`}
            fill="none"
            stroke={element.stroke}
            strokeWidth={element.strokeWidth + 4 / zoom}
            opacity={0.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }}
          />
        )}
        <DeleteButton
          cx={pathCx}
          cy={pathCy}
          r={deleteR}
          visible={shouldShowDelete}
          onClick={handleDeleteClick}
        />
      </g>
    );
  }

  if (element.type === 'sticky') {
    const contentTopPadding = 28;
    const contentSidePadding = 12;
    const contentBottomPadding = 12;

    return (
      <g
        opacity={animOpacity}
        transform={
          animScale !== 1
            ? `translate(${transformOriginX}, ${transformOriginY}) scale(${animScale}) translate(${-transformOriginX}, ${-transformOriginY})`
            : undefined
        }
        pointerEvents={deleting ? 'none' : 'auto'}
        style={{ cursor: editing ? 'text' : 'move' }}
      >
        <rect
          x={element.x - 8}
          y={element.y - 8}
          width={element.width + 16}
          height={element.height + 16}
          fill="transparent"
          style={{ pointerEvents: 'fill' }}
          onMouseEnter={handleEnterHitArea}
          onMouseLeave={handleLeaveHitArea}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        />
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rx={8}
          ry={8}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          filter={isSelected ? 'url(#dropShadow)' : undefined}
          style={{ pointerEvents: 'none' }}
        />
        {isSelected && !deleting && (
          <rect
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            rx={8}
            ry={8}
            fill="none"
            stroke="#6366F1"
            strokeWidth={2 / zoom}
            strokeDasharray="4 2"
            style={{ pointerEvents: 'none' }}
          />
        )}
        {editing ? (
          <foreignObject
            x={element.x + contentSidePadding}
            y={element.y + contentTopPadding}
            width={element.width - contentSidePadding * 2}
            height={element.height - contentTopPadding - contentBottomPadding}
            style={{ pointerEvents: 'auto' }}
          >
            <textarea
              ref={textRef}
              defaultValue={element.text}
              onBlur={handleTextBlur}
              onKeyDown={handleTextKeyDown}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: 'transparent',
                resize: 'none',
                outline: 'none',
                fontSize: 14,
                fontFamily: 'inherit',
                color: '#1E293B',
                lineHeight: 1.5,
              }}
            />
          </foreignObject>
        ) : (
          <foreignObject
            x={element.x + contentSidePadding}
            y={element.y + contentTopPadding}
            width={element.width - contentSidePadding * 2}
            height={element.height - contentTopPadding - contentBottomPadding}
            style={{ pointerEvents: 'none' }}
          >
            <div
              style={{
                fontSize: 14,
                color: '#1E293B',
                lineHeight: 1.5,
                overflow: 'hidden',
                wordBreak: 'break-word',
                userSelect: 'none',
              }}
            >
              {element.text}
            </div>
          </foreignObject>
        )}
        <DeleteButton
          cx={deleteCx}
          cy={deleteCy}
          r={deleteR}
          visible={shouldShowDelete}
          onClick={handleDeleteClick}
        />
      </g>
    );
  }

  if (element.type === 'rectangle') {
    return (
      <g
        opacity={animOpacity}
        transform={
          animScale !== 1
            ? `translate(${transformOriginX}, ${transformOriginY}) scale(${animScale}) translate(${-transformOriginX}, ${-transformOriginY})`
            : undefined
        }
        pointerEvents={deleting ? 'none' : 'auto'}
        style={{ cursor: 'move' }}
      >
        <rect
          x={element.x - 8}
          y={element.y - 8}
          width={element.width + 16}
          height={element.height + 16}
          fill="transparent"
          style={{ pointerEvents: 'fill' }}
          onMouseEnter={handleEnterHitArea}
          onMouseLeave={handleLeaveHitArea}
          onClick={handleClick}
        />
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rx={4}
          ry={4}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          filter={isSelected ? 'url(#dropShadow)' : undefined}
          style={{ pointerEvents: 'none' }}
        />
        {isSelected && !deleting && (
          <rect
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            rx={4}
            ry={4}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={2 / zoom}
            strokeDasharray="4 2"
            style={{ pointerEvents: 'none' }}
          />
        )}
        <DeleteButton
          cx={deleteCx}
          cy={deleteCy}
          r={deleteR}
          visible={shouldShowDelete}
          onClick={handleDeleteClick}
        />
      </g>
    );
  }

  return null;
};

export default React.memo(CanvasElementComponent);
