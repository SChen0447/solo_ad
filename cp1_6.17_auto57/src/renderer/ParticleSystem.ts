import * as THREE from 'three';

export interface ParticleParams {
  count: number;
  intensity: number;
  sizeMin: number;
  sizeMax: number;
  bgColor: string;
  speed: number;
}

const TRAIL_LENGTH = 8;
const TRAIL_DURATION = 0.3;

export class ParticleSystem {
  private scene: THREE.Scene;
  private params: ParticleParams;
  private particles: THREE.Points | null = null;
  private positions: Float32Array | null = null;
  private colors: Float32Array | null = null;
  private sizes: Float32Array | null = null;
  private alphas: Float32Array | null = null;

  private velocities: Float32Array;
  private targetPositions: Float32Array;
  private baseSizes: Float32Array;
  private hueOffsets: Float32Array;

  private beatTime: number = -1;
  private beatIntensity: number = 0;
  private currentTime: number = 0;

  private trailPositions: Float32Array[] = [];
  private trailAlphas: number[] = [];

  constructor(scene: THREE.Scene, params: ParticleParams) {
    this.scene = scene;
    this.params = { ...params };

    this.velocities = new Float32Array(params.count * 3);
    this.targetPositions = new Float32Array(params.count * 3);
    this.baseSizes = new Float32Array(params.count);
    this.hueOffsets = new Float32Array(params.count);

    this.initTrails();
    this.initParticles();
  }

  private initTrails(): void {
    this.trailPositions = [];
    this.trailAlphas = [];
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      this.trailPositions.push(new Float32Array(this.params.count * 3));
      this.trailAlphas.push(0);
    }
  }

  private initParticles(): void {
    const count = this.params.count;

    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * 2 + 1;

      this.positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      this.positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.positions[i3 + 2] = r * Math.cos(phi);

      this.targetPositions[i3] = this.positions[i3];
      this.targetPositions[i3 + 1] = this.positions[i3 + 1];
      this.targetPositions[i3 + 2] = this.positions[i3 + 2];

      this.velocities[i3] = 0;
      this.velocities[i3 + 1] = 0;
      this.velocities[i3 + 2] = 0;

      this.baseSizes[i] = this.params.sizeMin + Math.random() * (this.params.sizeMax - this.params.sizeMin);
      this.sizes[i] = this.baseSizes[i];

      this.hueOffsets[i] = (Math.random() - 0.5) * 20;

      const hue = 220 + this.hueOffsets[i];
      const color = new THREE.Color().setHSL(hue / 360, 1, 0.6);
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;

      this.alphas[i] = 0.8;
    }

    this.copyPositionsToTrails();
    this.createPoints();
  }

  private copyPositionsToTrails(): void {
    if (!this.positions) return;
    for (let t = 0; t < TRAIL_LENGTH; t++) {
      this.trailPositions[t].set(this.positions);
    }
  }

  private createPoints(): void {
    if (!this.positions || !this.colors || !this.sizes || !this.alphas) return;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: this.createCircleTexture() },
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          gl_FragColor = vec4(vColor, vAlpha) * texColor;
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
    });

    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));

    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private createCircleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  triggerBeat(intensity: number): void {
    this.beatTime = this.currentTime;
    this.beatIntensity = intensity * this.params.intensity;

    if (!this.positions || !this.velocities) return;

    const count = this.params.count;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const x = this.positions[i3];
      const y = this.positions[i3 + 1];
      const z = this.positions[i3 + 2];

      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      const speed = (2 + Math.random() * 3) * this.beatIntensity;

      this.velocities[i3] = (x / len) * speed;
      this.velocities[i3 + 1] = (y / len) * speed;
      this.velocities[i3 + 2] = (z / len) * speed;
    }
  }

  update(deltaTime: number): void {
    this.currentTime += deltaTime * this.params.speed;

    if (!this.positions || !this.colors || !this.sizes || !this.alphas || !this.velocities) return;

    const count = this.params.count;
    const beatProgress = this.beatTime >= 0
      ? Math.min(1, (this.currentTime - this.beatTime) / 0.5)
      : 1;

    const beatEase = 1 - Math.pow(1 - beatProgress, 3);

    this.shiftTrails();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      this.velocities[i3] *= 0.95;
      this.velocities[i3 + 1] *= 0.95;
      this.velocities[i3 + 2] *= 0.95;

      this.positions[i3] += this.velocities[i3] * deltaTime * 60;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * deltaTime * 60;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * deltaTime * 60;

      const tx = this.targetPositions[i3];
      const ty = this.targetPositions[i3 + 1];
      const tz = this.targetPositions[i3 + 2];

      this.positions[i3] += (tx - this.positions[i3]) * 0.02;
      this.positions[i3 + 1] += (ty - this.positions[i3 + 1]) * 0.02;
      this.positions[i3 + 2] += (tz - this.positions[i3 + 2]) * 0.02;

      const hueFrom = 220 + this.hueOffsets[i];
      const hueTo = 30 + this.hueOffsets[i];
      const currentHue = hueFrom + (hueTo - hueFrom) * beatEase * this.beatIntensity;

      const lightness = 0.5 + 0.3 * beatEase * this.beatIntensity;
      const color = new THREE.Color().setHSL(currentHue / 360, 1, lightness);
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;

      const sizeMultiplier = 1 + beatEase * this.beatIntensity * 1.5;
      this.sizes[i] = this.baseSizes[i] * sizeMultiplier;

      this.alphas[i] = 0.6 + 0.4 * (1 - beatEase);
    }

    this.updateTrailPositions();
    this.updateGeometry();
  }

  private shiftTrails(): void {
    for (let t = TRAIL_LENGTH - 1; t > 0; t--) {
      this.trailPositions[t].set(this.trailPositions[t - 1]);
    }
  }

  private updateTrailPositions(): void {
    if (!this.positions) return;
    this.trailPositions[0].set(this.positions);

    for (let t = 0; t < TRAIL_LENGTH; t++) {
      this.trailAlphas[t] = 0.8 * (1 - t / TRAIL_LENGTH);
    }
  }

  private updateGeometry(): void {
    if (!this.particles) return;

    const geometry = this.particles.geometry;

    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;

    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
    colorAttr.needsUpdate = true;

    const sizeAttr = geometry.getAttribute('size') as THREE.BufferAttribute;
    sizeAttr.needsUpdate = true;

    const alphaAttr = geometry.getAttribute('alpha') as THREE.BufferAttribute;
    alphaAttr.needsUpdate = true;
  }

  setParams(params: Partial<ParticleParams>): void {
    const oldCount = this.params.count;
    this.params = { ...this.params, ...params };

    if (params.count !== undefined && params.count !== oldCount) {
      this.recreateParticles();
    }

    if (params.sizeMin !== undefined || params.sizeMax !== undefined) {
      this.updateBaseSizes();
    }
  }

  private updateBaseSizes(): void {
    if (!this.baseSizes || !this.sizes) return;
    const count = this.params.count;
    for (let i = 0; i < count; i++) {
      this.baseSizes[i] = this.params.sizeMin + Math.random() * (this.params.sizeMax - this.params.sizeMin);
    }
  }

  private recreateParticles(): void {
    this.velocities = new Float32Array(this.params.count * 3);
    this.targetPositions = new Float32Array(this.params.count * 3);
    this.baseSizes = new Float32Array(this.params.count);
    this.hueOffsets = new Float32Array(this.params.count);
    this.initTrails();
    this.initParticles();
  }

  dispose(): void {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
      this.particles = null;
    }
  }
}
