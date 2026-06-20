import React, { useEffect, useRef } from 'react';
import { Artist, Track } from '../types';
import { computeTrackSimilarity, getArtistColor } from '../utils/helpers';

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

const ForceGraph: React.FC<Props> = ({ artist, allArtists, allTracks, styleColors }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const rafRef = useRef<number | null>(null);
  const draggingRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const buildGraph = () => {
      const artistTracks = allTracks.filter(t => t.artistId === artist.id);
      const relatedArtists = allArtists.filter(a => {
        if (a.id === artist.id) return true;
        const sim = computeTrackSimilarity(artist.styleTags, a.styleTags);
        return sim > 30;
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
        const radius = isCenter ? 0 : Math.min(w, h) * 0.28;
        const node: Node = {
          id: `a-${a.id}`,
          label: a.name,
          x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
          y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 20,
          vx: 0, vy: 0,
          isArtist: true,
          color: isCenter ? '#6c63ff' : getArtistColor(a.styleTags, styleColors),
          radius: isCenter ? 22 : 14,
          tags: a.styleTags,
        };
        nodes.push(node);
        nodeMap.set(node.id, node);
      });

      artistTracks.forEach((t, i) => {
        const artistNode = nodeMap.get(`a-${t.artistId}`);
        const baseX = artistNode ? artistNode.x + (Math.random() - 0.5) * 40 : cx;
        const baseY = artistNode ? artistNode.y + (Math.random() - 0.5) * 40 : cy;
        const node: Node = {
          id: `t-${t.id}`,
          label: t.name,
          x: baseX,
          y: baseY,
          vx: 0, vy: 0,
          isArtist: false,
          color: '#a29bfe',
          radius: 10,
        };
        nodes.push(node);
        nodeMap.set(node.id, node);
      });

      const edges: Edge[] = [];

      for (let i = 0; i < relatedArtists.length; i++) {
        for (let j = i + 1; j < relatedArtists.length; j++) {
          const a = relatedArtists[i];
          const b = relatedArtists[j];
          if (a.id === artist.id || b.id === artist.id) {
            const sim = computeTrackSimilarity(a.styleTags, b.styleTags);
            if (sim > 20) {
              edges.push({ source: `a-${a.id}`, target: `a-${b.id}`, similarity: sim });
            }
          }
        }
      }

      artistTracks.forEach(t => {
        edges.push({ source: `a-${t.artistId}`, target: `t-${t.id}`, similarity: 100 });
      });

      for (let i = 0; i < artistTracks.length; i++) {
        for (let j = i + 1; j < artistTracks.length; j++) {
          edges.push({ source: `t-${artistTracks[i].id}`, target: `t-${artistTracks[j].id}`, similarity: 50 });
        }
      }

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
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { w, h } = sizeRef.current;
      const cx = w / 2;
      const cy = h / 2;
      const damping = 0.85;
      const repulse = 3000;
      const spring = 0.008;
      const centerPull = 0.002;
      const idealDist = 90;

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
          n.vx += (dx / dist)