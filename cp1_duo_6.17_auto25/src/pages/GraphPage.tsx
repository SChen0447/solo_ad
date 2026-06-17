import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3Force from 'd3-force';
import { useGraphContext } from '../context/GraphContext';
import { FILE_TYPE_COLORS, FILE_TYPE_LABELS } from '../types';
import type { FileNode, DependencyEdge, FileType } from '../types';

interface TooltipData {
  node: FileNode;
  x: number;
  y: number;
}

interface Transform {
  x: number;
  y: number;
  k: number;
}

const getEdgeColor = (depth: number): string => {
  const start = { r: 176, g: 176, b: 176 };
  const end = { r: 80, g: 80, b: 80 };
  const t = Math.min(depth / 5, 1);
  const r = Math.round(start.r + (end.r - start.r) * t);
  const g = Math.round(start.g + (end.g - start.g) * t);
  const b = Math.round(start.b + (end.b - start.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
};

const GraphPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    nodes: contextNodes,
    edges: contextEdges,
    stats,
    selectedNodeId,
    highlightedNodeIds,
    searchQuery,
    visibleTypes,
    setSelectedNode,
    setSearchQuery,
    toggleTypeVisibility,
    resetView,
    clearData
  } = useGraphContext();

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3Force.Simulation<FileNode, DependencyEdge> | null>(null);
  const [nodes, setNodes] = useState<FileNode[]>([]);
  const [edges, setEdges] = useState<DependencyEdge[]>([]);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const searchLower = searchQuery.toLowerCase();
  const matchedNodeIds = useMemo(() => {
    if (!searchQuery) return new Set<string>();
    return new Set(
      contextNodes
        .filter(
          (n) =>
            n.name.toLowerCase().includes(searchLower) ||
            n.path.toLowerCase().includes(searchLower)
        )
        .map((n) => n.id)
    );
  }, [contextNodes, searchQuery, searchLower]);

  const filteredNodeIds = useMemo(() => {
    return new Set(contextNodes.filter((n) => visibleTypes.has(n.type)).map((n) => n.id));
  }, [contextNodes, visibleTypes]);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    const initialNodes = contextNodes.map((n) => ({
      ...n,
      x: n.x ?? centerX + (Math.random() - 0.5) * 400,
      y: n.y ?? centerY + (Math.random() - 0.5) * 400,
      fx: n.fx ?? null,
      fy: n.fy ?? null
    }));

    setNodes(initialNodes);
    setEdges(contextEdges);

    const nodeMap = new Map(initialNodes.map((n) => [n.id, n]));
    const simulationEdges = contextEdges.map((e) => ({
      ...e,
      source: nodeMap.get(e.source)!,
      target: nodeMap.get(e.target)!
    }));

    const simulation = d3Force
      .forceSimulation(initialNodes as d3Force.SimulationNodeDatum[])
      .force(
        'link',
        d3Force
          .forceLink<FileNode, d3Force.SimulationLinkDatum<FileNode>>(
            simulationEdges as d3Force.SimulationLinkDatum<FileNode>[]
          )
          .id((d: any) => d.id)
          .distance(120)
          .strength(0.3)
      )
      .force('charge', d3Force.forceManyBody().strength(-300))
      .force('center', d3Force.forceCenter(centerX, centerY).strength(0.05))
      .force(
        'collision',
        d3Force.forceCollide().radius((d: any) => d.radius + 10)
      )
      .alphaDecay(0.02)
      .velocityDecay(0.4);

    simulationRef.current = simulation as any;

    let animationFrame: number;
    const updatePositions = () => {
      setNodes([...initialNodes]);
      animationFrame = requestAnimationFrame(updatePositions);
    };

    simulation.on('tick', () => {
      if (!animationFrame) {
        animationFrame = requestAnimationFrame(updatePositions);
      }
    });

    return () => {
      simulation.stop();
      cancelAnimationFrame(animationFrame);
    };
  }, [contextNodes, contextEdges, dimensions]);

  const resetLayout = useCallback(() => {
    if (!simulationRef.current) return;

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    const resetNodes = nodes.map((n) => ({
      ...n,
      x: centerX + (Math.random() - 0.5) * 400,
      y: centerY + (Math.random() - 0.5) * 400,
      fx: null,
      fy: null,
      vx: 0,
      vy: 0
    }));

    setNodes(resetNodes);
    resetView();

    simulationRef.current
      .nodes(resetNodes as any)
      .alpha(1)
      .velocityDecay(0.4)
      .restart();
  }, [nodes, dimensions, resetView]);

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      setIsDragging(nodeId);

      const simulation = simulationRef.current;
      if (!simulation) return;

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;

      const moveHandler = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        const [mouseX, mouseY] = [
          (moveEvent.clientX - svgRect.left - transform.x) / transform.k,
          (moveEvent.clientY - svgRect.top - transform.y) / transform.k
        ];

        const targetNode = nodes.find((n) => n.id === nodeId);
        if (targetNode) {
          targetNode.fx = mouseX;
          targetNode.fy = mouseY;
          targetNode.x = mouseX;
          targetNode.y = mouseY;
          setNodes([...nodes]);
        }
      };

      const upHandler = () => {
        setIsDragging(null);
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);

        const releasedNode = nodes.find((n) => n.id === nodeId);
        if (releasedNode) {
          setTimeout(() => {
            if (simulationRef.current) {
              releasedNode.fx = null;
              releasedNode.fy = null;
              simulationRef.current.alpha(0.3).velocityDecay(0.9).restart();
            }
          }, 1000);
        }
      };

      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler);
    },
    [nodes, transform]
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as SVGElement).tagName === 'svg' || (e.target as SVGElement).className.baseVal.includes('grid-pattern')) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      }
    },
    [transform]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isPanning) {
        setTransform((prev) => ({
          ...prev,
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y
        }));
      }
    },
    [isPanning, panStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newK = Math.min(3, Math.max(0.1, transform.k * delta));

      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setTransform((prev) => ({
          k: newK,
          x: mouseX - ((mouseX - prev.x) * newK) / prev.k,
          y: mouseY - ((mouseY - prev.y) * newK) / prev.k
        }));
      }
    },
    [transform]
  );

  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, handleMouseMove, handleMouseUp]);

  const handleNodeClick = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      if (isDragging) return;
      setSelectedNode(selectedNodeId === nodeId ? null : nodeId);
    },
    [selectedNodeId, setSelectedNode, isDragging]
  );

  const handleCanvasClick = useCallback(() => {
    if (!isDragging) {
      setSelectedNode(null);
      setTooltip(null);
    }
  }, [setSelectedNode, isDragging]);

  const handleNodeMouseEnter = useCallback(
    (e: React.MouseEvent, node: FileNode) => {
      if (isDragging) return;
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltip({
          node,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    },
    [isDragging]
  );

  const handleNodeMouseMove = useCallback(
    (e: React.MouseEvent, node: FileNode) => {
      if (isDragging) return;
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltip({
          node,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    },
    [isDragging]
  );

  const handleNodeMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleBack = useCallback(() => {
    clearData();
    navigate('/');
  }, [clearData, navigate]);

  const renderEdge = (edge: DependencyEdge, index: number) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (!sourceNode || !targetNode) return null;
    if (!filteredNodeIds.has(edge.source) || !filteredNodeIds.has(edge.target)) return null;

    const sx = sourceNode.x ?? 0;
    const sy = sourceNode.y ?? 0;
    const tx = targetNode.x ?? 0;
    const ty = targetNode.y ?? 0;

    const dx = tx - sx;
    const dy = ty - sy;
    const dr = Math.sqrt(dx * dx + dy * dy);
    const radius = targetNode.radius;

    const endX = tx - (dx / dr) * radius;
    const endY = ty - (dy / dr) * radius;

    const isHighlighted =
      highlightedNodeIds.size === 0 ||
      (highlightedNodeIds.has(edge.source) && highlightedNodeIds.has(edge.target));
    const opacity = isHighlighted ? 1 : 0.1;

    return (
      <line
        key={`edge-${index}`}
        x1={sx}
        y1={sy}
        x2={endX}
        y2={endY}
        stroke={getEdgeColor(edge.depth)}
        strokeWidth={2}
        opacity={opacity}
        markerEnd="url(#arrowhead)"
        style={{ transition: 'opacity 0.3s ease' }}
      />
    );
  };

  const renderNode = (node: FileNode) => {
    if (!filteredNodeIds.has(node.id)) return null;

    const color = FILE_TYPE_COLORS[node.type];
    const isSelected = selectedNodeId === node.id;
    const isHighlighted = highlightedNodeIds.size === 0 || highlightedNodeIds.has(node.id);
    const isSearchMatch = matchedNodeIds.has(node.id);
    const opacity = isHighlighted ? 1 : 0.2;

    return (
      <g
        key={node.id}
        transform={`translate(${node.x}, ${node.y})`}
        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
        onClick={(e) => handleNodeClick(e, node.id)}
        onMouseEnter={(e) => handleNodeMouseEnter(e, node)}
        onMouseMove={(e) => handleNodeMouseMove(e, node)}
        onMouseLeave={handleNodeMouseLeave}
        style={{
          cursor: isDragging === node.id ? 'grabbing' : 'grab',
          opacity,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'all'
        }}
      >
        {isSearchMatch && (
          <circle
            r={node.radius + 8}
            fill="none"
            stroke={color}
            strokeWidth={3}
            className="glow-animation"
            style={{ color }}
          />
        )}
        <circle
          r={node.radius}
          fill={color}
          stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.3)'}
          strokeWidth={isSelected ? 3 : 1}
          style={{
            transition: 'all 0.3s ease',
            filter: isSelected ? `drop-shadow(0 0 12px ${color})` : 'none'
          }}
        />
        <text
          textAnchor="middle"
          dy="0.35em"
          fill="#ffffff"
          fontSize={Math.max(10, Math.min(14, node.radius / 3))}
          fontWeight={500}
          style={{
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          {node.name.length > 10 ? node.name.substring(0, 10) + '...' : node.name}
        </text>
      </g>
    );
  };

  const FilterPanel = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px',
        backgroundColor: '#2a2a3e',
        height: '100%',
        overflow: 'auto'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={handleBack}
          style={{
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#36364e',
            color: '#e0e0e0',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#40405a')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#36364e')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#e0e0e0' }}>筛选面板</h2>
      </div>

      {stats && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#1e1e2e',
            borderRadius: '12px',
            border: '1px solid #36364e'
          }}
        >
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#a0a0b0', marginBottom: '12px' }}>
            统计信息
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#a0a0b0' }}>文件总数</span>
              <span style={{ fontWeight: 600, color: '#e0e0e0' }}>{stats.totalFiles}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#a0a0b0' }}>依赖关系</span>
              <span style={{ fontWeight: 600, color: '#e0e0e0' }}>{stats.totalDependencies}</span>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#a0a0b0', marginBottom: '12px' }}>
          搜索节点
        </h3>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="输入文件名或路径..."
          style={{
            width: '100%',
            padding: '12px 14px',
            backgroundColor: '#1e1e2e',
            border: '1px solid #4a4a5e',
            borderRadius: '10px',
            color: '#e0e0e0',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.3s ease'
          }}
          onFocus={(e) => (e.target.style.borderColor = '#6c6cf0')}
          onBlur={(e) => (e.target.style.borderColor = '#4a4a5e')}
        />
      </div>

      <div>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#a0a0b0', marginBottom: '12px' }}>
          文件类型
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(Object.keys(FILE_TYPE_COLORS) as FileType[]).map((type) => (
            <label
              key={type}
              onClick={() => toggleTypeVisibility(type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease',
                backgroundColor: visibleTypes.has(type) ? 'rgba(108, 108, 240, 0.1)' : 'transparent'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(108, 108, 240, 0.15)')}
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = visibleTypes.has(type)
                  ? 'rgba(108, 108, 240, 0.1)'
                  : 'transparent')
              }
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  border: `2px solid ${visibleTypes.has(type) ? FILE_TYPE_COLORS[type] : '#4a4a5e'}`,
                  backgroundColor: visibleTypes.has(type) ? FILE_TYPE_COLORS[type] : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
              >
                {visibleTypes.has(type) && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', color: '#e0e0e0' }}>{FILE_TYPE_LABELS[type]}</div>
                <div style={{ fontSize: '11px', color: '#a0a0b0' }}>
                  {stats?.fileTypes[type] || 0} 个文件
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
        <button
          onClick={resetLayout}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#36364e',
            border: 'none',
            borderRadius: '10px',
            color: '#e0e0e0',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#40405a')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#36364e')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          重置布局
        </button>
        <button
          onClick={resetView}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'transparent',
            border: '1px solid #4a4a5e',
            borderRadius: '10px',
            color: '#a0a0b0',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#6c6cf0';
            e.currentTarget.style.color = '#e0e0e0';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#4a4a5e';
            e.currentTarget.style.color = '#a0a0b0';
          }}
        >
          清除选择
        </button>
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#1e1e2e',
        position: 'relative'
      }}
    >
      <style>{`
        @media (min-width: 768px) {
          .desktop-sidebar { display: block !important; }
          .mobile-toolbar { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-sidebar { display: none !important; }
          .mobile-toolbar { display: flex !important; }
        }
      `}</style>

      <div className="desktop-sidebar" style={{ width: '280px', flexShrink: 0, borderRight: '1px solid #36364e' }}>
        <FilterPanel />
      </div>

      <div className="mobile-toolbar" style={{
        display: 'none',
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 100,
        gap: '8px'
      }}>
        <button
          onClick={handleBack}
          style={{
            padding: '10px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: 'rgba(42, 42, 62, 0.9)',
            backdropFilter: 'blur(8px)',
            color: '#e0e0e0',
            cursor: 'pointer'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{
            padding: '10px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: isMobileMenuOpen ? 'rgba(108, 108, 240, 0.9)' : 'rgba(42, 42, 62, 0.9)',
            backdropFilter: 'blur(8px)',
            color: '#e0e0e0',
            cursor: 'pointer'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </div>

      {isMobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '60px',
            right: '16px',
            width: '280px',
            maxHeight: 'calc(100vh - 80px)',
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 99,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <FilterPanel />
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          onMouseDown={handleCanvasMouseDown}
          onClick={handleCanvasClick}
          onWheel={handleWheel}
          style={{
            cursor: isPanning ? 'grabbing' : 'grab',
            userSelect: 'none'
          }}
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2a2a3e" strokeWidth="0.5" />
            </pattern>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#808080" />
            </marker>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" className="grid-pattern" />

          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
            <g style={{ pointerEvents: 'none' }}>
              {edges.map((edge, index) => renderEdge(edge, index))}
            </g>
            <g>{nodes.map((node) => renderNode(node))}</g>
          </g>
        </svg>

        {tooltip && (
          <div
            style={{
              position: 'absolute',
              left: tooltip.x + 15,
              top: tooltip.y + 15,
              padding: '16px',
              backgroundColor: 'rgba(42, 42, 62, 0.95)',
              backdropFilter: 'blur(8px)',
              borderRadius: '12px',
              border: '1px solid #36364e',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              pointerEvents: 'none',
              zIndex: 100,
              animation: 'fadeIn 0.15s ease',
              minWidth: '200px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: FILE_TYPE_COLORS[tooltip.node.type]
                }}
              />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0e0' }}>
                {tooltip.node.name}
              </div>
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#a0a0b0',
                marginBottom: '12px',
                fontFamily: "'JetBrains Mono', monospace"
              }}
            >
              {tooltip.node.path}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '13px'
              }}
            >
              <div>
                <span style={{ color: '#a0a0b0' }}>类型:</span>
                <span style={{ color: '#e0e0e0', marginLeft: '6px' }}>
                  {FILE_TYPE_LABELS[tooltip.node.type]}
                </span>
              </div>
              <div>
                <span style={{ color: '#a0a0b0' }}>行数:</span>
                <span style={{ color: '#e0e0e0', marginLeft: '6px', fontWeight: 600 }}>
                  {tooltip.node.lineCount}
                </span>
              </div>
              <div>
                <span style={{ color: '#a0a0b0' }}>导入:</span>
                <span style={{ color: '#4a9eff', marginLeft: '6px', fontWeight: 600 }}>
                  {tooltip.node.imports.length}
                </span>
              </div>
              <div>
                <span style={{ color: '#a0a0b0' }}>被导入:</span>
                <span style={{ color: '#4ade80', marginLeft: '6px', fontWeight: 600 }}>
                  {tooltip.node.importedBy.length}
                </span>
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            padding: '12px 16px',
            backgroundColor: 'rgba(42, 42, 62, 0.9)',
            backdropFilter: 'blur(8px)',
            borderRadius: '10px',
            border: '1px solid #36364e',
            fontSize: '12px',
            color: '#a0a0b0',
            display: 'flex',
            gap: '16px',
            alignItems: 'center'
          }}
        >
          <span>缩放: {(transform.k * 100).toFixed(0)}%</span>
          <span style={{ color: '#36364e' }}>|</span>
          <span>节点: {filteredNodeIds.size}</span>
        </div>
      </div>
    </div>
  );
};

export default GraphPage;
