import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3-force';
import { GraphNode, GraphLink } from '../utils/dataParser';
import { ThemeColors } from './ControlPanel';

interface GraphContainerProps {
  nodes: GraphNode[];
  links: GraphLink[];
  themeColors: ThemeColors;
  nodeSpacing: number;
  showLabels: boolean;
  isExporting: boolean;
  graphRef: React.RefObject<HTMLDivElement>;
}

interface Transform {
  x: number;
  y: number;
  k: number;
}

type NodeShape = 'circle' | 'rect' | 'diamond';

const GraphContainer: React.FC<GraphContainerProps> = ({
  nodes,
  links,
  themeColors,
  nodeSpacing,
  showLabels,
  isExporting,
  graphRef
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [localNodes, setLocalNodes] = useState<GraphNode[]>([]);
  const [localLinks, setLocalLinks] = useState<GraphLink[]>([]);

  const isDraggingRef = useRef(false);
  const dragNodeRef = useRef<GraphNode | null>(null);
  const lastClickTimeRef = useRef(0);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  const getNodeColor = useCallback((node: GraphNode): string => {
    const groupKey = String(node.group);
    return themeColors[groupKey] || themeColors['1'] || '#3b82f6';
  }, [themeColors]);

  const getNodeShape = useCallback((node: GraphNode): NodeShape => {
    const groupNum = Number(node.group);
    if (isNaN(groupNum)) {
      return 'circle';
    }
    const shapes: NodeShape[] = ['circle', 'rect', 'diamond'];
    return shapes[(groupNum - 1) % shapes.length];
  }, []);

  const getNodeSize = useCallback((node: GraphNode): number => {
    const baseSize = 12;
    const maxSize = 30;
    const degreeFactor = Math.min(node.degree / 10, 1);
    return baseSize + degreeFactor * (maxSize - baseSize);
  }, []);

  const isNeighbor = useCallback((nodeId: string, targetId: string): boolean => {
    const node = localNodes.find(n => n.id === targetId);
    if (!node) return false;
    return node.neighbors.includes(nodeId);
  }, [localNodes]);

  const isLinkHighlighted = useCallback((link: GraphLink): boolean => {
    if (!highlightedNode) return false;
    const source = typeof link.source === 'object' ? link.source.id : link.source;
    const target = typeof link.target === 'object' ? link.target.id : link.target;
    return source === highlightedNode || target === highlightedNode;
  }, [highlightedNode]);

  const isNodeHighlighted = useCallback((nodeId: string): boolean => {
    if (!highlightedNode) return false;
    if (nodeId === highlightedNode) return true;
    return isNeighbor(highlightedNode, nodeId);
  }, [highlightedNode, isNeighbor]);

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
    if (nodes.length === 0) {
      setLocalNodes([]);
      setLocalLinks([]);
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      return;
    }

    const newNodes: GraphNode[] = nodes.map(node => ({
      ...node,
      x: dimensions.width / 2 + (Math.random() - 0.5) * 100,
      y: dimensions.height / 2 + (Math.random() - 0.5) * 100,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null
    }));

    const newLinks: GraphLink[] = links.map(link => {
      const sourceNode = newNodes.find(n => n.id === (typeof link.source === 'object' ? link.source.id : link.source));
      const targetNode = newNodes.find(n => n.id === (typeof link.target === 'object' ? link.target.id : link.target));
      return {
        source: sourceNode || link.source,
        target: targetNode || link.target
      };
    });

    setLocalNodes(newNodes);
    setLocalLinks(newLinks);

    const simulation = d3.forceSimulation<GraphNode>(newNodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(newLinks)
        .id((d: any) => d.id)
        .distance(nodeSpacing)
        .strength(0.6)
      )
      .force('charge', d3.forceManyBody().strength(-200 - nodeSpacing))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => getNodeSize(d) + 5))
      .alphaDecay(0.02)
      .on('tick', () => {
        setLocalNodes([...newNodes]);
        setLocalLinks([...newLinks]);
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [nodes, links, dimensions.width, dimensions.height, nodeSpacing, getNodeSize]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newK = Math.max(0.1, Math.min(5, transform.k * scaleFactor));

    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = mouseX - (mouseX - transform.x) * (newK / transform.k);
    const newY = mouseY - (mouseY - transform.y) * (newK / transform.k);

    setTransform({ x: newX, y: newY, k: newK });
  }, [transform]);

  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, transformX: 0, transformY: 0 });

  const handleSvgMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'g' || (e.target as SVGElement).classList.contains('link-group')) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        transformX: transform.x,
        transformY: transform.y
      };
    }
  }, [transform]);

  const handleSvgMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setTransform(prev => ({
        ...prev,
        x: panStartRef.current.transformX + dx,
        y: panStartRef.current.transformY + dy
      }));
    }

    if (isDraggingRef.current && dragNodeRef.current) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - transform.x) / transform.k;
        const y = (e.clientY - rect.top - transform.y) / transform.k;

        dragNodeRef.current.fx = x;
        dragNodeRef.current.fy = y;

        if (simulationRef.current) {
          simulationRef.current.alpha(0.3).restart();
        }
      }
    }
  }, [transform]);

  const handleSvgMouseUp = useCallback(() => {
    isPanningRef.current = false;

    if (isDraggingRef.current && dragNodeRef.current) {
      dragNodeRef.current.fx = null;
      dragNodeRef.current.fy = null;
      if (simulationRef.current) {
        simulationRef.current.alpha(0.1).restart();
      }
      isDraggingRef.current = false;
      dragNodeRef.current = null;
    }
  }, []);

  const handleNodeClick = useCallback((e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    const now = Date.now();
    const timeDiff = now - lastClickTimeRef.current;

    if (timeDiff < 300) {
      setHighlightedNode(prev => prev === node.id ? null : node.id);
      setSelectedNode(null);
    } else {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setPopupPosition({
          x: e.clientX - rect.left + 10,
          y: e.clientY - rect.top + 10
        });
      }
      setSelectedNode(node);
    }

    lastClickTimeRef.current = now;
  }, []);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    dragNodeRef.current = node;
    node.fx = node.x;
    node.fy = node.y;
  }, []);

  const handleSvgClick = useCallback(() => {
    setSelectedNode(null);
    setHighlightedNode(null);
  }, []);

  const renderNodeShape = (node: GraphNode) => {
    const size = getNodeSize(node);
    const color = getNodeColor(node);
    const shape = getNodeShape(node);
    const opacity = highlightedNode && !isNodeHighlighted(node.id) ? 0.2 : 1;

    if (shape === 'rect') {
      return (
        <rect
          x={-size}
          y={-size}
          width={size * 2}
          height={size * 2}
          rx={4}
          fill={color}
          style={{ opacity, transition: 'opacity 0.3s ease-out' }}
        />
      );
    } else if (shape === 'diamond') {
      const points = `0,${-size} ${size},0 0,${size} ${-size},0`;
      return (
        <polygon
          points={points}
          fill={color}
          style={{ opacity, transition: 'opacity 0.3s ease-out' }}
        />
      );
    }

    return (
      <circle
        r={size}
        fill={color}
        style={{ opacity, transition: 'opacity 0.3s ease-out' }}
      />
    );
  };

  const getLinkSourcePos = (link: GraphLink) => {
    const source = typeof link.source === 'object' ? link.source : null;
    return { x: source?.x || 0, y: source?.y || 0 };
  };

  const getLinkTargetPos = (link: GraphLink) => {
    const target = typeof link.target === 'object' ? link.target : null;
    return { x: target?.x || 0, y: target?.y || 0 };
  };

  const getNeighborLabels = (node: GraphNode): string[] => {
    return node.neighbors.map(neighborId => {
      const neighbor = localNodes.find(n => n.id === neighborId);
      return neighbor?.label || neighborId;
    });
  };

  return (
    <div className="graph-container" ref={graphRef}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <svg
          ref={svgRef}
          onWheel={handleWheel}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
          onClick={handleSvgClick}
        >
          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
            <g className="link-group">
              {localLinks.map((link, index) => {
                const source = getLinkSourcePos(link);
                const target = getLinkTargetPos(link);
                const highlighted = isLinkHighlighted(link);
                const opacity = highlightedNode ? (highlighted ? 1 : 0.1) : 0.6;

                return (
                  <line
                    key={`link-${index}`}
                    className={`link ${highlighted ? 'highlighted' : ''}`}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    style={{ opacity, transition: 'opacity 0.3s ease-out' }}
                  />
                );
              })}
            </g>

            <g className="node-group">
              {localNodes.map((node) => (
                <g
                  key={node.id}
                  className={`node ${isDraggingRef.current && dragNodeRef.current?.id === node.id ? 'dragging' : ''}`}
                  transform={`translate(${node.x || 0}, ${node.y || 0})`}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onClick={(e) => handleNodeClick(e, node)}
                  style={{ cursor: 'pointer' }}
                >
                  {renderNodeShape(node)}
                  {showLabels && (
                    <text
                      className="node-label"
                      y={getNodeSize(node) + 15}
                      textAnchor="middle"
                      style={{
                        opacity: highlightedNode && !isNodeHighlighted(node.id) ? 0.2 : 1,
                        transition: 'opacity 0.3s ease-out'
                      }}
                    >
                      {node.label}
                    </text>
                  )}
                </g>
              ))}
            </g>
          </g>
        </svg>

        {selectedNode && (
          <div
            className="node-detail-popup"
            style={{
              left: popupPosition.x,
              top: popupPosition.y
            }}
          >
            <h4>{selectedNode.label}</h4>
            <div className="detail-row">
              <strong>所属组：</strong>
              <span>组 {selectedNode.group}</span>
            </div>
            <div className="detail-row">
              <strong>连接数：</strong>
              <span>{selectedNode.degree}</span>
            </div>
            <div className="detail-row">
              <strong>入度：</strong>
              <span>{selectedNode.inDegree}</span>
            </div>
            <div className="detail-row">
              <strong>出度：</strong>
              <span>{selectedNode.outDegree}</span>
            </div>
            <div className="neighbors-list">
              <strong style={{ fontSize: '12px', color: '#333' }}>相邻节点：</strong>
              {getNeighborLabels(selectedNode).map((label, idx) => (
                <div key={idx} className="neighbor-item">
                  • {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {isExporting && (
          <div className="export-overlay">
            <div className="spinner" />
          </div>
        )}
      </div>
    </div>
  );
};

export default GraphContainer;
