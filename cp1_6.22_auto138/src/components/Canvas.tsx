import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { BaseElement, ToolType, Point, User } from '../types';
import { getInitials } from '../utils';
import './Canvas.css';

interface CanvasProps {
  elements: BaseElement[];
  onElementAdd: (element: BaseElement) => void;
  onElementUpdate: (elementId: string, updates: Partial<BaseElement>) => void;
  onElementDelete: (elementId: string) => void;
  onCursorMove: (x: number, y: number) => void;
  currentTool: ToolType;
  currentColor: string;
  currentLineWidth: number;
  remoteCursors: Map<string, { x: number; y: number; user: User }>;
}

type DragMode = 'none' | 'pan' | 'draw' | 'move' | 'resize' | 'rotate';

const GRID_SIZE = 40;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const HANDLE_SIZE = 8;

function Canvas({
  elements,
  onElementAdd,
  onElementUpdate,
  onElementDelete,
  onCursorMove,
  currentTool,
  currentColor,
  currentLineWidth,
  remoteCursors
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragElement, setDragElement] = useState<BaseElement | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const selectedElement = useMemo(() => 
    elements.find(e => e.id === selectedId) || null,
    [elements, selectedId]
  );

  const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (screenX - rect.left - viewTransform.x) / viewTransform.scale,
      y: (screenY - rect.top - viewTransform.y) / viewTransform.scale
    };
  }, [viewTransform]);

  const worldToScreen = useCallback((worldX: number, worldY: number): Point => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: worldX * viewTransform.scale + viewTransform.x + rect.left,
      y: worldY * viewTransform.scale + viewTransform.y + rect.top
    };
  }, [viewTransform]);

  const getElementAtPoint = useCallback((point: Point): BaseElement | null => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const transformedPoint = rotatePoint(point, { x: el.x + el.width / 2, y: el.y + el.height / 2 }, -el.rotation);
      
      if (transformedPoint.x >= el.x && transformedPoint.x <= el.x + el.width &&
          transformedPoint.y >= el.y && transformedPoint.y <= el.y + el.height) {
        return el;
      }
    }
    return null;
  }, [elements]);

  const getResizeHandleAtPoint = useCallback((point: Point): string | null => {
    if (!selectedElement) return null;
    
    const handles = getResizeHandles(selectedElement);
    for (const handle of handles) {
      const dist = Math.sqrt(Math.pow(point.x - handle.x, 2) + Math.pow(point.y - handle.y, 2));
      if (dist <= HANDLE_SIZE / viewTransform.scale) {
        return handle.type;
      }
    }
    return null;
  }, [selectedElement, viewTransform.scale]);

  const drawElement = useCallback((ctx: CanvasRenderingContext2D, el: BaseElement, isSelected: boolean) => {
    ctx.save();
    ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.translate(-(el.x + el.width / 2), -(el.y + el.height / 2));

    ctx.strokeStyle = el.color;
    ctx.fillStyle = el.type === 'sticky' ? `${el.color}20` : 'transparent';
    ctx.lineWidth = el.lineWidth;

    switch (el.type) {
      case 'rectangle':
        ctx.beginPath();
        ctx.rect(el.x, el.y, el.width, el.height);
        ctx.stroke();
        ctx.fill();
        break;
      case 'ellipse':
        ctx.beginPath();
        ctx.ellipse(
          el.x + el.width / 2,
          el.y + el.height / 2,
          Math.abs(el.width) / 2,
          Math.abs(el.height) / 2,
          0, 0, Math.PI * 2
        );
        ctx.stroke();
        ctx.fill();
        break;
      case 'line':
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x + el.width, el.y + el.height);
        ctx.stroke();
        break;
      case 'freehand':
        if (el.points && el.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(el.points[0].x, el.points[0].y);
          for (let i = 1; i < el.points.length; i++) {
            ctx.lineTo(el.points[i].x, el.points[i].y);
          }
          ctx.stroke();
        }
        break;
      case 'sticky':
        ctx.fillStyle = `${el.color}40`;
        ctx.fillRect(el.x, el.y, el.width, el.height);
        ctx.strokeStyle = el.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(el.x, el.y, el.width, el.height);
        if (el.text) {
          ctx.fillStyle = '#111827';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          wrapText(ctx, el.text, el.x + 8, el.y + 8, el.width - 16, 18);
        }
        break;
      case 'connector':
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x + el.width, el.y + el.height);
        ctx.stroke();
        const angle = Math.atan2(el.height, el.width);
        drawArrowhead(ctx, el.x + el.width, el.y + el.height, angle, el.color, el.lineWidth);
        break;
      case 'text':
        if (el.text) {
          ctx.fillStyle = el.color;
          ctx.font = `${16 * viewTransform.scale}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(el.text, el.x, el.y);
        } else {
          ctx.fillStyle = el.color + '40';
          ctx.fillRect(el.x, el.y, 80, 24);
        }
        break;
    }

    if (isSelected) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2 / viewTransform.scale;
      ctx.setLineDash([4 / viewTransform.scale, 4 / viewTransform.scale]);
      ctx.strokeRect(el.x - 2, el.y - 2, el.width + 4, el.height + 4);
      ctx.setLineDash([]);

      const handles = getResizeHandles(el);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1 / viewTransform.scale;
      const handleSize = HANDLE_SIZE / viewTransform.scale;
      handles.forEach(handle => {
        ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
      });
    }

    ctx.restore();
  }, [viewTransform.scale]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(viewTransform.x, viewTransform.y);
    ctx.scale(viewTransform.scale, viewTransform.scale);

    drawGrid(ctx, canvas.width / viewTransform.scale, canvas.height / viewTransform.scale);

    elements.forEach(el => {
      drawElement(ctx, el, el.id === selectedId);
    });

    if (isDrawing && drawingPoints.length > 1) {
      ctx.save();
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentLineWidth;
      ctx.globalAlpha = 0.5;
      
      if (currentTool === 'freehand') {
        ctx.beginPath();
        ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
        for (let i = 1; i < drawingPoints.length; i++) {
          ctx.lineTo(drawingPoints[i].x, drawingPoints[i].y);
        }
        ctx.stroke();
      } else if (currentTool !== 'select') {
        const start = drawingPoints[0];
        const end = drawingPoints[drawingPoints.length - 1];
        ctx.beginPath();
        
        switch (currentTool) {
          case 'rectangle':
            ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
            ctx.stroke();
            break;
          case 'ellipse':
            ctx.ellipse(
              start.x + (end.x - start.x) / 2,
              start.y + (end.y - start.y) / 2,
              Math.abs(end.x - start.x) / 2,
              Math.abs(end.y - start.y) / 2,
              0, 0, Math.PI * 2
            );
            ctx.stroke();
            break;
          case 'line':
          case 'connector':
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            break;
        }
      }
      ctx.restore();
    }

    ctx.restore();

    remoteCursors.forEach((cursor, userId) => {
      if (cursor.user.id !== '') {
        const screenPos = worldToScreen(cursor.x, cursor.y);
        const rect = canvas.getBoundingClientRect();
        const x = screenPos.x - rect.left;
        const y = screenPos.y - rect.top;
        
        ctx.fillStyle = cursor.user.avatarColor;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 12, y + 4);
        ctx.lineTo(x + 6, y + 12);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = cursor.user.avatarColor;
        ctx.fillRect(x + 12, y - 4, 60, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(getInitials(cursor.user.name), x + 16, y + 6);
      }
    });
  }, [elements, selectedId, viewTransform, isDrawing, drawingPoints, currentTool, currentColor, currentLineWidth, remoteCursors, drawElement, worldToScreen]);

  useEffect(() => {
    const animationFrame = requestAnimationFrame(function loop() {
      render();
      requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(animationFrame);
  }, [render]);

  useEffect(() => {
    const handleResize = () => render();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (editingTextId) return;
    
    const worldPos = screenToWorld(e.clientX, e.clientY);
    setDragStart(worldPos);

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setDragMode('pan');
      return;
    }

    if (currentTool === 'select') {
      const resizeHandle = getResizeHandleAtPoint(worldPos);
      if (resizeHandle) {
        setDragMode('resize');
        setResizeHandle(resizeHandle);
        setDragElement(selectedElement);
        return;
      }

      const element = getElementAtPoint(worldPos);
      if (element) {
        setSelectedId(element.id);
        setDragMode('move');
        setDragElement(element);
      } else {
        setSelectedId(null);
        setDragMode('none');
      }
    } else {
      setIsDrawing(true);
      setDrawingPoints([worldPos]);
      setDragMode('draw');
    }
  }, [currentTool, selectedElement, screenToWorld, getElementAtPoint, getResizeHandleAtPoint, editingTextId]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    onCursorMove(worldPos.x, worldPos.y);

    if (!dragStart) return;

    if (dragMode === 'pan') {
      const dx = e.clientX - (containerRef.current?.getBoundingClientRect().left || 0) - dragStart.x * viewTransform.scale - viewTransform.x;
      const dy = e.clientY - (containerRef.current?.getBoundingClientRect().top || 0) - dragStart.y * viewTransform.scale - viewTransform.y;
      setViewTransform(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy
      }));
      return;
    }

    if (dragMode === 'draw') {
      setDrawingPoints(prev => [...prev, worldPos]);
      return;
    }

    if (dragMode === 'move' && dragElement) {
      const dx = worldPos.x - dragStart.x;
      const dy = worldPos.y - dragStart.y;
      onElementUpdate(dragElement.id, {
        x: dragElement.x + dx,
        y: dragElement.y + dy
      });
      return;
    }

    if (dragMode === 'resize' && dragElement && resizeHandle) {
      const dx = worldPos.x - dragStart.x;
      const dy = worldPos.y - dragStart.y;
      
      let newX = dragElement.x;
      let newY = dragElement.y;
      let newWidth = dragElement.width;
      let newHeight = dragElement.height;

      if (resizeHandle.includes('e')) newWidth = dragElement.width + dx;
      if (resizeHandle.includes('w')) { newX = dragElement.x + dx; newWidth = dragElement.width - dx; }
      if (resizeHandle.includes('s')) newHeight = dragElement.height + dy;
      if (resizeHandle.includes('n')) { newY = dragElement.y + dy; newHeight = dragElement.height - dy; }

      if (Math.abs(newWidth) > 5 && Math.abs(newHeight) > 5) {
        onElementUpdate(dragElement.id, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight
        });
      }
      return;
    }
  }, [dragStart, dragMode, dragElement, resizeHandle, viewTransform.scale, viewTransform.x, viewTransform.y, screenToWorld, onElementUpdate, onCursorMove]);

  const handleMouseUp = useCallback(() => {
    if (dragMode === 'draw' && drawingPoints.length > 1) {
      const start = drawingPoints[0];
      const end = drawingPoints[drawingPoints.length - 1];
      const now = Date.now();

      if (currentTool === 'freehand') {
        const minX = Math.min(...drawingPoints.map(p => p.x));
        const minY = Math.min(...drawingPoints.map(p => p.y));
        const maxX = Math.max(...drawingPoints.map(p => p.x));
        const maxY = Math.max(...drawingPoints.map(p => p.y));
        
        const element: BaseElement = {
          id: uuidv4(),
          type: 'freehand',
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          rotation: 0,
          color: currentColor,
          lineWidth: currentLineWidth,
          points: drawingPoints,
          createdAt: now,
          updatedAt: now
        };
        onElementAdd(element);
      } else if (currentTool !== 'select') {
        const element: BaseElement = {
          id: uuidv4(),
          type: currentTool as Exclude<ToolType, 'select'>,
          x: Math.min(start.x, end.x),
          y: Math.min(start.y, end.y),
          width: Math.abs(end.x - start.x),
          height: Math.abs(end.y - start.y),
          rotation: 0,
          color: currentColor,
          lineWidth: currentLineWidth,
          text: currentTool === 'sticky' ? '双击编辑' : (currentTool === 'text' ? '' : undefined),
          createdAt: now,
          updatedAt: now
        };
        
        if (currentTool === 'line' || currentTool === 'connector') {
          element.x = start.x;
          element.y = start.y;
          element.width = end.x - start.x;
          element.height = end.y - start.y;
        }
        
        onElementAdd(element);
      }
    }

    setIsDrawing(false);
    setDrawingPoints([]);
    setDragMode('none');
    setDragStart(null);
    setDragElement(null);
    setResizeHandle(null);
  }, [dragMode, drawingPoints, currentTool, currentColor, currentLineWidth, onElementAdd]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(viewTransform.scale * delta, MIN_SCALE), MAX_SCALE);
    
    const scaleChange = newScale / viewTransform.scale;
    const newX = mouseX - (mouseX - viewTransform.x) * scaleChange;
    const newY = mouseY - (mouseY - viewTransform.y) * scaleChange;

    setViewTransform({ x: newX, y: newY, scale: newScale });
  }, [viewTransform]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    const element = getElementAtPoint(worldPos);
    
    if (element && (element.type === 'sticky' || element.type === 'text')) {
      setEditingTextId(element.id);
      setEditingText(element.text || '');
    }
  }, [screenToWorld, getElementAtPoint]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedId && !editingTextId) {
        onElementDelete(selectedId);
        setSelectedId(null);
      }
    }
    
    if (e.key === 'Escape') {
      setSelectedId(null);
      setEditingTextId(null);
    }

    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
    }

    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
    }
  }, [selectedId, editingTextId, onElementDelete]);

  const handleTextSubmit = useCallback(() => {
    if (editingTextId) {
      onElementUpdate(editingTextId, { text: editingText });
      setEditingTextId(null);
      setEditingText('');
    }
  }, [editingTextId, editingText, onElementUpdate]);

  return (
    <div 
      ref={containerRef}
      className="canvas-wrapper"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <canvas ref={canvasRef} className="whiteboard-canvas" />
      
      {editingTextId && selectedElement && (
        <div 
          className="text-editor"
          style={{
            left: selectedElement.x * viewTransform.scale + viewTransform.x,
            top: selectedElement.y * viewTransform.scale + viewTransform.y,
            width: Math.max(selectedElement.width * viewTransform.scale, 100),
            height: Math.max(selectedElement.height * viewTransform.scale, 40),
            fontSize: 16 * viewTransform.scale
          }}
        >
          <textarea
            autoFocus
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={handleTextSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleTextSubmit();
              }
            }}
            placeholder="输入文字..."
          />
          <div className="text-editor-hint">按 Ctrl+Enter 确认</div>
        </div>
      )}
    </div>
  );
}

function rotatePoint(point: Point, center: Point, angle: number): Point {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: cos * (point.x - center.x) - sin * (point.y - center.y) + center.x,
    y: sin * (point.x - center.x) + cos * (point.y - center.y) + center.y
  };
}

function getResizeHandles(el: BaseElement): { x: number; y: number; type: string }[] {
  return [
    { x: el.x, y: el.y, type: 'nw' },
    { x: el.x + el.width, y: el.y, type: 'ne' },
    { x: el.x, y: el.y + el.height, type: 'sw' },
    { x: el.x + el.width, y: el.y + el.height, type: 'se' }
  ];
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = '#d1d5db';
  const offsetX = Math.floor(-ctx.getTransform().e / ctx.getTransform().a / GRID_SIZE) * GRID_SIZE;
  const offsetY = Math.floor(-ctx.getTransform().f / ctx.getTransform().d / GRID_SIZE) * GRID_SIZE;
  
  for (let x = offsetX; x < width + Math.abs(ctx.getTransform().e / ctx.getTransform().a) + GRID_SIZE; x += GRID_SIZE) {
    for (let y = offsetY; y < height + Math.abs(ctx.getTransform().f / ctx.getTransform().d) + GRID_SIZE; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawArrowhead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string, lineWidth: number) {
  const arrowSize = 8 + lineWidth * 2;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(
    x - arrowSize * Math.cos(angle - Math.PI / 6),
    y - arrowSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x - arrowSize * Math.cos(angle + Math.PI / 6),
    y - arrowSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split('');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

export default Canvas;
