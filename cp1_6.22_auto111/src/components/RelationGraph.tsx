import { useRef, useEffect, useState, useCallback } from 'react';
import { Character, Relation } from '@/api';
import './RelationGraph.css';

interface RelationGraphProps {
  characters: Character[];
  relations: Relation[];
}

interface Node {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  character: Character;
  connectionCount: number;
}

interface Edge {
  id: string;
  source: Node;
  target: Node;
  strength: number;
  type: string;
}

function RelationGraph({ characters, relations }: RelationGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const draggedNodeRef = useRef<string | null>(null);
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPanRef = useRef({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    hoveredNodeRef.current = hoveredNode;
  }, [hoveredNode]);

  useEffect(() => {
    draggedNodeRef.current = draggedNode;
  }, [draggedNode]);

  const initSimulation = useCallback(() => {
    if (!containerRef.current || characters.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const connectionCounts: Record<string, number> = {};
    relations.forEach((rel) => {
      connectionCounts[rel.source] = (connectionCounts[rel.source] || 0) + 1;
      connectionCounts[rel.target] = (connectionCounts[rel.target] || 0) + 1;
    });

    const maxConnections = Math.max(...Object.values(connectionCounts), 1);

    const nodes: Node[] = characters.map((char, i) => {
      const count = connectionCounts[char.id] || 1;
      const radius = 30 + ((count / maxConnections) * 30);
      const angle = (i / characters.length) * Math.PI * 2;
      const distance = Math.min(width, height) * 0.3;
      return {
        id: char.id,
        x: width / 2 + Math.cos(angle) * distance,
        y: height / 2 + Math.sin(angle) * distance,
        vx: 0,
        vy: 0,
        radius,
        character: char,
        connectionCount: count,
      };
    });

    const nodeMap: Record<string, Node> = {};
    nodes.forEach((n) => {
      nodeMap[n.id] = n;
    });

    const edges: Edge[] = relations
      .filter((r) => nodeMap[r.source] && nodeMap[r.target])
      .map((rel) => ({
        id: rel.id,
        source: nodeMap[rel.source],
        target: nodeMap[rel.target],
        strength: rel.strength,
        type: rel.type,
      }));

    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [characters, relations]);

  useEffect(() => {
    initSimulation();
  }, [initSimulation]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    ctx.scale(dpr, dpr);

    if (nodesRef.current.length === 0) return;

    const updateSimulation = () => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const width = dimensions.width;
      const height = dimensions.height;

      if (nodes.length === 0) return;

      const centerX = width / 2;
      const centerY = height / 2;

      nodes.forEach((node, i) => {
        if (draggedNodeRef.current === node.id) return;

        nodes.forEach((other, j) => {
          if (i === j) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = node.radius + other.radius + 20;
          if (dist < minDist * 3) {
            const force = (minDist * minDist) / (dist * dist) * 0.5;
            node.vx += (dx / dist) * force;
            node.vy += (dy / dist) * force;
          }
        });

        edges.forEach((edge) => {
          let other: Node | null = null;
          if (edge.source.id === node.id) {
            other = edge.target;
          } else if (edge.target.id === node.id) {
            other = edge.source;
          }
          if (other) {
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const targetDist = 100 + edge.strength * 20;
            const force = (dist - targetDist) * 0.02 * edge.strength;
            node.vx += (dx / dist) * force;
            node.vy += (dy / dist) * force;
          }
        });

        const dx = centerX - node.x;
        const dy = centerY - node.y;
        node.vx += dx * 0.001;
        node.vy += dy * 0.001;

        node.vx *= 0.85;
        node.vy *= 0.85;

        node.x += node.vx;
        node.y += node.vy;

        node.x = Math.max(node.radius, Math.min(width - node.radius, node.x));
        node.y = Math.max(node.radius, Math.min(height - node.radius, node.y));
      });
    };

    const render = () => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const width = dimensions.width;
      const height = dimensions.height;

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(offsetRef.current.x, offsetRef.current.y);
      ctx.scale(scaleRef.current, scaleRef.current);

      const hovered = hoveredNodeRef.current;
      const highlightedNodes = new Set<string>();
      const highlightedEdges = new Set<string>();

      if (hovered) {
        highlightedNodes.add(hovered);
        edges.forEach((edge) => {
          if (edge.source.id === hovered || edge.target.id === hovered) {
            highlightedEdges.add(edge.id);
            highlightedNodes.add(edge.source.id);
            highlightedNodes.add(edge.target.id);
          }
        });
      }

      const hasHover = hovered !== null;

      edges.forEach((edge) => {
        const isHighlighted = highlightedEdges.has(edge.id);
        const alpha = hasHover ? (isHighlighted ? 1 : 0.15) : 0.6;

        ctx.beginPath();
        ctx.moveTo(edge.source.x, edge.source.y);
        ctx.lineTo(edge.target.x, edge.target.y);
        ctx.strokeStyle = hasHover
          ? isHighlighted
            ? '#a0aec0'
            : 'rgba(160, 174, 192, 0.2)'
          : 'rgba(160, 174, 192, 0.5)';
        ctx.lineWidth = 1 + (edge.strength - 1) * 1;
        ctx.globalAlpha = alpha;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      nodes.forEach((node) => {
        const isHighlighted = highlightedNodes.has(node.id);
        const alpha = hasHover ? (isHighlighted ? 1 : 0.3) : 1;

        ctx.globalAlpha = alpha;

        const gradient = ctx.createRadialGradient(
          node.x - node.radius * 0.3,
          node.y - node.radius * 0.3,
          0,
          node.x,
          node.y,
          node.radius
        );
        gradient.addColorStop(0, lightenColor(node.character.color, 30));
        gradient.addColorStop(1, node.character.color);

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        if (isHighlighted && hasHover) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#fff';
          ctx.stroke();
        }

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(12, node.radius * 0.35)}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.character.name.charAt(0), node.x, node.y);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(node.character.name, node.x, node.y + node.radius + 6);

        ctx.globalAlpha = 1;
      });

      ctx.restore();
    };

    const animate = () => {
      updateSimulation();
      render();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dimensions]);

  const lightenColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `rgb(${R}, ${G}, ${B})`;
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - offsetRef.current.x) / scaleRef.current,
      y: (e.clientY - rect.top - offsetRef.current.y) / scaleRef.current,
    };
  };

  const getNodeAtPosition = (x: number, y: number): Node | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy <= node.radius * node.radius) {
        return node;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    const node = getNodeAtPosition(pos.x, pos.y);

    if (node) {
      setDraggedNode(node.id);
    } else {
      isPanningRef.current = true;
      lastPanRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);

    if (draggedNodeRef.current) {
      const node = nodesRef.current.find((n) => n.id === draggedNodeRef.current);
      if (node) {
        node.x = pos.x;
        node.y = pos.y;
        node.vx = 0;
        node.vy = 0;
      }
      return;
    }

    if (isPanningRef.current) {
      const dx = e.clientX - lastPanRef.current.x;
      const dy = e.clientY - lastPanRef.current.y;
      offsetRef.current.x += dx;
      offsetRef.current.y += dy;
      lastPanRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const node = getNodeAtPosition(pos.x, pos.y);
    setHoveredNode(node ? node.id : null);
    canvasRef.current!.style.cursor = node ? 'grab' : 'default';
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    isPanningRef.current = false;
  };

  const handleMouseLeave = () => {
    setHoveredNode(null);
    setDraggedNode(null);
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(3, scaleRef.current * delta));

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    offsetRef.current.x = mouseX - ((mouseX - offsetRef.current.x) * newScale) / scaleRef.current;
    offsetRef.current.y = mouseY - ((mouseY - offsetRef.current.y) * newScale) / scaleRef.current;

    scaleRef.current = newScale;
  };

  return (
    <div className="relation-graph" ref={containerRef}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        style={{ cursor: hoveredNode ? 'grab' : 'default' }}
      />
      <div className="graph-legend">
        <div className="legend-item">
          <span className="legend-line thick" />
          <span>亲密</span>
        </div>
        <div className="legend-item">
          <span className="legend-line thin" />
          <span>疏远</span>
        </div>
      </div>
    </div>
  );
}

export default RelationGraph;
