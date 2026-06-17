import chroma from 'chroma-js';
import type { ArtworkAnalysis, ColorWithWeight } from './artAnalyzer';

export interface ParticleAnimationConfig {
  colors: string[];
  particleCount: number;
  composition: ArtworkAnalysis['composition'];
  flowField: number[][] | null;
  edgeImageData: ImageData | null;
  colorsWithWeight?: ColorWithWeight[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseColor: string;
  currentColor: string;
  size: number;
  shape: 'circle' | 'line';
  angle: number;
  life: number;
  maxLife: number;
  noiseOffsetX: number;
  noiseOffsetY: number;
  mass: number;
  targetColor: string | null;
  colorTransitionStart: number;
  colorTransitionDuration: number;
}

class PerlinNoise {
  private permutation: number[];

  constructor(seed: number = Math.random() * 10000) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    let n = seed;
    for (let i = 255; i > 0; i--) {
      n = (n * 16807) % 2147483647;
      const j = n % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    return [...p, ...p];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.permutation[X] + Y;
    const B = this.permutation[X + 1] + Y;
    return this.lerp(
      this.lerp(this.grad(this.permutation[A], x, y), this.grad(this.permutation[B], x - 1, y), u),
      this.lerp(this.grad(this.permutation[A + 1], x, y - 1), this.grad(this.permutation[B + 1], x - 1, y - 1), u),
      v
    );
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export class ParticleAnimation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: ParticleAnimationConfig;
  private particles: Particle[] = [];
  private animationId: number | null = null;
  private isRunning = false;

  private noiseX: PerlinNoise;
  private noiseY: PerlinNoise;

  private mouseX = 0;
  private mouseY = 0;
  private isMouseOver = false;
  private mouseRadius = 150;
  private mouseRepelStrength = 25;
  private mouseVelocityDecay = 0.92;

  private scale = 1;
  private minScale = 0.5;
  private maxScale = 2;

  private pulseActive = false;
  private pulseProgress = 0;
  private pulseDuration = 2000;

  private haloRotation = 0;
  private haloRotationSpeed = (Math.PI * 2) / 60 / 60;

  private time = 0;
  private lastFrameTime = 0;
  private fps = 60;
  private frameCount = 0;
  private fpsUpdateTime = 0;

  private width = 0;
  private height = 0;

  private onFpsUpdate?: (fps: number) => void;

  constructor(canvas: HTMLCanvasElement, config: ParticleAnimationConfig, onFpsUpdate?: (fps: number) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    this.ctx = ctx;
    this.config = config;
    this.onFpsUpdate = onFpsUpdate;

    this.noiseX = new PerlinNoise(Date.now());
    this.noiseY = new PerlinNoise(Date.now() + 1000);

    this.resize();
    this.initParticles();
  }

  private resize(): void {
    const container = this.canvas.parentElement;
    if (container) {
      this.width = container.clientWidth;
      this.height = container.clientHeight;
    } else {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
    }

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
  }

  private initParticles(): void {
    this.particles = [];
    const { particleCount, colors, composition, colorsWithWeight } = this.config as ParticleAnimationConfig & { colorsWithWeight?: { color: string; weight: number }[] };
    const lineRatio = Math.min(0.7, composition.lineDensity * 0.5 + 0.2);

    const weights = (colorsWithWeight && colorsWithWeight.length > 0)
      ? colorsWithWeight.map(c => c.weight)
      : colors.map(() => 1 / colors.length);

    for (let i = 0; i < particleCount; i++) {
      let colorIndex = 0;
      const r = Math.random();
      let cumulative = 0;
      for (let j = 0; j < weights.length; j++) {
        cumulative += weights[j];
        if (r <= cumulative) {
          colorIndex = j;
          break;
        }
      }

      const isLine = Math.random() < lineRatio;

      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: 0,
        vy: 0,
        baseColor: colors[colorIndex],
        currentColor: colors[colorIndex],
        size: isLine ? Math.random() * 15 + 5 : Math.random() * 3 + 1,
        shape: isLine ? 'line' : 'circle',
        angle: Math.random() * Math.PI * 2,
        life: Math.random() * 100,
        maxLife: 200 + Math.random() * 300,
        noiseOffsetX: Math.random() * 1000,
        noiseOffsetY: Math.random() * 1000,
        mass: 0.5 + Math.random() * 1.5,
        targetColor: null,
        colorTransitionStart: 0,
        colorTransitionDuration: 0,
      });
    }
  }

  private getComplementaryColorHSL(hex: string): string {
    const color = chroma(hex);
    const hsl = color.hsl();
    const h = (hsl[0] + 180) % 360;
    const s = hsl[1];
    const l = hsl[2];
    return chroma.hsl(h, s, l).hex();
  }

  private sampleFlowField(px: number, py: number): number | null {
    const { flowField } = this.config;
    if (!flowField || flowField.length === 0) return null;

    const fh = flowField.length;
    const fw = flowField[0].length;
    const nx = Math.floor((px / this.width) * fw);
    const ny = Math.floor((py / this.height) * fh);

    if (ny < 0 || ny >= fh || nx < 0 || nx >= fw) return null;
    return flowField[ny][nx];
  }

  private updateParticle(particle: Particle, deltaTime: number): void {
    const noiseScale = 0.0025;
    const timeScale = this.time * 0.0005;

    const noiseX = this.noiseX.noise2D(
      particle.x * noiseScale + particle.noiseOffsetX + timeScale,
      particle.y * noiseScale + particle.noiseOffsetY
    );
    const noiseY = this.noiseY.noise2D(
      particle.x * noiseScale + particle.noiseOffsetX,
      particle.y * noiseScale + particle.noiseOffsetY + timeScale
    );

    const dirAngle = this.config.composition.dominantDirection * (Math.PI / 180);
    const baseSpeed = 0.5 + this.config.composition.lineDensity * 1.5;

    let flowX = Math.cos(dirAngle) * baseSpeed * 0.3 + noiseX * 1.5;
    let flowY = Math.sin(dirAngle) * baseSpeed * 0.3 + noiseY * 1.5;

    const flowAngle = this.sampleFlowField(particle.x, particle.y);
    if (flowAngle !== null) {
      const lineInfluence = this.config.composition.lineDensity * 0.6;
      flowX = flowX * (1 - lineInfluence) + Math.cos(flowAngle) * baseSpeed * lineInfluence;
      flowY = flowY * (1 - lineInfluence) + Math.sin(flowAngle) * baseSpeed * lineInfluence;
    }

    particle.vx += flowX * 0.1;
    particle.vy += flowY * 0.1;

    if (this.isMouseOver) {
      const dx = particle.x - this.mouseX;
      const dy = particle.y - this.mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.mouseRadius && dist > 0.1) {
        const normalizedDist = dist / this.mouseRadius;
        const forceCurve = easeOutQuad(1 - normalizedDist);
        const force = (forceCurve * this.mouseRepelStrength) / particle.mass;
        particle.vx += (dx / dist) * force;
        particle.vy += (dy / dist) * force;
      }
    }

    particle.vx *= this.mouseVelocityDecay;
    particle.vy *= this.mouseVelocityDecay;

    const speedLimit = 12;
    const currentSpeed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
    if (currentSpeed > speedLimit) {
      particle.vx = (particle.vx / currentSpeed) * speedLimit;
      particle.vy = (particle.vy / currentSpeed) * speedLimit;
    }

    particle.x += particle.vx * this.scale * deltaTime * 0.06;
    particle.y += particle.vy * this.scale * deltaTime * 0.06;
    particle.angle = Math.atan2(particle.vy, particle.vx);

    if (particle.x < -50) particle.x = this.width + 50;
    if (particle.x > this.width + 50) particle.x = -50;
    if (particle.y < -50) particle.y = this.height + 50;
    if (particle.y > this.height + 50) particle.y = -50;

    if (particle.targetColor !== null && particle.colorTransitionDuration > 0) {
      const elapsed = this.time - particle.colorTransitionStart;
      const rawT = Math.min(1, elapsed / particle.colorTransitionDuration);
      const t = easeOutCubic(rawT);
      particle.currentColor = chroma.mix(particle.baseColor, particle.targetColor, t).hex();
      if (rawT >= 1) {
        particle.baseColor = particle.targetColor;
        particle.targetColor = null;
      }
    } else if (!this.pulseActive) {
      particle.currentColor = particle.baseColor;
    }

    if (this.pulseActive) {
      const rawT = this.pulseProgress / this.pulseDuration;
      const t = easeOutCubic(Math.sin(rawT * Math.PI));
      const complementary = this.getComplementaryColorHSL(particle.baseColor);
      particle.currentColor = chroma.mix(particle.baseColor, complementary, t).hex();
    }

    particle.life++;
    if (particle.life > particle.maxLife) {
      particle.x = Math.random() * this.width;
      particle.y = Math.random() * this.height;
      particle.vx = 0;
      particle.vy = 0;
      particle.life = 0;
    }
  }

  private drawParticle(particle: Particle): void {
    const alpha = 0.55 + 0.45 * Math.sin(particle.life / particle.maxLife * Math.PI);
    const color = chroma(particle.currentColor).alpha(alpha).css();

    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = particle.shape === 'line' ? 1.5 : 1;

    if (particle.shape === 'circle') {
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.save();
      this.ctx.translate(particle.x, particle.y);
      this.ctx.rotate(particle.angle);
      this.ctx.beginPath();
      this.ctx.moveTo(-particle.size / 2, 0);
      this.ctx.lineTo(particle.size / 2, 0);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private drawHalo(): void {
    const { colors } = this.config;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const radius = Math.max(this.width, this.height) * 0.75;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(this.haloRotation);

    for (let i = Math.min(colors.length - 1, 5); i >= 0; i--) {
      const color = chroma(colors[i]).alpha(0.07).css();
      const gradRadius = radius * (1 - i * 0.12);
      const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, gradRadius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'transparent');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, gradRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private render(currentTime: number): void {
    if (!this.isRunning) return;

    const deltaTime = Math.min(currentTime - this.lastFrameTime, 50);
    this.lastFrameTime = currentTime;
    this.time += deltaTime;

    this.frameCount++;
    if (this.time - this.fpsUpdateTime >= 1000) {
      this.fps = Math.round(this.frameCount * 1000 / (this.time - this.fpsUpdateTime));
      this.frameCount = 0;
      this.fpsUpdateTime = this.time;
      if (this.onFpsUpdate) this.onFpsUpdate(this.fps);
    }

    if (this.pulseActive) {
      this.pulseProgress += deltaTime;
      if (this.pulseProgress >= this.pulseDuration) {
        this.pulseActive = false;
        this.pulseProgress = 0;
      }
    }

    this.haloRotation += this.haloRotationSpeed * deltaTime;

    this.ctx.fillStyle = 'rgba(26, 26, 46, 0.14)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.drawHalo();

    for (const particle of this.particles) {
      this.updateParticle(particle, deltaTime);
      this.drawParticle(particle);
    }

    if (this.isMouseOver) {
      const gradient = this.ctx.createRadialGradient(
        this.mouseX, this.mouseY, 0,
        this.mouseX, this.mouseY, this.mouseRadius
      );
      gradient.addColorStop(0, 'rgba(233, 69, 96, 0.08)');
      gradient.addColorStop(1, 'transparent');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(this.mouseX, this.mouseY, this.mouseRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.animationId = requestAnimationFrame((t) => this.render(t));
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = this.time;
    this.animationId = requestAnimationFrame((t) => this.render(t));
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  updateConfig(config: Partial<ParticleAnimationConfig>): void {
    const prevColors = this.config.colors;
    this.config = { ...this.config, ...config };

    const newColors = config.colors;
    if (newColors && newColors.length > 0 && prevColors !== newColors) {
      const cww = this.config.colorsWithWeight;
      const weights = (cww && cww.length > 0)
        ? cww.map(c => c.weight)
        : newColors.map(() => 1 / newColors.length);

      for (const particle of this.particles) {
        let colorIndex = 0;
        const r = Math.random();
        let cumulative = 0;
        for (let j = 0; j < weights.length; j++) {
          cumulative += weights[j];
          if (r <= cumulative) {
            colorIndex = j;
            break;
          }
        }
        particle.targetColor = newColors[colorIndex];
        particle.colorTransitionStart = this.time;
        particle.colorTransitionDuration = 800;
      }
    }

    if (config.particleCount && config.particleCount !== this.particles.length) {
      this.initParticles();
    }
  }

  handleMouseMove(x: number, y: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = x - rect.left;
    this.mouseY = y - rect.top;
    this.isMouseOver = true;
  }

  handleMouseLeave(): void {
    this.isMouseOver = false;
  }

  handleWheel(delta: number): void {
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale - delta * 0.001));
  }

  handleClick(_x: number, _y: number): void {
    if (!this.pulseActive) {
      this.pulseActive = true;
      this.pulseProgress = 0;
    }
  }

  handleResize(): void {
    this.resize();
  }

  getFps(): number {
    return this.fps;
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}
