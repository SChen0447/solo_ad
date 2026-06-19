import React, { useEffect, useRef, useCallback } from 'react';
import type {
  ForceField,
  Ball,
  TargetZone,
  PhysicsData,
  TrailPoint,
  RippleEffect,
  FieldType,
} from 'src/types';
import { PhysicsEngine } from 'src/engine/PhysicsEngine';
import { FIELD_COLORS } from 'src/types';

interface SceneManagerProps {
  fields: ForceField[];
  ball: Ball;
  target: TargetZone;
  isRunning: boolean;
  selectedFieldType: FieldType | null;
  selectedFieldId: string | null;
  onBallUpdate: (ball: Ball, data: PhysicsData) => void;
  onFieldPlace: (x: number, y: number) => void;
  onFieldSelect: (id: string | null) => void;
  onFieldMove: (id: string, x: number, y: number) => void;
  onWin: () => void;
  won: boolean;
  fadeOpacity: number;
}

const MAX_TRAIL_POINTS = 500;
const TARGET_STAY_TIME = 0.5;
const RIPPLE_DURATION = 1.5;

export const SceneManager: React.FC<SceneManagerProps> = ({
  fields,
  ball,
  target,
  isRunning,
  selectedFieldType,
  selectedFieldId,
  onBallUpdate,
  onFieldPlace,
  onFieldSelect,
  onFieldMove,
  onWin,
  won,
  fadeOpacity,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef(new PhysicsEngine());
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const trailRef = useRef<TrailPoint[]>([]);
  const frameCountRef = useRef(0);
  const frameTimeRef = useRef(0);
  const lowDensityRef = useRef(false);
  const targetStayRef = useRef(0);
  const ripplesRef = useRef<RippleEffect[]>([]);
  const rippleStartRef = useRef(0);
  const isDraggingFieldRef = useRef(false);
  const dragFieldIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isPlacingRef = useRef(false);

  const getCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { width: 800, height: 500 };
    const rect = canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  const drawField = useCallback(
    (ctx: CanvasRenderingContext2D, field: ForceField, isSelected: boolean) => {
      const colors = FIELD_COLORS[field.type];
      const { x, y } = field.position;
      const r = field.radius;

      ctx.save();
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, colors.gradient[0]);
      gradient.addColorStop(1, colors.gradient[1]);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = colors.border;
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.setLineDash(isSelected ? [6, 4] : []);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const rad = (field.angle * Math.PI) / 180;
      const arrowLen = Math.min(r * 0.6, 60);
      const ax = x + Math.cos(rad) * arrowLen;
      const ay = y + Math.sin(rad) * arrowLen;
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ax, ay);
      ctx.stroke();

      const headLen = 10;
      const headAngle = 0.5;
      ctx.fillStyle = colors.border;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - headLen * Math.cos(rad - headAngle),
        ay - headLen * Math.sin(rad - headAngle)
      );
      ctx.lineTo(
        ax - headLen * Math.cos(rad + headAngle),
        ay - headLen * Math.sin(rad + headAngle)
      );
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = colors.border;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label =
        field.type === 'gravity' ? 'G' : field.type === 'magnetic' ? 'M' : 'E';
      ctx.fillText(label, x, y);

      ctx.restore();
    },
    []
  );

  const drawTarget = useCallback(
    (ctx: CanvasRenderingContext2D, t: TargetZone) => {
      ctx.save();
      const gradient = ctx.createRadialGradient(
        t.position.x,
        t.position.y,
        0,
        t.position.x,
        t.position.y,
        t.type === 'circle' ? (t.size.radius ?? 30) : 50
      );
      gradient.addColorStop(0, 'rgba(80, 255, 150, 0.4)');
      gradient.addColorStop(1, 'rgba(0, 180, 80, 0.15)');
      ctx.fillStyle = gradient;
      ctx.strokeStyle = 'rgba(80, 255, 150, 0.9)';
      ctx.lineWidth = 2;

      if (t.type === 'circle') {
        const r = t.size.radius ?? 30;
        ctx.beginPath();
        ctx.arc(t.position.x, t.position.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        const w = t.size.width ?? 60;
        const h = t.size.height ?? 60;
        ctx.beginPath();
        ctx.roundRect(t.position.x - w / 2, t.position.y - h / 2, w, h, 8);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    },
    []
  );

  const drawBall = useCallback((ctx: CanvasRenderingContext2D, b: Ball, speed: number) => {
    ctx.save();
    const { x, y } = b.position;

    if (speed > 150) {
      const blurAlpha = Math.min((speed - 150) / 400, 0.5);
      const blurLen = Math.min(speed * 0.15, 60);
      const angle = Math.atan2(b.velocity.y, b.velocity.x);
      const tx = x - Math.cos(angle) * blurLen;
      const ty = y - Math.sin(angle) * blurLen;
      const grad = ctx.createLinearGradient(tx, ty, x, y);
      grad.addColorStop(0, `rgba(255, 100, 50, 0)`);
      grad.addColorStop(1, `rgba(255, 100, 50, ${blurAlpha})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = b.radius * 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    const ballGrad = ctx.createRadialGradient(
      x - b.radius * 0.3,
      y - b.radius * 0.3,
      0,
      x,
      y,
      b.radius
    );
    ballGrad.addColorStop(0, '#ff8855');
    ballGrad.addColorStop(0.6, '#ff4422');
    ballGrad.addColorStop(1, '#cc1100');
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(x, y, b.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(x - b.radius * 0.3, y - b.radius * 0.3, b.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, []);

  const drawTrail = useCallback(
    (ctx: CanvasRenderingContext2D, lowDensity: boolean) => {
      const trail = trailRef.current;
      if (trail.length === 0) return;
      ctx.save();
      const step = lowDensity ? 2 : 1;
      for (let i = 0; i < trail.length; i += step) {
        const p = trail[i];
        const alpha = p.alpha * ((i + 1) / trail.length);
        ctx.fillStyle = `rgba(255, 140, 80, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
    []
  );

  const drawRipples = useCallback(
    (ctx: CanvasRenderingContext2D, elapsed: number) => {
      const ripples = ripplesRef.current;
      if (ripples.length === 0) return;
      ctx.save();
      const progress = Math.min(elapsed / RIPPLE_DURATION, 1);
      const colors = ['#ff5555', '#ffaa00', '#55ff55', '#55aaff', '#aa55ff'];
      for (let i = 0; i < ripples.length; i++) {
        const r = ripples[i];
        const t = (progress + i * 0.15) % 1;
        const radius = r.maxRadius * t;
        const alpha = (1 - t) * 0.8;
        ctx.strokeStyle = colors[i % colors.length].replace(')', `, ${alpha})`).replace('#', 'rgba(').replace(/([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i, (_, r, g, b) => `${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}`);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    },
    []
  );

  const drawPlacementPreview = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!selectedFieldType || !isPlacingRef.current) return;
      const colors = FIELD_COLORS[selectedFieldType];
      const { x, y } = mousePosRef.current;
      ctx.save();
      ctx.globalAlpha = 0.5;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 150);
      gradient.addColorStop(0, colors.gradient[0]);
      gradient.addColorStop(1, colors.gradient[1]);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 150, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(x, y, 150, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    },
    [selectedFieldType]
  );

  const render = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { width, height } = getCanvasSize();

      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      const dt = Math.min(rawDt, 1 / 30);

      const frameStart = performance.now();

      let currentBall = ball;
      let physicsData = {
        velocity: 0,
        acceleration: 0,
        netForce: { x: 0, y: 0 },
        forceMagnitude: 0,
      };

      if (isRunning) {
        engineRef.current.setObjects(ball, fields);
        const result = engineRef.current.update(dt * 60);
        currentBall = engineRef.current.handleBoundaryCollision(
          result.ball,
          width,
          height
        );
        physicsData = result.data;

        const shouldAddPoint = lowDensityRef.current
          ? frameCountRef.current % 2 === 0
          : true;
        if (shouldAddPoint) {
          trailRef.current.push({
            x: currentBall.position.x,
            y: currentBall.position.y,
            alpha: 0.8,
          });
          if (trailRef.current.length > MAX_TRAIL_POINTS) {
            trailRef.current.shift();
          }
        }
        frameCountRef.current++;

        if (engineRef.current.isBallInTarget(currentBall, target)) {
          targetStayRef.current += dt;
          if (targetStayRef.current >= TARGET_STAY_TIME && !won) {
            onWin();
            rippleStartRef.current = timestamp;
            const rippleColors = [
              '#ff5555',
              '#ffaa00',
              '#55ff55',
              '#55aaff',
              '#aa55ff',
            ];
            for (let i = 0; i < 5; i++) {
              ripplesRef.current.push({
                x: target.position.x,
                y: target.position.y,
                radius: 0,
                alpha: 1,
                maxRadius: Math.max(width, height) * 0.4,
                color: rippleColors[i],
              });
            }
          }
        } else {
          targetStayRef.current = 0;
        }

        onBallUpdate(currentBall, physicsData);
      } else {
        currentBall = ball;
        const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
        physicsData.velocity = speed;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      const grid = 40;
      for (let gx = 0; gx < width; gx += grid) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += grid) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      drawTarget(ctx, target);

      for (const f of fields) {
        drawField(ctx, f, f.id === selectedFieldId);
      }

      drawTrail(ctx, lowDensityRef.current);

      const speed = Math.sqrt(
        currentBall.velocity.x ** 2 + currentBall.velocity.y ** 2
      );
      drawBall(ctx, currentBall, speed);

      drawPlacementPreview(ctx);

      if (ripplesRef.current.length > 0) {
        drawRipples(ctx, (timestamp - rippleStartRef.current) / 1000);
        if ((timestamp - rippleStartRef.current) / 1000 > RIPPLE_DURATION + 0.5) {
          ripplesRef.current = [];
        }
      }

      if (fadeOpacity < 1) {
        ctx.fillStyle = `rgba(26, 26, 46, ${1 - fadeOpacity})`;
        ctx.fillRect(0, 0, width, height);
      }

      const frameTime = performance.now() - frameStart;
      frameTimeRef.current = frameTime;
      if (frameTime > 16) {
        lowDensityRef.current = true;
      } else if (frameTime < 10 && lowDensityRef.current) {
        lowDensityRef.current = false;
      }

      rafRef.current = requestAnimationFrame(render);
    },
    [
      ball,
      fields,
      target,
      isRunning,
      selectedFieldId,
      won,
      fadeOpacity,
      getCanvasSize,
      drawTarget,
      drawField,
      drawTrail,
      drawBall,
      drawPlacementPreview,
      drawRipples,
      onBallUpdate,
      onWin,
    ]
  );

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    rafRef.current = requestAnimationFrame(render);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [render, resizeCanvas]);

  useEffect(() => {
    if (!isRunning) {
      trailRef.current = [];
      targetStayRef.current = 0;
      ripplesRef.current = [];
    }
  }, [isRunning]);

  const getFieldAt = (x: number, y: number): ForceField | null => {
    for (let i = fields.length - 1; i >= 0; i--) {
      const f = fields[i];
      const dx = x - f.position.x;
      const dy = y - f.position.y;
      if (Math.sqrt(dx * dx + dy * dy) <= f.radius) return f;
    }
    return null;
  };

  const getCanvasCoords = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);
    mousePosRef.current = { x, y };

    const clickedField = getFieldAt(x, y);
    if (clickedField) {
      isDraggingFieldRef.current = true;
      dragFieldIdRef.current = clickedField.id;
      dragOffsetRef.current = {
        x: x - clickedField.position.x,
        y: y - clickedField.position.y,
      };
      onFieldSelect(clickedField.id);
      return;
    }

    if (selectedFieldType) {
      isPlacingRef.current = true;
    } else {
      onFieldSelect(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);
    mousePosRef.current = { x, y };

    if (isDraggingFieldRef.current && dragFieldIdRef.current) {
      onFieldMove(
        dragFieldIdRef.current,
        x - dragOffsetRef.current.x,
        y - dragOffsetRef.current.y
      );
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);

    if (isPlacingRef.current && selectedFieldType) {
      onFieldPlace(x, y);
    }

    isDraggingFieldRef.current = false;
    dragFieldIdRef.current = null;
    isPlacingRef.current = false;
  };

  const handleMouseLeave = () => {
    isDraggingFieldRef.current = false;
    dragFieldIdRef.current = null;
    isPlacingRef.current = false;
  };

  return (
    <canvas
      ref={canvasRef}
      className="scene-canvas"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: selectedFieldType ? 'crosshair' : 'default' }}
    />
  );
};
