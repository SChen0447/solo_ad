import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { GraphNode, GraphEdge } from './types';

export type LayoutType = 'force' | 'circle' | 'hierarchy';

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  searchQuery: string;
  layout: LayoutType;
  isEdgeMode: boolean;
  onEdgeModeChange: (active: boolean) => void;
  onNodeUpdate: (id: string, data: { x?: number; y?: number; name?: string; label?: string }) => void;
  onEdgeCreate: (source: string, target: string) => void;
  onNodeDoubleClick: (node: GraphNode) => void;
  onContextMenu: (x: number, y: number, nodeId?: string) => void;
}

export interface GraphCanvasRef {
  applyLayout: (layout: LayoutType) => void;
}

const NODE_RADIUS = 30;
const LABEL_COLORS: Record<string, string> = {
  '人物': '#ef4444',
  '事件': '#8b5cf6',
  '概念': '#3b82f6',
  '地点': '#10b981',
  '组织': '#f59e0b',
};

const GraphCanvas = forwardRef<GraphCanvasRef, GraphCanvasProps>((
  {
    nodes,
    edges,
    searchQuery,
    layout,
    isEdgeMode,
    onEdgeModeChange,
    onNodeUpdate,
    onEdgeCreate,
    onNodeDoubleClick,
    onContextMenu,
  },
  ref
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const nodesRef = useRef<GraphNode[]>([]);
  const targetNodesRef = useRef<GraphNode[]>([]);
  const animProgressRef = useRef<number>(1);
  const velocityRef = useRef<Map<string, { vx: number; vy: number }>>(new Map());
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragNodeRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const hoverNodeRef = useRef<string | null>(null);
  const edgeFirstNodeRef = useRef<string | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const newlyAddedRef = useRef<Set<string>>(new Set());
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useImperativeHandle(ref, () => ({
    applyLayout: (layoutType: LayoutType) => {
      applyLayout(layoutType);
    },
  }));

  const getCanvasCenter = useCallback(() => {
    return {
      x: dimensions.width / 2 - panRef.current.x / zoomRef.current,
      y: dimensions.height / 2 - panRef.current.y / zoomRef.current,
    };
  }, [dimensions]);

  const applyLayout = useCallback((layoutType: LayoutType) => {
    const center = getCanvasCenter();
    const targetPositions: GraphNode[] = [];

    if (layoutType === 'circle') {
      const radius = Math.min(dimensions.width, dimensions.height) * 0.35;
      nodesRef.current.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / nodesRef.current.length - Math.PI / 2;
        targetPositions.push({
          ...node,
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle),
        });
      });
    } else if (layoutType === 'hierarchy') {
      const levels: GraphNode[][] = [];
      const visited = new Set<string>();
      const edgeMap = new Map<string, string[]>();
      
      edges.forEach(edge => {
        if (!edgeMap.has(edge.source)) edgeMap.set(edge.source, []);
        edgeMap.get(edge.source)!.push(edge.target);
      });

      const rootNodes = nodesRef.current.filter(n => !edges.some(e => e.target === n.id));
      let currentLevel = rootNodes.length > 0 ? rootNodes : [nodesRef.current[0]];
      
      while (currentLevel.length > 0 && levels.length < 6) {
        levels.push(currentLevel);
        currentLevel.forEach(n => visited.add(n.id));
        const nextLevel: GraphNode[] = [];
        currentLevel.forEach(node => {
          const targets = edgeMap.get(node.id) || [];
          targets.forEach(tid => {
            if (!visited.has(tid)) {
              const tnode = nodesRef.current.find(n => n.id === tid);
              if (tnode && !nextLevel.find(n => n.id === tid)) {
                nextLevel.push(tnode);
              }
            }
          });
        });
        currentLevel = nextLevel;
      }

      const unvisited = nodesRef.current.filter(n => !visited.has(n.id));
      if (unvisited.length > 0) levels.push(unvisited);

      const levelHeight = dimensions.height * 0.7 / Math.max(levels.length, 1);
      const startY = center.y - (levels.length - 1) * levelHeight / 2;

      levels.forEach((levelNodes, levelIndex) => {
        const levelWidth = dimensions.width * 0.7;
        const spacing = levelWidth / Math.max(levelNodes.length, 1);
        const startX = center.x - (levelNodes.length - 1) * spacing / 2;
        
        levelNodes.forEach((node, nodeIndex) => {
          targetPositions.push({
            ...node,
            x: startX + nodeIndex * spacing,
            y: startY + levelIndex * levelHeight,
          });
        });
      });
    } else {
      targetPositions.push(...nodesRef.current);
    }

    targetNodesRef.current = targetPositions;
    animProgressRef.current = 0;
  }, [dimensions, edges, getCanvasCenter]);

  useEffect(() => {
    nodesRef.current = nodes.map(n => ({ ...n }));
    velocityRef.current.clear();
    nodes.forEach(n => {
      velocityRef.current.set(n.id, { vx: 0, vy: 0 });
    });
  }, [nodes]);

  useEffect(() => {
    applyLayout(layout);
  }, [layout, applyLayout]);

  useEffect(() => {
    newlyAddedRef.current.add(nodes[nodes.length - 1]?.id || '');
    setTimeout(() => {
      newlyAddedRef.current.delete(nodes[nodes.length - 1]?.id || '');
    }, 500);
  }, [nodes.length]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (screenX - rect.left - panRef.current.x) / zoomRef.current,
      y: (screenY - rect.top - panRef.current.y) / zoomRef.current,
    };
  }, []);

  const getNodeAtPosition = useCallback((worldX: number, worldY: number): GraphNode | null => {
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const node = nodesRef.current[i];
      const dx = worldX - node.x;
      const dy = worldY - node.y;
      if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) {
        return node;
      }
    }
    return null;
  }, []);

  const isNodeFiltered = useCallback((node: GraphNode): boolean => {
    if (!searchQuery.trim()) return false;
    const query = searchQuery.toLowerCase();
    return !node.name.toLowerCase().includes(query) && !node.label.toLowerCase().includes(query);
  }, [searchQuery]);

  const applyForce = useCallback(() => {
    if (layout !== 'force' || animProgressRef.current < 1) return;

    const repulsion = 8000;
    const attraction = 0.01;
    const damping = 0.9;
    const centerForce = 0.005;
    const center = getCanvasCenter();

    nodesRef.current.forEach((node, i) => {
      if (dragNodeRef.current === node.id) return;
      const vel = velocityRef.current.get(node.id) || { vx: 0, vy: 0 };

      nodesRef.current.forEach((other, j) => {
        if (i === j) return;
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        vel.vx += (dx / dist) * force;
        vel.vy += (dy / dist) * force;
      });

      vel.vx += (center.x - node.x) * centerForce;
      vel.vy += (center.y - node.y) * centerForce;

      edges.forEach(edge => {
        let source: GraphNode | undefined;
        let target: GraphNode | undefined;
        if (edge.source === node.id) {
          source = node;
          target = nodesRef.current.find(n => n.id === edge.target);
        } else if (edge.target === node.id) {
          source = nodesRef.current.find(n => n.id === edge.source);
          target = node;
        }
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 150) * attraction;
          if (edge.source === node.id) {
            vel.vx += (dx / dist) * force;
            vel.vy += (dy / dist) * force;
          } else {
            vel.vx -= (dx / dist) * force;
            vel.vy -= (dy / dist) * force;
          }
        }
      });

      vel.vx *= damping;
      vel.vy *= damping;

      velocityRef.current.set(node.id, vel);
    });

    nodesRef.current.forEach(node => {
      if (dragNodeRef.current === node.id) return;
      const vel = velocityRef.current.get(node.id) || { vx: 0, vy: 0 };
      node.x += vel.vx;
      node.y += vel.vy;
    });
  }, [layout, edges, getCanvasCenter]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (animProgressRef.current < 1) {
      animProgressRef.current += 0.02;
      if (animProgressRef.current > 1) animProgressRef.current = 1;
      
      const t = animProgressRef.current;
      const easeT = 1 - Math.pow(1 - t, 3);
      
      nodesRef.current.forEach(node => {
        const target = targetNodesRef.current.find(tn => tn.id === node.id);
        if (target) {
          node.x = node.x + (target.x - node.x) * easeT;
          node.y = node.y + (target.y - node.y) * easeT;
        }
      });
    }

    applyForce();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(panRef.current.x, panRef.current.y);
    ctx.scale(zoomRef.current, zoomRef.current);

    edges.forEach(edge => {
      const source = nodesRef.current.find(n => n.id === edge.source);
      const target = nodesRef.current.find(n => n.id === edge.target);
      if (!source || !target) return;

      const sourceFiltered = isNodeFiltered(source);
      const targetFiltered = isNodeFiltered(target);
      const opacity = sourceFiltered || targetFiltered ? 0.1 : 0.6;

      ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
      ctx.lineWidth = 2;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const startX = source.x + (dx / dist) * NODE_RADIUS;
      const startY = source.y + (dy / dist) * NODE_RADIUS;
      const endX = target.x - (dx / dist) * NODE_RADIUS;
      const endY = target.y - (dy / dist) * NODE_RADIUS;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const arrowLength = 12;
      const arrowAngle = Math.PI / 6;
      const angle = Math.atan2(dy, dx);
      
      ctx.fillStyle = `rgba(59, 130, 246, ${opacity})`;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle - arrowAngle),
        endY - arrowLength * Math.sin(angle - arrowAngle)
      );
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle + arrowAngle),
        endY - arrowLength * Math.sin(angle + arrowAngle)
      );
      ctx.closePath();
      ctx.fill();
    });

    if (isEdgeMode && edgeFirstNodeRef.current) {
      const firstNode = nodesRef.current.find(n => n.id === edgeFirstNodeRef.current);
      if (firstNode) {
        const worldMouse = screenToWorld(mousePosRef.current.x, mousePosRef.current.y);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(firstNode.x, firstNode.y);
        ctx.lineTo(worldMouse.x, worldMouse.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    nodesRef.current.forEach(node => {
      const filtered = isNodeFiltered(node);
      const isHovered = hoverNodeRef.current === node.id;
      const isEdgeFirst = edgeFirstNodeRef.current === node.id;
      const isNew = newlyAddedRef.current.has(node.id);
      const color = LABEL_COLORS[node.label] || '#3b82f6';

      const baseScale = filtered ? 1 : (searchQuery.trim() ? 1.3 : 1);
      const hoverScale = isHovered ? 1.15 : 1;
      const newScale = isNew ? 0.5 + 0.5 * Math.min(1, (Date.now() % 1000) / 500) : 1;
      const scale = baseScale * hoverScale * (isNew ? newScale : 1);
      const radius = NODE_RADIUS * scale;
      const opacity = filtered ? 0.2 : 1;

      if (!filtered && searchQuery.trim()) {
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 20;
      }

      if (isEdgeFirst) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#1e293b';
      ctx.font = `bold ${12 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = opacity;
      
      const displayName = node.name.length > 6 ? node.name.slice(0, 6) + '...' : node.name;
      ctx.fillText(displayName, node.x, node.y);
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#94a3b8';
      ctx.font = `${10 * scale}px sans-serif`;
      ctx.globalAlpha = opacity;
      ctx.fillText(node.label, node.x, node.y + radius + 12);
      ctx.globalAlpha = 1;
    });

    ctx.restore();

    animationRef.current = requestAnimationFrame(render);
  }, [edges, isEdgeMode, isNodeFiltered, applyForce, screenToWorld]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(render);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    
    const world = screenToWorld(e.clientX, e.clientY);
    const node = getNodeAtPosition(world.x, world.y);

    if (isEdgeMode) {
      if (node && !isNodeFiltered(node)) {
        if (!edgeFirstNodeRef.current) {
          edgeFirstNodeRef.current = node.id;
        } else if (node.id !== edgeFirstNodeRef.current) {
          onEdgeCreate(edgeFirstNodeRef.current, node.id);
          edgeFirstNodeRef.current = null;
          onEdgeModeChange(false);
        }
      }
      return;
    }

    if (node && !isNodeFiltered(node)) {
      isDraggingRef.current = true;
      dragNodeRef.current = node.id;
      dragOffsetRef.current = {
        x: world.x - node.x,
        y: world.y - node.y,
      };
    } else {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX - panRef.current.x,
        y: e.clientY - panRef.current.y,
      };
    }
  }, [screenToWorld, getNodeAtPosition, isEdgeMode, isNodeFiltered, onEdgeCreate, onEdgeModeChange]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    const world = screenToWorld(e.clientX, e.clientY);

    if (isDraggingRef.current && dragNodeRef.current) {
      const node = nodesRef.current.find(n => n.id === dragNodeRef.current);
      if (node) {
        node.x = world.x - dragOffsetRef.current.x;
        node.y = world.y - dragOffsetRef.current.y;
      }
    } else if (isPanningRef.current) {
      panRef.current = {
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      };
    } else {
      const node = getNodeAtPosition(world.x, world.y);
      hoverNodeRef.current = node ? node.id : null;
      canvasRef.current!.style.cursor = node ? 'grab' : 'default';
    }
  }, [screenToWorld, getNodeAtPosition]);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current && dragNodeRef.current) {
      const node = nodesRef.current.find(n => n.id === dragNodeRef.current);
      if (node) {
        onNodeUpdate(dragNodeRef.current, { x: node.x, y: node.y });
      }
    }
    isDraggingRef.current = false;
    dragNodeRef.current = null;
    isPanningRef.current = false;
  }, [onNodeUpdate]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const world = screenToWorld(e.clientX, e.clientY);
    const node = getNodeAtPosition(world.x, world.y);
    if (node && !isNodeFiltered(node)) {
      onNodeDoubleClick(node);
    }
  }, [screenToWorld, getNodeAtPosition, isNodeFiltered, onNodeDoubleClick]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(3, zoomRef.current * delta));
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    panRef.current = {
      x: mouseX - (mouseX - panRef.current.x) * (newZoom / zoomRef.current),
      y: mouseY - (mouseY - panRef.current.y) * (newZoom / zoomRef.current),
    };
    
    zoomRef.current = newZoom;
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const world = screenToWorld(e.clientX, e.clientY);
    const node = getNodeAtPosition(world.x, world.y);
    onContextMenu(e.clientX, e.clientY, node?.id);
  }, [screenToWorld, getNodeAtPosition, onContextMenu]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        style={{ display: 'block' }}
      />
    </div>
  );
});

GraphCanvas.displayName = 'GraphCanvas';

export default GraphCanvas;
