import React, { useRef, useEffect, useCallback } from 'react';
import { Particle, Spring, CollisionBall, Shockwave } from '../physics/types';

interface RendererProps {
  width: number;
  height: number;
  particles: Particle[];
  springs: Spring[];
  collisionBalls: CollisionBall[];
  shockwaves: Shockwave[];
  groundY: number;
  onParticleDragStart?: (particleId: string, x: number, y: number) => void;
  onParticleDragMove?: (x: number, y: number) => void;
  onParticleDragEnd?: () => void;
  showTensionHeatmap?: boolean;
  showTrails?: boolean;
}

function getTensionColor(tension: number, maxTension: number = 100): string {
  const ratio = Math.min(tension / maxTension, 1);
  const r = Math.floor(255 * ratio);
  const b = Math.floor(255 * (1 - ratio));
  const g = Math.floor(100 * (1 - ratio * 0.5));
  return `rgb(${r}, ${g}, ${b})`;
}

export const Renderer: React.FC<RendererProps> = ({
  width,
  height,
  particles,
  springs,
  collisionBalls,
  shockwaves,
  groundY,
  onParticleDragStart,
  onParticleDragMove,
  onParticleDragEnd,
  showTensionHeatmap = true,
  showTrails = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const draggedParticleRef = useRef<string | null>(null);

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const findParticleAt = useCallback(
    (x: number, y: number): Particle | null => {
      let closest: Particle | null = null;
      let closestDist = Infinity;
      const hitRadius = 15;

      for (const particle of particles) {
        const dx = particle.position.x - x;
        const dy = particle.position.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < hitRadius && dist < closestDist) {
          closest = particle;
          closestDist = dist;
        }
      }
      return closest;
    },
    [particles]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      const particle = findParticleAt(x, y);
      if (particle && onParticleDragStart) {
        isDraggingRef.current = true;
        draggedParticleRef.current = particle.id;
        onParticleDragStart(particle.id, x, y);
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      }
    },
    [getCanvasCoords, findParticleAt, onParticleDragStart]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current || !onParticleDragMove) return;
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      onParticleDragMove(x, y);
    },
    [getCanvasCoords, onParticleDragMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isDraggingRef.current && onParticleDragEnd) {
        isDraggingRef.current = false;
        draggedParticleRef.current = null;
        onParticleDragEnd();
      }
    },
    [onParticleDragEnd]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.7
    );
    gradient.addColorStop(0, '#1a1a3e');
    gradient.addColorStop(1, '#0d0d20');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();

    const particleMap = new Map(particles.map((p) => [p.id, p]));

    if (showTensionHeatmap) {
      let maxTension = 1;
      for (const spring of springs) {
        if (spring.tension > maxTension) maxTension = spring.tension;
      }

      for (const spring of springs) {
        const p1 = particleMap.get(spring.p1);
        const p2 = particleMap.get(spring.p2);
        if (!p1 || !p2) continue;

        ctx.strokeStyle = getTensionColor(spring.tension, maxTension);
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(p1.position.x, p1.position.y);
        ctx.lineTo(p2.position.x, p2.position.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.4)';
      ctx.lineWidth = 1;
      for (const spring of springs) {
        const p1 = particleMap.get(spring.p1);
        const p2 = particleMap.get(spring.p2);
        if (!p1 || !p2) continue;
        ctx.beginPath();
        ctx.moveTo(p1.position.x, p1.position.y);
        ctx.lineTo(p2.position.x, p2.position.y);
        ctx.stroke();
      }
    }

    if (showTrails) {
      for (const particle of particles) {
        if (particle.trail.length < 2) continue;

        ctx.lineWidth = 2;
        for (let i = 0; i < particle.trail.length - 1; i++) {
          const alpha = (1 - i / particle.trail.length) * 0.3;
          ctx.strokeStyle = `rgba(150, 200, 255, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(particle.trail[i].x, particle.trail[i].y);
          ctx.lineTo(particle.trail[i + 1].x, particle.trail[i + 1].y);
          ctx.stroke();
        }
      }
    }

    for (const particle of particles) {
      const radius = particle.pinned ? 6 : 3;
      ctx.fillStyle = particle.pinned
        ? '#00ff88'
        : 'rgba(150, 200, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(particle.position.x, particle.position.y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (particle.pinned) {
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(particle.position.x, particle.position.y, radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    for (const ball of collisionBalls) {
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(ball.position.x, ball.position.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(
        ball.position.x - ball.radius * 0.3,
        ball.position.y - ball.radius * 0.3,
        ball.radius * 0.4,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    for (const wave of shockwaves) {
      const alpha = 1 - wave.radius / wave.maxRadius;
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wave.position.x, wave.position.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [width, height, particles, springs, collisionBalls, shockwaves, groundY, showTensionHeatmap, showTrails]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        cursor: isDraggingRef.current ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
};
