import React, { useState, useRef, useEffect, useCallback } from 'react';

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
const TARGET_FPS = 45;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

function lerpColor(start: string, end: string, t: number): string {
  const sr = parseInt(start.slice(1, 3), 16);
  const sg = parseInt(start.slice(3, 5), 16);
  const sb = parseInt(start.slice(5, 7), 16);
  const er = parseInt(end.slice(1, 3), 16);
  const eg = parseInt(end.slice(3, 5), 16);
  const eb = parseInt(end.slice(5, 7), 16);
  const r = Math.round(sr + (er - sr) * t);
  const g = Math.round(sg + (eg - sg) * t);
  const b = Math.round(sb + (eb - sb) * t);
  return `rgb(${r},${g},${b})`;
}

const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const frameIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);

  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const colorT = Math.random();
      const colorIndex = colorT * (COLORS.length - 1);
      const ci = Math.floor(colorIndex);
      const ct = colorIndex - ci;
      const color = ci >= COLORS.length - 1
        ? COLORS[COLORS.length - 1]
        : lerpColor(COLORS[ci], COLORS[ci + 1], ct);

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED) * (Math.random() > 0.5 ? 1 : -1) * 0.5,
        vy: (Math.random() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED) * 0.3,
        size: Math.random() * 2 + 2,
        color,
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

    lastTimeRef.current = performance.now();

    const animate = (time: number) => {
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;
      accumulatorRef.current += deltaTime;

      while (accumulatorRef.current >= FRAME_INTERVAL) {
        updateParticles(canvas.width, canvas.height, FRAME_INTERVAL / 16.67);
        accumulatorRef.current -= FRAME_INTERVAL;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawParticles(ctx);

      frameIdRef.current = requestAnimationFrame(animate);
    };

    const updateParticles = (width: number, height: number, speedMult: number) => {
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const p of particlesRef.current) {
        p.x += p.vx * speedMult;
        p.y += p.vy * speedMult;

        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        const dx = mx - p.x;
        const dy = my - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 200 && dist > 0) {
          const force = (200 - dist) / 200;
          const targetOffsetX = (dx / dist) * MAX_MOUSE_OFFSET * force;
          const targetOffsetY = (dy / dist) * MAX_MOUSE_OFFSET * force;
          p.offsetX += (targetOffsetX - p.offsetX) * 0.08;
          p.offsetY += (targetOffsetY - p.offsetY) * 0.08;
        } else {
          p.offsetX *= 0.92;
          p.offsetY *= 0.92;
        }
      }
    };

    const drawParticles = (ctx: CanvasRenderingContext2D) => {
      for (const p of particlesRef.current) {
        ctx.beginPath();
        ctx.arc(p.x + p.offsetX, p.y + p.offsetY, p.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
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
