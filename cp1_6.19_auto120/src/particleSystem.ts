import * as THREE from 'three';
import {
  randomRange,
  generateRandomColor,
  smoothLerp,
  generateRandomPointInSphere
} from './utils';

export interface ParticleParams {
  hue: number;
  size: number;
  speed: number;
  shape: number;
}

export interface SelectedParticleInfo {
  id: number;
  color: string;
  position: { x: number; y: number; z: number };
  screenPosition: { x: number; y: number };
}

export class ParticleSystem {
  public points: THREE.Points;
  public boundingBox: THREE.LineSegments;

  private particleCount: number;
  private basePositions: Float32Array;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private baseColors: Float32Array;
  private flickerSpeeds: Float32Array;
  private flickerOffsets: Float32Array;
  private rotationAngles: Float32Array;

  private currentParams: ParticleParams;
  private targetParams: ParticleParams;
  private transitionDuration: number = 0.5;

  private selectedIndex: number = -1;
  private originalSize: number = 1;

  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;

  private boundingBoxSize: number = 20;

  constructor(particleCount: number = 5000) {
    this.particleCount = particleCount;

    this.basePositions = new Float32Array(particleCount * 3);
    this.positions = new Float32Array(particleCount * 3);
    this.colors = new Float32Array(particleCount * 3);
    this.sizes = new Float32Array(particleCount);
    this.baseColors = new Float32Array(particleCount * 3);
    this.flickerSpeeds = new Float32Array(particleCount);
    this.flickerOffsets = new Float32Array(particleCount);
    this.rotationAngles = new Float32Array(particleCount);

    this.currentParams = { hue: 210, size: 0.8, speed: 1, shape: 1 };
    this.targetParams = { hue: 210, size: 0.8, speed: 1, shape: 1 };

    this.geometry = new THREE.BufferGeometry();
    this.material = this.createShaderMaterial();

    this.points = new THREE.Points(this.geometry, this.material);
    this.boundingBox = this.createBoundingBox();

    this.initializeParticles();
    this.setupGeometryAttributes();
  }

  private createShaderMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: this.createGlowTexture() },
        glowIntensity: { value: 1.5 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 customColor;
        varying vec3 vColor;
        void main() {
          vColor = customColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        uniform float glowIntensity;
        varying vec3 vColor;
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          if (texColor.a < 0.01) discard;
          gl_FragColor = vec4(vColor * glowIntensity, texColor.a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  private createGlowTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createBoundingBox(): THREE.LineSegments {
    const halfSize = this.boundingBoxSize / 2;
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -halfSize, -halfSize, -halfSize,  halfSize, -halfSize, -halfSize,
       halfSize, -halfSize, -halfSize,   halfSize,  halfSize, -halfSize,
       halfSize,  halfSize, -halfSize,  -halfSize,  halfSize, -halfSize,
      -halfSize,  halfSize, -halfSize,  -halfSize, -halfSize, -halfSize,
      -halfSize, -halfSize,  halfSize,   halfSize, -halfSize,  halfSize,
       halfSize, -halfSize,  halfSize,   halfSize,  halfSize,  halfSize,
       halfSize,  halfSize,  halfSize,  -halfSize,  halfSize,  halfSize,
      -halfSize,  halfSize,  halfSize,  -halfSize, -halfSize,  halfSize,
      -halfSize, -halfSize, -halfSize,  -halfSize, -halfSize,  halfSize,
       halfSize, -halfSize, -halfSize,   halfSize, -halfSize,  halfSize,
       halfSize,  halfSize, -halfSize,   halfSize,  halfSize,  halfSize,
      -halfSize,  halfSize, -halfSize,  -halfSize,  halfSize,  halfSize
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    const material = new THREE.LineBasicMaterial({
      color: 0x00ff66,
      transparent: true,
      opacity: 0.4,
      linewidth: 1
    });
    const lines = new THREE.LineSegments(geometry, material);
    return lines;
  }

  private initializeParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const [x, y, z] = generateRandomPointInSphere(10);
      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = z;

      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;

      const [r, g, b] = generateRandomColor(this.currentParams.hue, 40);
      this.colors[i * 3] = r;
      this.colors[i * 3 + 1] = g;
      this.colors[i * 3 + 2] = b;

      this.baseColors[i * 3] = r;
      this.baseColors[i * 3 + 1] = g;
      this.baseColors[i * 3 + 2] = b;

      this.sizes[i] = this.currentParams.size;
      this.flickerSpeeds[i] = randomRange(0.5, 2);
      this.flickerOffsets[i] = randomRange(0, Math.PI * 2);
      this.rotationAngles[i] = randomRange(0, Math.PI * 2);
    }
  }

  private setupGeometryAttributes(): void {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('customColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
  }

  public updateParams(params: Partial<ParticleParams>): void {
    if (params.hue !== undefined) this.targetParams.hue = params.hue;
    if (params.size !== undefined) this.targetParams.size = params.size;
    if (params.speed !== undefined) this.targetParams.speed = params.speed;
    if (params.shape !== undefined) this.targetParams.shape = params.shape;
  }

  public update(deltaTime: number, elapsedTime: number): void {
    this.currentParams.hue = smoothLerp(this.currentParams.hue, this.targetParams.hue, this.transitionDuration, deltaTime);
    this.currentParams.size = smoothLerp(this.currentParams.size, this.targetParams.size, this.transitionDuration, deltaTime);
    this.currentParams.speed = smoothLerp(this.currentParams.speed, this.targetParams.speed, this.transitionDuration, deltaTime);
    this.currentParams.shape = smoothLerp(this.currentParams.shape, this.targetParams.shape, this.transitionDuration, deltaTime);

    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.geometry.getAttribute('customColor') as THREE.BufferAttribute;
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;

    const positions = positionAttr.array as Float32Array;
    const colors = colorAttr.array as Float32Array;
    const sizes = sizeAttr.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      const baseX = this.basePositions[i * 3];
      const baseY = this.basePositions[i * 3 + 1];
      const baseZ = this.basePositions[i * 3 + 2];

      const rotationSpeed = 0.1 * this.currentParams.speed;
      this.rotationAngles[i] += rotationSpeed * deltaTime;
      const angle = this.rotationAngles[i];
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const rotatedX = baseX * cosA - baseZ * sinA;
      const rotatedZ = baseX * sinA + baseZ * cosA;

      positions[i * 3] = rotatedX;
      positions[i * 3 + 1] = baseY;
      positions[i * 3 + 2] = rotatedZ * this.currentParams.shape;

      const flicker = Math.sin(elapsedTime * this.flickerSpeeds[i] + this.flickerOffsets[i]) * 0.15 + 0.85;
      const baseColor = generateRandomColor(this.currentParams.hue, 40);

      const isSelected = i === this.selectedIndex;
      const sizeMultiplier = isSelected ? 1.5 : flicker;

      colors[i * 3] = (isSelected ? 1 : baseColor[0]) * flicker;
      colors[i * 3 + 1] = (isSelected ? 1 : baseColor[1]) * flicker;
      colors[i * 3 + 2] = (isSelected ? 1 : baseColor[2]) * flicker;

      sizes[i] = this.currentParams.size * sizeMultiplier;
    }

    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  public selectParticle(index: number): SelectedParticleInfo | null {
    if (index < 0 || index >= this.particleCount) return null;

    if (this.selectedIndex === index) {
      this.selectedIndex = -1;
      return null;
    }

    this.selectedIndex = index;

    const x = this.positions[index * 3];
    const y = this.positions[index * 3 + 1];
    const z = this.positions[index * 3 + 2];

    const r = this.colors[index * 3];
    const g = this.colors[index * 3 + 1];
    const b = this.colors[index * 3 + 2];
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    return {
      id: index,
      color: hex.toUpperCase(),
      position: {
        x: parseFloat(x.toFixed(3)),
        y: parseFloat(y.toFixed(3)),
        z: parseFloat(z.toFixed(3))
      },
      screenPosition: { x: 0, y: 0 }
    };
  }

  public clearSelection(): void {
    this.selectedIndex = -1;
  }

  public getSelectedIndex(): number {
    return this.selectedIndex;
  }

  public getParticleCount(): number {
    return this.particleCount;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.boundingBox.geometry.dispose();
    (this.boundingBox.material as THREE.Material).dispose();
  }
}
