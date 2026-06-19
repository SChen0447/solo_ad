import { getElementById, type Element } from './ElementData';
import type { FusionResult } from './GameEngine';

export interface BallState {
  elementId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  scale: number;
  targetScale: number;
  rotation: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

interface FusionAnimation {
  active: boolean;
  startTime: number;
  duration: number;
  success: boolean;
  outputElementId?: string;
  colors: string[];
  particles: Particle[];
  centerX: number;
  centerY: number;
  bounceProgress: number;
  isNewUnlock?: boolean;
}

interface ErrorFlash {
  active: boolean;
  startTime: number;
  duration: number;
  intensity: number;
}

export class ElementRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private balls: Map<number, BallState> = new Map();
  private fusionAnim: FusionAnimation = {
    active: false,
    startTime: 0,
    duration: 500,
    success: false,
    colors: [],
    particles: [],
    centerX: 0,
    centerY: 0,
    bounceProgress: 0
  };
  private errorFlash: ErrorFlash = {
    active: false,
    startTime: 0,
    duration: 400,
    intensity: 0
  };
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private ballRadius: number = 25;
  private dragBallIndex: number | null = null;
  private onFusionTrigger?: () => void;
  private isMobile: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.resize();
    this.initBalls();
    this.start();
  }

  setCallbacks(
    onFusionTrigger: () => void
  ): void {
    this.onFusionTrigger = onFusionTrigger;
  }

  setMobile(mobile: boolean): void {
    this.isMobile = mobile;
    this.ballRadius = mobile ? 20 : 25;
    this.initBalls();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.initBalls();
  }

  private initBalls(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const centerY = h / 2;
    const spacing = this.ballRadius * 4;

    this.balls.set(0, {
      elementId: '',
      x: w / 2 - spacing,
      y: centerY,
      vx: 0,
      vy: 0,
      targetX: w / 2 - spacing,
      targetY: centerY,
      scale: 0,
      targetScale: 0,
      rotation: 0
    });

    this.balls.set(1, {
      elementId: '',
      x: w / 2 + spacing,
      y: centerY,
      vx: 0,
      vy: 0,
      targetX: w / 2 + spacing,
      targetY: centerY,
      scale: 0,
      targetScale: 0,
      rotation: 0
    });
  }

  setSlotElement(slotIndex: 0 | 1, elementId: string | null): void {
    const ball = this.balls.get(slotIndex);
    if (!ball) return;

    if (elementId) {
      ball.elementId = elementId;
      ball.targetScale = 1;
      ball.scale = 0.3;
    } else {
      ball.elementId = '';
      ball.targetScale = 0;
    }
  }

  playFusionAnimation(result: FusionResult): void {
    const rect = this.canvas.getBoundingClientRect();
    this.fusionAnim = {
      active: true,
      startTime: performance.now(),
      duration: result.success ? 900 : 400,
      success: result.success,
      outputElementId: result.outputElementId,
      colors: result.inputElementIds
        .map(id => getElementById(id))
        .filter((e): e is Element => e !== undefined)
        .map(e => e.color),
      particles: [],
      centerX: rect.width / 2,
      centerY: rect.height / 2,
      bounceProgress: 0,
      isNewUnlock: result.isNewUnlock
    };

    if (result.success) {
      this.spawnParticles(30, this.fusionAnim.centerX, this.fusionAnim.centerY);
    } else {
      this.errorFlash = {
        active: true,
        startTime: performance.now(),
        duration: 400,
        intensity: 1
      };
      this.bounceBallsApart();
    }
  }

  private spawnParticles(count: number, x: number, y: number): void {
    const colors = this.fusionAnim.colors;
    if (colors.length === 0) return;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 80 + Math.random() * 120;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.fusionAnim.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 500,
        maxLife: 500,
        size: 3 + Math.random() * 5
      });
    }
  }

  private bounceBallsApart(): void {
    const ball0 = this.balls.get(0);
    const ball1 = this.balls.get(1);
    if (ball0) {
      ball0.vx = -200;
      ball0.vy = -50 + Math.random() * 100;
    }
    if (ball1) {
      ball1.vx = 200;
      ball1.vy = -50 + Math.random() * 100;
    }
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = (): void => {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(dt, now);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number, now: number): void {
    for (const [index, ball] of this.balls) {
      if (this.dragBallIndex === index) continue;

      const damping = 0.85;
      ball.vx += (ball.targetX - ball.x) * 8 * dt;
      ball.vy += (ball.targetY - ball.y) * 8 * dt;
      ball.vx *= Math.pow(damping, dt * 60);
      ball.vy *= Math.pow(damping, dt * 60);
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      ball.scale += (ball.targetScale - ball.scale) * Math.min(1, dt * 10);
      ball.rotation += dt * 0.5;
    }

    if (this.fusionAnim.active) {
      const elapsed = now - this.fusionAnim.startTime;
      if (elapsed >= this.fusionAnim.duration) {
        this.fusionAnim.active = false;
        this.fusionAnim.particles = [];
      } else {
        for (const p of this.fusionAnim.particles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 100 * dt;
          p.life -= dt * 1000;
        }
        this.fusionAnim.bounceProgress = Math.min(1, elapsed / 400);
      }
    }

    if (this.errorFlash.active) {
      const elapsed = now - this.errorFlash.startTime;
      if (elapsed >= this.errorFlash.duration) {
        this.errorFlash.active = false;
      }
    }

    this.checkFusionCollision();
  }

  private checkFusionCollision(): void {
    if (this.fusionAnim.active) return;

    const ball0 = this.balls.get(0);
    const ball1 = this.balls.get(1);
    if (!ball0 || !ball1) return;
    if (!ball0.elementId || !ball1.elementId) return;

    const dx = ball1.x - ball0.x;
    const dy = ball1.y - ball0.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = this.ballRadius * 1.8;

    if (dist < minDist && this.onFusionTrigger) {
      this.onFusionTrigger();
    }
  }

  private render(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.clearRect(0, 0, w, h);
    this.drawHexGrid(w, h);
    this.drawFusionPlatform(w, h);
    this.drawConnector();
    this.drawBalls();
    this.drawParticles();
    this.drawFusionResult();
    this.drawErrorFlash();
  }

  private drawHexGrid(w: number, h: number): void {
    const ctx = this.ctx;
    const hexSize = 30;
    const hexWidth = hexSize * Math.sqrt(3);
    const hexHeight = hexSize * 1.5;

    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#8866FF';
    ctx.lineWidth = 0.5;

    const cols = Math.ceil(w / hexWidth) + 2;
    const rows = Math.ceil(h / hexHeight) + 2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * hexWidth + (row % 2) * (hexWidth / 2) - hexWidth;
        const y = row * hexHeight - hexHeight;
        this.drawHexagon(x, y, hexSize);
      }
    }
    ctx.restore();
  }

  private drawHexagon(x: number, y: number, size: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + Math.PI / 6;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.stroke();
  }

  private drawFusionPlatform(w: number, h: number): void {
    const ctx = this.ctx;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.35;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(100, 80, 200, 0.25)');
    gradient.addColorStop(0.6, 'rgba(80, 60, 160, 0.12)');
    gradient.addColorStop(1, 'rgba(60, 40, 120, 0)');

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#AA88FF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawConnector(): void {
    const ball0 = this.balls.get(0);
    const ball1 = this.balls.get(1);
    if (!ball0 || !ball1) return;
    if (!ball0.elementId || !ball1.elementId) return;

    const ctx = this.ctx;
    const e0 = getElementById(ball0.elementId);
    const e1 = getElementById(ball1.elementId);
    if (!e0 || !e1) return;

    ctx.save();
    ctx.globalAlpha = 0.5;

    const gradient = ctx.createLinearGradient(ball0.x, ball0.y, ball1.x, ball1.y);
    gradient.addColorStop(0, e0.color);
    gradient.addColorStop(1, e1.color);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(ball0.x, ball0.y);
    ctx.lineTo(ball1.x, ball1.y);
    ctx.stroke();
    ctx.restore();
  }

  private drawBalls(): void {
    for (const ball of this.balls.values()) {
      if (!ball.elementId || ball.scale <= 0.01) continue;
      const element = getElementById(ball.elementId);
      if (!element) continue;
      this.drawBall(ball, element);
    }
  }

  private drawBall(ball: BallState, element: Element): void {
    const ctx = this.ctx;
    const r = this.ballRadius * ball.scale;

    ctx.save();
    ctx.translate(ball.x, ball.y);

    ctx.shadowColor = element.color;
    ctx.shadowBlur = 20 * ball.scale;

    const gradient = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
    gradient.addColorStop(0, element.colorLight);
    gradient.addColorStop(0.5, element.color);
    gradient.addColorStop(1, this.darkenColor(element.color, 0.4));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.25, r * 0.15, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.save();
    ctx.globalAlpha = ball.scale;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${r * 0.7}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 3;
    ctx.fillText(element.name, ball.x, ball.y);
    ctx.restore();
  }

  private drawParticles(): void {
    if (!this.fusionAnim.active || this.fusionAnim.particles.length === 0) return;

    const ctx = this.ctx;
    for (const p of this.fusionAnim.particles) {
      if (p.life <= 0) continue;
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawFusionResult(): void {
    if (!this.fusionAnim.active || !this.fusionAnim.success || !this.fusionAnim.outputElementId) return;

    const element = getElementById(this.fusionAnim.outputElementId);
    if (!element) return;

    const t = this.fusionAnim.bounceProgress;
    const bounceT = this.bounceOut(t);
    const scale = bounceT;
    const r = this.ballRadius * 1.5 * scale;

    const ctx = this.ctx;
    const { centerX, centerY } = this.fusionAnim;

    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 2);
    ctx.translate(centerX, centerY);

    ctx.shadowColor = element.color;
    ctx.shadowBlur = 40 * scale;

    const gradient = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
    gradient.addColorStop(0, element.colorLight);
    gradient.addColorStop(0.5, element.color);
    gradient.addColorStop(1, this.darkenColor(element.color, 0.4));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = Math.min(1, t * 2) * 0.4;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.25, r * 0.15, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${r * 0.65}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 3;
    ctx.fillText(element.name, centerX, centerY);
    ctx.restore();

    if (this.fusionAnim.isNewUnlock !== undefined && this.fusionAnim.isNewUnlock && t > 0.3) {
      ctx.save();
      ctx.globalAlpha = (t - 0.3) / 0.7;
      ctx.fillStyle = '#FFD700';
      ctx.font = `bold ${this.isMobile ? 14 : 18}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 5;
      ctx.fillText('✨ 新元素解锁!', centerX, centerY + r + 25);
      ctx.restore();
    }
  }

  private drawErrorFlash(): void {
    if (!this.errorFlash.active) return;

    const now = performance.now();
    const elapsed = now - this.errorFlash.startTime;
    const progress = elapsed / this.errorFlash.duration;
    const alpha = (1 - progress) * 0.4;
    const pulse = Math.sin(progress * Math.PI * 4) * 0.5 + 0.5;

    const rect = this.canvas.getBoundingClientRect();
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = alpha * pulse;
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.restore();

    const ball0 = this.balls.get(0);
    const ball1 = this.balls.get(1);
    for (const ball of [ball0, ball1]) {
      if (!ball || !ball.elementId) continue;
      ctx.save();
      ctx.globalAlpha = (1 - progress) * 0.6 * pulse;
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, this.ballRadius * ball.scale + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private bounceOut(t: number): number {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }

  private darkenColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const nr = Math.floor(r * (1 - factor));
    const ng = Math.floor(g * (1 - factor));
    const nb = Math.floor(b * (1 - factor));
    return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
  }

  handleMouseDown(_x: number, _y: number): void {
  }

  handleMouseMove(_x: number, _y: number): void {
  }

  handleMouseUp(_x: number, _y: number): void {
  }

  getBallAtPosition(x: number, y: number): number | null {
    for (const [index, ball] of this.balls) {
      if (!ball.elementId) continue;
      const dx = x - ball.x;
      const dy = y - ball.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.ballRadius * ball.scale + 5) {
        return index;
      }
    }
    return null;
  }

  startDrag(index: number): void {
    this.dragBallIndex = index;
  }

  updateDragPosition(x: number, y: number): void {
    if (this.dragBallIndex === null) return;
    const ball = this.balls.get(this.dragBallIndex);
    if (!ball) return;
    ball.x = x;
    ball.y = y;
    ball.vx = 0;
    ball.vy = 0;
  }

  endDrag(): void {
    this.dragBallIndex = null;
  }
}
