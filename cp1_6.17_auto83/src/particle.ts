export type EffectType = 'fire' | 'ice' | 'lightning' | 'heal';

export interface ParticleConfig {
  effectType: EffectType;
  x: number;
  y: number;
  size: number;
  life: number;
  velocityX: number;
  velocityY: number;
  accelerationX: number;
  accelerationY: number;
}

interface ColorStop {
  t: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

const EFFECT_COLORS: Record<EffectType, ColorStop[]> = {
  fire: [
    { t: 0, r: 255, g: 255, b: 200, a: 1 },
    { t: 0.25, r: 255, g: 180, b: 60, a: 0.95 },
    { t: 0.5, r: 255, g: 100, b: 20, a: 0.8 },
    { t: 0.75, r: 200, g: 40, b: 10, a: 0.5 },
    { t: 1, r: 100, g: 20, b: 0, a: 0 }
  ],
  ice: [
    { t: 0, r: 255, g: 255, b: 255, a: 1 },
    { t: 0.3, r: 200, g: 240, b: 255, a: 0.9 },
    { t: 0.6, r: 120, g: 200, b: 255, a: 0.7 },
    { t: 1, r: 60, g: 140, b: 220, a: 0 }
  ],
  lightning: [
    { t: 0, r: 255, g: 255, b: 255, a: 1 },
    { t: 0.3, r: 255, g: 255, b: 160, a: 0.95 },
    { t: 0.6, r: 255, g: 230, b: 80, a: 0.7 },
    { t: 1, r: 200, g: 180, b: 0, a: 0 }
  ],
  heal: [
    { t: 0, r: 200, g: 255, b: 180, a: 1 },
    { t: 0.4, r: 120, g: 230, b: 100, a: 0.9 },
    { t: 0.8, r: 60, g: 200, b: 60, a: 0.6 },
    { t: 1, r: 20, g: 150, b: 40, a: 0 }
  ]
};

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  life: number;
  maxLife: number;
  initialSize: number;
  effectType: EffectType;
  trail: Array<{ x: number; y: number }>;
  trailLength: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'circle' | 'hexagon' | 'spark';
  pulsePhase: number;
  alive: boolean;

  constructor(config: ParticleConfig, trailLength: number = 15) {
    this.x = config.x;
    this.y = config.y;
    this.vx = config.velocityX;
    this.vy = config.velocityY;
    this.ax = config.accelerationX;
    this.ay = config.accelerationY;
    this.life = config.life;
    this.maxLife = config.life;
    this.initialSize = config.size;
    this.effectType = config.effectType;
    this.trail = [];
    this.trailLength = trailLength;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.15;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.alive = true;

    switch (config.effectType) {
      case 'ice':
        this.shape = 'hexagon';
        this.rotationSpeed = (Math.random() - 0.5) * 0.08;
        break;
      case 'lightning':
        this.shape = 'spark';
        break;
      default:
        this.shape = 'circle';
    }
  }

  sampleColor(lifeRatio: number): [number, number, number, number] {
    const stops = EFFECT_COLORS[this.effectType];
    if (lifeRatio <= stops[0].t) {
      const s = stops[0];
      return [s.r, s.g, s.b, s.a];
    }
    if (lifeRatio >= stops[stops.length - 1].t) {
      const s = stops[stops.length - 1];
      return [s.r, s.g, s.b, s.a];
    }
    for (let i = 0; i < stops.length - 1; i++) {
      const s1 = stops[i];
      const s2 = stops[i + 1];
      if (lifeRatio >= s1.t && lifeRatio <= s2.t) {
        const range = s2.t - s1.t;
        const localT = (lifeRatio - s1.t) / range;
        return [
          s1.r + (s2.r - s1.r) * localT,
          s1.g + (s2.g - s1.g) * localT,
          s1.b + (s2.b - s1.b) * localT,
          s1.a + (s2.a - s1.a) * localT
        ];
      }
    }
    const s = stops[0];
    return [s.r, s.g, s.b, s.a];
  }

  update(dt: number, windX: number, windY: number): void {
    if (!this.alive) return;

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.trailLength) {
      this.trail.shift();
    }

    const lifeRatio = 1 - this.life / this.maxLife;

    let shrinkFactor = 1;
    switch (this.effectType) {
      case 'fire':
        shrinkFactor = 1 - lifeRatio * 0.7;
        break;
      case 'ice':
        shrinkFactor = 1 - lifeRatio * 0.2;
        this.rotation += this.rotationSpeed;
        break;
      case 'lightning':
        if (Math.random() < 0.4) {
          this.x += (Math.random() - 0.5) * 12;
          this.y += (Math.random() - 0.5) * 8;
        }
        break;
      case 'heal':
        this.pulsePhase += dt * 0.008;
        break;
    }

    this.vx += (this.ax + windX) * dt * 0.06;
    this.vy += (this.ay + windY) * dt * 0.06;

    this.vx *= 0.992;
    this.vy *= 0.992;

    this.x += this.vx * dt * 0.06;
    this.y += this.vy * dt * 0.06;

    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
    }
  }

  getCurrentSize(): number {
    const lifeRatio = 1 - this.life / this.maxLife;
    let size = this.initialSize;
    switch (this.effectType) {
      case 'fire':
        size = this.initialSize * (1 - lifeRatio * 0.75);
        break;
      case 'ice':
        size = this.initialSize * (1 - lifeRatio * 0.25);
        break;
      case 'lightning':
        size = this.initialSize * (1 - lifeRatio * 0.4);
        break;
      case 'heal':
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.25;
        size = this.initialSize * (1 - lifeRatio * 0.3) * pulse;
        break;
    }
    return Math.max(0.5, size);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    const lifeRatio = 1 - this.life / this.maxLife;

    if (this.trailLength > 0 && this.trail.length > 1) {
      for (let i = 0; i < this.trail.length - 1; i++) {
        const trailRatio = i / this.trail.length;
        const [r, g, b, a] = this.sampleColor(lifeRatio);
        const alpha = a * trailRatio * 0.5;
        const trailSize = this.getCurrentSize() * (0.2 + trailRatio * 0.7);

        ctx.beginPath();
        ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha})`;
        ctx.arc(this.trail[i].x, this.trail[i].y, trailSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const [r, g, b, a] = this.sampleColor(lifeRatio);
    const size = this.getCurrentSize();

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.effectType === 'ice') {
      ctx.rotate(this.rotation);
    }

    ctx.shadowColor = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${a})`;
    ctx.shadowBlur = size * 2;
    ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${a})`;

    switch (this.shape) {
      case 'hexagon':
        this.drawHexagon(ctx, size);
        break;
      case 'spark':
        this.drawSpark(ctx, size);
        break;
      default:
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
  }

  private drawHexagon(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * size;
      const py = Math.sin(angle) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawSpark(ctx: CanvasRenderingContext2D, size: number): void {
    const spikes = 4;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i / (spikes * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? size : size * 0.35;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  static getColorGradientStops(effectType: EffectType): string[] {
    return EFFECT_COLORS[effectType].map(
      s => `rgba(${s.r}, ${s.g}, ${s.b}, ${s.a})`
    );
  }
}
