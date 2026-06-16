import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  Simulation,
  SimulationNodeDatum,
  SimulationLinkDatum,
} from 'd3-force';
import GraphNode from './GraphNode';
import GraphEdge from './GraphEdge';
import { GraphNode as GraphNodeType, GraphEdge as GraphEdgeType } from '../types';

interface ForceGraphProps {
  nodes: GraphNodeType[];
  edges: GraphEdgeType[];
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
  onNodeDoubleClick: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onUpdateNode: (id: string, updates: Partial<GraphNodeType>) => void;
  onAddManualEdge: (sourceId: string, targetId: string) => void;
  isLinkingMode: boolean;
  linkingSourceId: string | null;
  onLinkingSourceSelect: (id: string | null) => void;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  id: string;
  type: string;
}

const ForceGraph: React.FC<ForceGraphProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onNodeSelect,
  onNodeDoubleClick,
  onToggleCollapse,
  onUpdateNode,
  onAddManualEdge,
  isLinkingMode,
  linkingSourceId,
  onLinkingSourceSelect,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const simulationRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const simNodesRef = useRef<Map<string, SimNode>>(new Map());
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [, forceUpdate] = useState({});
  const animationRef = useRef<number | null>(null);

  const visibleNodes = useMemo(() => {
    const visible = new Set<string>();
    const rootNodes = nodes.filter((n) => n.parentId === null);

    const addVisible = (nodeId: string) => {
      visible.add(nodeId);
      const node = nodes.find((n) => n.id === nodeId);
      if (node && !node.collapsed) {
        node.childIds.forEach(addVisible);
      }
    };

    rootNodes.forEach((n) => addVisible(n.id));
    return nodes.filter((n) => visible.has(n.id));
  }, [nodes]);

  const visibleEdgeIds = useMemo(() => {
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    return edges.filter(
      (e) => visibleIds.has(e.source) && visibleIds.has(e.target)
    );
  }, [edges, visibleNodes]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (visibleNodes.length === 0) return;

    const simNodes: SimNode[] = visibleNodes.map((node) => {
      const existing = nodePositionsRef.current.get(node.id);
      return {
        id: node.id,
        x: existing?.x ?? dimensions.width / 2 + (Math.random() - 0.5) * 100,
        y: existing?.y ?? dimensions.height / 2 + (Math.random() - 0.5) * 100,
      };
    });

    const simNodesMap = new Map<string, SimNode>();
    simNodes.forEach((n) => simNodesMap.set(n.id, n));
    simNodesRef.current = simNodesMap;

    const simLinks: SimLink[] = visibleEdgeIds
      .filter((e) => simNodesMap.has(e.source) && simNodesMap.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
      }));

    const simulation = forceSimulation<SimNode, SimLink>(simNodes)
      .force(
        'link',
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((d) => {
            const sourceNode = nodes.find((n) => n.id === (d.source as SimNode).id);
            const targetNode = nodes.find((n) => n.id === (d.target as SimNode).id);
            const baseDist = 120;
            const sizeBonus = (sourceNode?.size || 30) + (targetNode?.size || 30);
            return baseDist + sizeBonus;
          })
          .strength(0.6)
      )
      .force('charge', forceManyBody().strength(-200))
      .force('center', forceCenter(dimensions.width / 2, dimensions.height / 2).strength(0.05))
      .force(
        'collision',
        forceCollide<SimNode>().radius((d) => {
          const node = nodes.find((n) => n.id === d.id);
          return (node?.size || 30) + 10;
        })
      )
      .alphaDecay(0.02)
      .velocityDecay(0.4);

    simulationRef.current = simulation;

    const tick = () => {
      simNodes.forEach((node) => {
        nodePositionsRef.current.set(node.id, { x: node.x || 0, y: node.y || 0 });
      });
      forceUpdate({});
      animationRef.current = requestAnimationFrame(tick);
    };

    simulation.on('tick', () => {});
    animationRef.current = requestAnimationFrame(tick);

    return () => {
      simulation.stop();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [visibleNodes.length, visibleEdgeIds.length, dimensions]);

  useEffect(() => {
    if (simulationRef.current) {
      simulationRef.current.alpha(0.3).restart();
    }
  }, [visibleNodes.length]);

  const getNodePosition = useCallback((nodeId: string) => {
    return nodePositionsRef.current.get(nodeId) || { x: 0, y: 0 };
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.2, Math.min(3, transform.scale * delta));

    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - transform.x) / transform.scale;
      const worldY = (mouseY - transform.y) / transform.scale;

      const newX = mouseX - worldX * newScale;
      const newY = mouseY - worldY * newScale;

      setTransform({ x: newX, y: newY, scale: newScale });
    }
  }, [transform]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    onNodeSelect(null);
  }, [transform, onNodeSelect]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && !dragNodeId) {
      setTransform({
        ...transform,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart, dragNodeId, transform]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragNodeId(null);
    if (simulationRef.current) {
      simulationRef.current.alphaTarget(0);
    }
  }, []);

  const handleNodeDragStart = useCallback((nodeId: string, event: React.MouseEvent) => {
    event.preventDefault();
    setDragNodeId(nodeId);

    if (isLinkingMode) {
      if (!linkingSourceId) {
        onLinkingSourceSelect(nodeId);
      } else if (linkingSourceId !== nodeId) {
        onAddManualEdge(linkingSourceId, nodeId);
        onLinkingSourceSelect(null);
      }
      return;
    }

    const simNode = simNodesRef.current.get(nodeId);
    if (simNode && simulationRef.current) {
      simulationRef.current.alphaTarget(0.3).restart();
      simNode.fx = simNode.x;
      simNode.fy = simNode.y;
    }

    const handleMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;

      const node = simNodesRef.current.get(nodeId);
      if (node) {
        node.fx = x;
        node.fy = y;
      }
    };

    const handleUp = () => {
      const node = simNodesRef.current.get(nodeId);
      if (node) {
        node.fx = null;
        node.fy = null;
      }
      if (simulationRef.current) {
        simulationRef.current.alphaTarget(0);
      }
      setDragNodeId(null);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [transform, isLinkingMode, linkingSourceId, onLinkingSourceSelect, onAddManualEdge]);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (isLinkingMode) {
      if (!linkingSourceId) {
        onLinkingSourceSelect(nodeId);
      } else if (linkingSourceId !== nodeId) {
        onAddManualEdge(linkingSourceId, nodeId);
        onLinkingSourceSelect(null);
      }
      return;
    }
    onNodeSelect(nodeId);
  }, [onNodeSelect, isLinkingMode, linkingSourceId, onLinkingSourceSelect, onAddManualEdge]);

  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    onToggleCollapse(nodeId);
  }, [onToggleCollapse]);

  const handleNodeMouseEnter = useCallback((nodeId: string) => {
    setHoveredNodeId(nodeId);
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
    if (simulationRef.current) {
      simulationRef.current.alpha(0.5).restart();
    }
  }, []);

  useEffect(() => {
    (window as any).__resetGraphView = resetView;
    return () => {
      delete (window as any).__resetGraphView;
    };
  }, [resetView]);

  const renderNodes = useMemo(() => {
    return visibleNodes.map((node) => {
      const pos = getNodePosition(node.id);
      const nodeWithPos = { ...node, x: pos.x, y: pos.y };
      return (
        <GraphNode
          key={node.id}
          node={nodeWithPos}
          isSelected={selectedNodeId === node.id || linkingSourceId === node.id}
          isHovered={hoveredNodeId === node.id}
          onMouseEnter={handleNodeMouseEnter}
          onMouseLeave={handleNodeMouseLeave}
          onClick={handleNodeClick}
          onDoubleClick={handleNodeDoubleClick}
          onDragStart={handleNodeDragStart}
        />
      );
    });
  }, [
    visibleNodes,
    getNodePosition,
    selectedNodeId,
    hoveredNodeId,
    linkingSourceId,
    handleNodeMouseEnter,
    handleNodeMouseLeave,
    handleNodeClick,
    handleNodeDoubleClick,
    handleNodeDragStart,
  ]);

  const renderEdges = useMemo(() => {
    const nodeMap = new Map(visibleNodes.map((n) => [n.id, n]));
    return visibleEdgeIds.map((edge) => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      if (!sourceNode || !targetNode) return null;

      const sourcePos = getNodePosition(edge.source);
      const targetPos = getNodePosition(edge.target);

      return (
        <GraphEdge
          key={edge.id}
          edge={edge}
          sourceNode={{ ...sourceNode, x: sourcePos.x, y: sourcePos.y }}
          targetNode={{ ...targetNode, x: targetPos.x, y: targetPos.y }}
          isHighlighted={
            selectedNodeId === edge.source ||
            selectedNodeId === edge.target ||
            hoveredNodeId === edge.source ||
            hoveredNodeId === edge.target
          }
        />
      );
    });
  }, [visibleEdgeIds, visibleNodes, getNodePosition, selectedNodeId, hoveredNodeId]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#1e1e2e',
      }}
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <g
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
        >
          {renderEdges}
          {renderNodes}
        </g>
      </svg>
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          backgroundColor: 'rgba(30, 30, 46, 0.8)',
          backdropFilter: 'blur(8px)',
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.1)',
          fontSize: 12,
          color: 'rgba(255,255,255,0.6)',
        }}
      >
        <span>节点: {visibleNodes.length}</span>
        <span style={{ opacity: 0.3 }}>|</span>
        <span>缩放: {Math.round(transform.scale * 100)}%</span>
      </div>
    </div>
  );
};

export default ForceGraph;
