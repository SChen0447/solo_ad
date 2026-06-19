import { Player, PlayerSnapshot } from './Player';
import { Level } from './Level';

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
  private level: Level;
  maxEnergy = 180;
  energy = 180;
  private energyRechargeRate = 0.5;
  isRewinding = false;
  private rewindFrameCount = 0;
  private readonly MAX_REWIND_FRAMES = 180;

  particles: RewindParticle[] = [];
  rewindPhase = 0;
  private distortionCanvas: HTMLCanvasElement | null = null;
  private distortionCtx: CanvasRenderingContext2D | null = null;

  constructor(player: Player, level: Level) {
    this.player = player;
    this.level = level;
  }

  private ensureDistortionCanvas(w: number, h: number): void {
    if (!this.distortionCanvas || this.distortionCanvas.width !== w || this.distortionCanvas.height !== h) {
      this.distortionCanvas = document.createElement('canvas');
      this.distortionCanvas.width = w;
      this.distortionCanvas.height = h;
      this.distortionCtx = this.distortionCanvas.getContext('2d');
    }
  }

  update(rewindPressed: boolean, rewindReleased: boolean): void {
    if (rewindPressed && this.energy > 10 && this.player.history.length > 10 && !this.isRewinding) {
      this.isRewinding = true;
      this.rewindFrameCount = 0;
    }

    if (rewindReleased && this.isRewinding) {
      this.endRewind();
    }

    if (this.isRewinding) {
      this.performRewind();
    } else {
      this.energy = Math.min(this.maxEnergy, this.energy + this.energyRechargeRate);
      this.player.recordFrame();
      this.particles = this.particles.filter((p) => p.life > 0);
    }

    this.rewindPhase += this.isRewinding ? 0.15 : 0.02;

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
      const snap = this.player.history[this.player.history.length - 1];

      const testX = snap.x;
      const testY = snap.y;

      if (!this.level.isSolidAt(testX, testY, this.player.width, this.player.height)) {
        this.player.history.pop();
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
        this.endRewind();
        return;
      }
    } else {
      this.endRewind();
    }
  }

  private endRewind(): void {
    if (this.isRewinding) {
      this.isRewinding = false;
      this.player.vx = 0;
      this.player.vy = 0;
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
    if (w === 0 || h === 0) return;

    this.ensureDistortionCanvas(w, h);
    if (!this.distortionCtx) return;

    this.distortionCtx.drawImage(ctx.canvas, 0, 0);
    const imageData = this.distortionCtx.getImageData(0, 0, w, h);
    const srcData = imageData.data;
    const dstData = new Uint8ClampedArray(srcData.length);

    const amplitude = 8 + Math.sin(now * 0.01) * 3;
    const frequency = 0.02;
    const scanLineOffset = Math.floor(now * 0.08) % h;

    for (let y = 0; y < h; y++) {
      const waveX = Math.sin(y * frequency + now * 0.003) * amplitude;
      const waveY = Math.cos(y * frequency * 0.7 + now * 0.002) * amplitude * 0.3;

      for (let x = 0; x < w; x++) {
        const srcX = Math.floor(x + waveX + Math.sin(x * 0.01 + now * 0.004) * 2);
        const srcY = Math.floor(y + waveY);

        const clampedX = Math.max(0, Math.min(w - 1, srcX));
        const clampedY = Math.max(0, Math.min(h - 1, srcY));

        const srcIdx = (clampedY * w + clampedX) * 4;
        const dstIdx = (y * w + x) * 4;

        let r = srcData[srcIdx];
        let g = srcData[srcIdx + 1];
        let b = srcData[srcIdx + 2];

        const yDiff = y - scanLineOffset;
        if (yDiff >= 0 && yDiff < 3) {
          const shift = Math.sin(now * 0.05) * 4;
          const shiftedX = Math.floor(x + shift);
          const clampedShiftX = Math.max(0, Math.min(w - 1, shiftedX));
          const shiftIdx = (y * w + clampedShiftX) * 4;
          r = srcData[shiftIdx];
          g = srcData[shiftIdx + 1];
          b = srcData[shiftIdx + 2];
        }

        const chromaOffset = Math.floor(Math.sin(now * 0.01 + y * 0.02) * 2);
        const rX = Math.max(0, Math.min(w - 1, clampedX + chromaOffset));
        const bX = Math.max(0, Math.min(w - 1, clampedX - chromaOffset));
        const rIdx = (clampedY * w + rX) * 4;
        const bIdx = (clampedY * w + bX) * 4;
        r = srcData[rIdx];
        b = srcData[bIdx + 2];

        const noise = (Math.random() - 0.5) * 40;
        r = Math.max(0, Math.min(255, r + noise));
        g = Math.max(0, Math.min(255, g + noise));
        b = Math.max(0, Math.min(255, b + noise));

        const rewindTint = 1 - this.rewindFrameCount / this.MAX_REWIND_FRAMES;
        r = Math.max(0, Math.min(255, r - 20 * (1 - rewindTint)));
        g = Math.max(0, Math.min(255, g + 10 * (1 - rewindTint)));
        b = Math.max(0, Math.min(255, b + 30 * (1 - rewindTint)));

        dstData[dstIdx] = r;
        dstData[dstIdx + 1] = g;
        dstData[dstIdx + 2] = b;
        dstData[dstIdx + 3] = srcData[srcIdx + 3];
      }
    }

    imageData.data.set(dstData);
    this.distortionCtx.putImageData(imageData, 0, 0);
    if (this.distortionCanvas) {
      ctx.drawImage(this.distortionCanvas, 0, 0);
    }

    ctx.save();
    ctx.globalAlpha = 0.1;
    for (let y = 0; y < h; y += 4) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, y, w, 2);
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.05 + Math.sin(now * 0.01) * 0.03;
    const vignetteGradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    vignetteGradient.addColorStop(0, 'transparent');
    vignetteGradient.addColorStop(1, '#7c3aed');
    ctx.fillStyle = vignetteGradient;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textAlpha = 0.15 + Math.sin(now * 0.02) * 0.1;
    ctx.globalAlpha = textAlpha;
    ctx.fillStyle = '#c084fc';
    ctx.scale(1.2, 1);
    ctx.rotate(Math.sin(now * 0.003) * 0.05);
    ctx.fillText('REWIND', w / 2, h / 2);
    ctx.restore();
  }

  getEnergyRatio(): number {
    return this.energy / this.maxEnergy;
  }

  isFull(): boolean {
    return this.energy >= this.maxEnergy;
  }
}
