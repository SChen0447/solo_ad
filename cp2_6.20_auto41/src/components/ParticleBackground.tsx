import React, { useRef, useEffect, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  offsetX: number;
  offsetY: number;
}

const PARTICLE_COUNT = 150;
const COLORS = ['#87CEEB', '#9BB8D3', '#B0A5C8', '#C89BD4', '#DDA0DD'];
const MIN_SPEED = 0.3;
const MAX_SPEED = 1.5;
const MAX_MOUSE_OFFSET = 20;

const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const frameIdRef = useRef<number>(0);

  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const colorIndex = Math.random() * (COLORS.length - 1);
      const ci = Math.floor(colorIndex);
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED) * (Math.random() > 0.5 ? 1 : -1) * 0.3,
        vy: (Math.random() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED) * 0.3,
        size: Math.random() * 2 + 2,
        color: COLORS[ci],
        opacity: Math.random() * 0.5 + 0.3,
        offsetX: 0,
        offsetY: 0,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (particlesRef.current.length === 0) {
        initParticles(canvas.width, canvas.height);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = Math.min(time - lastTime, 33);
      lastTime = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const p of particlesRef.current) {
        p.x += p.vx * (delta / 16);
        p.y += p.vy * (delta / 16);

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const dx = mx - p.x;
        const dy = my - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 200 && dist > 0) {
          const force = (200 - dist) / 200;
          const targetOffsetX = (dx / dist) * MAX_MOUSE_OFFSET * force;
          const targetOffsetY = (dy / dist) * MAX_MOUSE_OFFSET * force;
          p.offsetX += (targetOffsetX - p.offsetX) * 0.05;
          p.offsetY += (targetOffsetY - p.offsetY) * 0.05;
        } else {
          p.offsetX *= 0.95;
          p.offsetY *= 0.95;
        }

        ctx.beginPath();
        ctx.arc(p.x + p.offsetX, p.y + p.offsetY, p.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      frameIdRef.current = requestAnimationFrame(animate);
    };

    frameIdRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frameIdRef.current);
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export default ParticleBackground;
