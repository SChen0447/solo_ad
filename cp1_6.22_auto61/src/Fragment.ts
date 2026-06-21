import { FragmentState, Particle, Position, COLORS, CONFIG } from './types';

export class Fragment {
  private state: FragmentState;
  private particleTimer: number;
  private particleInterval: number;

  constructor(id: number, gridX: number, gridY: number) {
    this.particleTimer = 0;
    this.particleInterval = 0.1;
    this.state = {
      id,
      x: gridX,
      y: gridY,
      rotation: 0,
      rotationSpeed: CONFIG.FRAGMENT_ROTATION_SPEED,
      collected: false,
      scale: 1,
      disappearing: false,
      disappearTime: 0,
    };
  }

  public update(deltaTime: number, cellSize: number, mazeOffsetX: number, mazeOffsetY: number): Particle | null {
    if (this.state.collected && !this.state.disappearing) {
      return null;
    }

    if (this.state.disappearing) {
      this.state.disappearTime += deltaTime;
      const progress = this.state.disappearTime / CONFIG.COLLECT_ANIMATION_TIME;
      if (progress >= 1) {
        this.state.collected = true;
        this.state.disappearing = false;
        return null;
      }
      this.state.scale = 1 + progress * 1.5;
      return null;
    }

    this.state.rotation += this.state.rotationSpeed * deltaTime;

    this.particleTimer += deltaTime;
    if (this.particleTimer >= this.particleInterval) {
      this.particleTimer = 0;
      return this.emitParticle(cellSize, mazeOffsetX, mazeOffsetY);
    }

    return null;
  }

  private emitParticle(cellSize: number, mazeOffsetX: number, mazeOffsetY: number): Particle {
    const centerX = mazeOffsetX + this.state.x * cellSize + cellSize / 2;
    const centerY = mazeOffsetY + this.state.y * cellSize + cellSize / 2;
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 20;

    return {
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: CONFIG.PARTICLE_LIFE,
      maxLife: CONFIG.PARTICLE_LIFE,
      radius: CONFIG.PARTICLE_RADIUS,
      color: COLORS.FRAGMENT,
    };
  }

  public draw(ctx: CanvasRenderingContext2D, cellSize: number, mazeOffsetX: number, mazeOffsetY: number): void {
    if (this.state.collected && !this.state.disappearing) {
      return;
    }

    const centerX = mazeOffsetX + this.state.x * cellSize + cellSize / 2;
    const centerY = mazeOffsetY + this.state.y * cellSize + cellSize / 2;
    const size = CONFIG.FRAGMENT_SIZE * this.state.scale;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.state.rotation);

    if (this.state.disappearing) {
      const progress = this.state.disappearTime / CONFIG.COLLECT_ANIMATION_TIME;
      ctx.globalAlpha = 1 - progress;
    }

    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    glowGradient.addColorStop(0, COLORS.FRAGMENT_GLOW);
    glowGradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.FRAGMENT;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const outerAngle = (i * Math.PI) / 2;
      const innerAngle = outerAngle + Math.PI / 4;

      const outerX = Math.cos(outerAngle) * size;
      const outerY = Math.sin(outerAngle) * size;

      const innerX = Math.cos(innerAngle) * (size * 0.4);
      const innerY = Math.sin(innerAngle) * (size * 0.4);

      if (i === 0) {
        ctx.moveTo(outerX, outerY);
      } else {
        ctx.lineTo(outerX, outerY);
      }
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  public collect(): void {
    if (!this.state.collected && !this.state.disappearing) {
      this.state.disappearing = true;
      this.state.disappearTime = 0;
    }
  }

  public getState(): FragmentState {
    return { ...this.state };
  }

  public getWorldPosition(cellSize: number, mazeOffsetX: number, mazeOffsetY: number): Position {
    return {
      x: mazeOffsetX + this.state.x * cellSize + cellSize / 2,
      y: mazeOffsetY + this.state.y * cellSize + cellSize / 2,
    };
  }

  public isCollected(): boolean {
    return this.state.collected;
  }

  public isDisappearing(): boolean {
    return this.state.disappearing;
  }

  public reset(gridX: number, gridY: number): void {
    this.state.x = gridX;
    this.state.y = gridY;
    this.state.rotation = 0;
    this.state.collected = false;
    this.state.scale = 1;
    this.state.disappearing = false;
    this.state.disappearTime = 0;
    this.particleTimer = 0;
  }
}
