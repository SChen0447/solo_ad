import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { TagBubble, BubbleConnection } from '../types';
import { api } from '../utils/api';

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
  opacity: number;
}

const StarChart: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<TagBubble[]>([]);
  const [connections, setConnections] = useState<BubbleConnection[]>([]);
  const [month, setMonth] = useState('');
  const [hoveredBubble, setHoveredBubble] = useState<TagBubble | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 600;

  const initParticles = useCallback(() => {
    const particles: Particle[] = [];
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: 1 + Math.random() * 1,
        speed: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.3 + Math.random() * 0.4
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await api.getStarChart();
        setBubbles(data.tags);
        setConnections(data.connections);
        setMonth(data.month);
        initParticles();
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [initParticles]);

  useEffect(() => {
    if (isLoading || error || bubbles.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;
    ctx.scale(dpr, dpr);

    const render = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = (timestamp - startTimeRef.current) / 1000;

      ctx.fillStyle = '#0a0e27';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      particlesRef.current.forEach(particle => {
        const yOffset = Math.sin(elapsed * particle.speed + particle.phase) * 2;
        const xOffset = Math.sin(elapsed * particle.speed * 0.7 + particle.phase) * 1;
        const opacity = particle.opacity * (0.5 + 0.5 * Math.sin(elapsed * particle.speed + particle.phase));
        
        ctx.beginPath();
        ctx.arc(
          particle.x + xOffset,
          particle.y + yOffset,
          particle.size,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fill();
      });

      const bubbleMap = new Map(bubbles.map(b => [b.name, b]));
      connections.forEach(conn => {
        const from = bubbleMap.get(conn.from);
        const to = bubbleMap.get(conn.to);
        if (from && to) {
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      bubbles.forEach(bubble => {
        const gradient = ctx.createRadialGradient(
          bubble.x - bubble.radius * 0.3,
          bubble.y - bubble.radius * 0.3,
          0,
          bubble.x,
          bubble.y,
          bubble.radius
        );
        gradient.addColorStop(0, bubble.color);
        gradient.addColorStop(1, adjustColor(bubble.color, -30));

        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = `${bubble.color}40`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Lato, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bubble.name, bubble.x, bubble.y - 6);
        
        ctx.font = '12px Lato, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(`${bubble.count}`, bubble.x, bubble.y + 12);
      });

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isLoading, error, bubbles, connections]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let found: TagBubble | null = null;
    for (const bubble of bubbles) {
      const dx = x - bubble.x;
      const dy = y - bubble.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= bubble.radius) {
        found = bubble;
        break;
      }
    }

    setHoveredBubble(found);
    if (found) {
      setTooltipPos({ x: e.clientX + 10, y: e.clientY + 10 });
    }
  }, [bubbles]);

  const adjustColor = (color: string, amount: number): string => {
    const num = parseInt(color.slice(1), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  if (isLoading) {
    return <div className="loading">生成星图中...</div>;
  }

  if (error) {
    return <div className="empty-state">{error}</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">灵感星图</h1>
        <p className="page-description">{month} 月度灵感分布可视化</p>
      </div>

      <div className="star-chart-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="star-chart-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredBubble(null)}
        />
        {hoveredBubble && (
          <div
            className="star-chart-tooltip"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
              position: 'fixed'
            }}
          >
            <strong>{hoveredBubble.name}</strong>: {hoveredBubble.count} 个灵感
          </div>
        )}
      </div>
    </div>
  );
};

export default StarChart;
