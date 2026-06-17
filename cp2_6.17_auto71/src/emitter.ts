import { Particle, PhysicsSceneType } from './particle';

export interface EmitterConfig {
  emissionRate: number;
  initialSpeed: number;
  lifetime: number;
  particleSize: number;
  startColor: string;
  endColor: string;
  sceneType: PhysicsSceneType;
  particleCollision: boolean;
}

export const MAX_PARTICLES = 5000;
export const WARNING_THRESHOLD = 3000;

export class Emitter {
  private particles: Particle[] = [];
  private emitAccumulator: number = 0;
  private emitX: number = 0;
  private emitY: number = 0;
  private config: EmitterConfig = {
    emissionRate: 50,
    initialSpeed: 200,
    lifetime: 2,
    particleSize: 8,
    startColor: '#ff6b6b',
    endColor: '#4ecdc4',
    sceneType: 'gravity',
    particleCollision: false
  };

  public getConfig(): EmitterConfig {
    return { ...this.config };
  }

  public setConfig(config: Partial<EmitterConfig>): void {
    this.config = { ...this.config, ...config };
    for (const p of this.particles) {
      if (config.sceneType) {
        p.setScene(config.sceneType);
      }
    }
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public getActiveCount(): number {
    return this.particles.length;
  }

  public isOverThreshold(): boolean {
    return this.particles.length > WARNING_THRESHOLD;
  }

  public setEmitterPosition(x: number, y: number): void {
    this.emitX = x;
    this.emitY = y;
  }

  public update(dt: number, canvasWidth: number, canvasHeight: number, wallThickness: number): void {
    let effectiveRate = this.config.emissionRate;
    if (this.particles.length > WARNING_THRESHOLD) {
      effectiveRate = this.config.emissionRate / 3;
    }

    this.emitAccumulator += dt * effectiveRate;
    while (this.emitAccumulator >= 1 && this.particles.length < MAX_PARTICLES) {
      this.emitAccumulator -= 1;
      this.emitParticle(canvasWidth, canvasHeight);
    }

    const wallRestitution = 0.7;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt, canvasWidth, canvasHeight, wallThickness, wallRestitution);
      if (!this.particles[i].alive) {
        this.particles.splice(i, 1);
      }
    }

    if (this.config.particleCollision) {
      const particleRestitution = 0.5;
      const len = this.particles.length;
      for (let i = 0; i < len; i++) {
        for (let j = i + 1; j < len; j++) {
          this.particles[i].resolveCollision(this.particles[j], particleRestitution);
        }
      }
    }
  }

  private emitParticle(canvasWidth: number, canvasHeight: number): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = this.config.initialSpeed * (0.7 + Math.random() * 0.6);
    const x = this.emitX || canvasWidth / 2;
    const y = this.emitY || canvasHeight / 2;

    const particle = new Particle({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: this.config.lifetime,
      maxLife: this.config.lifetime,
      size: this.config.particleSize,
      maxSize: this.config.particleSize,
      startColor: this.config.startColor,
      endColor: this.config.endColor
    });

    particle.setScene(this.config.sceneType);
    this.particles.push(particle);
  }

  public clear(): void {
    this.particles = [];
  }
}
