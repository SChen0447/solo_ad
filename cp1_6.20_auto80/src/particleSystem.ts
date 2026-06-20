import * as THREE from 'three';

export type LayoutType = 'sphere' | 'spiral' | 'waterfall';

const PARTICLE_COUNT = 2048;
const FREQ_BIN_COUNT = 128;
const LAYERS_PER_BIN = PARTICLE_COUNT / FREQ_BIN_COUNT;
const SPHERE_RADIUS = 5;
const Y_OFFSET_MIN = -1;
const Y_OFFSET_MAX = 3;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: THREE.Color, c2: THREE.Color, t: number, out: THREE.Color): THREE.Color {
  out.r = lerp(c1.r, c2.r, t);
  out.g = lerp(c1.g, c2.g, t);
  out.b = lerp(c1.b, c2.b, t);
  return out;
}

export class ParticleSystem {
  public readonly points: THREE.Points;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.PointsMaterial;
  private readonly particleCount: number = PARTICLE_COUNT;
  private layout: LayoutType = 'sphere';
  private speedMultiplier: number = 1.0;

  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly sizes: Float32Array;
  private readonly basePositions: Float32Array;
  private readonly targetBasePositions: Float32Array;
  private readonly yOffsets: Float32Array;
  private readonly targetYOffsets: Float32Array;
  private readonly baseSizes: Float32Array;
  private readonly freqBinIndex: Int32Array;

  private layoutTransitionProgress: number = 1.0;
  private readonly layoutTransitionDuration: number = 0.5;

  private readonly waterfallVelocities: Float32Array;
  private readonly waterfallBaseY: Float32Array;

  private readonly colorLowDark = new THREE.Color(0x660000);
  private readonly colorLowBright = new THREE.Color(0xff0033);
  private readonly colorMidDark = new THREE.Color(0x006600);
  private readonly colorMidBright = new THREE.Color(0x00ff33);
  private readonly colorHighDark = new THREE.Color(0x000066);
  private readonly colorHighBright = new THREE.Color(0x0033ff);
  private readonly tmpColor = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);
    this.basePositions = new Float32Array(this.particleCount * 3);
    this.targetBasePositions = new Float32Array(this.particleCount * 3);
    this.yOffsets = new Float32Array(this.particleCount);
    this.targetYOffsets = new Float32Array(this.particleCount);
    this.baseSizes = new Float32Array(this.particleCount);
    this.freqBinIndex = new Int32Array(this.particleCount);
    this.waterfallVelocities = new Float32Array(this.particleCount);
    this.waterfallBaseY = new Float32Array(this.particleCount);

    this.initParticleData();
    this.generateLayout(this.basePositions, this.layout);
    this.targetBasePositions.set(this.basePositions);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }

  private initParticleData(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const bin = Math.floor(i / LAYERS_PER_BIN);
      this.freqBinIndex[i] = bin;
      this.yOffsets[i] = 0;
      this.targetYOffsets[i] = 0;
      this.baseSizes[i] = lerp(3, 6, Math.random());
      this.sizes[i] = this.baseSizes[i];
      this.waterfallVelocities[i] = 2.0 + Math.random() * 1.0;
      this.waterfallBaseY[i] = lerp(5, -5, Math.random());
      this.colors[i * 3] = 0.3;
      this.colors[i * 3 + 1] = 0.3;
      this.colors[i * 3 + 2] = 0.5;
    }
  }

  private generateLayout(positions: Float32Array, layout: LayoutType): void {
    if (layout === 'sphere') {
      this.generateSphereLayout(positions);
    } else if (layout === 'spiral') {
      this.generateSpiralLayout(positions);
    } else {
      this.generateWaterfallLayout(positions);
    }
  }

  private generateSphereLayout(positions: Float32Array): void {
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < this.particleCount; i++) {
      const bin = this.freqBinIndex[i];
      const layerWithinBin = i % LAYERS_PER_BIN;
      const layerRadius = lerp(1, SPHERE_RADIUS, layerWithinBin / (LAYERS_PER_BIN - 1));

      const theta = 2 * Math.PI * i / goldenRatio;
      const phi = Math.acos(1 - 2 * (i + 0.5) / this.particleCount);

      positions[i * 3] = layerRadius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = layerRadius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = layerRadius * Math.cos(phi);

      void bin;
    }
  }

  private generateSpiralLayout(positions: Float32Array): void {
    const turns = 8;
    const zMin = -5;
    const zMax = 5;
    for (let i = 0; i < this.particleCount; i++) {
      const t = i / (this.particleCount - 1);
      const z = lerp(zMin, zMax, t);
      const radius = lerp(0, SPHERE_RADIUS, t);
      const angle = t * turns * 2 * Math.PI + (i % LAYERS_PER_BIN) * (2 * Math.PI / LAYERS_PER_BIN);

      positions[i * 3] = radius * Math.cos(angle);
      positions[i * 3 + 1] = radius * Math.sin(angle);
      positions[i * 3 + 2] = z;
    }
  }

  private generateWaterfallLayout(positions: Float32Array): void {
    const spread = 5;
    for (let i = 0; i < this.particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * spread;
      positions[i * 3] = r * Math.cos(angle);
      positions[i * 3 + 1] = this.waterfallBaseY[i];
      positions[i * 3 + 2] = r * Math.sin(angle);
    }
  }

  setLayout(layout: LayoutType): void {
    if (this.layout === layout) return;
    this.layout = layout;
    this.basePositions.set(this.positions);
    for (let i = 0; i < this.particleCount; i++) {
      const yOffset = this.yOffsets[i];
      this.basePositions[i * 3 + 1] -= yOffset;
    }
    this.generateLayout(this.targetBasePositions, layout);
    this.layoutTransitionProgress = 0;
  }

  getLayout(): LayoutType {
    return this.layout;
  }

  setSpeedMultiplier(m: number): void {
    this.speedMultiplier = Math.max(0.5, Math.min(2.0, m));
  }

  getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  private mapFrequencyToColor(freqBin: number, amplitude: number): void {
    const t = amplitude / 255;
    const normalizedBin = freqBin / FREQ_BIN_COUNT;

    let dark: THREE.Color;
    let bright: THREE.Color;

    if (normalizedBin < 0.33) {
      dark = this.colorLowDark;
      bright = this.colorLowBright;
    } else if (normalizedBin < 0.66) {
      dark = this.colorMidDark;
      bright = this.colorMidBright;
    } else {
      dark = this.colorHighDark;
      bright = this.colorHighBright;
    }

    lerpColor(dark, bright, t, this.tmpColor);
  }

  private mapAmplitudeToAlpha(amplitude: number): number {
    if (amplitude <= 50) return 0.3;
    if (amplitude <= 200) return 0.7;
    return 1.0;
  }

  update(frequencyData: Uint8Array, deltaTime: number): void {
    const dt = deltaTime * this.speedMultiplier;
    const smoothFactor = 1 - Math.exp(-dt / 0.3);
    const layoutSmoothFactor = 1 - Math.exp(-dt / this.layoutTransitionDuration);

    if (this.layoutTransitionProgress < 1.0) {
      this.layoutTransitionProgress = Math.min(1.0, this.layoutTransitionProgress + layoutSmoothFactor);
    }

    for (let i = 0; i < this.particleCount; i++) {
      const bin = this.freqBinIndex[i];
      const amplitude = frequencyData[bin] ?? 0;

      const targetOffset = lerp(Y_OFFSET_MIN, Y_OFFSET_MAX, amplitude / 255);
      this.targetYOffsets[i] = targetOffset;
      this.yOffsets[i] = lerp(this.yOffsets[i], targetOffset, smoothFactor);

      const i3 = i * 3;
      const t = this.layoutTransitionProgress;
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      let baseX = lerp(this.basePositions[i3], this.targetBasePositions[i3], easeT);
      let baseY = lerp(this.basePositions[i3 + 1], this.targetBasePositions[i3 + 1], easeT);
      let baseZ = lerp(this.basePositions[i3 + 2], this.targetBasePositions[i3 + 2], easeT);

      if (this.layout === 'waterfall' && this.layoutTransitionProgress >= 1.0) {
        baseY -= this.waterfallVelocities[i] * dt;
        if (baseY < -5) {
          baseY = 5;
        }
        this.waterfallBaseY[i] = baseY;
        this.targetBasePositions[i3 + 1] = baseY;
        this.basePositions[i3 + 1] = baseY;
      }

      this.positions[i3] = baseX;
      this.positions[i3 + 1] = baseY + this.yOffsets[i];
      this.positions[i3 + 2] = baseZ;

      this.mapFrequencyToColor(bin, amplitude);
      const alpha = this.mapAmplitudeToAlpha(amplitude);
      this.colors[i3] = this.tmpColor.r * alpha;
      this.colors[i3 + 1] = this.tmpColor.g * alpha;
      this.colors[i3 + 2] = this.tmpColor.b * alpha;

      this.sizes[i] = this.baseSizes[i] * (0.8 + amplitude / 255 * 0.5);
    }

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
