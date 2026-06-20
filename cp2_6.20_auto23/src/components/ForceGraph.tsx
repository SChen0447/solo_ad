import React, { useEffect, useRef } from 'react';
import { Artist, Track } from '../types';
import { computeStyleSimilarity, getArtistColor } from '../utils/helpers';

interface Props {
  artist: Artist;
  allArtists: Artist[];
  allTracks: Track[];
  styleColors: Record<string, string>;
}

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isArtist: boolean;
  color: string;
  radius: number;
  tags?: string[];
}

interface Edge {
  source: string;
  target: string;
  similarity: number;
}

function shadeColor(hex: string, percent: number) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) + Math.round(2.55 * percent);
  const g = ((num >> 8) & 0x00ff) + Math.round(2.55 * percent);
  const b = (num & 0x0000ff) + Math.round(2.55 * percent);
  return (
    '#' +
    (
      0x1000000 +
      Math.max(0, Math.min(255, r)) * 0x10000 +
      Math.max(0, Math.min(255, g)) * 0x100 +
      Math.max(0, Math.min(255, b))
    )
      .toString(16)
      .slice(1)
  );
}

const ForceGraph: React.FC<Props> = ({ artist, allArtists, allTracks, styleColors }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const rafRef = useRef<number | null>(null);
  const draggingRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const reqId = useRef(0);

  useEffect(() => {
    reqId.current++;
    const myReqId = reqId.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    function findNode(id: string): Node | undefined {
      return nodesRef.current.find(n => n.id === id);
    }

    const buildGraph = () => {
      const artistTracks = allTracks.filter(t => t.artistId === artist.id);
      const relatedArtists = allArtists.filter(a => {
        if (a.id === artist.id) return true;
        const sim = computeStyleSimilarity(artist, a);
        return sim > 20;
      }).slice(0, 8);

      const nodes: Node[] = [];
      const nodeMap = new Map<string, Node>();
      const w = sizeRef.current.w;
      const h = sizeRef.current.h;
      const cx = w / 2;
      const cy = h / 2;

      relatedArtists.forEach((a, i) => {
        const isCenter = a.id === artist.id;
        const angle = (i / Math.max(1, relatedArtists.length)) * Math.PI * 2;
        const radius = isCenter ? 0 : Math.min(w, h) * 0.3;
        const node: Node = {
          id: `a-${a.id}`,
          label: a.name,
          x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 10,
          y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 10,
          vx: 0,
          vy: 0,
          isArtist: true,
          color: isCenter ? '#6c63ff' : getArtistColor(a.styleTags, styleColors),
          radius: isCenter ? 20 : 12,
          tags: a.styleTags,
        };
        nodes.push(node);
        nodeMap.set(node.id, node);
      });

      artistTracks.forEach(t => {
        const artistNode = nodeMap.get(`a-${t.artistId}`);
        const baseX = artistNode ? artistNode.x + (Math.random() - 0.5) * 30 : cx;
        const baseY = artistNode ? artistNode.y + (Math.random() - 0.5) * 30 : cy;
        const node: Node = {
          id: `t-${t.id}`,
          label: t.name,
          x: baseX,
          y: baseY,
          vx: 0,
          vy: 0,
          isArtist: false,
          color: '#a29bfe',
          radius: 8,
        };
        nodes.push(node);
        nodeMap.set(node.id, node);
      });

      const edges: Edge[] = [];

      for (let i = 0; i < relatedArtists.length; i++) {
        for (let j = i + 1; j < relatedArtists.length; j++) {
          const a = relatedArtists[i];
          const b = relatedArtists[j];
          const sim = computeStyleSimilarity(a, b);
          if (sim > 20) {
            edges.push({ source: `a-${a.id}`, target: `a-${b.id}`, similarity: sim });
          }
        }
      }

      artistTracks.forEach(t => {
        edges.push({ source: `a-${t.artistId}`, target: `t-${t.id}`, similarity: 100 });
      });

      nodesRef.current = nodes;
      edgesRef.current = edges;
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      sizeRef.current = { w: rect.width, h: rect.height };
    };

    resize();
    buildGraph();

    const step = () => {
      if (myReqId !== reqId.current) return;
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { w, h } = sizeRef.current;
      const cx = w / 2;
      const cy = h / 2;
      const damping = 0.82;
      const repulse = 2500;
      const spring = 0.006;
      const centerPull = 0.0015;
      const idealDist = 100;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (draggingRef.current?.id === n.id) continue;
        n.vx += (cx - n.x) * centerPull;
        n.vy += (cy - n.y) * centerPull;

        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const other = nodes[j];
          const dx = n.x - other.x;
          const dy = n.y - other.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < 1) continue;
          const f = repulse / dist2;
          const dist = Math.sqrt(dist2);
          n.vx += (dx / dist) * f;
          n.vy += (dy / dist) * f;
        }
      }

      edges.forEach(e => {
        const s = findNode(e.source);
        const t = findNode(e.target);
        if (!s || !t) return;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return;
        const diff = (dist - idealDist) * spring * (e.similarity / 50);
        const fx = (dx / dist) * diff;
        const fy = (dy / dist) * diff;
        s.vx += fx;
        s.vy += fy;
        t.vx -= fx;
        t.vy -= fy;
      });

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (draggingRef.current?.id === n.id) {
          n.vx = 0;
          n.vy = 0;
          continue;
        }
        n.vx *= damping;
        n.vy *= damping;
        n.x += n.vx;
        n.y += n.vy;
        const pad = 20;
        n.x = Math.max(pad, Math.min(w - pad, n.x));
        n.y = Math.max(pad, Math.min(h - pad, n.y));
      }

      ctx.clearRect(0, 0, w, h);

      edges.forEach(e => {
        const s = findNode(e.source);
        const t = findNode(e.target);
        if (!s || !t) return;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        const sim = e.similarity;
        if (sim > 70) {
          ctx.strokeStyle = 'rgba(123, 230, 161, 0.9)';
          ctx.lineWidth = 2.5;
        } else if (sim > 40) {
          ctx.strokeStyle = 'rgba(162, 155, 254, 0.6)';
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = 'rgba(162, 155, 254, 0.25)';
          ctx.lineWidth = 1;
        }
        ctx.stroke();
      });

      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(
          n.x - n.radius * 0.3,
          n.y - n.radius * 0.3,
          1,
          n.x,
          n.y,
          n.radius
        );
        grad.addColorStop(0, n.color);
        grad.addColorStop(1, shadeColor(n.color, -30));
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (n.label && (n.isArtist || nodes.length < 20)) {
          ctx.fillStyle = '#e0e0f0';
          ctx.font = n.isArtist ? 'bold 11px -apple-system, sans-serif' : '10px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(n.label.slice(0, 12), n.x, n.y + n.radius + 14);
        }
      });

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    const onResize = () => {
      resize();
      buildGraph();
    };
    window.addEventListener('resize', onResize);

    const handleDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      for (let i = nodesRef.current.length - 1; i >= 0; i--) {
        const n = nodesRef.current[i];
        const dx = mx - n.x;
        const dy = my - n.y;
        if (dx * dx + dy * dy <= n.radius * n.radius * 1.5) {
          draggingRef.current = { id: n.id, offsetX: dx, offsetY: dy };
          break;
        }
      }
    };

    const handleMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const n = findNode(draggingRef.current.id);
      if (n) {
        n.x = mx - draggingRef.current.offsetX;
        n.y = my - draggingRef.current.offsetY;
        const pad = 20;
        n.x = Math.max(pad, Math.min(sizeRef.current.w - pad, n.x));
        n.y = Math.max(pad, Math.min(sizeRef.current.h - pad, n.y));
      }
    };

    const handleUp = () => {
      draggingRef.current = null;
    };

    canvas.addEventListener('mousedown', handleDown);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [artist, allArtists, allTracks, styleColors]);

  return (
    <div className="force-graph-container" style={{ width: '100%', height: '100%', minHeight: 320 }}>
      <canvas ref={canvasRef} style={{ display: 'block', cursor: 'grab' }} />
    </div>
  );
};

export default ForceGraph;
