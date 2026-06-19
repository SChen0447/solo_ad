import {
  BEAT_INTERVAL, BEAT_POINT_SIZE, COLORS, TOTAL_BEAT_POINTS,
  BeatPoint, Spike, SafePoint, Particle, MAX_PARTICLES
} from './Types';
import {
  spawnParticle, spawnBackgroundParticles, updateParticle,
  getMusicColor, getBackgroundGradientColors, lerp, clamp
} from './utils';

export class Level {
  width: number;
  groundY: number;
  beatPoints: BeatPoint[];
  spikes: Spike[];
  safePoints: SafePoint[];
  particles: Particle[];
  maxParticles: number;
  beatTime: number;
  musicFrequency: number;
  time: number;

  constructor(levelWidth: number, groundY: number) {
    this.width = levelWidth;
    this.groundY = groundY;
    this.beatPoints = [];
    this.spikes = [];
    this.safePoints = [];
    this.particles = [];
    this.maxParticles = MAX_PARTICLES;
    this.beatTime = 0;
    this.musicFrequency = 0;
    this.time = 0;
    this.generateLevel();
  }

  generateLevel(): void {
    const section = this.width / (TOTAL_BEAT_POINTS + 2);
    let beatCount = 0;
    let x = section * 1.2;

    this.safePoints.push({ x: x - section * 0.5, y: this.groundY });

    while (beatCount < TOTAL_BEAT_POINTS && x < this.width - section * 2) {
      const jitter = (Math.random() - 0.5) * section * 0.3;
      const bx = x + jitter;
      const by = this.groundY - BEAT_POINT_SIZE - 2;

      this.beatPoints.push({
        x: bx,
        y: by,
        hit: false,
        phase: (beatCount % 4) * (Math.PI / 2),
        glowPulse: 0
      });

      if ((beatCount + 1) % 3 === 0 && beatCount > 2) {
        const spikeX = bx + section * 0.35;
        const spikeCount = 1 + Math.floor(Math.random() * 2);
        for (let s = 0; s < spikeCount; s++) {
          this.spikes.push({
            x: spikeX + s * 28,
            y: this.groundY - 30,
            width: 24,
            height: 30
          });
        }
      }

      if ((beatCount + 1) % 10 === 0) {
        this.safePoints.push({ x: bx + section * 0.5, y: this.groundY });
      }

      beatCount++;
      x += section;
    }

    this.safePoints.push({ x: this.width - section, y: this.groundY });
  }

  getNearestSafePoint(playerX: number): SafePoint {
    let nearest = this.safePoints[0];
    let minDist = Math.abs(playerX - nearest.x);
    for (let i = 1; i < this.safePoints.length; i++) {
      const sp = this.safePoints[i];
      if (sp.x > playerX) break;
      const d = Math.abs(playerX - sp.x);
      if (d < minDist) {
        minDist = d;
        nearest = sp;
      }
    }
    return nearest;
  }

  update(dt: number, canvasW: number, canvasH: number): void {
    const d = Math.max(dt, 1);
    this.time += d;
    this.beatTime += d * 16.67;

    if (this.beatTime >= BEAT_INTERVAL) {
      this.beatTime -= BEAT_INTERVAL;
    }

    const beatProgress = this.beatTime / BEAT_INTERVAL;
    this.musicFrequency = (Math.sin(beatProgress * Math.PI * 2) + 1) * 0.5;
    this.musicFrequency = lerp(this.musicFrequency, Math.abs(Math.sin(this.time * 0.01)), 0.4);

    for (const bp of this.beatPoints) {
      bp.glowPulse = 0.5 + 0.5 * Math.sin(beatProgress * Math.PI * 2 + bp.phase);
    }

    spawnBackgroundParticles(this.particles, this.maxParticles, canvasW, canvasH, this.musicFrequency);

    this.particles = this.particles.filter(p => updateParticle(p, d, this.groundY));
  }

  spawnHitParticles(x: number, y: number): void {
    const color = getMusicColor(this.musicFrequency);
    for (let i = 0; i < 18; i++) {
      spawnParticle(this.particles, this.maxParticles, x, y, COLORS.BEAT_POINT, 4, 3);
    }
    for (let i = 0; i < 8; i++) {
      spawnParticle(this.particles, this.maxParticles, x, y, color, 3, 2);
    }
  }

  spawnHitSpikeParticles(x: number, y: number): void {
    for (let i = 0; i < 25; i++) {
      spawnParticle(this.particles, this.maxParticles, x, y, COLORS.SPIKE, 5, 4);
    }
    for (let i = 0; i < 12; i++) {
      spawnParticle(this.particles, this.maxParticles, x, y, COLORS.SPIKE_GLOW, 4, 3);
    }
  }

  renderBackground(ctx: CanvasRenderingContext2D, w: number, h: number, cameraX: number): void {
    const freq = clamp(this.musicFrequency, 0, 1);
    const { top, bottom } = getBackgroundGradientColors(freq);

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const farOffset = (cameraX * 0.1) % w;
    ctx.save();
    for (let layer = 0; layer < 3; layer++) {
      const alpha = 0.08 + layer * 0.06;
      const parallax = 0.05 + layer * 0.08;
      const offset = (cameraX * parallax) % w;
      const starColor = layer === 0 ? COLORS.NEON_CYAN : layer === 1 ? COLORS.NEON_MAGENTA : COLORS.NEON_GREEN;

      ctx.globalAlpha = alpha;
      for (let i = -1; i < 3; i++) {
        const baseX = i * w - offset;
        for (let s = 0; s < 40; s++) {
          const sx = baseX + ((s * 137 + layer * 791) % w);
          const sy = (s * 257 + layer * 131) % (h * 0.7);
          const size = 1 + (s % 3);
          const pulse = 0.5 + 0.5 * Math.sin(this.time * 0.02 + s + layer);
          ctx.beginPath();
          ctx.arc(sx, sy, size * pulse, 0, Math.PI * 2);
          ctx.fillStyle = starColor;
          ctx.fill();
        }
      }
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.12 + freq * 0.08;
    const bandCount = 8;
    for (let b = 0; b < bandCount; b++) {
      const bandX = (w / bandCount) * b - (farOffset * 0.3) % (w / bandCount);
      const amp = Math.abs(Math.sin(this.time * 0.01 + b * 0.8 + freq * Math.PI)) * (h * 0.25) + h * 0.05;
      const bandColor = getMusicColor((b / bandCount + freq * 0.3) % 1);
      ctx.fillStyle = bandColor;
      const bw = (w / bandCount) * 0.6;
      ctx.fillRect(bandX + (w / bandCount) * 0.2, h - amp, bw, amp);
    }
    ctx.restore();
  }

  renderGround(ctx: CanvasRenderingContext2D, w: number, h: number, cameraX: number): void {
    const freq = clamp(this.musicFrequency, 0, 1);
    const edgeColor = COLORS.GROUND_EDGE;

    const grad = ctx.createLinearGradient(0, this.groundY, 0, h);
    grad.addColorStop(0, 'rgba(20, 10, 50, 0.9)');
    grad.addColorStop(0.3, 'rgba(30, 5, 60, 0.95)');
    grad.addColorStop(1, 'rgba(10, 0, 30, 1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, this.groundY, w, h - this.groundY);

    ctx.save();
    ctx.shadowColor = edgeColor;
    ctx.shadowBlur = 15 + freq * 15;
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    for (let x = 0; x <= w; x += 12) {
      const worldX = x + cameraX;
      const wave = Math.sin(worldX * 0.015 + this.time * 0.04) * 2 +
                   Math.sin(worldX * 0.008 - this.time * 0.02) * 3;
      ctx.lineTo(x, this.groundY + wave);
    }
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(102, 255, 234, 0.15)';
    ctx.lineWidth = 1;
    const gridSpacing = 80;
    const gridOffset = cameraX % gridSpacing;
    for (let gx = -gridOffset; gx < w; gx += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(gx, this.groundY);
      ctx.lineTo(gx - (gx - w / 2) * 0.2, h);
      ctx.stroke();
    }
    for (let gy = this.groundY + 20; gy < h; gy += 40) {
      const shrink = (gy - this.groundY) / (h - this.groundY);
      const lineW = w * (1 - shrink * 0.5);
      const startX = (w - lineW) / 2;
      ctx.beginPath();
      ctx.moveTo(startX, gy);
      ctx.lineTo(startX + lineW, gy);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderBeatPoints(ctx: CanvasRenderingContext2D, cameraX: number): void {
    for (const bp of this.beatPoints) {
      if (bp.hit) continue;
      const dx = bp.x - cameraX + BEAT_POINT_SIZE / 2;
      const dy = bp.y + BEAT_POINT_SIZE / 2;
      if (dx < -60 || dx > ctx.canvas.width + 60) continue;

      const pulse = bp.glowPulse;
      const baseR = BEAT_POINT_SIZE / 2;
      const glowR = baseR * (2 + pulse * 1.5);

      ctx.save();
      const glowGrad = ctx.createRadialGradient(dx, dy, 0, dx, dy, glowR);
      glowGrad.addColorStop(0, `rgba(255, 215, 0, ${0.5 + pulse * 0.4})`);
      glowGrad.addColorStop(0.5, `rgba(255, 170, 0, ${0.2 + pulse * 0.2})`);
      glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.beginPath();
      ctx.arc(dx, dy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.shadowColor = COLORS.BEAT_POINT;
      ctx.shadowBlur = 10 + pulse * 10;
      ctx.beginPath();
      ctx.arc(dx, dy, baseR * (0.8 + pulse * 0.3), 0, Math.PI * 2);
      const coreGrad = ctx.createRadialGradient(dx, dy, 0, dx, dy, baseR);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, COLORS.BEAT_POINT);
      coreGrad.addColorStop(1, COLORS.BEAT_POINT_GLOW);
      ctx.fillStyle = coreGrad;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.3 + pulse * 0.4;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(dx, dy, baseR * 1.2 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  renderSpikes(ctx: CanvasRenderingContext2D, cameraX: number): void {
    for (const sp of this.spikes) {
      const dx = sp.x - cameraX;
      if (dx < -80 || dx > ctx.canvas.width + 80) continue;

      ctx.save();
      ctx.shadowColor = COLORS.SPIKE_GLOW;
      ctx.shadowBlur = 12;

      const tipX = dx + sp.width / 2;
      const tipY = sp.y;
      const baseY = sp.y + sp.height;

      const grad = ctx.createLinearGradient(tipX, tipY, tipX, baseY);
      grad.addColorStop(0, COLORS.SPIKE);
      grad.addColorStop(1, COLORS.SPIKE_GLOW);

      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(dx, baseY);
      ctx.lineTo(dx + sp.width, baseY);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 120, 180, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    }
  }

  renderParticles(ctx: CanvasRenderingContext2D, cameraX: number): void {
    ctx.save();
    for (const p of this.particles) {
      const dx = p.x - cameraX;
      if (dx < -30 || dx > ctx.canvas.width + 30) continue;
      ctx.beginPath();
      ctx.arc(dx, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.restore();
  }

  renderGoal(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const goalX = this.width - cameraX;
    if (goalX < -100 || goalX > ctx.canvas.width + 100) return;

    const freq = clamp(this.musicFrequency, 0, 1);

    ctx.save();
    const grad = ctx.createLinearGradient(goalX - 5, 0, goalX + 5, 0);
    grad.addColorStop(0, `rgba(255, 0, 255, ${0.3 + freq * 0.3})`);
    grad.addColorStop(0.5, `rgba(0, 240, 255, ${0.5 + freq * 0.4})`);
    grad.addColorStop(1, `rgba(255, 0, 255, ${0.3 + freq * 0.3})`);
    ctx.fillStyle = grad;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 30 + freq * 20;
    ctx.fillRect(goalX - 4, 0, 8, this.groundY);
    ctx.restore();

    ctx.save();
    ctx.shadowColor = COLORS.NEON_MAGENTA;
    ctx.shadowBlur = 20;
    const pulse = 0.8 + 0.2 * Math.sin(this.time * 0.08);
    ctx.font = `bold ${16 * pulse}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.NEON_MAGENTA;
    ctx.fillText('终点', goalX, 50);
    ctx.restore();
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number, cameraX: number): void {
    this.renderBackground(ctx, w, h, cameraX);
    this.renderGround(ctx, w, h, cameraX);
    this.renderGoal(ctx, cameraX);
    this.renderSpikes(ctx, cameraX);
    this.renderBeatPoints(ctx, cameraX);
    this.renderParticles(ctx, cameraX);
  }
}
