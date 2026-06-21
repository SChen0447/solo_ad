import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Tree } from '../types';

interface TreeMapProps {
  trees: Tree[];
  onTreeClick: (treeId: string) => void;
  onTreeClaim: (treeId: string) => void;
  currentUserId: string;
}

interface ViewTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

const NODE_RADIUS = 20;
const NODE_HOVER_RADIUS = 26;
const GRID_SIZE = 40;

const TreeMap: React.FC<TreeMapProps> = ({ trees, onTreeClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewTransform>({ offsetX: 0, offsetY: 0, scale: 1 });
  const [hoveredTreeId, setHoveredTreeId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipTree, setTooltipTree] = useState<Tree | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false);
  const viewRef = useRef(view);
  const hoveredRef = useRef<string | null>(null);
  const animFrameRef = useRef<number>(0);

  viewRef.current = view;
  hoveredRef.current = hoveredTreeId;

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        setCanvasSize({ width: rect.width, height: rect.height });
        canvasRef.current.width = rect.width * dpr;
        canvasRef.current.height = rect.height * dpr;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const worldToScreen = useCallback((wx: number, wy: number, v: ViewTransform) => {
    return {
      x: wx * v.scale + v.offsetX + canvasSize.width / 2,
      y: wy * v.scale + v.offsetY + canvasSize.height / 2,
    };
  }, [canvasSize]);

  const screenToWorld = useCallback((sx: number, sy: number, v: ViewTransform) => {
    return {
      x: (sx - v.offsetX - canvasSize.width / 2) / v.scale,
      y: (sy - v.offsetY - canvasSize.height / 2) / v.scale,
    };
  }, [canvasSize]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const v = viewRef.current;
    const { width, height } = canvasSize;

    ctx.clearRect(0, 0, width, height);

    const gridSpacing = GRID_SIZE * v.scale;
    const gridOffsetX = ((v.offsetX + width / 2) % gridSpacing + gridSpacing) % gridSpacing;
    const gridOffsetY = ((v.offsetY + height / 2) % gridSpacing + gridSpacing) % gridSpacing;

    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = gridOffsetX; x < width; x += gridSpacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = gridOffsetY; y < height; y += gridSpacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    const hovered = hoveredRef.current;

    for (const tree of trees) {
      const pos = worldToScreen(tree.x, tree.y, v);
      const isHovered = hovered === tree.id;
      const currentRadius = (isHovered ? NODE_HOVER_RADIUS : NODE_RADIUS) * v.scale;

      if (isHovered) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, currentRadius + 8 * v.scale, 0, Math.PI * 2);
        ctx.fillStyle = tree.speciesColor || '#BDBDBD';
        ctx.fill();
        ctx.restore();
      }

      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = tree.speciesColor || '#BDBDBD';
      ctx.fill();

      ctx.globalAlpha = 1;

      if (v.scale > 0.6 && isHovered) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${12 * v.scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const displayName = tree.species ? tree.species : '待认养';
        ctx.fillText(displayName.slice(0, 3), pos.x, pos.y);
      }
    }
  }, [trees, worldToScreen, canvasSize]);

  useEffect(() => {
    const render = () => {
      draw();
      animFrameRef.current = requestAnimationFrame(render);
    };
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragMoved.current = false;
    dragStart.current = { x: e.clientX - view.offsetX, y: e.clientY - view.offsetY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging.current) {
      const dx = e.clientX - dragStart.current.x - view.offsetX;
      const dy = e.clientY - dragStart.current.y - view.offsetY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        dragMoved.current = true;
      }
      const newOffsetX = e.clientX - dragStart.current.x;
      const newOffsetY = e.clientY - dragStart.current.y;
      setView(prev => ({ ...prev, offsetX: newOffsetX, offsetY: newOffsetY }));
      if (dragMoved.current && hoveredRef.current) {
        setHoveredTreeId(null);
        setTooltipTree(null);
      }
      return;
    }

    const worldPos = screenToWorld(mouseX, mouseY, view);
    let found: Tree | null = null;
    let minDist = Infinity;
    for (const tree of trees) {
      const dx = worldPos.x - tree.x;
      const dy = worldPos.y - tree.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= NODE_RADIUS && dist < minDist) {
        found = tree;
        minDist = dist;
      }
    }

    if (found) {
      setHoveredTreeId(found.id);
      setTooltipTree(found);
      const screenPos = worldToScreen(found.x, found.y, view);
      setTooltipPos({ x: screenPos.x + 20, y: screenPos.y - 30 });
    } else if (hoveredRef.current) {
      setHoveredTreeId(null);
      setTooltipTree(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging.current && !dragMoved.current) {
      handleClick(e);
    }
    isDragging.current = false;
    dragMoved.current = false;
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
    dragMoved.current = false;
    setHoveredTreeId(null);
    setTooltipTree(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldBefore = screenToWorld(mouseX, mouseY, view);

    const newScale = Math.max(0.2, Math.min(5, view.scale * delta));
    const newView = { ...view, scale: newScale };

    const worldAfter = screenToWorld(mouseX, mouseY, newView);
    newView.offsetX += (worldAfter.x - worldBefore.x) * newScale;
    newView.offsetY += (worldAfter.y - worldBefore.y) * newScale;

    setView(newView);
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldPos = screenToWorld(mouseX, mouseY, view);

    for (const tree of trees) {
      const dx = worldPos.x - tree.x;
      const dy = worldPos.y - tree.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= NODE_RADIUS) {
        onTreeClick(tree.id);
        break;
      }
    }
  };

  const handleZoomIn = () => {
    setView(prev => ({ ...prev, scale: Math.min(5, prev.scale * 1.3) }));
  };

  const handleZoomOut = () => {
    setView(prev => ({ ...prev, scale: Math.max(0.2, prev.scale / 1.3) }));
  };

  const handleReset = () => {
    setView({ offsetX: 0, offsetY: 0, scale: 1 });
  };

  return (
    <div className="tree-map-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="tree-map-canvas"
        style={{ width: canvasSize.width, height: canvasSize.height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />
      {tooltipTree && (
        <div
          className="tree-tooltip"
          style={{
            left: Math.min(tooltipPos.x, canvasSize.width - 180),
            top: Math.max(tooltipPos.y, 10),
          }}
        >
          <div className="tree-tooltip-name">{tooltipTree.name}</div>
          <div className="tree-tooltip-info">品种: {tooltipTree.species || '（认领后揭晓）'}</div>
          <div className="tree-tooltip-info">
            {tooltipTree.claimerName ? `认养人: ${tooltipTree.claimerName}` : '🌱 待认养'}
          </div>
        </div>
      )}
      <div className="tree-map-controls">
        <button onClick={handleZoomIn} title="放大">+</button>
        <button onClick={handleZoomOut} title="缩小">−</button>
        <button onClick={handleReset} title="重置视图">⌂</button>
      </div>
      <div className="tree-map-hint">
        拖拽平移 · 滚轮缩放 · 点击树木查看详情
      </div>
    </div>
  );
};

export default TreeMap;
