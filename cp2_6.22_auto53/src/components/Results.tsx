import React, { useEffect, useRef, useState } from 'react';

interface ResultsProps {
  rank: number;
  time: number;
  onRestart: () => void;
  onBackToWorkshop: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  maxSize: number;
  color: string;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const Results: React.FC<ResultsProps> = ({ rank, time, onRestart, onBackToWorkshop }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const [isFirst, setIsFirst] = useState(rank === 1);

  const createFirework = (x: number, y: number) => {
    const colors = ['#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899'];
    
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50 + Math.random() * 0.2;
      const speed = 2 + Math.random() * 5;
      
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 2.5,
        maxLife: 2.5,
        size: 4 + Math.random() * 3,
        maxSize: 7,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isFirst) {
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          createFirework(
            100 + Math.random() * (CANVAS_WIDTH - 200),
            100 + Math.random() * 200
          );
        }, i * 300);
      }
    }

    let lastTime = performance.now();

    const animate = (timestamp: number) => {
      const deltaTime = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life -= deltaTime;
        p.size = p.maxSize * (p.life / p.maxLife);
        return p.life > 0;
      });

      for (const p of particlesRef.current) {
        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.restore();
      }

      if (isFirst && Math.random() < 0.02) {
        createFirework(
          100 + Math.random() * (CANVAS_WIDTH - 200),
          100 + Math.random() * 300
        );
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isFirst]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const getRankText = (): string => {
    switch (rank) {
      case 1: return '第一名';
      case 2: return '第二名';
      case 3: return '第三名';
      default: return '第四名';
    }
  };

  const getRankColor = (): string => {
    switch (rank) {
      case 1: return '#FBBF24';
      case 2: return '#94A3B8';
      case 3: return '#D97706';
      default: return '#64748B';
    }
  };

  return (
    <div className="results-container">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="results-canvas"
      />

      <div className="results-content">
        <h1 className="results-title" style={{ color: getRankColor() }}>
          {isFirst ? '🏆 胜利！' : '比赛结束'}
        </h1>

        <div className="results-card">
          <div className="result-item">
            <span className="result-label">最终排名</span>
            <span className="result-value rank-value" style={{ color: getRankColor() }}>
              {getRankText()}
            </span>
          </div>

          <div className="result-item">
            <span className="result-label">完成用时</span>
            <span className="result-value">{formatTime(time)}</span>
          </div>

          {isFirst && (
            <div className="result-badge">
              ⭐ 完美表现 ⭐
            </div>
          )}
        </div>

        <div className="results-buttons">
          <button className="result-btn primary" onClick={onRestart}>
            再来一局
          </button>
          <button className="result-btn secondary" onClick={onBackToWorkshop}>
            返回改装车间
          </button>
        </div>
      </div>
    </div>
  );
};

export default Results;
