import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CanvasElement, StrokeElement, StickyElement, ArrowElement, ToolType, OnlineUser } from '../types';

interface CanvasProps {
  elements: CanvasElement[];
  tool: ToolType;
  color: string;
  thickness: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddElement: (element: Omit<CanvasElement, 'id' | 'updatedAt'>) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onlineUsers: OnlineUser[];
  currentUserId: string;
  onCursorMove: (x: number, y: number) => void;
  stickyShape: 'rectangle' | 'circle' | 'hexagon';
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

const Canvas: React.FC<CanvasProps> = ({
  elements,
  tool,
  color,
  thickness,
  selectedId,
  onSelect,
  onAddElement,
  onUpdateElement,
  onDeleteElement,
  onlineUsers,
  currentUserId,
  onCursorMove,
  stickyShape,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [arrowStart, setArrowStart] = useState<string | null>(null);
  const [editingStickyId, setEditingStickyId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [animatingScale, setAnimatingScale] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>(0);
  const pulseTime = useRef(0);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (sx - rect.left - viewport.x) / viewport.scale,
      y: (sy - rect.top - viewport.y) / viewport.scale,
    };
  }, [viewport]);

  const worldToScreen = useCallback((wx: number, wy: number) => {
    return {
      x: wx * viewport.scale + viewport.x,
      y: wy * viewport.scale + viewport.y,
    };
  }, [viewport]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(true);
      }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedId && !editingStickyId) {
          e.preventDefault();
          onDeleteElement(selectedId);
          onSelect(null);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedId, editingStickyId, onDeleteElement, onSelect]);

  const getElementAtPoint = useCallback((wx: number, wy: number): CanvasElement | null => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.deleted) continue;
      
      if (el.type === 'sticky') {
        if (wx >= el.x && wx <= el.x + el.width && wy >= el.y && wy <= el.y + el.height) {
          return el;
        }
      } else if (el.type === 'stroke') {
        for (const p of el.points) {
          const dist = Math.sqrt((p.x - wx) ** 2 + (p.y - wy) ** 2);
          if (dist <= el.thickness / 2 + 5) {
            return el;
          }
        }
      } else if (el.type === 'arrow') {
        const startEl = elements.find(e => e.id === el.startElementId);
        const endEl = elements.find(e => e.id === el.endElementId);
        if (startEl && endEl) {
          const start = getElementCenter(startEl);
          const end = getElementCenter(endEl);
          const dist = pointToLineDistance(wx, wy, start.x, start.y, end.x, end.y);
          if (dist < 10) return el;
        }
      }
    }
    return null;
  }, [elements]);

  const getElementCenter = (el: CanvasElement): { x: number; y: number } => {
    if (el.type === 'sticky') {
      return { x: el.x + el.width / 2, y: el.y + el.height / 2 };
    }
    return { x: el.x, y: el.y };
  };

  const pointToLineDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = lenSq !== 0 ? dot / lenSq : -1;
    let xx, yy;
    if (param < 0) { xx = x1; yy = y1; }
    else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }
    return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
  };

  const getEdgeMidpoint = (el: CanvasElement, targetX: number, targetY: number): { x: number; y: number } => {
    if (el.type !== 'sticky') return getElementCenter(el);
    
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const dx = targetX - cx;
    const dy = targetY - cy;
    const hw = el.width / 2;
    const hh = el.height / 2;
    
    if (Math.abs(dx) * hh > Math.abs(dy) * hw) {
      return { x: cx + Math.sign(dx) * hw, y: cy + (dy / Math.abs(dx)) * hw };
    } else {
      return { x: cx + (dx / Math.abs(dy)) * hh, y: cy + Math.sign(dy) * hh };
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    setCursorPos({ x: e.clientX, y: e.clientY });
    onCursorMove(worldPos.x, worldPos.y);

    if (isSpacePressed || e.button === 1) {
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (tool === 'pen') {
      setIsDrawing(true);
      setCurrentStroke([worldPos]);
      setDrawStart(worldPos);
      return;
    }

    if (tool === 'sticky') {
      const newSticky: Omit<StickyElement, 'id' | 'updatedAt'> = {
        type: 'sticky',
        x: worldPos.x - 80,
        y: worldPos.y - 60,
        width: 160,
        height: 120,
        text: '双击编辑',
        bgColor: '#FFF9C4',
        shape: stickyShape,
      };
      onAddElement(newSticky as Omit<CanvasElement, 'id' | 'updatedAt'>);
      return;
    }

    if (tool === 'arrow') {
      const clickedEl = getElementAtPoint(worldPos.x, worldPos.y);
      if (clickedEl) {
        if (arrowStart) {
          if (arrowStart !== clickedEl.id) {
            const newArrow: Omit<ArrowElement, 'id' | 'updatedAt'> = {
              type: 'arrow',
              x: 0,
              y: 0,
              startElementId: arrowStart,
              endElementId: clickedEl.id,
              color: color,
            };
            onAddElement(newArrow as Omit<CanvasElement, 'id' | 'updatedAt'>);
          }
          setArrowStart(null);
        } else {
          setArrowStart(clickedEl.id);
        }
      }
      return;
    }

    if (tool === 'select') {
      const clickedEl = getElementAtPoint(worldPos.x, worldPos.y);
      
      if (clickedEl && selectedId === clickedEl.id) {
        const handles = getResizeHandles(clickedEl);
        for (const handle of handles) {
          const dist = Math.sqrt((worldPos.x - handle.x) ** 2 + (worldPos.y - handle.y) ** 2);
          if (dist < 10 / viewport.scale) {
            setIsResizing(true);
            setResizeHandle(handle.position);
            setDrawStart(worldPos);
            return;
          }
        }
      }

      if (clickedEl) {
        onSelect(clickedEl.id);
        setIsDragging(true);
        dragOffset.current = { x: worldPos.x - clickedEl.x, y: worldPos.y - clickedEl.y };
        if (clickedEl.type === 'sticky') {
          setEditingStickyId(null);
        }
      } else {
        onSelect(null);
      }
      return;
    }

    if (tool === 'eraser') {
      const clickedEl = getElementAtPoint(worldPos.x, worldPos.y);
      if (clickedEl) {
        onDeleteElement(clickedEl.id);
        if (selectedId === clickedEl.id) {
          onSelect(null);
        }
      }
    }
  };

  const getResizeHandles = (el: CanvasElement) => {
    if (el.type !== 'sticky') return [];
    const handles = [];
    const positions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
    for (const pos of positions) {
      let x = el.x, y = el.y;
      if (pos.includes('e')) x += el.width;
      if (pos.includes('w')) x += 0;
      if (pos === 'n' || pos === 's') x += el.width / 2;
      if (pos.includes('s')) y += el.height;
      if (pos.includes('n')) y += 0;
      if (pos === 'e' || pos === 'w') y += el.height / 2;
      handles.push({ x, y, position: pos });
    }
    return handles;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    setCursorPos({ x: e.clientX, y: e.clientY });
    onCursorMove(worldPos.x, worldPos.y);

    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setViewport(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (isDrawing) {
      setCurrentStroke(prev => [...prev, worldPos]);
      return;
    }

    if (isDragging && selectedId) {
      const newX = worldPos.x - dragOffset.current.x;
      const newY = worldPos.y - dragOffset.current.y;
      onUpdateElement(selectedId, { x: newX, y: newY } as Partial<CanvasElement>);
      return;
    }

    if (isResizing && selectedId && resizeHandle) {
      const el = elements.find(e => e.id === selectedId);
      if (el && el.type === 'sticky') {
        let newWidth = el.width;
        let newHeight = el.height;
        let newX = el.x;
        let newY = el.y;

        if (resizeHandle.includes('e')) {
          newWidth = Math.max(50, worldPos.x - el.x);
        }
        if (resizeHandle.includes('w')) {
          const dx = worldPos.x - el.x;
          newWidth = Math.max(50, el.width - dx);
          newX = el.x + el.width - newWidth;
        }
        if (resizeHandle.includes('s')) {
          newHeight = Math.max(40, worldPos.y - el.y);
        }
        if (resizeHandle.includes('n')) {
          const dy = worldPos.y - el.y;
          newHeight = Math.max(40, el.height - dy);
          newY = el.y + el.height - newHeight;
        }

        onUpdateElement(selectedId, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        } as Partial<CanvasElement>);
      }
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && currentStroke.length > 1) {
      const newStroke: Omit<StrokeElement, 'id' | 'updatedAt'> = {
        type: 'stroke',
        x: currentStroke[0].x,
        y: currentStroke[0].y,
        points: currentStroke,
        color,
        thickness,
      };
      onAddElement(newStroke as Omit<CanvasElement, 'id' | 'updatedAt'>);
    }

    setIsPanning(false);
    setIsDrawing(false);
    setIsDragging(false);
    setIsResizing(false);
    setCurrentStroke([]);
    setArrowStart(null);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    const clickedEl = getElementAtPoint(worldPos.x, worldPos.y);
    
    if (clickedEl && clickedEl.type === 'sticky') {
      setEditingStickyId(clickedEl.id);
      setEditingText(clickedEl.text);
      onSelect(clickedEl.id);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingText(e.target.value);
  };

  const handleTextBlur = () => {
    if (editingStickyId) {
      onUpdateElement(editingStickyId, { text: editingText } as Partial<CanvasElement>);
      setEditingStickyId(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, viewport.scale * delta));

    setAnimatingScale(true);
    setViewport(prev => {
      const worldX = (mouseX - prev.x) / prev.scale;
      const worldY = (mouseY - prev.y) / prev.scale;
      return {
        scale: newScale,
        x: mouseX - worldX * newScale,
        y: mouseY - worldY * newScale,
      };
    });

    setTimeout(() => setAnimatingScale(false), 150);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = 0;
    const render = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      pulseTime.current = (pulseTime.current + delta) % 1000;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(viewport.x, viewport.y);
      ctx.scale(viewport.scale, viewport.scale);

      drawGrid(ctx, canvas.width / viewport.scale, canvas.height / viewport.scale);

      for (const el of elements) {
        if (el.deleted) continue;
        if (el.type === 'arrow') {
          drawArrow(ctx, el as ArrowElement);
        }
      }

      for (const el of elements) {
        if (el.deleted) continue;
        if (el.type === 'stroke') {
          drawStroke(ctx, el as StrokeElement);
        } else if (el.type === 'sticky') {
          drawSticky(ctx, el as StickyElement, el.id === selectedId);
        }
      }

      if (isDrawing && currentStroke.length > 0) {
        drawCurrentStroke(ctx);
      }

      if (arrowStart) {
        const startEl = elements.find(e => e.id === arrowStart);
        if (startEl) {
          const start = getElementCenter(startEl);
          const mouseWorld = screenToWorld(cursorPos.x, cursorPos.y);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2 / viewport.scale;
          ctx.setLineDash([5 / viewport.scale, 5 / viewport.scale]);
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(mouseWorld.x, mouseWorld.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      ctx.restore();

      for (const user of onlineUsers) {
        if (user.id === currentUserId) continue;
        drawUserCursor(ctx, user);
      }

      if (tool === 'pen' || isDrawing) {
        drawCursorCoords(ctx);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationRef.current);
  }, [elements, viewport, currentStroke, isDrawing, selectedId, onlineUsers, arrowStart, color, cursorPos, tool]);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 50;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1 / viewport.scale;

    const offsetX = -viewport.x / viewport.scale % gridSize;
    const offsetY = -viewport.y / viewport.scale % gridSize;

    const startX = -offsetX - gridSize;
    const startY = -offsetY - gridSize;
    const endX = width + gridSize;
    const endY = height + gridSize;

    for (let x = startX; x < endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = startY; y < endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, el: StrokeElement) => {
    if (el.points.length < 2) return;
    ctx.strokeStyle = el.color;
    ctx.lineWidth = el.thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(el.points[0].x, el.points[0].y);
    for (let i = 1; i < el.points.length; i++) {
      ctx.lineTo(el.points[i].x, el.points[i].y);
    }
    ctx.stroke();
  };

  const drawCurrentStroke = (ctx: CanvasRenderingContext2D) => {
    if (currentStroke.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
    for (let i = 1; i < currentStroke.length; i++) {
      ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
    }
    ctx.stroke();
  };

  const drawSticky = (ctx: CanvasRenderingContext2D, el: StickyElement, selected: boolean) => {
    ctx.save();
    
    if (selected && isDragging) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      drawStickyShape(ctx, el.x + 5, el.y + 5, el.width, el.height, el.shape);
    }

    ctx.fillStyle = el.bgColor;
    ctx.strokeStyle = selected ? '#e94560' : 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = selected ? 2 / viewport.scale : 1 / viewport.scale;
    
    drawStickyShape(ctx, el.x, el.y, el.width, el.height, el.shape);

    ctx.fillStyle = '#333';
    ctx.font = `${14 / viewport.scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    wrapText(ctx, el.text, el.x + el.width / 2, el.y + el.height / 2, el.width - 20, 18 / viewport.scale);

    if (selected) {
      const handles = getResizeHandles(el);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1 / viewport.scale;
      for (const handle of handles) {
        const size = 6 / viewport.scale;
        ctx.fillRect(handle.x - size / 2, handle.y - size / 2, size, size);
        ctx.strokeRect(handle.x - size / 2, handle.y - size / 2, size, size);
      }
    }

    ctx.restore();
  };

  const drawStickyShape = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, shape: string) => {
    ctx.beginPath();
    if (shape === 'circle') {
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else if (shape === 'hexagon') {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rw = w / 2;
      const rh = h / 2;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const px = cx + rw * Math.cos(angle);
        const py = cy + rh * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else {
      const radius = 8 / viewport.scale;
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
    }
    ctx.fill();
    ctx.stroke();
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const lines = text.split('\n');
    const allLines: string[] = [];
    
    for (const line of lines) {
      let currentLine = '';
      const chars = line.split('');
      for (let i = 0; i < chars.length; i++) {
        const testLine = currentLine + chars[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          allLines.push(currentLine);
          currentLine = chars[i];
        } else {
          currentLine = testLine;
        }
      }
      allLines.push(currentLine);
    }

    const startY = y - (allLines.length - 1) * lineHeight / 2;
    for (let i = 0; i < allLines.length; i++) {
      ctx.fillText(allLines[i], x, startY + i * lineHeight);
    }
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, el: ArrowElement) => {
    const startEl = elements.find(e => e.id === el.startElementId);
    const endEl = elements.find(e => e.id === el.endElementId);
    if (!startEl || !endEl) return;

    const endCenter = getElementCenter(endEl);
    const startCenter = getElementCenter(startEl);
    
    const start = getEdgeMidpoint(startEl, endCenter.x, endCenter.y);
    const end = getEdgeMidpoint(endEl, startCenter.x, startCenter.y);

    const pulseIntensity = 0.5 + 0.5 * Math.sin((pulseTime.current / 1000) * Math.PI * 2);
    
    ctx.save();
    ctx.shadowColor = '#45B7D1';
    ctx.shadowBlur = (10 + pulseIntensity * 10) / viewport.scale;
    ctx.strokeStyle = el.color;
    ctx.lineWidth = 2 / viewport.scale;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const headLen = 12 / viewport.scale;
    
    ctx.fillStyle = el.color;
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  const drawUserCursor = (ctx: CanvasRenderingContext2D, user: OnlineUser) => {
    const screenPos = worldToScreen(user.cursorX, user.cursorY);
    
    ctx.save();
    ctx.fillStyle = user.color + '80';
    ctx.strokeStyle = user.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = user.color;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(user.nickname, screenPos.x + 14, screenPos.y);
    ctx.restore();
  };

  const drawCursorCoords = (ctx: CanvasRenderingContext2D) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const worldPos = screenToWorld(cursorPos.x, cursorPos.y);
    const text = `(${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`;
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.font = '11px monospace';
    const metrics = ctx.measureText(text);
    ctx.fillRect(cursorPos.x - rect.left + 15, cursorPos.y - rect.top - 18, metrics.width + 8, 18);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, cursorPos.x - rect.left + 19, cursorPos.y - rect.top - 5);
    ctx.restore();
  };

  const selectedElement = elements.find(e => e.id === selectedId);

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: getCursor() }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        style={{ display: 'block' }}
      />
      
      <div style={{
        position: 'absolute',
        right: 16,
        bottom: 16,
        padding: '4px 8px',
        backgroundColor: 'rgba(51, 51, 51, 0.7)',
        color: '#fff',
        borderRadius: 4,
        fontSize: 12,
        transition: 'opacity 0.15s ease',
        opacity: animatingScale ? 1 : 0.8,
      }}>
        {Math.round(viewport.scale * 100)}%
      </div>

      {editingStickyId && selectedElement && selectedElement.type === 'sticky' && (
        <textarea
          value={editingText}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          autoFocus
          style={{
            position: 'absolute',
            left: worldToScreen(selectedElement.x, selectedElement.y).x,
            top: worldToScreen(selectedElement.x, selectedElement.y).y,
            width: selectedElement.width * viewport.scale,
            height: selectedElement.height * viewport.scale,
            backgroundColor: selectedElement.bgColor,
            border: '2px solid #e94560',
            borderRadius: 8,
            padding: 10,
            fontSize: 14,
            fontFamily: 'sans-serif',
            resize: 'none',
            outline: 'none',
            pointerEvents: 'auto',
            transformOrigin: 'top left',
          }}
        />
      )}
    </div>
  );

  function getCursor() {
    if (isSpacePressed || isPanning) return 'grab';
    if (tool === 'pen') return 'crosshair';
    if (tool === 'eraser') return 'cell';
    if (isResizing) {
      if (resizeHandle === 'n' || resizeHandle === 's') return 'ns-resize';
      if (resizeHandle === 'e' || resizeHandle === 'w') return 'ew-resize';
      if (resizeHandle === 'nw' || resizeHandle === 'se') return 'nwse-resize';
      if (resizeHandle === 'ne' || resizeHandle === 'sw') return 'nesw-resize';
    }
    return 'default';
  }
};

export default Canvas;
