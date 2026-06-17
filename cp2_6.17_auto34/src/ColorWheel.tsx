import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ColorScheme, lightenColor } from './colorUtils';

interface ColorWheelProps {
  colors: ColorScheme[];
  rotation: number;
  selectedIndex: number;
  onRotationChange: (rotation: number) => void;
  onSelect: (index: number) => void;
  onRotationEnd: (finalRotation: number) => void;
}

const WHEEL_SIZE = 320;
const CENTER = WHEEL_SIZE / 2;
const RADIUS = WHEEL_SIZE / 2 - 10;
const SECTOR_ANGLE = 30;

const ColorWheel: React.FC<ColorWheelProps> = ({
  colors,
  rotation,
  selectedIndex,
  onRotationChange,
  onSelect,
  onRotationEnd,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const dragState = useRef({
    startAngle: 0,
    startRotation: 0,
    lastAngle: 0,
    lastTime: 0,
    velocity: 0,
    rafId: 0,
  });

  const polarToCartesian = useCallback(
    (angleDeg: number, radius: number): { x: number; y: number } => {
      const angleRad = ((angleDeg - 90) * Math.PI) / 180;
      return {
        x: CENTER + radius * Math.cos(angleRad),
        y: CENTER + radius * Math.sin(angleRad),
      };
    },
    []
  );

  const createSectorPath = useCallback(
    (startAngle: number, endAngle: number, radius: number): string => {
      const start = polarToCartesian(startAngle, radius);
      const end = polarToCartesian(endAngle, radius);
      const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

      return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
    },
    [polarToCartesian]
  );

  const getAngleFromEvent = useCallback(
    (clientX: number, clientY: number): number => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      return (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    },
    []
  );

  const normalizeAngle = useCallback((angle: number): number => {
    let result = angle % 360;
    if (result < 0) result += 360;
    return result;
  }, []);

  const snapToNearestSector = useCallback(
    (currentRotation: number): number => {
      const sectorSize = 360 / colors.length;
      const normalized = normalizeAngle(currentRotation);
      const offset = normalized % sectorSize;
      const snapOffset = offset > sectorSize / 2 ? sectorSize - offset : -offset;
      return currentRotation + snapOffset;
    },
    [colors.length, normalizeAngle]
  );

  const getSelectedIndexFromRotation = useCallback(
    (currentRotation: number): number => {
      const normalized = normalizeAngle(-currentRotation);
      const sectorSize = 360 / colors.length;
      return Math.round(normalized / sectorSize) % colors.length;
    },
    [colors.length, normalizeAngle]
  );

  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      const angle = getAngleFromEvent(clientX, clientY);
      dragState.current = {
        startAngle: angle,
        startRotation: rotation,
        lastAngle: angle,
        lastTime: performance.now(),
        velocity: 0,
        rafId: 0,
      };
      setIsDragging(true);
    },
    [rotation, getAngleFromEvent]
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;

      const angle = getAngleFromEvent(clientX, clientY);
      const deltaAngle = angle - dragState.current.startAngle;
      const newRotation = dragState.current.startRotation + deltaAngle;

      const now = performance.now();
      const deltaTime = now - dragState.current.lastTime;
      if (deltaTime > 0) {
        dragState.current.velocity =
          (angle - dragState.current.lastAngle) / deltaTime;
      }
      dragState.current.lastAngle = angle;
      dragState.current.lastTime = now;

      onRotationChange(newRotation);
    },
    [isDragging, getAngleFromEvent, onRotationChange]
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const velocity = dragState.current.velocity;
    let currentRotation = rotation;
    let currentVelocity = velocity * 16;

    const animate = () => {
      currentVelocity *= 0.95;
      currentRotation += currentVelocity;

      if (Math.abs(currentVelocity) > 0.1) {
        onRotationChange(currentRotation);
        dragState.current.rafId = requestAnimationFrame(animate);
      } else {
        const snappedRotation = snapToNearestSector(currentRotation);
        onRotationChange(snappedRotation);
        onRotationEnd(snappedRotation);
        const newIndex = getSelectedIndexFromRotation(snappedRotation);
        onSelect(newIndex);
      }
    };

    if (Math.abs(currentVelocity) > 0.5) {
      dragState.current.rafId = requestAnimationFrame(animate);
    } else {
      const snappedRotation = snapToNearestSector(currentRotation);
      onRotationChange(snappedRotation);
      onRotationEnd(snappedRotation);
      const newIndex = getSelectedIndexFromRotation(snappedRotation);
      onSelect(newIndex);
    }
  }, [
    isDragging,
    rotation,
    snapToNearestSector,
    getSelectedIndexFromRotation,
    onRotationChange,
    onRotationEnd,
    onSelect,
  ]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientX, e.clientY);
    },
    [handleDragStart]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY);
    },
    [handleDragMove]
  );

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    [handleDragStart]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    [handleDragMove]
  );

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  const handleSectorClick = useCallback(
    (index: number, e: React.MouseEvent) => {
      if (isDragging) return;
      e.stopPropagation();
      const targetRotation = -index * SECTOR_ANGLE;
      onRotationChange(targetRotation);
      onRotationEnd(targetRotation);
      onSelect(index);
    },
    [isDragging, onRotationChange, onRotationEnd, onSelect]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      if (dragState.current.rafId) {
        cancelAnimationFrame(dragState.current.rafId);
      }
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const renderSector = (color: ColorScheme, index: number) => {
    const startAngle = index * SECTOR_ANGLE;
    const endAngle = (index + 1) * SECTOR_ANGLE;
    const isHovered = hoveredIndex === index;
    const isSelected = selectedIndex === index;
    const radius = isHovered ? RADIUS + 8 : RADIUS;
    const fillColor = isHovered
      ? lightenColor(color.hex, 15)
      : color.hex;

    const pathData = createSectorPath(startAngle, endAngle, radius);
    const dividerData = createSectorPath(startAngle, startAngle + 0.5, RADIUS);

    return (
      <g key={index}>
        <path
          d={pathData}
          fill={fillColor}
          className={`wheel-sector ${isSelected ? 'selected' : ''}`}
          onClick={(e) => handleSectorClick(index, e)}
          onMouseEnter={() => !isDragging && setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{
            transformOrigin: `${CENTER}px ${CENTER}px`,
          }}
        />
        <path
          d={dividerData}
          fill="none"
          className="sector-divider"
          style={{ pointerEvents: 'none' }}
        />
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      className="color-wheel-container"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <svg
        className={`color-wheel ${isDragging ? 'dragging' : ''}`}
        viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
        style={{
          transform: `rotate(${rotation}deg)`,
        }}
      >
        {colors.map((color, index) => renderSector(color, index))}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={25}
          fill="#1a1a1a"
          stroke="#b8913c"
          strokeWidth="2"
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={10}
          fill="#b8913c"
        />
      </svg>
    </div>
  );
};

export default ColorWheel;
