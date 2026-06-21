import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3-force';
import { GraphNode, GraphLink, Conflict, NODE_WIDTH, NODE_HEIGHT } from '../types';
import NodeCard from './NodeCard';

interface GraphContainerProps {
  nodes: GraphNode[];
  links: GraphLink[];
  conflicts: Conflict[];
  selectedConflictId: string | null;
  onNodeClick: (node: GraphNode) => void;
  onAddLink: (sourceId: string, targetId: string) => void;
  onUpdateLinkWeight: (linkId: string, weight: number) => void;
  onDeleteLink: (linkId: string) => void;
  onNodesPositionChange: (nodes: GraphNode[]) => void;
}

const GraphContainer: React.FC<GraphContainerProps> = ({
  nodes,
  links,
  conflicts,
  selectedConflictId,
  onNodeClick,
  onAddLink,
  onUpdateLinkWeight,
  onDeleteLink,
  onNodesPositionChange,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const [draggingLink, setDraggingLink] = useState<{
    sourceId: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState<number>(5);

  const conflictLinkIds = new Set(conflicts.map(c => c.linkId));

  useEffect(() => {
    nodesRef.current = nodes.map(n => ({ ...n }));
    linksRef.current = links.map(l => ({ ...l }));
  }, [nodes, links]);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const simNodes = nodes.map(n => ({ ...n }));
    const simLinks = links.map(l => ({ ...l, source: l.source, target: l.target }));

    const simulation = d3.forceSimulation<GraphNode>(simNodes)
      .force('link', d3.forceLink<GraphNode, any>(simLinks)
        .id((d: any) => d.id)
        .distance((d: any) => 120 + (10 - d.weight) * 10)
        .strength(0.3)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(NODE_WIDTH / 2 + 10))
      .alphaDecay(0.02)
      .stop();

    simulation.tick(100);

    simulation.on('tick', () => {
      onNodesPositionChange(simNodes.map(n => ({ ...n })));
    });

    simulationRef.current = simulation;
    simulation.alpha(1).restart();

    return () => {
      simulation.stop();
    };
  }, [nodes.length, links.length]);

  useEffect(() => {
    if (simulationRef.current && nodesRef.current.length > 0) {
      simulationRef.current.nodes(nodesRef.current);
      const linkForce = simulationRef.current.force('link') as d3.ForceLink<GraphNode, GraphLink>;
      if (linkForce) {
        linkForce.links(linksRef.current as any);
      }
      simulationRef.current.alpha(0.3).restart();
    }
  }, [nodes.length, links.length]);

  const handleNodeDragStart = useCallback((nodeId: string) => {
    if (simulationRef.current) {
      const node = nodesRef.current.find(n => n.id === nodeId);
      if (node) {
        node.fx = node.x;
        node.fy = node.y;
        simulationRef.current.alphaTarget(0.3).restart();
      }
    }
  }, []);

  const handleNodeDrag = useCallback((nodeId: string, x: number, y: number) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (node) {
      node.fx = x;
      node.fy = y;
      onNodesPositionChange([...nodesRef.current]);
    }
  }, [onNodesPositionChange]);

  const handleNodeDragEnd = useCallback((nodeId: string) => {
    if (simulationRef.current) {
      const node = nodesRef.current.find(n => n.id === nodeId);
      if (node) {
        node.fx = null;
        node.fy = null;
      }
      simulationRef.current.alphaTarget(0);
    }
  }, []);

  const handleLinkDragStart = useCallback((nodeId: string, x: number, y: number) => {
    setDraggingLink({
      sourceId: nodeId,
      startX: x,
      startY: y,
      endX: x,
      endY: y,
    });
  }, []);

  const handleLinkDragMove = useCallback((e: React.MouseEvent) => {
    if (draggingLink && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDraggingLink(prev => prev ? {
        ...prev,
        endX: e.clientX - rect.left,
        endY: e.clientY - rect.top,
      } : null);
    }
  }, [draggingLink]);

  const handleLinkDragEnd = useCallback((targetNodeId?: string) => {
    if (draggingLink && targetNodeId && draggingLink.sourceId !== targetNodeId) {
      onAddLink(draggingLink.sourceId, targetNodeId);
    }
    setDraggingLink(null);
  }, [draggingLink, onAddLink]);

  const handleLinkDoubleClick = useCallback((link: GraphLink) => {
    setEditingLinkId(link.id);
    setEditWeight(link.weight);
  }, []);

  const handleWeightSubmit = useCallback(() => {
    if (editingLinkId) {
      onUpdateLinkWeight(editingLinkId, Math.max(1, Math.min(10, editWeight)));
      setEditingLinkId(null);
    }
  }, [editingLinkId, editWeight, onUpdateLinkWeight]);

  const getNodePosition = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  const getLinkPath = (sourceId: string, targetId: string) => {
    const source = getNodePosition(sourceId);
    const target = getNodePosition(targetId);

    const sourceX = source.x + NODE_WIDTH / 2;
    const sourceY = source.y + NODE_HEIGHT / 2;
    const targetX = target.x + NODE_WIDTH / 2;
    const targetY = target.y + NODE_HEIGHT / 2;

    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return '';

    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;

    const curveHeight = Math.min(distance * 0.15, 50);
    const perpX = -dy / distance * curveHeight;
    const perpY = dx / distance * curveHeight;

    const ctrlX = midX + perpX;
    const ctrlY = midY + perpY;

    return `M ${sourceX} ${sourceY} Q ${ctrlX} ${ctrlY} ${targetX} ${targetY}`;
  };

  const getLinkMidpoint = (sourceId: string, targetId: string) => {
    const source = getNodePosition(sourceId);
    const target = getNodePosition(targetId);

    const sourceX = source.x + NODE_WIDTH / 2;
    const sourceY = source.y + NODE_HEIGHT / 2;
    const targetX = target.x + NODE_WIDTH / 2;
    const targetY = target.y + NODE_HEIGHT / 2;

    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return { x: sourceX, y: sourceY };

    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;

    const curveHeight = Math.min(distance * 0.15, 50);
    const perpX = -dy / distance * curveHeight;
    const perpY = dx / distance * curveHeight;

    return { x: midX + perpX, y: midY + perpY };
  };

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onMouseMove={handleLinkDragMove}
      onMouseUp={() => handleLinkDragEnd()}
      onMouseLeave={() => handleLinkDragEnd()}
    >
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {links.map((link) => {
          const isConflict = conflictLinkIds.has(link.id);
          const isSelected = selectedConflictId === link.id;
          const isHovered = hoveredLinkId === link.id;
          const path = getLinkPath(link.source, link.target);
          const midpoint = getLinkMidpoint(link.source, link.target);

          return (
            <g key={link.id}>
              <path
                d={path}
                fill="none"
                stroke={isConflict ? '#e53e3e' : '#718096'}
                strokeWidth={isSelected ? 4 : isHovered ? 3 : 2}
                style={{
                  pointerEvents: 'stroke',
                  cursor: 'pointer',
                  opacity: isConflict ? 1 : 0.6,
                  filter: isSelected ? 'url(#glow)' : 'none',
                  animation: isConflict ? 'pulse-red 0.5s ease-in-out infinite' : 'none',
                  transition: 'stroke-width 0.2s ease',
                }}
                onMouseEnter={() => setHoveredLinkId(link.id)}
                onMouseLeave={() => setHoveredLinkId(null)}
                onDoubleClick={() => handleLinkDoubleClick(link)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onDeleteLink(link.id);
                }}
              />
              {(isHovered || editingLinkId === link.id) && (
                <>
                  <circle
                    cx={midpoint.x}
                    cy={midpoint.y}
                    r={16}
                    fill="#2d3748"
                    stroke={isConflict ? '#e53e3e' : '#4a5568'}
                    strokeWidth={2}
                    style={{ pointerEvents: 'none' }}
                  />
                  {editingLinkId === link.id ? (
                    <foreignObject
                      x={midpoint.x - 20}
                      y={midpoint.y - 12}
                      width={40}
                      height={24}
                    >
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={editWeight}
                        onChange={(e) => setEditWeight(parseInt(e.target.value) || 1)}
                        onBlur={handleWeightSubmit}
                        onKeyDown={(e) => e.key === 'Enter' && handleWeightSubmit()}
                        autoFocus
                        style={{
                          width: '100%',
                          height: '100%',
                          textAlign: 'center',
                          backgroundColor: '#1a202c',
                          color: '#fff',
                          border: '1px solid #3182ce',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 'bold',
                        }}
                      />
                    </foreignObject>
                  ) : (
                    <text
                      x={midpoint.x}
                      y={midpoint.y + 4}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize={12}
                      fontWeight="bold"
                      style={{ pointerEvents: 'none' }}
                    >
                      {link.weight}
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}

        {draggingLink && (
          <line
            x1={draggingLink.startX}
            y1={draggingLink.startY}
            x2={draggingLink.endX}
            y2={draggingLink.endY}
            stroke="#3182ce"
            strokeWidth={2}
            strokeDasharray="8,4"
            style={{ pointerEvents: 'none' }}
          />
        )}
      </svg>

      {nodes.map((node) => (
        <NodeCard
          key={node.id}
          node={node}
          onDragStart={handleNodeDragStart}
          onDrag={handleNodeDrag}
          onDragEnd={handleNodeDragEnd}
          onLinkDragStart={handleLinkDragStart}
          onLinkDragEnd={handleLinkDragEnd}
          onClick={() => onNodeClick(node)}
          isConnecting={!!draggingLink}
        />
      ))}
    </div>
  );
};

export default GraphContainer;
