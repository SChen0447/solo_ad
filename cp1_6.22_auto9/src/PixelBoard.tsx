import React, { useRef, useEffect, useCallback, useState } from 'react';
import { PixelBoard as PixelBoardType, Color, ToolType, BOARD_SIZE } from './types';

interface PixelBoardProps {
  board: PixelBoardType;
  tool: ToolType;
  foregroundColor: Color;
  backgroundColor: Color;
  hoveredPixel: { x: number; y: number } | null;
  onPixelAction: (
    x: number,
    y: number,
    action: 'left' | 'right',
    type: 'start' | 'drag' | 'end'
  ) => void;
  onHover: (pixel: { x: number; y: number } | null) => void;
  eyeDropperFlash: { x: number; y: number; color: Color } | null;
  randomAnimate: boolean;
  cellSize?: number;
}

const DEFAULT_CELL_SIZE = 28;

const TRANSPARENT_A = '#1a2544';
const TRANSPARENT_B = '#1e2d52';

const PixelBoard: React.FC<PixelBoardProps> = ({
  board,
  tool,
  hoveredPixel,
  onPixelAction,
  onHover,
  eyeDropperFlash,
  randomAnimate,
  cellSize = DEFAULT_CELL_SIZE,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef<{ active: boolean; button: number; lastX: number; lastY: number }>({
    active: false,
    button: 0,
    lastX: -1,
    lastY: -1,
  });
  const [hoverFlashEl, setHoverFlashEl] = useState<HTMLElement | null>(null);

  const canvasSize = BOARD_SIZE * cellSize;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const isAlt = (x + y) % 2 === 0;
        ctx.fillStyle = isAlt ? TRANSPARENT_A : TRANSPARENT_B;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

        const color = board[y][x];
        if (color !== null) {
          ctx.fillStyle = color;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 1; i < BOARD_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvasSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvasSize, i * cellSize);
      ctx.stroke();
    }

    if (hoveredPixel) {
      const { x, y } = hoveredPixel;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        x * cellSize + 1,
        y * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      );
      ctx.strokeStyle = 'rgba(233, 69, 96, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        x * cellSize + 2.5,
        y * cellSize + 2.5,
        cellSize - 5,
        cellSize - 5
      );
      ctx.restore();
    }
  }, [board, hoveredPixel, cellSize, canvasSize]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getPixelFromEvent = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor(((clientX - rect.left) * scaleX) / cellSize);
    const y = Math.floor(((clientY - rect.top) * scaleY) / cellSize);

    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return null;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pixel = getPixelFromEvent(e);
    if (!pixel) return;

    drawingRef.current = {
      active: true,
      button: e.button,
      lastX: pixel.x,
      lastY: pixel.y,
    };

    const action: 'left' | 'right' = e.button === 2 ? 'right' : 'left';
    onPixelAction(pixel.x, pixel.y, action, 'start');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pixel = getPixelFromEvent(e);
    onHover(pixel);

    if (!drawingRef.current.active || !pixel) return;

    const { lastX, lastY, button } = drawingRef.current;

    if (pixel.x === lastX && pixel.y === lastY) return;

    drawingRef.current.lastX = pixel.x;
    drawingRef.current.lastY = pixel.y;

    const action: 'left' | 'right' = button === 2 ? 'right' : 'left';
    onPixelAction(pixel.x, pixel.y, action, 'drag');
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current.active) return;
    const pixel = getPixelFromEvent(e);
    if (pixel) {
      const action: 'left' | 'right' = drawingRef.current.button === 2 ? 'right' : 'left';
      onPixelAction(pixel.x, pixel.y, action, 'end');
    }
    drawingRef.current.active = false;
  };

  const handleMouseLeave = () => {
    onHover(null);
    if (drawingRef.current.active) {
      drawingRef.current.active = false;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  useEffect(() => {
    if (!eyeDropperFlash) return;
    const { x, y, color } = eyeDropperFlash;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    const flash = document.createElement('div');
    flash.className = 'eyedropper-flash';
    flash.textContent = color;
    flash.style.left = `${rect.left + (x * cellSize + cellSize / 2) * scaleX}px`;
    flash.style.top = `${rect.top + y * cellSize * scaleY - 12}px`;
    flash.style.background = color;
    flash.style.color = getContrastColor(color);
    flash.style.transform = 'translate(-50%, -100%)';
    document.body.appendChild(flash);
    setHoverFlashEl(flash);

    const timer = setTimeout(() => {
      if (flash.parentNode) flash.parentNode.removeChild(flash);
    }, 250);

    return () => clearTimeout(timer);
  }, [eyeDropperFlash, cellSize]);

  useEffect(() => {
    return () => {
      if (hoverFlashEl && hoverFlashEl.parentNode) {
        hoverFlashEl.parentNode.removeChild(hoverFlashEl);
      }
    };
  }, [hoverFlashEl]);

  const cursorClass =
    tool === 'fill' ? 'fill-cursor' : tool === 'eyedropper' ? 'eyedropper-cursor' : '';

  return (
    <div className={`board-wrapper ${randomAnimate ? 'board-animate-random' : ''}`}>
      <canvas
        ref={canvasRef}
        className={`board-canvas ${cursorClass}`}
        width={canvasSize}
        height={canvasSize}
        style={{
          width: canvasSize,
          height: canvasSize,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
      />
      <div className="board-coords">
        16 × 16 · {tool === 'pencil' ? '✏️ 铅笔' : tool === 'eraser' ? '🧽 橡皮' : tool === 'eyedropper' ? '💧 吸管' : '🪣 填充'}
        {hoveredPixel ? ` · (${hoveredPixel.x}, ${hoveredPixel.y})` : ''}
      </div>
    </div>
  );
};

function getContrastColor(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return '#fff';
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000' : '#fff';
}

export default React.memo(PixelBoard);
