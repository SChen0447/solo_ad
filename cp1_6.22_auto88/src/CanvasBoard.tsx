import React, { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import {
  CanvasState,
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  BG_COLOR,
  GRID_COLOR,
  drawPixel,
  undoPixel,
  applyReplayStep,
  AffectedCell,
  Operation
} from './pixelOperations';

export interface User {
  id: string;
  name: string;
  color: string;
  cursorX: number;
  cursorY: number;
  isOnCanvas: boolean;
  lastActive: number;
}

export interface CanvasBoardHandle {
  undoStep: (affected: AffectedCell[]) => void;
  highlightCells: (cells: AffectedCell[]) => void;
  replayStep: (op: Operation) => { state: CanvasState; affected: AffectedCell[] };
  resetCanvas: () => void;
  getCanvasState: () => CanvasState;
  exportPNG: (userCount: number) => void;
}

interface Props {
  canvasState: CanvasState;
  setCanvasState: React.Dispatch<React.SetStateAction<CanvasState>>;
  currentColor: string;
  brushSize: 1 | 4;
  currentUser: User;
  users: User[];
  onDraw: (gridX: number, gridY: number, color: string, brushSize: 1 | 4, affected: AffectedCell[]) => void;
  onCursorMove: (x: number, y: number, onCanvas: boolean) => void;
}

interface FlashCell {
  x: number;
  y: number;
  startTime: number;
  color: string;
}

interface FadeCell {
  x: number;
  y: number;
  startTime: number;
  fromColor: string;
}

interface HighlightPulse {
  cells: AffectedCell[];
  startTime: number;
}

const CanvasBoard = forwardRef<CanvasBoardHandle, Props>((props, ref) => {
  const { canvasState, setCanvasState, currentColor, brushSize, currentUser, users, onDraw, onCursorMove } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastDrawnRef = useRef<{ x: number; y: number } | null>(null);
  const flashCellsRef = useRef<FlashCell[]>([]);
  const fadeCellsRef = useRef<FadeCell[]>([]);
  const highlightRef = useRef<HighlightPulse | null>(null);
  const animFrameRef = useRef<number>(0);
  const cursorPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasWidth = GRID_COLS * CELL_SIZE;
  const canvasHeight = GRID_ROWS * CELL_SIZE;

  const drawGridBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= GRID_COLS; x++) {
      const px = x * CELL_SIZE + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, canvasHeight);
    }
    for (let y = 0; y <= GRID_ROWS; y++) {
      const py = y * CELL_SIZE + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(canvasWidth, py);
    }
    ctx.stroke();
  }, [canvasWidth, canvasHeight]);

  const redrawCells = useCallback((ctx: CanvasRenderingContext2D, cells: Iterable<{ x: number; y: number }>) => {
    const pixelMap = canvasState.pixels;
    for (const c of cells) {
      if (c.x < 0 || c.x >= GRID_COLS || c.y < 0 || c.y >= GRID_ROWS) continue;
      const px = c.x * CELL_SIZE;
      const py = c.y * CELL_SIZE;
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
      const color = pixelMap[c.y][c.x];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      }
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
    }
  }, [canvasState.pixels]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = performance.now();

    drawGridBackground(ctx);

    const pixelMap = canvasState.pixels;
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const color = pixelMap[y][x];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
      }
    }

    fadeCellsRef.current = fadeCellsRef.current.filter(fc => {
      const elapsed = now - fc.startTime;
      if (elapsed >= 200) return false;
      const alpha = 1 - elapsed / 200;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = fc.fromColor;
      ctx.fillRect(fc.x * CELL_SIZE + 1, fc.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      ctx.globalAlpha = 1;
      return true;
    });

    flashCellsRef.current = flashCellsRef.current.filter(fc => {
      const elapsed = now - fc.startTime;
      if (elapsed >= 100) return false;
      const alpha = 1 - elapsed / 100;
      ctx.globalAlpha = Math.max(0, alpha) * 0.8;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(fc.x * CELL_SIZE, fc.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = fc.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.strokeRect(fc.x * CELL_SIZE + 1, fc.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      ctx.globalAlpha = 1;
      return true;
    });

    if (highlightRef.current) {
      const elapsed = now - highlightRef.current.startTime;
      const totalDuration = 1200;
      if (elapsed >= totalDuration) {
        highlightRef.current = null;
      } else {
        const phase = Math.floor((elapsed / totalDuration) * 4);
        const inOut = phase % 2 === 0 ? (elapsed % (totalDuration / 2)) / (totalDuration / 2) : 1 - ((elapsed % (totalDuration / 2)) / (totalDuration / 2));
        const radius = 6 + inOut * 14;
        const alpha = (1 - Math.abs(inOut * 2 - 1)) * 0.9;
        for (const cell of highlightRef.current.cells) {
          const cx = cell.gridX * CELL_SIZE + CELL_SIZE / 2;
          const cy = cell.gridY * CELL_SIZE + CELL_SIZE / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = '#00ff88';
          ctx.globalAlpha = alpha;
          ctx.lineWidth = 3;
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 15;
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
      }
    }

    for (const u of users) {
      if (u.id === currentUser.id || !u.isOnCanvas) continue;
      const opacity = u.isOnCanvas ? 0.85 : Math.max(0, 0.85 - (now - u.lastActive) / 300);
      if (opacity <= 0) continue;
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.arc(u.cursorX, u.cursorY, 10, 0, Math.PI * 2);
      ctx.fillStyle = u.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = 'bold 11px system-ui, sans-serif';
      const label = u.name;
      const textW = ctx.measureText(label).width + 10;
      ctx.fillStyle = u.color;
      ctx.fillRect(u.cursorX + 14, u.cursorY - 20, textW, 18);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(u.cursorX + 14, u.cursorY - 20, textW, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, u.cursorX + 19, u.cursorY - 7);
      ctx.globalAlpha = 1;
    }

    animFrameRef.current = requestAnimationFrame(render);
  }, [canvasState, users, currentUser, drawGridBackground]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  const getGridPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    cursorPosRef.current = { x: px, y: py };
    return {
      gridX: Math.floor(px / CELL_SIZE),
      gridY: Math.floor(py / CELL_SIZE),
      px,
      py
    };
  }, []);

  const performDraw = useCallback((gridX: number, gridY: number, suppressFlash = false) => {
    if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS) return;
    const result = drawPixel(canvasState, gridX, gridY, currentColor, brushSize);
    if (result.affected.length === 0) return;
    setCanvasState(result.state);

    if (!suppressFlash) {
      const now = performance.now();
      for (const c of result.affected) {
        flashCellsRef.current.push({ x: c.gridX, y: c.gridY, startTime: now, color: currentColor });
      }
    }

    onDraw(gridX, gridY, currentColor, brushSize, result.affected);
  }, [canvasState, currentColor, brushSize, setCanvasState, onDraw]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const { gridX, gridY } = getGridPos(e);
    performDraw(gridX, gridY);
    lastDrawnRef.current = { x: gridX, y: gridY };
  }, [getGridPos, performDraw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { gridX, gridY, px, py } = getGridPos(e);
    onCursorMove(px, py, true);

    if (!isDrawingRef.current) return;

    const last = lastDrawnRef.current;
    if (last) {
      const dx = gridX - last.x;
      const dy = gridY - last.y;
      const steps = Math.max(Math.abs(dx), Math.abs(dy));
      if (steps > 1) {
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const ix = Math.round(last.x + dx * t);
          const iy = Math.round(last.y + dy * t);
          performDraw(ix, iy, true);
        }
      } else if (steps === 1) {
        performDraw(gridX, gridY, true);
      }
    }

    if (!last || last.x !== gridX || last.y !== gridY) {
      lastDrawnRef.current = { x: gridX, y: gridY };
    }
  }, [getGridPos, onCursorMove, performDraw]);

  const handleMouseUp = useCallback(() => {
    isDrawingRef.current = false;
    lastDrawnRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDrawingRef.current = false;
    lastDrawnRef.current = null;
    onCursorMove(0, 0, false);
  }, [onCursorMove]);

  useImperativeHandle(ref, () => ({
    undoStep: (affected: AffectedCell[]) => {
      const now = performance.now();
      for (const c of affected) {
        const currentColor = canvasState.pixels[c.gridY]?.[c.gridX];
        if (currentColor) {
          fadeCellsRef.current.push({ x: c.gridX, y: c.gridY, startTime: now, fromColor: currentColor });
        }
      }
      setTimeout(() => {
        setCanvasState(prev => undoPixel(prev, affected).state);
      }, 50);
    },
    highlightCells: (cells: AffectedCell[]) => {
      highlightRef.current = { cells, startTime: performance.now() };
    },
    replayStep: (op: Operation) => {
      const result = applyReplayStep(canvasState, op);
      setCanvasState(result.state);
      const now = performance.now();
      for (const c of result.affected) {
        flashCellsRef.current.push({ x: c.gridX, y: c.gridY, startTime: now, color: op.color });
      }
      return result;
    },
    resetCanvas: () => {
      flashCellsRef.current = [];
      fadeCellsRef.current = [];
      highlightRef.current = null;
    },
    getCanvasState: () => canvasState,
    exportPNG: (userCount: number) => {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = GRID_COLS;
      exportCanvas.height = GRID_ROWS;
      const ctx = exportCanvas.getContext('2d')!;
      const bgRgb = [45, 55, 72];
      ctx.fillStyle = `rgb(${bgRgb[0]},${bgRgb[1]},${bgRgb[2]})`;
      ctx.fillRect(0, 0, GRID_COLS, GRID_ROWS);
      for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
          const c = canvasState.pixels[y][x];
          if (c) {
            ctx.fillStyle = c;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const watermark = `${timeStr} | ${userCount} 用户在线`;
      const scaleCanvas = document.createElement('canvas');
      scaleCanvas.width = GRID_COLS * 4;
      scaleCanvas.height = GRID_ROWS * 4;
      const sctx = scaleCanvas.getContext('2d')!;
      sctx.imageSmoothingEnabled = false;
      sctx.drawImage(exportCanvas, 0, 0, scaleCanvas.width, scaleCanvas.height);
      sctx.font = 'bold 14px system-ui, sans-serif';
      const textW = sctx.measureText(watermark).width + 16;
      const textH = 22;
      const tx = scaleCanvas.width - textW - 10;
      const ty = scaleCanvas.height - textH - 10;
      sctx.fillStyle = 'rgba(0,0,0,0.6)';
      sctx.fillRect(tx, ty, textW, textH);
      sctx.fillStyle = '#00ff88';
      sctx.fillText(watermark, tx + 8, ty + 16);

      const link = document.createElement('a');
      link.download = `pixel-whiteboard-${Date.now()}.png`;
      link.href = scaleCanvas.toDataURL('image/png');
      link.click();
    }
  }), [canvasState, setCanvasState]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        imageRendering: 'pixelated',
        cursor: 'crosshair',
        borderRadius: '6px'
      }}
    />
  );
});

CanvasBoard.displayName = 'CanvasBoard';
export default CanvasBoard;
