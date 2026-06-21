import type { Team } from '../../shared/types';

export class MatchingUI {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private angle: number = 0;
  private pulsePhase: number = 0;
  private waitTime: number = 0;
  private running: boolean = false;
  private animFrameId: number = 0;
  private lastTimestamp: number = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  start(): void {
    this.running = true;
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return;

    const dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    this.angle += dt * 0.5;
    this.pulsePhase += dt;

    this.draw();
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private draw(): void {
    const { ctx, width, height } = this;
    const cx = width / 2;
    const cy = height / 2;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin((this.pulsePhase / 1.5) * Math.PI * 2));
    const baseRadius = Math.min(width, height) * 0.15;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);

    const ringCount = 4;
    for (let i = 1; i <= ringCount; i++) {
      const radius = baseRadius * i;
      const ringAlpha = alpha * (1 - (i - 1) / ringCount * 0.5);

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${ringAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('搜索对手中...', cx, cy - 10);

    ctx.font = '16px Orbitron, sans-serif';
    ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
    ctx.fillText(`${this.waitTime}s`, cx, cy + 25);
  }

  setWaitTime(seconds: number): void {
    this.waitTime = seconds;
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animFrameId);
  }
}
