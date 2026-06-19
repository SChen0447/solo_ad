import {
  GameState, Ship, ShipType, Projectile, Particle,
  CANVAS_WIDTH, CANVAS_HEIGHT, SHIP_COLORS, SHIP_SIZES,
  SHIP_SINK_DURATION
} from './types';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
  }

  render(state: GameState, now: number): void {
    this.time = now;

    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawOcean();
    this.drawGrid();

    for (const p of state.particles) {
      if (p.type === 'wake') {
        this.drawWakeParticle(p);
      }
    }

    for (const ship of [...state.enemyShips, ...state.playerShips]) {
      this.drawShip(ship, now);
    }

    for (const proj of state.projectiles) {
      this.drawProjectile(proj);
    }

    for (const p of state.particles) {
      if (p.type === 'explosion') {
        this.drawExplosionParticle(p);
      }
    }

    for (const ship of state.enemyShips) {
      if (!ship.isSinking) {
        this.drawEnemyHealthBar(ship);
      }
    }

    this.drawTargetIndicator(state);
  }

  private drawOcean(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0a1628');
    gradient.addColorStop(0.5, '#0d1f38');
    gradient.addColorStop(1, '#0a1628');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const t = this.time * 0.001;

    for (let layer = 0; layer < 3; layer++) {
      this.ctx.strokeStyle = `rgba(74, 138, 170, ${0.05 + layer * 0.03})`;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();

      const amplitude = 8 + layer * 4;
      const frequency = 0.015 + layer * 0.005;
      const speed = 0.5 + layer * 0.2;

      for (let x = 0; x <= CANVAS_WIDTH; x += 2) {
        const y = CANVAS_HEIGHT * (0.2 + layer * 0.25) +
          Math.sin(x * frequency + t * speed + layer) * amplitude +
          Math.sin(x * frequency * 0.7 + t * speed * 1.3 + layer * 2) * amplitude * 0.5;

        if (x === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.stroke();
    }

    this.ctx.fillStyle = 'rgba(74, 138, 170, 0.02)';
    for (let i = 0; i < 30; i++) {
      const x = ((i * 137 + t * 10) % (CANVAS_WIDTH + 40)) - 20;
      const y = ((i * 89) % CANVAS_HEIGHT);
      const size = 2 + Math.sin(t * 2 + i) * 1;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawGrid(): void {
    const t = this.time * 0.0003;
    const gridSize = 60;

    this.ctx.strokeStyle = 'rgba(74, 138, 170, 0.08)';
    this.ctx.lineWidth = 1;

    const offset = (t * 30) % gridSize;

    for (let x = -gridSize + offset; x < CANVAS_WIDTH + gridSize; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, CANVAS_HEIGHT);
      this.ctx.stroke();
    }

    for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(CANVAS_WIDTH, y);
      this.ctx.stroke();
    }
  }

  private drawShip(ship: Ship, now: number): void {
    const ctx = this.ctx;
    const size = SHIP_SIZES[ship.type];
    const color = SHIP_COLORS[ship.type];

    let scale = 1;
    let opacity = 1;

    if (ship.isSinking) {
      const sinkProgress = Math.min(1, (now - ship.sinkStartTime) / SHIP_SINK_DURATION);
      scale = 1 - sinkProgress * 0.8;
      opacity = 1 - sinkProgress;
    }

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.rotation);
    ctx.scale(scale, scale);
    ctx.globalAlpha = opacity;

    ctx.shadowColor = ship.side === 'player' ? 'rgba(74, 138, 170, 0.5)' : 'rgba(220, 20, 60, 0.5)';
    ctx.shadowBlur = 10;

    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;

    switch (ship.type) {
      case ShipType.DESTROYER:
        this.drawTriangle(ctx, size.width, size.height);
        break;
      case ShipType.CRUISER:
        this.drawDiamond(ctx, size.width, size.height);
        break;
      case ShipType.BATTLESHIP:
        this.drawRectangle(ctx, size.width, size.height);
        break;
    }

    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(0, -size.height * 0.2, size.width * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawTriangle(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawDiamond(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(-w / 2, 0);
    ctx.lineTo(0, h / 2);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawRectangle(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const r = 4;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + r, -h / 2);
    ctx.lineTo(w / 2 - r, -h / 2);
    ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    ctx.lineTo(w / 2, h / 2 - r);
    ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    ctx.lineTo(-w / 2 + r, h / 2);
    ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    ctx.lineTo(-w / 2, -h / 2 + r);
    ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawEnemyHealthBar(ship: Ship): void {
    const barWidth = 36;
    const barHeight = 4;
    const x = ship.x - barWidth / 2;
    const y = ship.y - SHIP_SIZES[ship.type].height - 10;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

    this.ctx.fillStyle = 'rgba(50, 10, 10, 0.8)';
    this.ctx.fillRect(x, y, barWidth, barHeight);

    const healthPercent = ship.health / ship.maxHealth;
    const gradient = this.ctx.createLinearGradient(x, y, x, y + barHeight);
    gradient.addColorStop(0, '#ff6666');
    gradient.addColorStop(1, '#cc2222');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x, y, barWidth * healthPercent, barHeight);

    this.ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
    this.ctx.lineWidth = 0.5;
    this.ctx.strokeRect(x, y, barWidth, barHeight);
  }

  private drawProjectile(proj: Projectile): void {
    const ctx = this.ctx;

    for (let i = proj.trail.length - 1; i >= 0; i--) {
      const t = i / proj.trail.length;
      const alpha = (1 - t) * 0.6;
      const size = 4 * (1 - t * 0.5);

      const trailColor = proj.isFocusFire
        ? `rgba(255, ${60 + t * 40}, ${60 + t * 40}, ${alpha})`
        : `rgba(255, ${200 + t * 55}, ${100 + t * 100}, ${alpha})`;

      ctx.fillStyle = trailColor;
      ctx.beginPath();
      ctx.arc(proj.trail[i].x, proj.trail[i].y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const coreColor = proj.isFocusFire ? '#ff4444' : '#ffaa00';
    const glowColor = proj.isFocusFire ? 'rgba(255, 68, 68, 0.5)' : 'rgba(255, 170, 0, 0.5)';

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;

    const gradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, 6);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, coreColor);
    gradient.addColorStop(1, glowColor);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  private drawWakeParticle(p: Particle): void {
    const alpha = p.life / p.maxLife;
    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawExplosionParticle(p: Particle): void {
    const alpha = p.life / p.maxLife;
    const size = p.size * (0.5 + alpha * 0.5);

    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = p.color;
    this.ctx.shadowColor = p.color;
    this.ctx.shadowBlur = 8;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;
  }

  private drawTargetIndicator(state: GameState): void {
    if (!state.isFocusFire || state.targetShipId === null) return;

    const target = state.enemyShips.find(s => s.id === state.targetShipId && !s.isSinking);
    if (!target) return;

    const t = this.time * 0.005;
    const pulse = 0.8 + Math.sin(t * 6) * 0.2;
    const size = SHIP_SIZES[target.type].radius + 15;

    this.ctx.strokeStyle = `rgba(255, 68, 68, ${pulse})`;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.lineDashOffset = -t * 20;
    this.ctx.beginPath();
    this.ctx.arc(target.x, target.y, size * pulse, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    for (let i = 0; i < 4; i++) {
      const angle = (i * 90 + t * 30) * Math.PI / 180;
      const x1 = target.x + Math.cos(angle) * (size + 5);
      const y1 = target.y + Math.sin(angle) * (size + 5);
      const x2 = target.x + Math.cos(angle) * (size + 12);
      const y2 = target.y + Math.sin(angle) * (size + 12);

      this.ctx.strokeStyle = `rgba(255, 68, 68, ${pulse})`;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
  }
}
