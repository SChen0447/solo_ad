import { Player, PlayerSnapshot } from './Player';

interface RewindParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export class TimeRecorder {
  private player: Player;
  maxEnergy = 180;
  energy = 180;
  private energyRechargeRate = 0.5;
  isRewinding = false;
  private rewindFrameCount = 0;
  private readonly MAX_REWIND_FRAMES = 180;

  particles: RewindParticle[] = [];
  spiralAngle = 0;

  noiseCanvas: HTMLCanvasElement | null = null;

  constructor(player: Player) {
    this.player = player;
  }

  update(rewindPressed: boolean, rewindReleased: boolean): void {
    if (rewindPressed && this.energy > 10 && this.player.history.length > 10) {
      this.isRewinding = true;
      this.rewindFrameCount = 0;
    }

    if (rewindReleased) {
      this.isRewinding = false;
    }

    if (this.isRewinding) {
      this.performRewind();
    } else {
      this.energy = Math.min(this.maxEnergy, this.energy + this.energyRechargeRate);
      this.player.recordFrame();
      this.particles = this.particles.filter((p) => p.life > 0);
    }

    this.spiralAngle += this.isRewinding ? 0.1 : 0.02;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  private performRewind(): void {
    if (this.player.history.length > 0 && this.energy > 0 && this.rewindFrameCount < this.MAX_REWIND_FRAMES) {
      const snap = this.player.history.pop()!;
      this.player.applySnapshot(snap);

      this.energy -= 1;
      this.rewindFrameCount++;

      for (let i = 0; i < 2; i++) {
        this.particles.push({
          x: this.player.x + this.player.width / 2,
          y: this.player.y + this.player.height / 2,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 20 + Math.random() * 20,
          maxLife: 40,
          size: 2 + Math.random() * 3,
        });
      }
    } else {
      this.isRewinding = false;
    }
  }

  drawParticles(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y - camY, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawRewindOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, now: number): void {
    if (!this.isRewinding) return;

    this.drawVHSEffect(ctx, w, h, now);
    this.drawSpiralBorder(ctx, w, h, now);
  }

  private drawVHSEffect(ctx: CanvasRenderingContext2D, w: number, h: number, now: number): void {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const noiseStrength = 0.03;
    for (let i = 0; i < data.length; i += 16) {
      if (Math.random() < noiseStrength) {
        const noise = (Math.random() - 0.5) * 60;
        data[i] += noise;
        data[i + 1] += noise;
        data[i + 2] += noise;
      }
    }

    const scanLineOffset = Math.floor(now * 0.05) % h;
    for (let y = scanLineOffset; y < h; y += 4) {
      const shift = Math.floor((Math.random() - 0.5) * 6);
      if (shift !== 0 && y * w * 4 < data.length) {
        const rowStart = y * w * 4;
        const copyLen = Math.min(w * 4, data.length - rowStart);
        if (shift > 0 && rowStart + shift * 4 + copyLen < data.length) {
          for (let i = copyLen - 4; i >= 0; i -= 4) {
            if (rowStart + i + shift * 4 < data.length) {
              data[rowStart + i + shift * 4] = data[rowStart + i];
              data[rowStart + i + shift * 4 + 1] = data[rowStart + i + 1];
              data[rowStart + i + shift * 4 + 2] = data[rowStart + i + 2];
            }
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  private drawSpiralBorder(ctx: CanvasRenderingContext2D, w: number, h: number, _now: number): void {
    ctx.save();
    ctx.globalAlpha = 0.25;

    const spiralCount = 8;
    for (let i = 0; i < spiralCount; i++) {
      const angle = this.spiralAngle + (i * Math.PI * 2) / spiralCount;
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.sqrt(cx * cx + cy * cy);

      ctx.beginPath();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 8;
      for (let t = 0; t < 1; t += 0.01) {
        const r = t * maxR * 0.15;
        const a = angle + t * Math.PI * 3;
        const x = cx + Math.cos(a) * (r + maxR * 0.35);
        const y = cy + Math.sin(a) * (r + maxR * 0.35);
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const borderSize = 40;
    ctx.fillStyle = '#7c3aed';
    ctx.globalAlpha = 0.15;

    for (let x = 0; x < w; x += 6) {
      const topH = borderSize + Math.sin(x * 0.05 + this.spiralAngle * 3) * 10;
      const botH = borderSize + Math.sin(x * 0.05 + this.spiralAngle * 3 + 2) * 10;
      ctx.fillRect(x, 0, 6, topH);
      ctx.fillRect(x, h - botH, 6, botH);
    }

    for (let y = 0; y < h; y += 6) {
      const leftW = borderSize + Math.sin(y * 0.05 + this.spiralAngle * 3) * 10;
      const rightW = borderSize + Math.sin(y * 0.05 + this.spiralAngle * 3 + 2) * 10;
      ctx.fillRect(0, y, leftW, 6);
      ctx.fillRect(w - rightW, y, rightW, 6);
    }

    ctx.restore();
  }

  getEnergyRatio(): number {
    return this.energy / this.maxEnergy;
  }

  isFull(): boolean {
    return this.energy >= this.maxEnergy;
  }
}
