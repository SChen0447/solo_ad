import { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import type {
  Path,
  TextItem,
  StickerItem,
  ToolType,
  StickerType,
  Point
} from '../types';
import '../styles/canvas.css';

const STICKER_EMOJIS: Record<StickerType, string> = {
  smile: '😊',
  star: '⭐',
  arrow: '➡️',
  flower: '🌸',
  lightning: '⚡',
  heart: '❤️'
};

interface CanvasProps {
  paths: Path[];
  texts: TextItem[];
  stickers: StickerItem[];
  selectedTool: ToolType;
  selectedColor: string;
  selectedSize: number;
  textFontSize: number;
  userId: string;
  socket: Socket | null;
  remoteDrawings: Map<string, { points: Point[]; color: string; size: number; tool: string }>;
  onAddText: (text: TextItem) => void;
  onAddSticker: (sticker: StickerItem) => void;
  onMoveSticker: (stickerId: string, x: number, y: number) => void;
  stickerType: StickerType | null;
  undoRedoAnimating: boolean;
}

const Canvas = forwardRef(function Canvas(props: CanvasProps, ref) {
  const {
    paths,
    texts,
    stickers,
    selectedTool,
    selectedColor,
    selectedSize,
    textFontSize,
    userId,
    socket,
    remoteDrawings,
    onAddText,
    onAddSticker,
    onMoveSticker,
    stickerType,
    undoRedoAnimating
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Path | null>(null);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [clientCursorPos, setClientCursorPos] = useState({ x: 0, y: 0 });
  const [cursorTipVisible, setCursorTipVisible] = useState(false);
  const [cursorTipFading, setCursorTipFading] = useState(false);
  const cursorFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [editingText, setEditingText] = useState<{ id: string; x: number; y: number; fontSize: number; color: string; text: string } | null>(null);
  const [newTextPosition, setNewTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState('');
  
  const [draggingSticker, setDraggingSticker] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [animating, setAnimating] = useState(false);

  const getCanvasCoords = useCallback((e: React.MouseEvent | MouseEvent | Touch): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top)
    };
  }, []);

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
  }, []);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    paths.forEach(path => {
      drawPath(ctx, path);
    });

    remoteDrawings.forEach((drawing, pathId) => {
      if (drawing.points.length > 1) {
        const tempPath: Path = {
          id: pathId,
          tool: drawing.tool as any,
          points: drawing.points,
          color: drawing.color,
          size: drawing.size,
          userId: ''
        };
        drawPath(ctx, tempPath);
      }
    });
  }, [paths, remoteDrawings]);

  const drawPath = (ctx: CanvasRenderingContext2D, path: Path) => {
    if (path.points.length < 1) return;

    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (path.tool === 'pencil') {
      if (path.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    } else if (path.tool === 'eraser') {
      if (path.points.length < 2) return;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.lineWidth = path.size;
      ctx.stroke();
      ctx.restore();
    } else if (path.tool === 'rectangle' && path.points.length >= 2) {
      const start = path.points[0];
      const end = path.points[path.points.length - 1];
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else if (path.tool === 'circle' && path.points.length >= 2) {
      const start = path.points[0];
      const end = path.points[path.points.length - 1];
      const radiusX = Math.abs(end.x - start.x) / 2;
      const radiusY = Math.abs(end.y - start.y) / 2;
      const centerX = start.x + (end.x - start.x) / 2;
      const centerY = start.y + (end.y - start.y) / 2;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (path.tool === 'line' && path.points.length >= 2) {
      const start = path.points[0];
      const end = path.points[path.points.length - 1];
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  };

  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentPath && currentPoints.length > 0) {
      const previewPath: Path = {
        ...currentPath,
        points: currentPoints
      };
      drawPath(ctx, previewPath);
    }
  }, [currentPath, currentPoints]);

  useEffect(() => {
    const resizeCanvas = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const previewCanvas = previewCanvasRef.current;
      if (!container || !canvas || !previewCanvas) return;

      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      previewCanvas.width = rect.width;
      previewCanvas.height = rect.height;
      
      redrawAll();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [redrawAll]);

  useEffect(() => {
    redrawAll();
  }, [redrawAll]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const point = getCanvasCoords(e);

    if (selectedTool === 'text') {
      setNewTextPosition(point);
      setTextInputValue('');
      return;
    }

    if (selectedTool === 'sticker' && stickerType) {
      const sticker: StickerItem = {
        id: uuidv4(),
        type: stickerType,
        x: point.x - 20,
        y: point.y - 20,
        userId
      };
      onAddSticker(sticker);
      return;
    }

    if (selectedTool === 'pencil' || selectedTool === 'eraser' || 
        selectedTool === 'rectangle' || selectedTool === 'circle' || selectedTool === 'line') {
      const pathId = uuidv4();
      const newPath: Path = {
        id: pathId,
        tool: selectedTool as any,
        points: [point],
        color: selectedTool === 'eraser' ? '#FFFFFF' : selectedColor,
        size: selectedTool === 'eraser' ? 20 : selectedSize,
        userId
      };

      setIsDrawing(true);
      setCurrentPath(newPath);
      setCurrentPoints([point]);

      socket?.emit('drawStart', {
        pathId,
        tool: selectedTool,
        x: point.x,
        y: point.y,
        color: newPath.color,
        size: newPath.size
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const point = getCanvasCoords(e);
    setCursorPos(point);
    setClientCursorPos({ x: e.clientX, y: e.clientY });

    if (cursorFadeTimerRef.current) {
      clearTimeout(cursorFadeTimerRef.current);
    }
    setCursorTipVisible(true);
    setCursorTipFading(false);
    cursorFadeTimerRef.current = setTimeout(() => {
      setCursorTipFading(true);
      setTimeout(() => {
        setCursorTipVisible(false);
        setCursorTipFading(false);
      }, 100);
    }, 100);

    if (!isDrawing || !currentPath) return;

    let newPoints = [...currentPoints, point];
    
    if (selectedTool === 'rectangle' || selectedTool === 'circle' || selectedTool === 'line') {
      if (e.shiftKey && selectedTool === 'rectangle') {
        const start = currentPoints[0];
        const size = Math.max(Math.abs(point.x - start.x), Math.abs(point.y - start.y));
        const endX = start.x + (point.x > start.x ? size : -size);
        const endY = start.y + (point.y > start.y ? size : -size);
        newPoints = [currentPoints[0], { x: endX, y: endY }];
      } else if (e.shiftKey && selectedTool === 'circle') {
        const start = currentPoints[0];
        const radius = Math.max(Math.abs(point.x - start.x), Math.abs(point.y - start.y));
        const endX = start.x + (point.x > start.x ? radius : -radius);
        const endY = start.y + (point.y > start.y ? radius : -radius);
        newPoints = [currentPoints[0], { x: endX, y: endY }];
      } else {
        newPoints = [currentPoints[0], point];
      }
    }

    setCurrentPoints(newPoints);

    socket?.emit('drawMove', {
      pathId: currentPath.id,
      x: point.x,
      y: point.y
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentPath) return;

    const finalPath: Path = {
      ...currentPath,
      points: currentPoints
    };

    socket?.emit('drawEnd', {
      pathId: currentPath.id,
      points: currentPoints,
      tool: currentPath.tool,
      color: currentPath.color,
      size: currentPath.size
    });

    setIsDrawing(false);
    setCurrentPath(null);
    setCurrentPoints([]);
  };

  const handleMouseEnter = () => {
    setCursorTipVisible(true);
    setCursorTipFading(false);
  };

  const handleMouseLeave = () => {
    setCursorTipVisible(false);
    setCursorTipFading(false);
    if (cursorFadeTimerRef.current) {
      clearTimeout(cursorFadeTimerRef.current);
    }
    if (isDrawing) {
      handleMouseUp();
    }
  };

  const handleTextConfirm = () => {
    if (newTextPosition && textInputValue.trim()) {
      const textItem: TextItem = {
        id: uuidv4(),
        text: textInputValue,
        x: newTextPosition.x,
        y: newTextPosition.y + textFontSize,
        fontSize: textFontSize,
        color: selectedColor,
        userId
      };
      onAddText(textItem);
    }
    setNewTextPosition(null);
    setTextInputValue('');
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTextConfirm();
    } else if (e.key === 'Escape') {
      setNewTextPosition(null);
      setTextInputValue('');
    }
  };

  const handleStickerMouseDown = (e: React.MouseEvent, sticker: StickerItem) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDraggingSticker({
      id: sticker.id,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    });
  };

  useEffect(() => {
    if (!draggingSticker) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - draggingSticker.offsetX;
      const y = e.clientY - rect.top - draggingSticker.offsetY;
      onMoveSticker(draggingSticker.id, x, y);
    };

    const handleMouseUp = () => {
      setDraggingSticker(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingSticker, onMoveSticker]);

  useEffect(() => {
    setAnimating(true);
    const timer = setTimeout(() => setAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [paths.length, texts.length, stickers.length]);

  const getToolName = () => {
    const names: Record<ToolType, string> = {
      pencil: '铅笔',
      eraser: '橡皮',
      rectangle: '矩形',
      circle: '圆形',
      line: '直线',
      text: '文字',
      sticker: '贴纸'
    };
    return names[selectedTool];
  };

  return (
    <div 
      className={`canvas-container ${undoRedoAnimating ? 'undo-redo-animating' : ''}`}
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="canvas-bg" />
      
      <canvas
        ref={canvasRef}
        className={`canvas-main ${animating ? 'canvas-fade' : ''}`}
      />
      
      <canvas
        ref={previewCanvasRef}
        className="canvas-preview"
      />

      {texts.map(textItem => (
        <div
          key={textItem.id}
          className="canvas-text-item"
          style={{
            left: textItem.x,
            top: textItem.y - textItem.fontSize,
            fontSize: textItem.fontSize,
            color: textItem.color
          }}
        >
          {textItem.text}
        </div>
      ))}

      {stickers.map(sticker => (
        <div
          key={sticker.id}
          className={`sticker-item ${draggingSticker?.id === sticker.id ? 'dragging' : ''}`}
          style={{ left: sticker.x, top: sticker.y }}
          onMouseDown={(e) => handleStickerMouseDown(e, sticker)}
        >
          {STICKER_EMOJIS[sticker.type]}
        </div>
      ))}

      {newTextPosition && (
        <div
          className="text-editor-overlay"
          style={{ left: newTextPosition.x, top: newTextPosition.y }}
        >
          <input
            type="text"
            className="text-editor-input"
            style={{
              fontSize: textFontSize,
              color: selectedColor,
              height: textFontSize + 8
            }}
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            onKeyDown={handleTextKeyDown}
            onBlur={handleTextConfirm}
            autoFocus
            placeholder="输入文字..."
          />
        </div>
      )}

      {cursorTipVisible && !isDrawing && (
        <div
          className={`tool-cursor-tip ${cursorTipFading ? 'fading' : ''}`}
          style={{
            left: clientCursorPos.x + 18,
            top: clientCursorPos.y + 18
          }}
        >
          <svg className="tool-cursor-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <path d="m15 5 4 4"/>
          </svg>
          <span className="tool-cursor-label">{getToolName()}</span>
          {selectedTool !== 'eraser' && selectedTool !== 'sticker' && (
            <span
              className="color-dot"
              style={{ backgroundColor: selectedColor }}
            />
          )}
        </div>
      )}
    </div>
  );
});

export default Canvas;
