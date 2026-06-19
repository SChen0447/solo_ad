import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Work } from '../types';
import '../styles/force-graph.css';

interface GraphNode {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isMain: boolean;
  color: string;
  work?: Work;
}

interface GraphEdge {
  source: string;
  target: string;
  similarity: number;
}

interface ForceGraphProps {
  mainArtistWorks: Work[];
  relatedWorks: (Work & { artistName: string; styleTags: string[] })[];
  artistStyleTags: string[];
}

const calculateStyleSimilarity = (tags1: string[], tags2: string[]): number => {
  if (tags1.length === 0 || tags2.length === 0) return 0;
  const set1 = new Set(tags1);
  let common = 0;
  tags2.forEach(tag => {
    if (set1.has(tag)) common++;
  });
  return (common / Math.max(tags1.length, tags2.length)) * 100;
};

const ForceGraph: React.FC<ForceGraphProps> = ({
  mainArtistWorks,
  relatedWorks,
  artistStyleTags,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const initGraph = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    canvas.width = width;
    canvas.height = height;

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    const mainColors = ['#6c63ff', '#4ade80', '#fbbf24', '#f472b6', '#38bdf8'];
    const relatedColor = '#a0a0b8';

    mainArtistWorks.forEach((work, i) => {
      const angle = (i / Math.max(mainArtistWorks.length, 1)) * Math.PI * 2;
      const radius = 80;
      nodes.push({
        id: work.id,
        name: work.name,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: 18,
        isMain: true,
        color: mainColors[i % mainColors.length],
        work,
      });
    });

    relatedWorks.forEach((work, i) => {
      const angle = (i / Math.max(relatedWorks.length, 1)) * Math.PI * 2;
      const radius = 180;
      nodes.push({
        id: work.id,
        name: work.name,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: 14,
        isMain: false,
        color: relatedColor,
        work,
      });
    });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        const similarity = calculateStyleSimilarity(
          nodeA.isMain ? artistStyleTags : (nodeA.work as any).styleTags || [],
          nodeB.isMain ? artistStyleTags : (nodeB.work as any).styleTags || []
        );

        if (similarity > 30) {
          edges.push({
            source: nodeA.id,
            target: nodeB.id,
            similarity,
          });
        }
      }
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [mainArtistWorks, relatedWorks, artistStyleTags]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    edges.forEach(edge => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) return;

      const isHighSimilarity = edge.similarity > 70;
      const lineWidth = isHighSimilarity ? 3 : 1.5;
      const color = isHighSimilarity ? '#4ade80' : 'rgba(160, 160, 184, 0.3)';

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    });

    nodes.forEach(node => {
      const isHovered = hoveredNode === node.id;
      const scale = isHovered ? 1.3 : 1;
      const r = node.radius * scale;

      if (isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 8, 0, Math.PI * 2);
        ctx.fillStyle = `${node.color}20`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();

      ctx.strokeStyle = node.isMain ? '#fff' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (isHovered || node.isMain) {
        ctx.fillStyle = '#e0e0f0';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.name, node.x, node.y + r + 14);
      }
    });
  }, [hoveredNode]);

  const simulate = useCallback(() => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const canvas = canvasRef.current;
    if (!canvas) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    nodes.forEach(node => {
      if (node.id === draggingNode) return;

      let fx = 0;
      let fy = 0;

      nodes.forEach(other => {
        if (other.id === node.id) return;
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 2000 / (dist * dist);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      });

      edges.forEach(edge => {
        let source, target;
        if (edge.source === node.id) {
          source = node;
          target = nodeMap.get(edge.target);
        } else if (edge.target === node.id) {
          source = nodeMap.get(edge.source);
          target = node;
        } else {
          return;
        }
        if (!source || !target) return;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const restLength = edge.similarity > 70 ? 100 : 180;
        const force = (dist - restLength) * 0.02;

        if (edge.source === node.id) {
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        } else {
          fx -= (dx / dist) * force;
          fy -= (dy / dist) * force;
        }
      });

      const cx = centerX - node.x;
      const cy = centerY - node.y;
      fx += cx * 0.002;
      fy += cy * 0.002;

      node.vx += fx;
      node.vy += fy;
      node.vx *= 0.9;
      node.vy *= 0.9;

      node.x += node.vx;
      node.y += node.vy;

      const margin = 30;
      node.x = Math.max(margin, Math.min(canvas.width - margin, node.x));
      node.y = Math.max(margin, Math.min(canvas.height - margin, node.y));
    });
  }, [draggingNode]);

  const animate = useCallback(() => {
    simulate();
    draw();
    animationRef.current = requestAnimationFrame(animate);
  }, [simulate, draw]);

  const getNodeAtPosition = (x: number, y: number): GraphNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy < node.radius * node.radius) {
        return node;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const node = getNodeAtPosition(x, y);
    if (node) {
      setDraggingNode(node.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggingNode) {
      const node = nodesRef.current.find(n => n.id === draggingNode);
      if (node) {
        node.x = x;
        node.y = y;
        node.vx = 0;
        node.vy = 0;
      }
    } else {
      const node = getNodeAtPosition(x, y);
      setHoveredNode(node?.id || null);
    }
  };

  const handleMouseUp = () => {
    setDraggingNode(null);
  };

  const handleMouseLeave = () => {
    setDraggingNode(null);
    setHoveredNode(null);
  };

  useEffect(() => {
    initGraph();
    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [initGraph, animate]);

  useEffect(() => {
    const handleResize = () => {
      initGraph();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initGraph]);

  return (
    <div className="force-graph-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: draggingNode ? 'grabbing' : hoveredNode ? 'grab' : 'default' }}
      />
      <div className="graph-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#6c63ff' }}></span>
          <span>当前艺术家作品</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#a0a0b8' }}></span>
          <span>其他艺术家作品</span>
        </div>
        <div className="legend-item">
          <span className="legend-line green"></span>
          <span>高相似度 (&gt;70%)</span>
        </div>
      </div>
    </div>
  );
};

export default ForceGraph;
