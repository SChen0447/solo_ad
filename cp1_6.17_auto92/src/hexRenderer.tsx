import React, { useRef, useEffect, useCallback } from 'react';
import { HexCoord, PlacedUnit, Formation, COLORS, HEX_SIZE } from './types';
import { hexToPixel, pixelToHex, getHexCorners, generateAllHexes, getPreviewPositions, isValidHex, calculateBoardBounds, hexEquals } from './hexGrid';

interface HexRendererProps {
  placedUnits: PlacedUnit[];
  selectedFormation: Formation | null;
  previewCenter: HexCoord | null;
  selectedHex: HexCoord | null;
  onHexClick: (hex: HexCoord) => void;
  onHexHover: (hex: HexCoord | null) => void;
  onUnitDragStart: (unit: PlacedUnit, position: { x: number; y: number }) => void;
  onUnitDragMove: (position: { x: number; y: number }) => void;
  onUnitDragEnd: (targetHex: HexCoord | null) => void;
  draggingUnit: PlacedUnit | null;
  dragPosition: { x: number; y: number } | null;
}

const ANIMATION_DURATION_ENTER = 400;
const ANIMATION_DURATION_EXIT = 300;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function bounceIn(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

const HexRenderer: React.FC<HexRendererProps> = ({
  placedUnits,
  selectedFormation,
  previewCenter,
  selectedHex,
  onHexClick,
  onHexHover,
  onUnitDragStart,
  onUnitDragMove,
  onUnitDragEnd,
  draggingUnit,
  dragPosition
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const hoveredHexRef = useRef<HexCoord | null>(null);
  const boundsRef = useRef(calculateBoardBounds(HEX_SIZE));
  const allHexes = useRef(generateAllHexes());

  const drawHex = useCallback((
    ctx: CanvasRenderingContext2D,
    hex: HexCoord,
    fillStyle: string,
    strokeStyle: string,
    lineWidth: number = 2,
    hexSize: number = HEX_SIZE
  ) => {
    const { x, y } = hexToPixel(hex, hexSize);
    const corners = getHexCorners(x + boundsRef.current.offsetX, y + boundsRef.current.offsetY, hexSize * 0.95);

    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    corners.forEach((corner, i) => {
      if (i > 0) ctx.lineTo(corner.x, corner.y);
    });
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }, []);

  const drawUnit = useCallback((
    ctx: CanvasRenderingContext2D,
    unit: PlacedUnit,
    currentTime: number
  ) => {
    const { x, y } = hexToPixel(unit.position, HEX_SIZE);
    const centerX = x + boundsRef.current.offsetX;
    const centerY = y + boundsRef.current.offsetY;
    const baseRadius = HEX_SIZE * 0.6;

    let scale = 1;
    let opacity = 1;
    let offsetX = 0;
    let offsetY = 0;

    const elapsed = currentTime - unit.animationStart;

    if (unit.animationState === 'entering') {
      const progress = Math.min(1, elapsed / ANIMATION_DURATION_ENTER);
      const eased = easeInOut(progress);
      const bounce = bounceIn(progress);
      scale = bounce;
      opacity = progress;
      offsetY = (1 - eased) * 20;
    } else if (unit.animationState === 'exiting') {
      const progress = Math.min(1, elapsed / ANIMATION_DURATION_EXIT);
      opacity = 1 - progress;
      scale = 1 - progress * 0.5;
    } else if (unit.animationState === 'dragging') {
      scale = 1.1;
    }

    const drawX = centerX + offsetX;
    const drawY = centerY + offsetY;
    const radius = baseRadius * scale;

    ctx.save();
    ctx.globalAlpha = opacity;

    const gradient = ctx.createRadialGradient(drawX - radius * 0.3, drawY - radius * 0.3, 0, drawX, drawY, radius);
    gradient.addColorStop(0, unit.unit.color);
    gradient.addColorStop(1, shadeColor(unit.unit.color, -20));

    ctx.beginPath();
    ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFF';
    ctx.font = `bold ${radius * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initial = unit.unit.name.charAt(0);
    ctx.fillText(initial, drawX, drawY);

    ctx.restore();
  }, []);

  const drawDraggingUnit = useCallback((
    ctx: CanvasRenderingContext2D,
    unit: PlacedUnit,
    position: { x: number; y: number }
  ) => {
    const radius = HEX_SIZE * 0.6 * 1.1;

    ctx.save();

    const gradient = ctx.createRadialGradient(
      position.x - radius * 0.3, position.y - radius * 0.3, 0,
      position.x, position.y, radius
    );
    gradient.addColorStop(0, unit.unit.color);
    gradient.addColorStop(1, shadeColor(unit.unit.color, -20));

    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#FFF';
    ctx.font = `bold ${radius * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(unit.unit.name.charAt(0), position.x, position.y);

    ctx.restore();
  }, []);

  const render = useCallback((currentTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    allHexes.current.forEach(hex => {
      let fillStyle = COLORS.GRID_FILL;

      if (selectedHex && hexEquals(hex, selectedHex)) {
        fillStyle = COLORS.GRID_SELECTED;
      } else if (hoveredHexRef.current && hexEquals(hex, hoveredHexRef.current)) {
        fillStyle = COLORS.GRID_HOVER;
      }

      drawHex(ctx, hex, fillStyle, COLORS.GRID_STROKE);
    });

    if (selectedFormation && previewCenter) {
      const previewPositions = getPreviewPositions(selectedFormation, previewCenter);
      previewPositions.forEach(pos => {
        drawHex(ctx, pos, COLORS.PREVIEW_FILL, COLORS.PREVIEW_STROKE, 2);
      });
    }

    const activeUnits = placedUnits.filter(u => u.animationState !== 'exiting' || (currentTime - u.animationStart) < ANIMATION_DURATION_EXIT);
    activeUnits.forEach(unit => {
      if (draggingUnit && unit.instanceId === draggingUnit.instanceId) {
        return;
      }
      drawUnit(ctx, unit, currentTime);
    });

    if (draggingUnit && dragPosition) {
      drawDraggingUnit(ctx, draggingUnit, dragPosition);
    }

    const hasActiveAnimations = placedUnits.some(u =>
      u.animationState === 'entering' && (currentTime - u.animationStart) < ANIMATION_DURATION_ENTER) ||
      placedUnits.some(u => u.animationState === 'exiting' && (currentTime - u.animationStart) < ANIMATION_DURATION_EXIT);

    if (hasActiveAnimations || draggingUnit) {
      animationRef.current = requestAnimationFrame(render);
    } else {
      animationRef.current = requestAnimationFrame(render);
    }
  }, [placedUnits, selectedFormation, previewCenter, selectedHex, draggingUnit, dragPosition, drawHex, drawUnit, drawDraggingUnit]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationRef.current);
  }, [render]);

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (draggingUnit) {
      onUnitDragMove(coords);
      return;
    }

    const hex = pixelToHex(
      coords.x - boundsRef.current.offsetX,
      coords.y - boundsRef.current.offsetY,
      HEX_SIZE
    );

    if (isValidHex(hex)) {
      if (!hoveredHexRef.current || !hexEquals(hoveredHexRef.current, hex)) {
        hoveredHexRef.current = hex;
        onHexHover(hex);
      }
    } else {
      if (hoveredHexRef.current) {
        hoveredHexRef.current = null;
        onHexHover(null);
      }
    }
  }, [draggingUnit, getCanvasCoords, onHexHover, onUnitDragMove]);

  const handleMouseLeave = useCallback(() => {
    if (hoveredHexRef.current) {
      hoveredHexRef.current = null;
      onHexHover(null);
    }
  }, [onHexHover]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingUnit) return;

    const coords = getCanvasCoords(e);
    if (!coords) return;

    const hex = pixelToHex(
      coords.x - boundsRef.current.offsetX,
      coords.y - boundsRef.current.offsetY,
      HEX_SIZE
    );

    if (isValidHex(hex)) {
      onHexClick(hex);
    }
  }, [draggingUnit, getCanvasCoords, onHexClick]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;

    const hex = pixelToHex(
      coords.x - boundsRef.current.offsetX,
      coords.y - boundsRef.current.offsetY,
      HEX_SIZE
    );

    if (isValidHex(hex)) {
      const unit = placedUnits.find(u =>
        hexEquals(u.position, hex) && u.animationState === 'idle'
      );
      if (unit) {
        onUnitDragStart(unit, coords);
      }
    }
  }, [placedUnits, getCanvasCoords, onUnitDragStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingUnit) return;

    const coords = getCanvasCoords(e);
    if (!coords) {
      onUnitDragEnd(null);
      return;
    }

    const hex = pixelToHex(
      coords.x - boundsRef.current.offsetX,
      coords.y - boundsRef.current.offsetY,
      HEX_SIZE
    );

    onUnitDragEnd(isValidHex(hex) ? hex : null);
  }, [draggingUnit, getCanvasCoords, onUnitDragEnd]);

  return (
    <div ref={containerRef} className="canvas-container">
      <canvas
        ref={canvasRef}
        width={boundsRef.current.width}
        height={boundsRef.current.height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
};

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}

export default HexRenderer;
