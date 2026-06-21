import * as THREE from 'three';
import { StructureType, StructureParams, getEquations } from './structures';

const PROJECTION_STYLE_ID = 'ne-projection-style';

function injectProjectionStyles(): void {
  if (document.getElementById(PROJECTION_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PROJECTION_STYLE_ID;
  style.textContent = `
    .ne-projection-container {
      position: fixed;
      bottom: 16px;
      right: 16px;
      width: 320px;
      height: 240px;
      border-radius: 12px;
      overflow: hidden;
      z-index: 90;
      background: rgba(16, 18, 24, 0.65);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: transform 0.3s ease, opacity 0.3s ease;
    }

    .ne-projection-container.ne-projection-enter {
      animation: neProjectionIn 0.3s ease forwards;
    }

    @keyframes neProjectionIn {
      from {
        transform: scale(0.85);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }

    .ne-projection-canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  `;
  document.head.appendChild(style);
}

export interface ProjectionHandle {
  update(type: StructureType, params: StructureParams): void;
  triggerEnterAnimation(): void;
  setRotation(angle: number): void;
  dispose(): void;
}

export function createProjection(): ProjectionHandle {
  injectProjectionStyles();

  const container = document.createElement('div');
  container.className = 'ne-projection-container';
  document.body.appendChild(container);

  const canvas = document.createElement('canvas');
  canvas.className = 'ne-projection-canvas';
  canvas.width = 640;
  canvas.height = 480;
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;

  let currentType: StructureType = 'mobius';
  let currentParams: StructureParams = { twist: 1, density: 48, curvature: 1.0 };
  let rotationAngle = 0;

  function draw(): void {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(16, 18, 24, 0.4)';
    ctx.fillRect(0, 0, w, h);

    drawEquations(ctx, w * 0.02, 14);

    const projCenterX = w * 0.7;
    const projCenterY = h * 0.55;
    const projRadius = Math.min(w * 0.25, h * 0.35);

    drawProjection(ctx, projCenterX, projCenterY, projRadius);
  }

  function drawEquations(ctx: CanvasRenderingContext2D, x: number, startY: number): void {
    const equations = getEquations(currentType, currentParams);

    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = '#A78BFA';
    ctx.fillText('参数化方程', x, startY);

    ctx.fillStyle = '#ccccdd';
    equations.forEach((eq, i) => {
      ctx.fillText(eq, x, startY + 20 + i * 18);
    });
  }

  function drawProjection(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotationAngle);
    ctx.translate(-cx, -cy);

    ctx.strokeStyle = 'rgba(167, 139, 250, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    if (currentType === 'hyperbolic') {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      drawHyperbolicUnfolded(ctx, cx, cy, radius);
    } else if (currentType === 'mobius') {
      drawMobiusUnfolded(ctx, cx, cy, radius);
    } else {
      drawKleinUnfolded(ctx, cx, cy, radius);
    }

    ctx.restore();

    ctx.font = '10px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#666677';
    ctx.textAlign = 'center';
    ctx.fillText('展开图投影', cx, cy + radius + 16);
    ctx.textAlign = 'left';
  }

  function drawMobiusUnfolded(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number
  ): void {
    const twists = currentParams.twist;
    const stripW = radius * 1.8;
    const stripH = radius * 0.35;

    ctx.strokeStyle = 'rgba(108, 99, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);

    const steps = 60;
    const topPoints: [number, number][] = [];
    const bottomPoints: [number, number][] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = cx - stripW / 2 + t * stripW;
      const twistOffset = Math.sin(t * Math.PI * twists) * stripH * 0.3;
      topPoints.push([x, cy - stripH / 2 + twistOffset]);
      bottomPoints.push([x, cy + stripH / 2 - twistOffset]);
    }

    ctx.beginPath();
    topPoints.forEach((p, i) => i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
    ctx.stroke();

    ctx.beginPath();
    bottomPoints.forEach((p, i) => i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
    ctx.stroke();

    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const x = cx - stripW / 2 + t * stripW;
      const twistOffset = Math.sin(t * Math.PI * twists) * stripH * 0.3;
      ctx.beginPath();
      ctx.moveTo(x, cy - stripH / 2 + twistOffset);
      ctx.lineTo(x, cy + stripH / 2 - twistOffset);
      ctx.strokeStyle = 'rgba(108, 99, 255, 0.2)';
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(108, 99, 255, 0.08)';
    ctx.beginPath();
    topPoints.forEach((p, i) => i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
    bottomPoints.reverse().forEach(p => ctx.lineTo(p[0], p[1]));
    ctx.closePath();
    ctx.fill();
  }

  function drawKleinUnfolded(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number
  ): void {
    const w = radius * 1.6;
    const h = radius * 1.2;

    ctx.strokeStyle = 'rgba(108, 99, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);

    ctx.beginPath();
    const steps = 64;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = cx - w / 2 + t * w;
      const y = cy + Math.sin(t * Math.PI * 2) * h * 0.3;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(108, 99, 255, 0.3)';
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const x = cx - w / 2 + t * w;
      ctx.beginPath();
      ctx.moveTo(x, cy - h * 0.35);
      ctx.lineTo(x, cy + h * 0.35);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(108, 99, 255, 0.05)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHyperbolicUnfolded(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number
  ): void {
    const curvature = currentParams.curvature;

    ctx.strokeStyle = 'rgba(108, 99, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    const p = 7;
    const numRings = 3;

    for (let ring = 0; ring < numRings; ring++) {
      const r = (ring + 1) / (numRings + 1) * radius * curvature;
      const count = p * (ring + 1);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        ctx.beginPath();
        for (let v = 0; v <= p; v++) {
          const a = angle + (v / p - 0.5) * (Math.PI * 2 / count) * 0.8;
          const pr = r * 0.3;
          const px = x + Math.cos(a) * pr;
          const py = y + Math.sin(a) * pr;
          v === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = `rgba(108, 99, 255, ${0.03 + ring * 0.02})`;
        ctx.fill();
      }
    }
  }

  draw();

  return {
    update(type: StructureType, params: StructureParams): void {
      currentType = type;
      currentParams = { ...params };
      draw();
    },
    triggerEnterAnimation(): void {
      container.classList.remove('ne-projection-enter');
      void container.offsetWidth;
      container.classList.add('ne-projection-enter');
    },
    setRotation(angle: number): void {
      rotationAngle = angle;
      draw();
    },
    dispose(): void {
      container.remove();
    },
  };
}
