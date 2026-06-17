import { Particle, RGB, PhysicsForce, Boundary } from './particle';

export type PhysicsScene = 'gravity' | 'wind' | 'vortex';

export interface ParticleConfig {
  emissionRate: number;
  initialSpeed: number;
  lifetime: number;
  size: number;
  startColor: RGB;
  endColor: RGB;
}

export interface EmitterStats {
  activeCount: number;
  reducedRate: boolean;
}

export const MAX_POOL_SIZE = 5000;
export const WARNING_THRESHOLD = 4500;
export const REDUCTION_THRESHOLD = 5000;

export class Emitter {
  private pool: Particle[] = [];
  private emissionAccumulator: number = 0;
  private config: ParticleConfig;
  private scene: PhysicsScene = 'gravity';
  private canvasWidth: number = 800;
  private canvasHeight: number = 600;

  constructor() {
    this.config = {
      emissionRate: 50,
      initialSpeed: 150,
      lifetime: 2,
      size: 6,
      startColor: { r: 255, g: 107, b: 107 },
      endColor: { r: 255, g: 200, b: 150 }
    };

    for (let i = 0; i < MAX_POOL_SIZE; i++) {
      this.pool.push(new Particle());
    }
  }

  public setConfig(config: Partial<ParticleConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): ParticleConfig {
    return { ...this.config };
  }

  public setScene(scene: PhysicsScene): void {
    this.scene = scene;
  }

  public getScene(): PhysicsScene {
    return this.scene;
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public update(dt: number): Particle[] {
    let activeCount = 0;

    for (const p of this.pool) {
      if (p.active) {
        p.update(dt, this.getPhysicsForce());
        activeCount++;
      }
    }

    const effectiveRate = activeCount > REDUCTION_THRESHOLD
      ? this.config.emissionRate / 3
      : this.config.emissionRate;

    this.emissionAccumulator += effectiveRate * dt;

    while (this.emissionAccumulator >= 1) {
      if (activeCount >= MAX_POOL_SIZE) {
        this.emissionAccumulator = 0;
        break;
      }
      this.emissionAccumulator -= 1;
      this.emitParticle();
      activeCount++;
    }

    return this.pool.filter(p => p.active);
  }

  private emitParticle(): void {
    const particle = this.pool.find(p => !p.active);
    if (!particle) return;

    const border = 8;
    const emitX = this.canvasWidth / 2 + (Math.random() - 0.5) * 100;
    const emitY = this.canvasHeight / 2 + (Math.random() - 0.5) * 60;
    const clampedX = Math.max(border + 10, Math.min(this.canvasWidth - border - 10, emitX));
    const clampedY = Math.max(border + 10, Math.min(this.canvasHeight - border - 10, emitY));

    const angle = Math.random() * Math.PI * 2;
    const speed = this.config.initialSpeed * (0.5 + Math.random() * 0.5);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    particle.reset(
      clampedX,
      clampedY,
      vx,
      vy,
      this.config.lifetime * (0.7 + Math.random() * 0.6),
      this.config.size * (0.7 + Math.random() * 0.6),
      { ...this.config.startColor },
      { ...this.config.endColor }
    );
  }

  private getPhysicsForce(): PhysicsForce {
    switch (this.scene) {
      case 'gravity':
        return { ax: 0, ay: 300, type: 'gravity' };
      case 'wind':
        return { ax: 100, ay: 50, type: 'wind' };
      case 'vortex':
        return {
          ax: 0,
          ay: 0,
          type: 'vortex',
          centerX: this.canvasWidth / 2,
          centerY: this.canvasHeight / 2
        };
      default:
        return { ax: 0, ay: 300, type: 'gravity' };
    }
  }

  public getStats(): EmitterStats {
    const activeCount = this.pool.filter(p => p.active).length;
    return {
      activeCount,
      reducedRate: activeCount > REDUCTION_THRESHOLD
    };
  }

  public getBoundary(): Boundary {
    const border = 8;
    return {
      left: border,
      right: this.canvasWidth - border,
      top: border,
      bottom: this.canvasHeight - border
    };
  }
}
