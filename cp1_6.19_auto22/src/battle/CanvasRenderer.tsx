import React, { useRef, useEffect } from 'react';

export interface ShipRenderData {
  x: number;
  y: number;
  angle: number;
  health: number;
  maxHealth: number;
  isPlayer: boolean;
  size: number;
}

export interface ProjectileRenderData {
  x: number;
  y: number;
  radius: number;
}

export interface ParticleRenderData {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: string;
}

export interface WaveData {
  amplitude: number;
  frequency: number;
  phase: number;
  speed: number;
}

interface CanvasRendererProps {
  width: number;
  height: number;
  playerShip: ShipRenderData | null;
  enemyShips: ShipRenderData[];
  projectiles: ProjectileRenderData[];
  particles: ParticleRenderData[];
  aimStart: { x: number; y: number } | null;
  aimEnd: { x: number; y: number } | null;
  waves: WaveData[];
  time: number;
  goldEarned: number;
  enemiesRemaining: number;
}

const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  width,
  height,
  playerShip,
  enemyShips,
  projectiles,
  particles,
  aimStart,
  aimEnd,
  waves,
  time,
  goldEarned,
  enemiesRemaining,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    offscreenCanvasRef.current = offscreen;
  }, [width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    if (!canvas || !offscreen) return;

    const ctx = canvas.getContext('2d');
    const offCtx = offscreen.getContext('2d');
    if (!ctx || !offCtx) return;

    drawScene(offCtx, width, height, playerShip, enemyShips, projectiles, particles, aimStart, aimEnd, waves, time);

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(offscreen, 0, 0);

    drawHUD(ctx, width, height, playerShip, goldEarned, enemiesRemaining);
  }, [width, height, playerShip, enemyShips, projectiles, particles, aimStart, aimEnd, waves, time, goldEarned, enemiesRemaining]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="battle-canvas"
    />
  );
};

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  playerShip: ShipRenderData | null,
  enemyShips: ShipRenderData[],
  projectiles: ProjectileRenderData[],
  particles: ParticleRenderData[],
  aimStart: { x: number; y: number } | null,
  aimEnd: { x: number; y: number } | null,
  waves: WaveData[],
  time: number,
) {
  ctx.fillStyle = '#0a3d6b';
  ctx.fillRect(0, 0, width, height);

  drawWaves(ctx, width, height, waves, time);

  projectiles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff6347';
    ctx.fill();
    ctx.shadowColor = '#ff6347';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  enemyShips.forEach(ship => drawShip(ctx, ship, false));

  if (playerShip) {
    drawShip(ctx, playerShip, true);

    if (aimStart && aimEnd) {
      drawAimLine(ctx, aimStart, aimEnd);
    }
  }
}

function drawWaves(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  waves: WaveData[],
  time: number,
) {
  const waveLineCount = 8;
  const waveSpacing = height / waveLineCount;

  for (let i = 0; i < waveLineCount; i++) {
    const baseY = waveSpacing * i + waveSpacing / 2;

    ctx.beginPath();
    ctx.moveTo(0, baseY);

    for (let x = 0; x <= width; x += 2) {
      let y = baseY;
      waves.forEach((wave, idx) => {
        const offset = (idx * 0.5 + i * 0.3) * Math.PI;
        y += Math.sin((x * wave.frequency / width) * Math.PI * 2 + time * wave.speed + offset + wave.phase) * wave.amplitude;
      });
      ctx.lineTo(x, y);
    }

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 + i * 0.01})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawShip(
  ctx: CanvasRenderingContext2D,
  ship: ShipRenderData,
  isPlayer: boolean,
) {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  const w = ship.size;
  const h = ship.size * 0.5;

  const bodyColor = isPlayer ? '#3b82f6' : '#dc2626';
  const deckColor = isPlayer ? '#60a5fa' : '#f87171';
  const cannonColor = '#1f2937';

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(w * 0.6, 0);
  ctx.lineTo(w * 0.3, -h);
  ctx.lineTo(-w * 0.5, -h * 0.8);
  ctx.lineTo(-w * 0.5, h * 0.8);
  ctx.lineTo(w * 0.3, h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = isPlayer ? '#1d4ed8' : '#991b1b';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = deckColor;
  ctx.fillRect(-w * 0.1, -h * 0.5, w * 0.3, h);

  ctx.fillStyle = cannonColor;
  ctx.fillRect(w * 0.2, -3, w * 0.45, 6);

  if (!isPlayer) {
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(-w * 0.35, -4, w * 0.2, 8);
  }

  ctx.restore();
}

function drawAimLine(
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const dashLength = 5;
  const gapLength = 5;
  const segmentLength = dashLength + gapLength;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 1) return;

  const dirX = dx / dist;
  const dirY = dy / dist;
  const maxLength = 100;
  const actualLength = Math.min(dist, maxLength);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.setLineDash([dashLength, gapLength]);

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(start.x + dirX * actualLength, start.y + dirY * actualLength);
  ctx.stroke();

  ctx.setLineDash([]);
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  playerShip: ShipRenderData | null,
  goldEarned: number,
  enemiesRemaining: number,
) {
  const panelX = 12;
  const panelY = 12;
  const panelW = 180;
  const panelH = 70;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  const r = 8;
  ctx.moveTo(panelX + r, panelY);
  ctx.lineTo(panelX + panelW - r, panelY);
  ctx.quadraticCurveTo(panelX + panelW, panelY, panelX + panelW, panelY + r);
  ctx.lineTo(panelX + panelW, panelY + panelH - r);
  ctx.quadraticCurveTo(panelX + panelW, panelY + panelH, panelX + panelW - r, panelY + panelH);
  ctx.lineTo(panelX + r, panelY + panelH);
  ctx.quadraticCurveTo(panelX, panelY + panelH, panelX, panelY + panelH - r);
  ctx.lineTo(panelX, panelY + r);
  ctx.quadraticCurveTo(panelX, panelY, panelX + r, panelY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'left';

  ctx.fillText(`🎯 敌舰: ${enemiesRemaining}`, panelX + 12, panelY + 28);
  ctx.fillText(`💰 金币: ${goldEarned}`, panelX + 12, panelY + 50);

  if (playerShip) {
    const barX = 20;
    const barY = height - 28;
    const barW = 200;
    const barH = 12;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

    const healthPercent = playerShip.health / playerShip.maxHealth;
    const gradient = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    gradient.addColorStop(0, '#ef4444');
    gradient.addColorStop(0.5, '#f59e0b');
    gradient.addColorStop(1, '#22c55e');

    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, barW * healthPercent, barH);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(playerShip.health)} / ${playerShip.maxHealth}`, barX + barW / 2, barY + barH - 2);
  }

  if (goldEarned > 0) {
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`+${goldEarned} 💰`, width - 20, height - 20);
  }
}

export default CanvasRenderer;
