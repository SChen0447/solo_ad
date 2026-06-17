import { Particle, EffectType, ParticleConfig } from './particle';

export interface EmitterConfig {
  maxParticles: number;
  particleSize: number;
  emissionRate: number;
  trailLength: number;
  windStrength: number;
  windDirection: number;
}

const EFFECT_NAMES: Record<EffectType, string> = {
  fire: '火焰特效',
  ice: '冰霜特效',
  lightning: '闪电特效',
  heal: '治愈特效'
};

export class Emitter {
  particles: Particle[];
  maxParticles: number;
  particleSize: number;
  emissionRate: number;
  trailLength: number;
  windStrength: number;
  windDirection: number;
  currentEffect: EffectType;
  activeEffects: Set<EffectType>;
  mouseX: number;
  mouseY: number;
  isMouseDown: boolean;
  private emissionAccumulator: number;
  private poolIndex: number;

  constructor(config: EmitterConfig) {
    this.maxParticles = config.maxParticles;
    this.particleSize = config.particleSize;
    this.emissionRate = config.emissionRate;
    this.trailLength = config.trailLength;
    this.windStrength = config.windStrength;
    this.windDirection = config.windDirection;
    this.currentEffect = 'fire';
    this.activeEffects = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.isMouseDown = false;
    this.emissionAccumulator = 0;
    this.poolIndex = 0;
    this.particles = [];
  }

  setConfig(config: Partial<EmitterConfig>): void {
    if (config.maxParticles !== undefined) {
      this.maxParticles = config.maxParticles;
      if (this.particles.length > this.maxParticles) {
        this.particles.length = this.maxParticles;
      }
    }
    if (config.particleSize !== undefined) this.particleSize = config.particleSize;
    if (config.emissionRate !== undefined) this.emissionRate = config.emissionRate;
    if (config.trailLength !== undefined) {
      this.trailLength = config.trailLength;
      for (const p of this.particles) {
        p.trailLength = config.trailLength;
      }
    }
    if (config.windStrength !== undefined) this.windStrength = config.windStrength;
    if (config.windDirection !== undefined) this.windDirection = config.windDirection;
  }

  activateEffect(effect: EffectType): void {
    this.activeEffects.add(effect);
    this.currentEffect = effect;
  }

  deactivateEffect(effect: EffectType): void {
    this.activeEffects.delete(effect);
    if (this.activeEffects.size > 0) {
      this.currentEffect = Array.from(this.activeEffects)[this.activeEffects.size - 1];
    }
  }

  setActiveEffect(effect: EffectType): void {
    this.currentEffect = effect;
  }

  getWindVector(): { x: number; y: number } {
    const rad = (this.windDirection * Math.PI) / 180;
    return {
      x: Math.cos(rad) * this.windStrength,
      y: Math.sin(rad) * this.windStrength
    };
  }

  spawnParticle(effect: EffectType, x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) {
      this.poolIndex = (this.poolIndex + 1) % this.particles.length;
      this.particles[this.poolIndex] = this.createParticle(effect, x, y);
      return;
    }
    this.particles.push(this.createParticle(effect, x, y));
  }

  private createParticle(effect: EffectType, x: number, y: number): Particle {
    const size = this.particleSize * (0.6 + Math.random() * 0.8);
    const config: ParticleConfig = {
      effectType: effect,
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      size,
      life: 1000,
      velocityX: 0,
      velocityY: 0,
      accelerationX: 0,
      accelerationY: 0
    };

    switch (effect) {
      case 'fire':
        config.life = 800 + Math.random() * 600;
        config.velocityX = (Math.random() - 0.5) * 2;
        config.velocityY = -(2 + Math.random() * 4);
        config.accelerationY = -0.3;
        break;
      case 'ice':
        config.life = 1200 + Math.random() * 800;
        const iceAngle = Math.random() * Math.PI * 2;
        const iceSpeed = 1 + Math.random() * 2.5;
        config.velocityX = Math.cos(iceAngle) * iceSpeed;
        config.velocityY = Math.sin(iceAngle) * iceSpeed;
        config.accelerationX = -Math.cos(iceAngle) * 0.05;
        config.accelerationY = -Math.sin(iceAngle) * 0.05 + 0.05;
        break;
      case 'lightning':
        config.life = 200 + Math.random() * 300;
        const angle = (Math.random() - 0.5) * Math.PI * 0.5 - Math.PI / 2;
        const speed = 6 + Math.random() * 8;
        config.velocityX = Math.sin(angle) * speed;
        config.velocityY = Math.cos(angle) * -speed;
        break;
      case 'heal':
        config.life = 1400 + Math.random() * 800;
        config.velocityX = (Math.random() - 0.5) * 1.2;
        config.velocityY = -(1.5 + Math.random() * 2.5);
        config.accelerationY = -0.08;
        break;
    }

    return new Particle(config, this.trailLength);
  }

  update(dt: number): void {
    const wind = this.getWindVector();
    const activeEffects = this.activeEffects.size > 0 ? Array.from(this.activeEffects) : [this.currentEffect];

    this.emissionAccumulator += this.emissionRate * dt * 0.001;
    while (this.emissionAccumulator >= 1) {
      this.emissionAccumulator -= 1;
      if (this.isMouseDown) {
        const effect = activeEffects[Math.floor(Math.random() * activeEffects.length)];
        this.spawnParticle(effect, this.mouseX, this.mouseY);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt, wind.x, wind.y);
      if (!p.alive) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      p.draw(ctx);
    }
  }

  getActiveCount(): number {
    return this.particles.length;
  }

  getActiveEffectName(): string {
    return EFFECT_NAMES[this.currentEffect];
  }

  static getEffectName(effect: EffectType): string {
    return EFFECT_NAMES[effect];
  }

  static getAllEffects(): EffectType[] {
    return ['fire', 'ice', 'lightning', 'heal'];
  }
}
