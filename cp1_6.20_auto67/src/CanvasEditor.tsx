import { useRef, useEffect, useCallback, useState } from 'react';
import { useStore } from './store';
import type { Shape, MindMapNode } from './types';

const HANDLE_SIZE = 8;
const EASING_DURATION = 150;

interface HandlePosition {
  x: number;
  y: number;
  cursor: string;
  type: string;
}

function getHandles(shape: Shape): HandlePosition[] {
  const { x, y, width, height } = shape;
  return [
    { x: x, y: y, cursor: 'nwse-resize', type: 'tl' },
    { x: x + width / 2, y: y, cursor: 'ns-resize', type: 'tc' },
    { x: x + width, y: y, cursor: 'nesw-resize', type: 'tr' },
    { x: x + width, y: y + height / 2, cursor: 'ew-resize', type: 'mr' },
    { x: x + width, y: y + height, cursor: 'nwse-resize', type: 'br' },
    { x: x + width / 2, y: y + height, cursor: 'ns-resize', type: 'bc' },
    { x: x, y: y + height, cursor: 'nesw-resize', type: 'bl' },
    { x: x, y: y + height / 2, cursor: 'ew-resize', type: 'ml' },
  ];
}

function hitTest(shape: Shape, mx: number, my: number): boolean {
  if (shape.type === 'circle') {
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;
    const rx = shape.width / 2;
    const ry = shape.height / 2;
    return ((mx - cx) / rx) ** 2 + ((my - cy) / ry) ** 2 <= 1;
  }
  if (shape.type === 'freehand' && shape.points) {
    for (const p of shape.points) {
      if (Math.hypot(mx - p.x, my - p.y) < 10) return true;
    }
    return false;
  }
  return mx >= shape.x && mx <= shape.x + shape.width && my >= shape.y && my <= shape.y + shape.height;
}

function generateId(): string {
  return 's_' + Math.random().toString(36).substr(2, 9);
}

export default function CanvasEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const {
    shapes, selectedId, tool, color, strokeWidth, mode,
    remoteSelections, mindMapData, mindMapTransition,
    addShape, updateShape, selectShape, pushHistory,
    undo, redo, deleteShape,
  } = useStore();

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [resizeOrigin, setResizeOrigin] = useState<Shape | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });

  const easeOut = useCallback((t: number) => 1 - Math.pow(1 - t, 3), []);

  const getMousePos = useCallback((e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: Shape, isSelected: boolean, remoteColor?: string) => {
    ctx.save();
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (remoteColor) {
      ctx.shadowColor = remoteColor;
      ctx.shadowBlur = 12;
      ctx.fillStyle = remoteColor + '33';
    }

    switch (shape.type) {
      case 'rect':
        if (remoteColor) ctx.fillRect(shape.x - 4, shape.y - 4, shape.width + 8, shape.height + 8);
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        break;
      case 'circle': {
        const cx = shape.x + shape.width / 2;
        const cy = shape.y + shape.height / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, shape.width / 2, shape.height / 2, 0, 0, Math.PI * 2);
        if (remoteColor) ctx.fill();
        ctx.stroke();
        break;
      }
      case 'freehand':
        if (shape.points && shape.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
          }
          ctx.stroke();
        }
        break;
      case 'sticky': {
        ctx.fillStyle = '#fef3c7';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        if (remoteColor) {
          ctx.shadowColor = remoteColor;
          ctx.shadowBlur = 12;
          ctx.fillRect(shape.x - 4, shape.y - 4, shape.width + 8, shape.height + 8);
        }
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        if (shape.text) {
          ctx.fillStyle = '#1f2937';
          ctx.font = '14px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const lines = shape.text.split('\n');
          const lineHeight = 20;
          const startY = shape.y + shape.height / 2 - ((lines.length - 1) * lineHeight) / 2;
          lines.forEach((line, i) => {
            ctx.fillText(line, shape.x + shape.width / 2, startY + i * lineHeight, shape.width - 16);
          });
        }
        break;
      }
    }

    if (isSelected && !remoteColor) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#4a90d9';
      ctx.lineWidth = 1;
      ctx.strokeRect(shape.x - 2, shape.y - 2, shape.width + 4, shape.height + 4);
      ctx.setLineDash([]);

      const handles = getHandles(shape);
      handles.forEach((h) => {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#4a90d9';
        ctx.lineWidth = 1.5;
        ctx.fillRect(h.x - HANDLE_SIZE / 2, h.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        ctx.strokeRect(h.x - HANDLE_SIZE / 2, h.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      });
    }

    ctx.restore();
  }, []);

  const drawMindMap = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!mindMapData) return;

    ctx.save();

    const progress = mindMapTransition ? Math.min(1, (Date.now() - (window as unknown as Record<string, number>)._mmStartTime) / 500) : 1;
    const alpha = easeOut(progress);

    ctx.globalAlpha = alpha;

    mindMapData.connections.forEach((conn) => {
      const fromNode = findNode(mindMapData.root, conn.from);
      const toNode = findNode(mindMapData.root, conn.to);
      if (!fromNode || !toNode) return;
      if (toNode.opacity === 0) return;

      const fx = fromNode.x + 80;
      const fy = fromNode.y + 25;
      const tx = toNode.x + 80;
      const ty = toNode.y + 25;

      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.bezierCurveTo(conn.controlPoints[0].x + 80, conn.controlPoints[0].y + 25, conn.controlPoints[1].x + 80, conn.controlPoints[1].y + 25, tx, ty);
      ctx.strokeStyle = '#4a90d9';
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha * toNode.opacity;
      ctx.stroke();
    });

    function drawNode(node: MindMapNode) {
      if (node.opacity === 0) return;
      ctx.globalAlpha = alpha * node.opacity;

      const isRoot = node.id === 'root';
      const w = isRoot ? 180 : 160;
      const h = isRoot ? 56 : 44;

      ctx.fillStyle = isRoot ? '#4a90d9' : '#ffffff';
      ctx.strokeStyle = '#4a90d9';
      ctx.lineWidth = isRoot ? 0 : 1.5;

      const r = 8;
      const nx = node.x;
      const ny = node.y;

      ctx.beginPath();
      ctx.moveTo(nx + r, ny);
      ctx.lineTo(nx + w - r, ny);
      ctx.quadraticCurveTo(nx + w, ny, nx + w, ny + r);
      ctx.lineTo(nx + w, ny + h - r);
      ctx.quadraticCurveTo(nx + w, ny + h, nx + w - r, ny + h);
      ctx.lineTo(nx + r, ny + h);
      ctx.quadraticCurveTo(nx, ny + h, nx, ny + h - r);
      ctx.lineTo(nx, ny + r);
      ctx.quadraticCurveTo(nx, ny, nx + r, ny);
      ctx.closePath();

      ctx.fill();
      if (!isRoot) ctx.stroke();

      ctx.fillStyle = isRoot ? '#ffffff' : '#1f2937';
      ctx.font = isRoot ? 'bold 16px -apple-system, sans-serif' : '14px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.text, nx + w / 2, ny + h / 2, w - 20);

      if (node.children.length > 0) {
        const btnX = nx + w - 20;
        const btnY = ny + h / 2;
        ctx.fillStyle = '#e0e7ff';
        ctx.beginPath();
        ctx.arc(btnX, btnY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4a90d9';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(node.collapsed ? '+' : '−', btnX, btnY);
      }

      node.children.forEach(drawNode);
    }

    drawNode(mindMapData.root);
    ctx.restore();
  }, [mindMapData, mindMapTransition, easeOut]);

  const findNode = useCallback((node: MindMapNode, id: string): MindMapNode | null => {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    if (mode === 'mindmap' && mindMapData) {
      drawMindMap(ctx);
    } else {
      shapes.forEach((shape) => {
        const isSelected = shape.id === selectedId;
        const remoteInfo = Object.values(remoteSelections).find((r) => r.shapeId === shape.id);
        drawShape(ctx, shape, isSelected, remoteInfo?.color);
      });

      if (currentShape) {
        drawShape(ctx, currentShape, false);
      }
    }

    animFrameRef.current = requestAnimationFrame(render);
  }, [shapes, selectedId, currentShape, remoteSelections, mode, mindMapData, drawShape, drawMindMap]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  useEffect(() => {
    const resize = () => {
      const container = containerRef.current;
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      setCanvasSize({ w, h });
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = w * window.devicePixelRatio;
        canvas.height = h * window.devicePixelRatio;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingNodeId) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          deleteShape(selectedId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedId, deleteShape, editingNodeId]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);

    if (mode === 'mindmap' && mindMapData) {
      const node = findClickedNode(pos.x, pos.y);
      if (node) {
        if (node.children.length > 0) {
          const cx = node.x + 160 - 20;
          const cy = node.y + (node.id === 'root' ? 28 : 22);
          if (Math.hypot(pos.x - cx, pos.y - cy) < 12) {
            toggleCollapse(node.id);
            return;
          }
        }
      }
      return;
    }

    if (tool === 'select') {
      if (selectedId) {
        const shape = shapes.find((s) => s.id === selectedId);
        if (shape) {
          const handles = getHandles(shape);
          for (const h of handles) {
            if (Math.abs(pos.x - h.x) <= HANDLE_SIZE && Math.abs(pos.y - h.y) <= HANDLE_SIZE) {
              setActiveHandle(h.type);
              setResizeOrigin({ ...shape });
              return;
            }
          }
        }
      }

      let found: Shape | null = null;
      for (let i = shapes.length - 1; i >= 0; i--) {
        if (hitTest(shapes[i], pos.x, pos.y)) {
          found = shapes[i];
          break;
        }
      }

      if (found) {
        selectShape(found.id);
        setDragOffset({ x: pos.x - found.x, y: pos.y - found.y });
        setIsDrawing(true);
      } else {
        selectShape(null);
      }
      return;
    }

    setIsDrawing(true);
    setDrawStart(pos);

    if (tool === 'freehand') {
      setCurrentShape({
        id: generateId(),
        type: 'freehand',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color,
        strokeWidth,
        points: [{ x: pos.x, y: pos.y }],
      });
    } else if (tool === 'sticky') {
      const newShape: Shape = {
        id: generateId(),
        type: 'sticky',
        x: pos.x - 75,
        y: pos.y - 25,
        width: 150,
        height: 80,
        color,
        strokeWidth: 1,
        text: '双击编辑',
      };
      addShape(newShape);
      selectShape(newShape.id);
      setIsDrawing(false);
    } else {
      setCurrentShape({
        id: generateId(),
        type: tool as 'rect' | 'circle',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color,
        strokeWidth,
      });
    }
  }, [tool, color, strokeWidth, shapes, selectedId, mode, mindMapData, getMousePos, addShape, selectShape]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);

    if (mode === 'mindmap') return;

    if (tool === 'select') {
      if (activeHandle && resizeOrigin && selectedId) {
        const shape = shapes.find((s) => s.id === selectedId);
        if (!shape) return;
        const updates = calcResize(activeHandle, pos, resizeOrigin);
        updateShape(selectedId, updates);
        return;
      }

      if (selectedId) {
        const shape = shapes.find((s) => s.id === selectedId);
        if (shape) {
          updateShape(selectedId, {
            x: pos.x - dragOffset.x,
            y: pos.y - dragOffset.y,
          });
        }
      }
      return;
    }

    if (currentShape) {
      if (currentShape.type === 'freehand') {
        setCurrentShape((prev) => {
          if (!prev || !prev.points) return prev;
          const newPoints = [...prev.points, { x: pos.x, y: pos.y }];
          const xs = newPoints.map((p) => p.x);
          const ys = newPoints.map((p) => p.y);
          return {
            ...prev,
            points: newPoints,
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys),
          };
        });
      } else {
        const dx = pos.x - drawStart.x;
        const dy = pos.y - drawStart.y;
        setCurrentShape((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            x: dx >= 0 ? drawStart.x : pos.x,
            y: dy >= 0 ? drawStart.y : pos.y,
            width: Math.abs(dx),
            height: Math.abs(dy),
          };
        });
      }
    }
  }, [isDrawing, tool, currentShape, drawStart, selectedId, shapes, dragOffset, activeHandle, resizeOrigin, mode, getMousePos, updateShape]);

  const handleMouseUp = useCallback(() => {
    if (tool === 'select' && isDrawing) {
      if (activeHandle || selectedId) {
        pushHistory();
      }
      setActiveHandle(null);
      setResizeOrigin(null);
      setIsDrawing(false);
      return;
    }

    if (currentShape && isDrawing) {
      if (currentShape.type === 'freehand' || currentShape.width > 5 || currentShape.height > 5) {
        addShape(currentShape);
      }
    }

    setCurrentShape(null);
    setIsDrawing(false);
  }, [isDrawing, tool, currentShape, selectedId, activeHandle, addShape, pushHistory]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);

    if (mode === 'mindmap' && mindMapData) {
      const node = findClickedNode(pos.x, pos.y);
      if (node) {
        setEditingNodeId(node.id);
        setEditText(node.text);
      }
      return;
    }

    for (let i = shapes.length - 1; i >= 0; i--) {
      if (hitTest(shapes[i], pos.x, pos.y) && shapes[i].type === 'sticky') {
        setEditingNodeId(shapes[i].id);
        setEditText(shapes[i].text || '');
        return;
      }
    }
  }, [shapes, mode, mindMapData, getMousePos]);

  const findClickedNode = useCallback((mx: number, my: number): MindMapNode | null => {
    if (!mindMapData) return null;

    function search(node: MindMapNode): MindMapNode | null {
      if (node.opacity === 0) return null;
      const w = node.id === 'root' ? 180 : 160;
      const h = node.id === 'root' ? 56 : 44;
      if (mx >= node.x && mx <= node.x + w && my >= node.y && my <= node.y + h) {
        return node;
      }
      for (const child of node.children) {
        const found = search(child);
        if (found) return found;
      }
      return null;
    }

    return search(mindMapData.root);
  }, [mindMapData]);

  const toggleCollapse = useCallback((nodeId: string) => {
    if (!mindMapData) return;
    const updated = JSON.parse(JSON.stringify(mindMapData)) as typeof mindMapData;

    function setCollapsed(node: MindMapNode): boolean {
      if (node.id === nodeId) {
        node.collapsed = !node.collapsed;
        setChildOpacity(node, node.collapsed ? 0 : 1);
        return true;
      }
      for (const child of node.children) {
        if (setCollapsed(child)) return true;
      }
      return false;
    }

    function setChildOpacity(node: MindMapNode, opacity: number) {
      node.children.forEach((child) => {
        child.opacity = opacity;
        if (opacity === 0) {
          setChildOpacity(child, 0);
        } else if (!child.collapsed) {
          setChildOpacity(child, 1);
        }
      });
    }

    setCollapsed(updated.root);
    useStore.getState().setMindMapData(updated);
  }, [mindMapData]);

  const commitEdit = useCallback(() => {
    if (!editingNodeId) return;

    if (mode === 'mindmap' && mindMapData) {
      const updated = JSON.parse(JSON.stringify(mindMapData)) as typeof mindMapData;
      const node = findNodeInTree(updated.root, editingNodeId);
      if (node) node.text = editText;
      useStore.getState().setMindMapData(updated);
    } else {
      updateShape(editingNodeId, { text: editText });
    }

    setEditingNodeId(null);
    setEditText('');
  }, [editingNodeId, editText, mode, mindMapData, updateShape]);

  const findNodeInTree = (node: MindMapNode, id: string): MindMapNode | null => {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = findNodeInTree(child, id);
      if (found) return found;
    }
    return null;
  };

  const calcResize = (handle: string, pos: { x: number; y: number }, origin: Shape) => {
    const result: Partial<Shape> = {};
    switch (handle) {
      case 'tl':
        result.x = pos.x;
        result.y = pos.y;
        result.width = origin.x + origin.width - pos.x;
        result.height = origin.y + origin.height - pos.y;
        break;
      case 'tc':
        result.y = pos.y;
        result.height = origin.y + origin.height - pos.y;
        break;
      case 'tr':
        result.y = pos.y;
        result.width = pos.x - origin.x;
        result.height = origin.y + origin.height - pos.y;
        break;
      case 'mr':
        result.width = pos.x - origin.x;
        break;
      case 'br':
        result.width = pos.x - origin.x;
        result.height = pos.y - origin.y;
        break;
      case 'bc':
        result.height = pos.y - origin.y;
        break;
      case 'bl':
        result.x = pos.x;
        result.width = origin.x + origin.width - pos.x;
        result.height = pos.y - origin.y;
        break;
      case 'ml':
        result.x = pos.x;
        result.width = origin.x + origin.width - pos.x;
        break;
    }
    if (result.width !== undefined && result.width < 20) result.width = 20;
    if (result.height !== undefined && result.height < 20) result.height = 20;
    return result;
  };

  const getCursor = () => {
    if (mode === 'mindmap') return 'default';
    if (tool === 'select') return 'default';
    if (tool === 'freehand') return 'crosshair';
    return 'crosshair';
  };

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ background: '#f0f4f8' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ cursor: getCursor() }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />
      {editingNodeId && (
        <input
          className="absolute z-10 border border-blue-400 rounded px-2 py-1 text-sm outline-none"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            minWidth: 200,
          }}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') {
              setEditingNodeId(null);
              setEditText('');
            }
          }}
          autoFocus
        />
      )}
    </div>
  );
}
