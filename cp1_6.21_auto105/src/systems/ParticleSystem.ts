import Phaser from 'phaser';

export enum ParticleType {
  MechanismActivate = 'mechanism_activate',
  BlockCollision = 'block_collision',
  PressureGlow = 'pressure_glow',
  Dust = 'dust',
}

interface ParticleData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  alpha: number;
  type: ParticleType;
}

export class ParticleSystem {
  private scene: Phaser.Scene;
  private particles: ParticleData[] = [];
  private graphics: Phaser.GameObjects.Graphics;
  private maxParticles: number = 100;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(100);

    this.scene.events.on('update', this.update, this);
  }

  emit(type: ParticleType, x: number, y: number, count: number = 10): void {
    const available = this.maxParticles - this.particles.length;
    const toEmit = Math.min(count, available);

    for (let i = 0; i < toEmit; i++) {
      const config = this.getParticleConfig(type);
      const angle = Math.random() * Math.PI * 2;
      const speed = config.speed * (0.5 + Math.random() * 0.5);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: config.life,
        maxLife: config.life,
        color: config.color,
        size: config.size * (0.5 + Math.random() * 0.5),
        alpha: 1,
        type,
      });
    }
  }

  emitRing(type: ParticleType, x: number, y: number, radius: number = 40, count: number = 20): void {
    const available = this.maxParticles - this.particles.length;
    const toEmit = Math.min(count, available);
    const config = this.getParticleConfig(type);

    for (let i = 0; i < toEmit; i++) {
      const angle = (i / toEmit) * Math.PI * 2;
      const px = x + Math.cos(angle) * radius * 0.3;
      const py = y + Math.sin(angle) * radius * 0.3;

      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * config.speed,
        vy: Math.sin(angle) * config.speed,
        life: config.life,
        maxLife: config.life,
        color: config.color,
        size: config.size * (0.5 + Math.random() * 0.5),
        alpha: 1,
        type,
      });
    }
  }

  private getParticleConfig(type: ParticleType): {
    color: number;
    speed: number;
    life: number;
    size: number;
  } {
    switch (type) {
      case ParticleType.MechanismActivate:
        return {
          color: 0xffd700,
          speed: 60,
          life: 400,
          size: 5,
        };
      case ParticleType.BlockCollision:
        return {
          color: 0xffffff,
          speed: 80,
          life: 200,
          size: 3,
        };
      case ParticleType.PressureGlow:
        return {
          color: 0xffdd44,
          speed: 30,
          life: 400,
          size: 6,
        };
      case ParticleType.Dust:
        return {
          color: 0x8b7355,
          speed: 20,
          life: 600,
          size: 4,
        };
      default:
        return {
          color: 0xffffff,
          speed: 40,
          life: 300,
          size: 3,
        };
    }
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;

    this.graphics.clear();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 20 * dt;
      p.vx *= 0.98;

      p.alpha = Math.max(0, p.life / p.maxLife);
      const progress = 1 - p.life / p.maxLife;
      const currentSize = p.size * (1 - progress * 0.5);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const colorObj = Phaser.Display.Color.IntegerToColor(p.color);
      this.graphics.fillStyle(
        Phaser.Display.Color.GetColor(
          colorObj.red,
          colorObj.green,
          colorObj.blue
        ),
        p.alpha
      );
      this.graphics.fillCircle(p.x, p.y, currentSize);
    }
  }

  clear(): void {
    this.particles = [];
    this.graphics.clear();
  }

  destroy(): void {
    this.particles = [];
    this.graphics.destroy();
    this.scene.events.off('update', this.update, this);
  }
}
