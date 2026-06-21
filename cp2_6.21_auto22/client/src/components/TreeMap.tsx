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

const TreeMap: React.FC<TreeMapProps> = ({ trees, onTreeClick, onTreeClaim }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewTransform>({ offsetX: 0, offsetY: 0, scale: 1 });
  const [hoveredTree, setHoveredTree] = useState<Tree | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const viewRef = useRef(view);
  const animFrameRef = useRef<number>(0);

  viewRef.current = view;

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
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

    const gridSpacing = 40 * v.scale;
    const gridOffsetX = (v.offsetX + width / 2) % gridSpacing;
    const gridOffsetY = (v.offsetY + height / 2) % gridSpacing;

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

    for (const tree of trees) {
      const pos = worldToScreen(tree.x, tree.y, v);
      const radius = 20 * v.scale;
      const isHovered = hoveredTree?.id === tree.id;
      const currentRadius = isHovered ? 26 * v.scale : radius;

      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = tree.speciesColor || '#BDBDBD';
      ctx.fill();

      if (isHovered) {
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, currentRadius + 6 * v.scale, 0, Math.PI * 2);
        ctx.fillStyle = tree.speciesColor || '#BDBDBD';
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }
  }, [trees, hoveredTree, worldToScreen, canvasSize]);

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
    dragStart.current = { x: e.clientX - view.offsetX, y: e.clientY - view.offsetY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging.current) {
      const newOffsetX = e.clientX - dragStart.current.x;
      const newOffsetY = e.clientY - dragStart.current.y;
      setView(prev => ({ ...prev, offsetX: newOffsetX, offsetY: newOffsetY }));
      setHoveredTree(null);
      return;
    }

    const worldPos = screenToWorld(mouseX, mouseY, view);
    let found: Tree | null = null;
    for (const tree of trees) {
      const dx = worldPos.x - tree.x;
      const dy = worldPos.y - tree.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 20) {
        found = tree;
        break;
      }
    }
    setHoveredTree(found);
    if (found) {
      const screenPos = worldToScreen(found.x, found.y, view);
      setTooltipPos({ x: screenPos.x + 30, y: screenPos.y - 10 });
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
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
    if (isDragging.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldPos = screenToWorld(mouseX, mouseY, view);

    for (const tree of trees) {
      const dx = worldPos.x - tree.x;
      const dy = worldPos.y - tree.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 20) {
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
      />
      {hoveredTree && (
        <div
          className="tree-tooltip"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="tree-tooltip-name">{hoveredTree.name}</div>
          <div className="tree-tooltip-info">品种: {hoveredTree.species}</div>
          <div className="tree-tooltip-info">
            {hoveredTree.claimerName ? `认养人: ${hoveredTree.claimerName}` : '待认养'}
          </div>
        </div>
      )}
      <div className="tree-map-controls">
        <button onClick={handleZoomIn} title="放大">+</button>
        <button onClick={handleZoomOut} title="缩小">−</button>
        <button onClick={handleReset} title="重置">⌂</button>
      </div>
    </div>
  );
};

export default TreeMap;
