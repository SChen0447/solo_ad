import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { PixelFrame, PixelColor, ToolType } from '../types';
import { CANVAS_SIZE, SCALE_FACTOR, cloneFrame } from '../types';
import {
  drawCheckerboardBackground,
  drawGridLines,
  drawPixelFrame,
  drawPixelHighlight,
} from '../utils/canvasUtils';

interface EditorProps {
  frame: PixelFrame;
  selectedColor: PixelColor;
  currentTool: ToolType;
  onFrameChange: (frame: PixelFrame) => void;
}

const Editor: React.FC<EditorProps> = ({
  frame,
  selectedColor,
  currentTool,
  onFrameChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const canvasSize = CANVAS_SIZE * SCALE_FACTOR;

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    drawCheckerboardBackground(ctx, canvasSize, canvasSize, SCALE_FACTOR);
    drawPixelFrame(ctx, frame, SCALE_FACTOR);
    drawGridLines(ctx, canvasSize, canvasSize, SCALE_FACTOR);

    if (hoverPos) {
      drawPixelHighlight(ctx, hoverPos.x, hoverPos.y, SCALE_FACTOR);
    }
  }, [frame, hoverPos, canvasSize]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const getPixelPosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor(((e.clientX - rect.left) * scaleX) / SCALE_FACTOR);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / SCALE_FACTOR);

    if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) {
      return null;
    }

    return { x, y };
  };

  const setPixel = (x: number, y: number) => {
    const newFrame = cloneFrame(frame);

    if (currentTool === 'eraser') {
      newFrame[y][x] = { r: 0, g: 0, b: 0, a: 0 };
    } else {
      newFrame[y][x] = { ...selectedColor };
    }

    onFrameChange(newFrame);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPixelPosition(e);
    if (!pos) return;

    setIsDrawing(true);
    setPixel(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPixelPosition(e);
    setHoverPos(pos);

    if (isDrawing && pos) {
      setPixel(pos.x, pos.y);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleMouseLeave = () => {
    setIsDrawing(false);
    setHoverPos(null);
  };

  return (
    <div className="editor-container">
      <div className="editor-header">
        <h2>关键帧编辑器</h2>
        <span className="canvas-info">32 × 32 像素</span>
      </div>
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="editor-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{
            cursor: currentTool === 'eraser' ? 'cell' : 'crosshair',
          }}
        />
      </div>
      <div className="editor-hint">
        点击或拖拽绘制像素 • 选择橡皮擦清除像素
      </div>
    </div>
  );
};

export default Editor;
