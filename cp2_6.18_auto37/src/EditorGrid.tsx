import React, { useRef, useEffect, useCallback, memo } from 'react';
import {
  GridData,
  CellType,
  CELL_SIZE,
  CELL_COLORS,
  pixelToGrid,
  getCell,
} from './utils';
import { PathPoint, SimulationResult } from './SimulationEngine';

interface EditorGridProps {
  grid: GridData;
  editMode: CellType;
  onCellClick: (col: number, row: number) => void;
  path: PathPoint[];
  simulationResult: SimulationResult | null;
  flashCount: number;
}

const PATH_DOT_RADIUS = 3;
const THROTTLE_MS = 50;

function drawGroundIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = CELL_COLORS[CellType.Ground];
  ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  ctx.fillStyle = '#A0522D';
  ctx.fillRect(x + 4, y + 8, CELL_SIZE - 8, 3);
  ctx.fillRect(x + 4, y + 18, CELL_SIZE - 8, 3);
}

function drawSpikeIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = CELL_COLORS[CellType.Spike];
  ctx.beginPath();
  ctx.moveTo(x + CELL_SIZE / 2, y + 4);
  ctx.lineTo(x + CELL_SIZE - 5, y + CELL_SIZE - 4);
  ctx.lineTo(x + 5, y + CELL_SIZE - 4);
  ctx.closePath();
  ctx.fill();
}

function drawFinishIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = CELL_COLORS[CellType.Finish];
  ctx.fillRect(x + 5, y + 4, 2, CELL_SIZE - 6);
  ctx.beginPath();
  ctx.moveTo(x + 7, y + 4);
  ctx.lineTo(x + CELL_SIZE - 4, y + 10);
  ctx.lineTo(x + 7, y + 16);
  ctx.closePath();
  ctx.fill();
}

function drawPlayerIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const cx = x + CELL_SIZE / 2;
  const cy = y + CELL_SIZE / 2;
  const r = CELL_SIZE * 0.35;
  ctx.fillStyle = CELL_COLORS[CellType.Player];
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx - 3, cy - 2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 3, cy - 2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.arc(cx - 3, cy - 2, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 3, cy - 2, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

const CELL_DRAWERS: Record<number, (ctx: CanvasRenderingContext2D, x: number, y: number) => void> = {
  [CellType.Ground]: drawGroundIcon,
  [CellType.Spike]: drawSpikeIcon,
  [CellType.Finish]: drawFinishIcon,
  [CellType.Player]: drawPlayerIcon,
};

function renderCanvas(
  ctx: CanvasRenderingContext2D,
  grid: GridData,
  path: PathPoint[],
  simulationResult: SimulationResult | null,
  flashCount: number,
  scale: number
) {
  const w = grid.cols * CELL_SIZE;
  const h = grid.rows * CELL_SIZE;

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= grid.cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL_SIZE, 0);
    ctx.lineTo(c * CELL_SIZE, h);
    ctx.stroke();
  }
  for (let r = 0; r <= grid.rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL_SIZE);
    ctx.lineTo(w, r * CELL_SIZE);
    ctx.stroke();
  }

  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const cellType = getCell(grid, col, row);
      if (cellType !== CellType.Empty && CELL_DRAWERS[cellType]) {
        CELL_DRAWERS[cellType](ctx, col * CELL_SIZE, row * CELL_SIZE);
      }
    }
  }

  if (path.length > 0) {
    let dotColor = '#3B82F6';
    if (simulationResult === 'hit_spike') dotColor = '#DC2626';
    if (simulationResult === 'reached_finish') {
      dotColor = flashCount % 2 === 0 ? '#F59E0B' : '#FDE68A';
    }

    for (const pt of path) {
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, PATH_DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

const EditorGrid: React.FC<EditorGridProps> = ({
  grid,
  onCellClick,
  path,
  simulationResult,
  flashCount,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const lastThrottleTimeRef = useRef(0);
  const trailingTimerRef = useRef<number | null>(null);
  const rafPendingRef = useRef(false);

  const [canvasSize, setCanvasSize] = React.useState({
    width: grid.cols * CELL_SIZE,
    height: grid.rows * CELL_SIZE,
  });

  const handleResize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth - 16;
    const naturalWidth = grid.cols * CELL_SIZE;
    const minScale = 0.25;
    const scale = Math.min(1, Math.max(minScale, containerWidth / naturalWidth));
    scaleRef.current = scale;
    setCanvasSize({
      width: Math.floor(naturalWidth * scale),
      height: Math.floor(grid.rows * CELL_SIZE * scale),
    });
  }, [grid.cols, grid.rows]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    const container = containerRef.current;
    let observer: ResizeObserver | null = null;

    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => handleResize());
      observer.observe(container);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (observer) observer.disconnect();
    };
  }, [handleResize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (rafPendingRef.current) return;
    rafPendingRef.current = true;

    requestAnimationFrame(() => {
      rafPendingRef.current = false;
      renderCanvas(ctx, grid, path, simulationResult, flashCount, scaleRef.current);
    });
  }, [grid, path, simulationResult, flashCount]);

  const invokeCellClick = useCallback(
    (col: number, row: number) => {
      onCellClick(col, row);
    },
    [onCellClick]
  );

  const throttledClick = useCallback(
    (col: number, row: number) => {
      const now = performance.now();
      const timeSinceLast = now - lastThrottleTimeRef.current;

      if (timeSinceLast >= THROTTLE_MS) {
        lastThrottleTimeRef.current = now;
        if (trailingTimerRef.current) {
          clearTimeout(trailingTimerRef.current);
          trailingTimerRef.current = null;
        }
        invokeCellClick(col, row);
      } else {
        if (trailingTimerRef.current) {
          clearTimeout(trailingTimerRef.current);
        }
        const remaining = THROTTLE_MS - timeSinceLast;
        trailingTimerRef.current = window.setTimeout(() => {
          lastThrottleTimeRef.current = performance.now();
          trailingTimerRef.current = null;
          invokeCellClick(col, row);
        }, remaining);
      }
    },
    [invokeCellClick]
  );

  const getGridPos = useCallback((clientX: number, clientY: number): { col: number; row: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scale = scaleRef.current;
    if (scale <= 0) return null;
    const x = (clientX - rect.left) / scale;
    const y = (clientY - rect.top) / scale;
    const { col, row } = pixelToGrid(x, y);
    if (col >= 0 && col < grid.cols && row >= 0 && row < grid.rows) {
      return { col, row };
    }
    return null;
  }, [grid.cols, grid.rows]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getGridPos(e.clientX, e.clientY);
      if (pos) {
        throttledClick(pos.col, pos.row);
      }
    },
    [getGridPos, throttledClick]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const pos = getGridPos(touch.clientX, touch.clientY);
      if (pos) {
        throttledClick(pos.col, pos.row);
      }
    },
    [getGridPos, throttledClick]
  );

  return (
    <div
      ref={containerRef}
      style={{
        background: '#fff',
        padding: '8px',
        borderRadius: '8px',
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          display: 'block',
          cursor: 'crosshair',
          touchAction: 'none',
          maxWidth: '100%',
          height: 'auto',
        }}
        onClick={handleCanvasClick}
        onTouchStart={handleTouchStart}
      />
    </div>
  );
};

export default memo(EditorGrid);
