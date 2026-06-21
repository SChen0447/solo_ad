import * as THREE from 'three';
import { eventBus, EVENTS, ColorTheme, THEME_COLORS } from '@/utils/EventBus';

export class ParticleEngine {
  private count: number;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points!: THREE.Points;

  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private targetColors: Float32Array;
  private startColors: Float32Array;
  private sizes: Float32Array;

  private gravity: number = 1.5;
  private damping: number = 0.995;
  private currentTheme: ColorTheme = 'aurora';
  private colorTransitionProgress: number = 1;
  private colorTransitionDuration: number = 1.5;
  private isTransitioning: boolean = false;
  private transitionTimer: number = 0;
  private colorAnimationId: number = 0;
  private colorLastTime: number = 0;

  private readonly SPHERE_RADIUS = 100;
  private readonly PERTURBATION = 0.01;

  constructor(initialCount: number = 8000) {
    this.count = initialCount;
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count * 3);
    this.colors = new Float32Array(this.count * 3);
    this.targetColors = new Float32Array(this.count * 3);
    this.startColors = new Float32Array(this.count * 3);
    this.sizes = new Float32Array(this.count);

    this.generateParticles();
    this.setupEventListeners();
    this.createPoints();
    this.startColorTransitionLoop();
  }

  private setupEventListeners(): void {
    eventBus.on(EVENTS.DENSITY_CHANGED, (density: number) => {
      this.setDensity(density);
    });

    eventBus.on(EVENTS.GRAVITY_CHANGED, (gravity: number) => {
      this.gravity = gravity;
      this.updateGlowIntensity();
    });

    eventBus.on(EVENTS.DAMPING_CHANGED, (damping: number) => {
      this.damping = damping;
    });

    eventBus.on(EVENTS.THEME_CHANGED, (theme: ColorTheme) => {
      this.setTheme(theme);
    });
  }

  private generateParticles(): void {
    const themeColors = THEME_COLORS[this.currentTheme].map(hex => new THREE.Color(hex));

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      const radius = Math.random() * this.SPHERE_RADIUS;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      this.positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      this.positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      this.positions[i3 + 2] = radius * Math.cos(phi);

      const speed = 0.05 + Math.random() * 0.1;
      const vTheta = theta + Math.PI / 2;
      const vPhi = phi + (Math.random() - 0.5) * 0.5;

      this.velocities[i3] = speed * Math.sin(vPhi) * Math.cos(vTheta);
      this.velocities[i3 + 1] = speed * Math.cos(vPhi);
      this.velocities[i3 + 2] = speed * Math.sin(vPhi) * Math.sin(vTheta);

      const color = themeColors[Math.floor(Math.random() * themeColors.length)];
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;

      this.targetColors[i3] = color.r;
      this.targetColors[i3 + 1] = color.g;
      this.targetColors[i3 + 2] = color.b;

      this.startColors[i3] = color.r;
      this.startColors[i3 + 1] = color.g;
      this.startColors[i3 + 2] = color.b;

      this.sizes[i] = 2 + Math.random() * 2;
    }
  }

  private createPoints(): void {
    const posAttr = new THREE.BufferAttribute(this.positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', posAttr);

    const colorAttr = new THREE.BufferAttribute(this.colors, 3);
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('color', colorAttr);

    const sizeAttr = new THREE.BufferAttribute(this.sizes, 1);
    sizeAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('size', sizeAttr);

    this.points = new THREE.Points(this.geometry, this.material);
  }

  setDensity(newCount: number): void {
    if (newCount === this.count) return;

    const oldPosAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute | null;
    const oldColorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute | null;
    const oldSizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute | null;

    this.count = newCount;

    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count * 3);
    this.colors = new Float32Array(this.count * 3);
    this.targetColors = new Float32Array(this.count * 3);
    this.startColors = new Float32Array(this.count * 3);
    this.sizes = new Float32Array(this.count);

    this.generateParticles();

    if (oldPosAttr) {
      oldPosAttr.array = this.positions;
      oldPosAttr.count = this.count;
      oldPosAttr.needsUpdate = true;
    } else {
      const posAttr = new THREE.BufferAttribute(this.positions, 3);
      posAttr.setUsage(THREE.DynamicDrawUsage);
      this.geometry.setAttribute('position', posAttr);
    }

    if (oldColorAttr) {
      oldColorAttr.array = this.colors;
      oldColorAttr.count = this.count;
      oldColorAttr.needsUpdate = true;
    } else {
      const colorAttr = new THREE.BufferAttribute(this.colors, 3);
      colorAttr.setUsage(THREE.DynamicDrawUsage);
      this.geometry.setAttribute('color', colorAttr);
    }

    if (oldSizeAttr) {
      oldSizeAttr.array = this.sizes;
      oldSizeAttr.count = this.count;
      oldSizeAttr.needsUpdate = true;
    } else {
      const sizeAttr = new THREE.BufferAttribute(this.sizes, 1);
      sizeAttr.setUsage(THREE.DynamicDrawUsage);
      this.geometry.setAttribute('size', sizeAttr);
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  setTheme(theme: ColorTheme): void {
    if (theme === this.currentTheme) return;

    this.currentTheme = theme;
    const themeColors = THEME_COLORS[theme].map(hex => new THREE.Color(hex));

    this.startColors.set(this.colors);

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const color = themeColors[Math.floor(Math.random() * themeColors.length)];
      this.targetColors[i3] = color.r;
      this.targetColors[i3 + 1] = color.g;
      this.targetColors[i3 + 2] = color.b;
    }

    this.isTransitioning = true;
    this.transitionTimer = 0;
    this.colorTransitionProgress = 0;
    this.colorLastTime = performance.now();
  }

  private startColorTransitionLoop(): void {
    const animate = () => {
      this.colorAnimationId = requestAnimationFrame(animate);

      if (!this.isTransitioning) return;

      const now = performance.now();
      const dt = (now - this.colorLastTime) / 1000;
      this.colorLastTime = now;

      this.transitionTimer += dt;
      this.colorTransitionProgress = Math.min(1, this.transitionTimer / this.colorTransitionDuration);
      const t = this.easeInOutCubic(this.colorTransitionProgress);

      for (let i = 0; i < this.count; i++) {
        const i3 = i * 3;
        this.colors[i3] = this.startColors[i3] + (this.targetColors[i3] - this.startColors[i3]) * t;
        this.colors[i3 + 1] = this.startColors[i3 + 1] + (this.targetColors[i3 + 1] - this.startColors[i3 + 1]) * t;
        this.colors[i3 + 2] = this.startColors[i3 + 2] + (this.targetColors[i3 + 2] - this.startColors[i3 + 2]) * t;
      }

      const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
      if (colorAttr) {
        colorAttr.needsUpdate = true;
      }

      if (this.colorTransitionProgress >= 1) {
        this.isTransitioning = false;
      }
    };

    this.colorAnimationId = requestAnimationFrame(animate);
  }

  private updateGlowIntensity(): void {
    if (this.gravity > 2) {
      this.material.opacity = Math.min(1, 0.9 + 0.1 * (this.gravity - 2) / 3);
    } else {
      this.material.opacity = 0.9;
    }
    this.material.needsUpdate = true;
  }

  update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.05);
    const gravityScale = this.gravity * 0.001;
    const spiralFactor = this.gravity > 2 ? (this.gravity - 2) * 0.05 : 0;
    const dt60 = dt * 60;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      const x = this.positions[i3];
      const y = this.positions[i3 + 1];
      const z = this.positions[i3 + 2];

      const distSq = x * x + y * y + z * z;
      const dist = Math.sqrt(distSq) + 0.001;

      const nx = x / dist;
      const ny = y / dist;
      const nz = z / dist;

      const force = gravityScale / Math.max(dist * 0.01, 0.1);

      this.velocities[i3] -= nx * force;
      this.velocities[i3 + 1] -= ny * force;
      this.velocities[i3 + 2] -= nz * force;

      if (spiralFactor > 0 && dist > 3) {
        const tx = -ny;
        const ty = (nx * nz) / (Math.sqrt(nx * nx + nz * nz) + 0.001);
        const tz = nx;

        const tangentialSpeed = spiralFactor * (1 + 1 / Math.max(dist * 0.02, 0.5));

        this.velocities[i3] += tx * tangentialSpeed * dt60;
        this.velocities[i3 + 1] += ty * tangentialSpeed * dt60 * 0.4;
        this.velocities[i3 + 2] += tz * tangentialSpeed * dt60;

        const upX = nz;
        const upZ = -nx;
        this.velocities[i3] += upX * tangentialSpeed * 0.15 * dt60;
        this.velocities[i3 + 2] += upZ * tangentialSpeed * 0.15 * dt60;
      }

      this.velocities[i3] += (Math.random() - 0.5) * this.PERTURBATION;
      this.velocities[i3 + 1] += (Math.random() - 0.5) * this.PERTURBATION;
      this.velocities[i3 + 2] += (Math.random() - 0.5) * this.PERTURBATION;

      const damp = Math.pow(this.damping, dt60);
      this.velocities[i3] *= damp;
      this.velocities[i3 + 1] *= damp;
      this.velocities[i3 + 2] *= damp;

      this.positions[i3] += this.velocities[i3] * dt60;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt60;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt60;

      if (dist > this.SPHERE_RADIUS * 3 && this.gravity < 1) {
        const resetRadius = Math.random() * this.SPHERE_RADIUS;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        this.positions[i3] = resetRadius * Math.sin(phi) * Math.cos(theta);
        this.positions[i3 + 1] = resetRadius * Math.sin(phi) * Math.sin(theta);
        this.positions[i3 + 2] = resetRadius * Math.cos(phi);

        const speed = 0.05 + Math.random() * 0.1;
        this.velocities[i3] = speed * (Math.random() - 0.5);
        this.velocities[i3 + 1] = speed * (Math.random() - 0.5);
        this.velocities[i3 + 2] = speed * (Math.random() - 0.5);
      }
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  getPoints(): THREE.Points {
    return this.points;
  }

  getGlowSpriteTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  getGravity(): number {
    return this.gravity;
  }

  dispose(): void {
    if (this.colorAnimationId) {
      cancelAnimationFrame(this.colorAnimationId);
    }

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute | undefined;

    if (posAttr) posAttr.dispose();
    if (colorAttr) colorAttr.dispose();
    if (sizeAttr) sizeAttr.dispose();

    this.geometry.dispose();
    this.material.dispose();
  }
}
