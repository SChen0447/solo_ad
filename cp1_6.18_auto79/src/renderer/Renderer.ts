import { PhysicsEngine, PhysicsState, Wall } from '../engine/PhysicsEngine';
import { GameManager, GameState } from '../game/GameManager';
import { eventBus, GameEvents } from '../core/EventBus';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private physics: PhysicsEngine;
  private gameManager: GameManager;
  private width: number;
  private height: number;
  private time: number = 0;
  private waveTexture: HTMLCanvasElement | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    physics: PhysicsEngine,
    gameManager: GameManager
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.physics = physics;
    this.gameManager = gameManager;
    this.width = canvas.width;
    this.height = canvas.height;

    this.createWaveTexture();
  }

  private createWaveTexture(): void {
    const tex = document.createElement('canvas');
    tex.width = 512;
    tex.height = 64;
    const tctx = tex.getContext('2d');
    if (!tctx) return;

    const grad = tctx.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#1a2145');
    grad.addColorStop(0.5, '#0f1530');
    grad.addColorStop(1, '#1a2145');
    tctx.fillStyle = grad;
    tctx.fillRect(0, 0, 512, 64);

    tctx.strokeStyle = 'rgba(74, 144, 217, 0.08)';
    tctx.lineWidth = 1;
    for (let y = 4; y < 64; y += 8) {
      tctx.beginPath();
      for (let x = 0; x < 512; x++) {
        const wave = Math.sin((x * 0.03) + (y * 0.1)) * 2;
        if (x === 0) tctx.moveTo(x, y + wave);
        else tctx.lineTo(x, y + wave);
      }
      tctx.stroke();
    }

    this.waveTexture = tex;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public render(deltaTime: number): void {
    const dt = deltaTime / 1000;
    this.time += dt;

    const ctx = this.ctx;
    const gameState = this.gameManager.getState();
    const physicsState = this.physics.getState();

    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(ctx);
    this.drawBubbles(ctx, gameState);
    this.drawWalls(ctx, physicsState);
    this.drawCorals(ctx, gameState);
    this.drawDoor(ctx, gameState);
    this.drawCollectibles(ctx, gameState);
    this.drawCreatures(ctx, gameState);
    this.drawPings(ctx, physicsState, gameState);
    this.drawPlayer(ctx, gameState);
    this.drawParticles(ctx, gameState);
    this.drawLightOverlay(ctx, physicsState, gameState);
    this.drawHurtEffect(ctx, gameState);
    this.drawUI(ctx, gameState);
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0B0F24');
    grad.addColorStop(0.4, '#080A1C');
    grad.addColorStop(0.7, '#050712');
    grad.addColorStop(1, '#020308');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    const spotX = this.width * 0.7;
    const spotY = this.height * 0.3;
    const rayGrad = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, 500);
    rayGrad.addColorStop(0, 'rgba(74, 144, 217, 0.08)');
    rayGrad.addColorStop(1, 'rgba(74, 144, 217, 0)');
    ctx.fillStyle = rayGrad;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawBubbles(ctx: CanvasRenderingContext2D, state: GameState): void {
    for (const bubble of state.bubbles) {
      ctx.save();
      ctx.globalAlpha = bubble.opacity;
      ctx.strokeStyle = 'rgba(150, 200, 255, 0.4)';
      ctx.fillStyle = 'rgba(150, 200, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bubble.position.x, bubble.position.y, bubble.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(
        bubble.position.x - bubble.radius * 0.3,
        bubble.position.y - bubble.radius * 0.3,
        bubble.radius * 0.2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
  }

  private drawWalls(ctx: CanvasRenderingContext2D, state: PhysicsState): void {
    if (!this.waveTexture) return;

    for (const wall of state.walls) {
      this.drawWall(ctx, wall);
    }
  }

  private drawWall(ctx: CanvasRenderingContext2D, wall: Wall): void {
    const isBoundary = wall.id === 'top' || wall.id === 'bottom' ||
                       wall.id === 'left' || wall.id === 'right';

    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return;

    const nx = -dy / length;
    const ny = dx / length;
    const thickness = isBoundary ? 50 : 18;

    ctx.save();

    const corners = [
      { x: wall.x1 + nx * thickness, y: wall.y1 + ny * thickness },
      { x: wall.x2 + nx * thickness, y: wall.y2 + ny * thickness },
      { x: wall.x2 - nx * thickness, y: wall.y2 - ny * thickness },
      { x: wall.x1 - nx * thickness, y: wall.y1 - ny * thickness }
    ];

    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();

    const grad = ctx.createLinearGradient(
      wall.x1 - nx * thickness, wall.y1 - ny * thickness,
      wall.x1 + nx * thickness, wall.y1 + ny * thickness
    );
    grad.addColorStop(0, '#0a0d1a');
    grad.addColorStop(0.3, '#1a2042');
    grad.addColorStop(0.5, '#2a3465');
    grad.addColorStop(0.7, '#1a2042');
    grad.addColorStop(1, '#0a0d1a');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.clip();

    if (this.waveTexture) {
      const pattern = ctx.createPattern(this.waveTexture, 'repeat');
      if (pattern) {
        ctx.save();
        const angle = Math.atan2(dy, dx);
        ctx.translate(wall.x1, wall.y1);
        ctx.rotate(angle);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = pattern;
        ctx.fillRect(
          -thickness * 2, -thickness * 2,
          length + thickness * 4, thickness * 4
        );
        ctx.restore();
      }
    }

    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(74, 144, 217, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(wall.x1, wall.y1);
    ctx.lineTo(wall.x2, wall.y2);
    ctx.stroke();
    ctx.restore();
  }

  private drawCorals(ctx: CanvasRenderingContext2D, state: GameState): void {
    for (const coral of state.corals) {
      const baseX = coral.position.x;
      const baseY = coral.position.y;

      ctx.save();
      const glow = ctx.createRadialGradient(baseX, baseY, 0, baseX, baseY, 40);
      glow.addColorStop(0, coral.color + '33');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(baseX - 40, baseY - 40, 80, 80);

      const branches = 4 + Math.floor(Math.sin(baseX * 0.01) * 2 + 2);
      for (let i = 0; i < branches; i++) {
        const t = i / branches;
        const angle = -Math.PI / 2 + (t - 0.5) * 1.2;
        const len = 15 + i * 4;
        const sway = Math.sin(this.time * 2 + i + baseX * 0.1) * 3;

        ctx.strokeStyle = coral.color;
        ctx.lineWidth = 3 - i * 0.3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.quadraticCurveTo(
          baseX + Math.cos(angle) * len * 0.5 + sway,
          baseY + Math.sin(angle) * len * 0.5,
          baseX + Math.cos(angle) * len + sway,
          baseY + Math.sin(angle) * len
        );
        ctx.stroke();

        ctx.fillStyle = coral.color;
        ctx.beginPath();
        ctx.arc(
          baseX + Math.cos(angle) * len + sway,
          baseY + Math.sin(angle) * len,
          3 - i * 0.2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawDoor(ctx: CanvasRenderingContext2D, state: GameState): void {
    const door = state.door;
    const x = door.position.x;
    const y = door.position.y;
    const w = door.width;
    const h = door.height;
    const progress = door.openProgress;

    ctx.save();

    const baseGrad = ctx.createLinearGradient(x, y, x + w, y);
    baseGrad.addColorStop(0, '#2a1f1a');
    baseGrad.addColorStop(0.5, '#3a2d22');
    baseGrad.addColorStop(1, '#2a1f1a');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(x - 10, y - 10, w + 20, h + 20);

    ctx.strokeStyle = '#4a3525';
    ctx.lineWidth = 4;
    ctx.strokeRect(x - 10, y - 10, w + 20, h + 20);

    const halfW = w / 2;
    const leftDoorX = x + progress * -halfW;
    const rightDoorX = x + halfW + progress * halfW;

    this.drawDoorPanel(ctx, leftDoorX, y, halfW, h, 'left');
    this.drawDoorPanel(ctx, rightDoorX, y, halfW, h, 'right');

    if (progress > 0.3) {
      const portalAlpha = (progress - 0.3) / 0.7;
      const centerX = x + w / 2;
      const centerY = y + h / 2;

      ctx.save();
      ctx.globalAlpha = portalAlpha * 0.9;

      for (let i = 0; i < 3; i++) {
        const radius = 25 + i * 10 + Math.sin(this.time * 3 + i) * 5;
        const pg = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        pg.addColorStop(0, `rgba(74, 144, 217, ${0.5 - i * 0.1})`);
        pg.addColorStop(0.7, `rgba(100, 180, 255, ${0.3 - i * 0.08})`);
        pg.addColorStop(1, 'transparent');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(150, 200, 255, 0.6)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const angle = this.time * 2 + (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20 + Math.sin(this.time * 4 + i) * 8, angle, angle + 0.5);
        ctx.stroke();
      }

      ctx.restore();
    }

    if (!state.doorUnlocked) {
      ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
      ctx.fillRect(x - 10, y - 10, w + 20, h + 20);

      ctx.fillStyle = '#888';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🔒', x + w / 2, y + h / 2 + 4);
    }

    ctx.restore();
  }

  private drawDoorPanel(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    side: 'left' | 'right'
  ): void {
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    if (side === 'left') {
      grad.addColorStop(0, '#4a3525');
      grad.addColorStop(0.5, '#5c4230');
      grad.addColorStop(1, '#3a2d22');
    } else {
      grad.addColorStop(0, '#3a2d22');
      grad.addColorStop(0.5, '#5c4230');
      grad.addColorStop(1, '#4a3525');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = '#2a1f1a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#2a1f1a';
    ctx.lineWidth = 1;

    for (let i = 0; i < 3; i++) {
      const cy = y + h * (0.25 + i * 0.25);
      ctx.beginPath();
      ctx.moveTo(x + 5, cy + Math.sin(i) * 5);
      ctx.lineTo(x + w - 5, cy + Math.cos(i) * 3);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawCollectibles(ctx: CanvasRenderingContext2D, state: GameState): void {
    for (const c of state.collectibles) {
      if (c.collected) continue;

      const pulse = Math.sin(c.pulsePhase) * 0.2 + 1;
      const scale = c.collecting ? Math.max(0, 1 - c.collectProgress * 0.5) : pulse;
      const r = 10 * scale;
      const x = c.position.x;
      const y = c.position.y;

      ctx.save();
      const alpha = c.collecting ? (1 - c.collectProgress * 0.7) : 1;
      ctx.globalAlpha = alpha;

      const glowR = 30 * scale;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
      glow.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
      glow.addColorStop(0.5, 'rgba(255, 180, 0, 0.2)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(c.pulsePhase * 0.3);

      const shapeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      shapeGrad.addColorStop(0, '#FFF5B0');
      shapeGrad.addColorStop(0.5, '#FFD700');
      shapeGrad.addColorStop(1, '#B8860B');
      ctx.fillStyle = shapeGrad;

      ctx.beginPath();
      const sides = 6;
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
      ctx.restore();
    }
  }

  private drawCreatures(ctx: CanvasRenderingContext2D, state: GameState): void {
    for (const creature of state.creatures) {
      if (creature.state === 'disappearing' && creature.radius <= 0) continue;

      const x = creature.position.x;
      const y = creature.position.y;
      const r = creature.radius;
      const isAngered = creature.state === 'angered';
      const angerProgress = creature.angerProgress;

      ctx.save();

      const baseColor = isAngered
        ? `rgba(255, ${Math.floor(80 - angerProgress * 60)}, ${Math.floor(80 - angerProgress * 60)}, `
        : `rgba(180, 140, 200, `;

      const alpha = creature.state === 'disappearing'
        ? Math.max(0, creature.disappearTimer / 0.3) * 0.7
        : 0.7;

      ctx.globalAlpha = alpha;

      const glowR = r * 1.8;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
      if (isAngered) {
        glow.addColorStop(0, `rgba(255, 100, 100, ${0.5 + angerProgress * 0.3})`);
        glow.addColorStop(1, 'transparent');
      } else {
        glow.addColorStop(0, 'rgba(180, 140, 200, 0.3)');
        glow.addColorStop(1, 'transparent');
      }
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = alpha * 0.85;

      const domeGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
      if (isAngered) {
        domeGrad.addColorStop(0, `rgba(255, 150, 150, 0.9)`);
        domeGrad.addColorStop(1, `rgba(200, 30, 30, 0.7)`);
      } else {
        domeGrad.addColorStop(0, 'rgba(230, 200, 240, 0.9)');
        domeGrad.addColorStop(1, 'rgba(160, 120, 180, 0.6)');
      }
      ctx.fillStyle = domeGrad;
      ctx.beginPath();
      ctx.arc(x, y - r * 0.1, r, Math.PI, 0, false);
      ctx.lineTo(x + r, y + r * 0.1);
      ctx.lineTo(x - r, y + r * 0.1);
      ctx.closePath();
      ctx.fill();

      const tentacleCount = 6;
      ctx.strokeStyle = isAngered
        ? `rgba(255, ${Math.floor(100 - angerProgress * 50)}, ${Math.floor(100 - angerProgress * 50)}, 0.8)`
        : 'rgba(200, 160, 220, 0.7)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      for (let i = 0; i < tentacleCount; i++) {
        const t = (i + 0.5) / tentacleCount;
        const startX = x + (t - 0.5) * r * 1.8;
        const startY = y + r * 0.1;
        const wave = Math.sin(this.time * 3 + i + creature.position.x * 0.02) * r * 0.3;
        const len = r * (1 + (isAngered ? angerProgress * 0.5 : 0));

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(
          startX + wave,
          startY + len * 0.5,
          startX + wave * 1.5,
          startY + len
        );
        ctx.stroke();
      }

      ctx.globalAlpha = alpha;
      const eyeOffset = r * 0.3;
      const eyeR = isAngered ? 4 + angerProgress * 3 : 3;
      ctx.fillStyle = isAngered ? '#220000' : '#3a2050';
      ctx.beginPath();
      ctx.arc(x - eyeOffset, y - r * 0.2, eyeR, 0, Math.PI * 2);
      ctx.arc(x + eyeOffset, y - r * 0.2, eyeR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x - eyeOffset - 1, y - r * 0.2 - 1, eyeR * 0.35, 0, Math.PI * 2);
      ctx.arc(x + eyeOffset - 1, y - r * 0.2 - 1, eyeR * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawPings(
    ctx: CanvasRenderingContext2D,
    physicsState: PhysicsState,
    _gameState: GameState
  ): void {
    for (const ping of physicsState.pings) {
      const t = ping.radius / ping.maxRadius;
      const alpha = 1 - t * 0.7;
      const lineWidth = 3 * (1 - t * 0.6);

      ctx.save();

      const ringGrad = ctx.createRadialGradient(
        ping.origin.x, ping.origin.y, ping.radius * 0.95,
        ping.origin.x, ping.origin.y, ping.radius
      );
      ringGrad.addColorStop(0, `rgba(74, 144, 217, 0)`);
      ringGrad.addColorStop(0.4, `rgba(100, 180, 255, ${alpha * 0.4})`);
      ringGrad.addColorStop(0.7, `rgba(150, 210, 255, ${alpha * 0.7})`);
      ringGrad.addColorStop(1, `rgba(200, 230, 255, 0)`);

      ctx.strokeStyle = `rgba(120, 190, 255, ${alpha})`;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.arc(ping.origin.x, ping.origin.y, ping.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.3;
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = lineWidth * 3;
      ctx.stroke();

      ctx.restore();
    }

    const now = performance.now();
    for (const rp of physicsState.reflectPoints) {
      const elapsed = now - rp.createdAt;
      const t = elapsed / rp.duration;
      const alpha = 1 - t;
      const pulse = 1 + Math.sin(t * Math.PI * 4) * 0.3;

      ctx.save();

      const glowR = 25 * rp.intensity * pulse;
      const glow = ctx.createRadialGradient(
        rp.position.x, rp.position.y, 0,
        rp.position.x, rp.position.y, glowR
      );
      glow.addColorStop(0, `rgba(180, 230, 255, ${alpha * 0.8 * rp.intensity})`);
      glow.addColorStop(0.5, `rgba(100, 180, 255, ${alpha * 0.4 * rp.intensity})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(rp.position.x, rp.position.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(rp.position.x, rp.position.y, 4 * rp.intensity * pulse, 0, Math.PI * 2);
      ctx.fill();

      const reflectLen = 30 * rp.intensity * (1 - t * 0.5);
      const nx = rp.normal.x;
      const ny = rp.normal.y;
      ctx.strokeStyle = `rgba(150, 210, 255, ${alpha * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rp.position.x, rp.position.y);
      ctx.lineTo(rp.position.x + nx * reflectLen, rp.position.y + ny * reflectLen);
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, state: GameState): void {
    const player = state.player;
    const x = player.position.x;
    const y = player.position.y;
    const r = player.radius;
    const walk = Math.sin(player.walkPhase) * 2;
    const now = performance.now();
    const isInvincible = now < player.invincibleUntil;
    const flicker = isInvincible ? (Math.sin(now * 0.02) > 0 ? 1 : 0.3) : 1;

    ctx.save();
    ctx.globalAlpha = flicker;

    const helmetGlow = ctx.createRadialGradient(x, y - 4, 0, x, y - 4, 80);
    helmetGlow.addColorStop(0, 'rgba(255, 240, 200, 0.35)');
    helmetGlow.addColorStop(0.4, 'rgba(255, 200, 150, 0.15)');
    helmetGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = helmetGlow;
    ctx.fillRect(x - 80, y - 80, 160, 160);

    const bodyOffsetX = walk;
    const bodyOffsetY = Math.abs(walk) * 0.5;

    ctx.fillStyle = '#2a3870';
    ctx.beginPath();
    ctx.ellipse(
      x + bodyOffsetX, y + 8 + bodyOffsetY,
      r * 0.85, r * 1.1, 0, 0, Math.PI * 2
    );
    ctx.fill();

    ctx.strokeStyle = '#1a2450';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const cx = x + bodyOffsetX;
    const cy = y - 6 + bodyOffsetY;
    const helmetR = r * 0.85;

    const helmetGrad = ctx.createRadialGradient(cx - 3, cy - 3, 0, cx, cy, helmetR);
    helmetGrad.addColorStop(0, '#e0e8f0');
    helmetGrad.addColorStop(0.5, '#9eb5cc');
    helmetGrad.addColorStop(1, '#5a7088');
    ctx.fillStyle = helmetGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, helmetR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#3a4a60';
    ctx.lineWidth = 2;
    ctx.stroke();

    const visorGrad = ctx.createLinearGradient(cx, cy - helmetR * 0.5, cx, cy + helmetR * 0.3);
    visorGrad.addColorStop(0, 'rgba(120, 180, 255, 0.9)');
    visorGrad.addColorStop(0.5, 'rgba(60, 130, 220, 0.8)');
    visorGrad.addColorStop(1, 'rgba(30, 80, 160, 0.9)');
    ctx.fillStyle = visorGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, helmetR * 0.65, helmetR * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.ellipse(cx - helmetR * 0.2, cy - helmetR * 0.15, helmetR * 0.18, helmetR * 0.1, -0.4, 0, Math.PI * 2);
    ctx.fill();

    const helmetLight = ctx.createRadialGradient(cx, cy, 0, cx, cy, helmetR * 1.3);
    helmetLight.addColorStop(0, 'rgba(255, 245, 220, 0.3)');
    helmetLight.addColorStop(1, 'transparent');
    ctx.fillStyle = helmetLight;
    ctx.beginPath();
    ctx.arc(cx, cy, helmetR * 1.3, 0, Math.PI * 2);
    ctx.fill();

    const tankX = player.facing === 'right' ? x - r * 0.6 + bodyOffsetX : x + r * 0.6 + bodyOffsetX;
    ctx.fillStyle = '#4a5580';
    ctx.beginPath();
    ctx.ellipse(tankX, y + 5 + bodyOffsetY, r * 0.25, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2a3050';
    ctx.lineWidth = 1;
    ctx.stroke();

    const oxygenGlow = ctx.createRadialGradient(tankX, y + 5 + bodyOffsetY, 0, tankX, y + 5 + bodyOffsetY, r * 0.5);
    oxygenGlow.addColorStop(0, 'rgba(100, 200, 255, 0.25)');
    oxygenGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = oxygenGlow;
    ctx.beginPath();
    ctx.arc(tankX, y + 5 + bodyOffsetY, r * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D, state: GameState): void {
    for (const p of state.particles) {
      const alpha = Math.min(1, p.life);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawLightOverlay(
    ctx: CanvasRenderingContext2D,
    physicsState: PhysicsState,
    gameState: GameState
  ): void {
    ctx.save();

    const mask = ctx.createRadialGradient(
      gameState.player.position.x, gameState.player.position.y, 50,
      gameState.player.position.x, gameState.player.position.y, 200
    );
    mask.addColorStop(0, 'rgba(0, 0, 0, 0)');
    mask.addColorStop(1, 'rgba(2, 4, 12, 0.5)');
    ctx.fillStyle = mask;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.globalCompositeOperation = 'lighter';

    for (const ping of physicsState.pings) {
      const t = ping.radius / ping.maxRadius;
      const alpha = (1 - t) * 0.35;
      const innerR = Math.max(0, ping.radius - 80);
      const outerR = ping.radius + 20;

      const ringLight = ctx.createRadialGradient(
        ping.origin.x, ping.origin.y, innerR,
        ping.origin.x, ping.origin.y, outerR
      );
      ringLight.addColorStop(0, `rgba(80, 150, 255, 0)`);
      ringLight.addColorStop(0.3, `rgba(80, 180, 255, ${alpha * 0.3})`);
      ringLight.addColorStop(0.6, `rgba(120, 200, 255, ${alpha})`);
      ringLight.addColorStop(1, `rgba(150, 220, 255, 0)`);

      ctx.fillStyle = ringLight;
      ctx.beginPath();
      ctx.arc(ping.origin.x, ping.origin.y, outerR, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const rp of physicsState.reflectPoints) {
      const elapsed = performance.now() - rp.createdAt;
      const t = elapsed / rp.duration;
      const alpha = (1 - t) * rp.intensity * 0.4;

      const light = ctx.createRadialGradient(
        rp.position.x, rp.position.y, 0,
        rp.position.x, rp.position.y, 60
      );
      light.addColorStop(0, `rgba(200, 230, 255, ${alpha})`);
      light.addColorStop(1, 'transparent');
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(rp.position.x, rp.position.y, 60, 0, Math.PI * 2);
      ctx.fill();
    }

    const playerGlow = ctx.createRadialGradient(
      gameState.player.position.x, gameState.player.position.y - 4, 0,
      gameState.player.position.x, gameState.player.position.y - 4, 120
    );
    playerGlow.addColorStop(0, 'rgba(255, 240, 210, 0.2)');
    playerGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = playerGlow;
    ctx.beginPath();
    ctx.arc(gameState.player.position.x, gameState.player.position.y - 4, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawHurtEffect(ctx: CanvasRenderingContext2D, state: GameState): void {
    if (state.screenHurtIntensity <= 0) return;

    ctx.save();

    const intensity = state.screenHurtIntensity;
    const edgeWidth = 100 * intensity;

    const edgeGrad = ctx.createRadialGradient(
      this.width / 2, this.height / 2, Math.min(this.width, this.height) * 0.3,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
    );
    edgeGrad.addColorStop(0, 'transparent');
    edgeGrad.addColorStop(1, `rgba(255, 30, 30, ${intensity * 0.6})`);

    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = `rgba(255, 50, 50, ${intensity * 0.8})`;
    ctx.lineWidth = edgeWidth;
    ctx.strokeRect(edgeWidth / 2, edgeWidth / 2, this.width - edgeWidth, this.height - edgeWidth);

    if (intensity > 0.5) {
      ctx.globalAlpha = (intensity - 0.5) * 0.3;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    ctx.restore();
  }

  private drawUI(ctx: CanvasRenderingContext2D, state: GameState): void {
    ctx.save();
    ctx.textBaseline = 'top';

    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = '#4A90D9';
    ctx.shadowColor = 'rgba(74, 144, 217, 0.8)';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'left';
    ctx.fillText(`LEVEL ${state.level}`, 30, 30);
    ctx.shadowBlur = 0;

    const total = state.requiredCollectibles;
    const current = state.collectedCount;
    const ringRadius = 12;
    const spacing = 34;
    const startX = this.width - 30 - total * spacing + spacing / 2;
    const uiY = 38;

    for (let i = 0; i < total; i++) {
      const x = startX + i * spacing;
      const isCollected = i < current;

      ctx.save();
      ctx.lineWidth = 2;

      if (isCollected) {
        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, uiY, ringRadius - 2, 0, Math.PI * 2);
        ctx