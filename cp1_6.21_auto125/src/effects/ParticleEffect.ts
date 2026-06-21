import Phaser from 'phaser';
import { PlanetData } from '../physics/GravityManager';

export class ParticleEffect {
  private scene: Phaser.Scene;
  private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private emitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private maxParticles: number = 30;
  private activeParticleCount: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createParticleTexture();
  }

  private createParticleTexture(): void {
    const size = 8;
    const gfx = this.scene.make.graphics({});
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(size / 2, size / 2, size / 2);
    gfx.generateTexture('shockwave_particle', size, size);
    gfx.destroy();
  }

  public spawnShockwave(x: number, y: number, planet: PlanetData): void {
    if (this.activeParticleCount >= this.maxParticles) {
      if (this.emitter) {
        this.emitter.killAll();
      }
      this.activeParticleCount = 0;
    }

    const gravityFactor = planet.gravity;
    const count = Math.min(planet.particleCount, this.maxParticles - this.activeParticleCount);
    const speed = 80 + (1 - gravityFactor) * 200;
    const lifespan = 500 + (1 - gravityFactor) * 800;
    const scale = 0.5 + (1 - gravityFactor) * 1.5;
    const alpha = 0.6 + gravityFactor * 0.4;

    const particles = this.scene.add.particles(0, 0, 'shockwave_particle');
    particles.setDepth(100);

    this.emitter = particles.createEmitter({
      x: x,
      y: y,
      speed: { min: speed * 0.4, max: speed },
      angle: { min: 0, max: 360 },
      lifespan: { min: lifespan * 0.6, max: lifespan },
      scale: { start: scale, end: 0 },
      alpha: { start: alpha, end: 0 },
      quantity: count,
      gravityY: 0,
      gravityX: 0,
      blendMode: Phaser.BlendModes.ADD,
      tint: [planet.accentColor, planet.groundColor, 0xffffff],
      on: false
    });

    this.emitter.explode(count, x, y);
    this.activeParticleCount += count;

    this.scene.time.delayedCall(lifespan + 100, () => {
      this.activeParticleCount = Math.max(0, this.activeParticleCount - count);
      particles.destroy();
    });
  }

  public spawnSpringBounce(x: number, y: number, color: number = 0xffdd00): void {
    const count = Math.min(8, this.maxParticles - this.activeParticleCount);
    if (count <= 0) return;

    const particles = this.scene.add.particles(0, 0, 'shockwave_particle');
    particles.setDepth(100);

    const emitter = particles.createEmitter({
      x: x,
      y: y,
      speed: { min: 60, max: 150 },
      angle: { min: 200, max: 340 },
      lifespan: { min: 300, max: 500 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.9, end: 0 },
      quantity: count,
      gravityY: 200,
      tint: [color, 0xffff88],
      on: false
    });

    emitter.explode(count, x, y);
    this.activeParticleCount += count;

    this.scene.time.delayedCall(600, () => {
      this.activeParticleCount = Math.max(0, this.activeParticleCount - count);
      particles.destroy();
    });
  }

  public destroy(): void {
    if (this.particles) {
      this.particles.destroy();
      this.particles = null;
    }
    this.emitter = null;
  }

  public getActiveCount(): number {
    return this.activeParticleCount;
  }
}
