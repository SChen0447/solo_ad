import * as THREE from 'three';

interface ParticleData {
  basePositionX: Float32Array;
  basePositionY: Float32Array;
  basePositionZ: Float32Array;
  hue: Float32Array;
  baseSize: Float32Array;
  birthTime: Float32Array;
  lifespan: Float32Array;
  phaseX: Float32Array;
  phaseY: Float32Array;
  phaseZ: Float32Array;
}

export interface ParticleSystemParams {
  count: number;
  rotationSpeed: number;
  colorPulseSpeed: number;
}

const DEFAULT_COUNT = 2000;
const DEFAULT_ROTATION_SPEED = 0.02;
const DEFAULT_COLOR_PULSE_SPEED = 5;
const NEBULA_RADIUS = 10;
const MIN_HUE = 200;
const MAX_HUE = 330;
const MIN_SIZE = 0.05;
const MAX_SIZE = 0.2;
const WANDER_AMPLITUDE = 0.1;
const WANDER_PERIOD = 2;
const FADE_DURATION = 1.0;
const MIN_LIFESPAN = 10;
const MAX_LIFESPAN = 30;
const REGEN_OFFSET = 0.5;

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createParticleTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export class ParticleSystem {
  public points: THREE.Points;
  public glowPoints: THREE.Points;
  public group: THREE.Group;

  private data!: ParticleData;
  private geometry: THREE.BufferGeometry;
  private glowGeometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private glowMaterial: THREE.PointsMaterial;
  private params: ParticleSystemParams;
  private positionAttr: THREE.BufferAttribute;
  private colorAttr: THREE.BufferAttribute;
  private sizeAttr: THREE.BufferAttribute;
  private glowPositionAttr: THREE.BufferAttribute;
  private glowColorAttr: THREE.BufferAttribute;
  private glowSizeAttr: THREE.BufferAttribute;
  private startTime: number;
  private currentRotation: number;

  constructor(maxParticles: number = 5000) {
    this.params = {
      count: DEFAULT_COUNT,
      rotationSpeed: DEFAULT_ROTATION_SPEED,
      colorPulseSpeed: DEFAULT_COLOR_PULSE_SPEED,
    };
    this.startTime = performance.now() / 1000;
    this.currentRotation = 0;

    this.group = new THREE.Group();
    this.geometry = new THREE.BufferGeometry();
    this.glowGeometry = new THREE.BufferGeometry();

    const attrResult = this.initAttributes(maxParticles);
    this.positionAttr = attrResult.position;
    this.colorAttr = attrResult.color;
    this.sizeAttr = attrResult.size;
    this.glowPositionAttr = attrResult.glowPosition;
    this.glowColorAttr = attrResult.glowColor;
    this.glowSizeAttr = attrResult.glowSize;

    this.initData(maxParticles);

    const particleTexture = createParticleTexture();
    const glowTexture = createGlowTexture();

    this.material = new THREE.PointsMaterial({
      size: MAX_SIZE,
      map: particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.glowMaterial = new THREE.PointsMaterial({
      size: MAX_SIZE * 1.5,
      map: glowTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.glowPoints = new THREE.Points(this.glowGeometry, this.glowMaterial);

    this.group.add(this.glowPoints);
    this.group.add(this.points);

    this.initializeParticles(this.params.count);
    this.updateDrawRange();
  }

  private initAttributes(max: number): {
    position: THREE.BufferAttribute;
    color: THREE.BufferAttribute;
    size: THREE.BufferAttribute;
    glowPosition: THREE.BufferAttribute;
    glowColor: THREE.BufferAttribute;
    glowSize: THREE.BufferAttribute;
  } {
    const positions = new Float32Array(max * 3);
    const colors = new Float32Array(max * 3);
    const sizes = new Float32Array(max);

    const positionAttr = new THREE.BufferAttribute(positions, 3);
    const colorAttr = new THREE.BufferAttribute(colors, 3);
    const sizeAttr = new THREE.BufferAttribute(sizes, 1);

    positionAttr.setUsage(THREE.DynamicDrawUsage);
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    sizeAttr.setUsage(THREE.DynamicDrawUsage);

    this.geometry.setAttribute('position', positionAttr);
    this.geometry.setAttribute('color', colorAttr);
    this.geometry.setAttribute('size', sizeAttr);

    const glowPositions = new Float32Array(max * 3);
    const glowColors = new Float32Array(max * 3);
    const glowSizes = new Float32Array(max);

    const glowPositionAttr = new THREE.BufferAttribute(glowPositions, 3);
    const glowColorAttr = new THREE.BufferAttribute(glowColors, 3);
    const glowSizeAttr = new THREE.BufferAttribute(glowSizes, 1);

    glowPositionAttr.setUsage(THREE.DynamicDrawUsage);
    glowColorAttr.setUsage(THREE.DynamicDrawUsage);
    glowSizeAttr.setUsage(THREE.DynamicDrawUsage);

    this.glowGeometry.setAttribute('position', glowPositionAttr);
    this.glowGeometry.setAttribute('color', glowColorAttr);
    this.glowGeometry.setAttribute('size', glowSizeAttr);

    return { position: positionAttr, color: colorAttr, size: sizeAttr, glowPosition: glowPositionAttr, glowColor: glowColorAttr, glowSize: glowSizeAttr };
  }

  private initData(max: number): void {
    this.data = {
      basePositionX: new Float32Array(max),
      basePositionY: new Float32Array(max),
      basePositionZ: new Float32Array(max),
      hue: new Float32Array(max),
      baseSize: new Float32Array(max),
      birthTime: new Float32Array(max),
      lifespan: new Float32Array(max),
      phaseX: new Float32Array(max),
      phaseY: new Float32Array(max),
      phaseZ: new Float32Array(max),
    };
  }

  private initParticle(index: number, currentTime: number, nearX?: number, nearY?: number, nearZ?: number): void {
    let x: number, y: number, z: number;
    if (nearX !== undefined && nearY !== undefined && nearZ !== undefined) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * REGEN_OFFSET;
      x = nearX + r * Math.sin(phi) * Math.cos(theta);
      y = nearY + r * Math.sin(phi) * Math.sin(theta);
      z = nearZ + r * Math.cos(phi);
    } else {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * NEBULA_RADIUS;
      x = r * Math.sin(phi) * Math.cos(theta);
      y = r * Math.sin(phi) * Math.sin(theta);
      z = r * Math.cos(phi);
    }

    this.data.basePositionX[index] = x;
    this.data.basePositionY[index] = y;
    this.data.basePositionZ[index] = z;
    this.data.hue[index] = randRange(MIN_HUE, MAX_HUE);
    this.data.baseSize[index] = randRange(MIN_SIZE, MAX_SIZE);
    this.data.birthTime[index] = currentTime;
    this.data.lifespan[index] = randRange(MIN_LIFESPAN, MAX_LIFESPAN);
    this.data.phaseX[index] = Math.random() * Math.PI * 2;
    this.data.phaseY[index] = Math.random() * Math.PI * 2;
    this.data.phaseZ[index] = Math.random() * Math.PI * 2;
  }

  private initializeParticles(count: number): void {
    const currentTime = performance.now() / 1000 - this.startTime;
    for (let i = 0; i < count; i++) {
      this.initParticle(i, currentTime);
    }
  }

  private updateDrawRange(): void {
    this.geometry.setDrawRange(0, this.params.count);
    this.glowGeometry.setDrawRange(0, this.params.count);
  }

  public setCount(count: number): void {
    const currentTime = performance.now() / 1000 - this.startTime;
    if (count > this.params.count) {
      for (let i = this.params.count; i < count; i++) {
        this.initParticle(i, currentTime);
      }
    }
    this.params.count = count;
    this.updateDrawRange();
  }

  public setRotationSpeed(speed: number): void {
    this.params.rotationSpeed = speed;
  }

  public setColorPulseSpeed(speed: number): void {
    this.params.colorPulseSpeed = speed;
  }

  public getParams(): ParticleSystemParams {
    return { ...this.params };
  }

  public update(): void {
    const now = performance.now() / 1000 - this.startTime;
    const count = this.params.count;
    const pulseSpeed = this.params.colorPulseSpeed > 0 ? this.params.colorPulseSpeed : 0.001;

    this.currentRotation += this.params.rotationSpeed * (1 / 60);
    const rotCos = Math.cos(this.currentRotation);
    const rotSin = Math.sin(this.currentRotation);

    const posArray = this.positionAttr.array as Float32Array;
    const colorArray = this.colorAttr.array as Float32Array;
    const sizeArray = this.sizeAttr.array as Float32Array;
    const glowPosArray = this.glowPositionAttr.array as Float32Array;
    const glowColorArray = this.glowColorAttr.array as Float32Array;
    const glowSizeArray = this.glowSizeAttr.array as Float32Array;

    const hueRange = MAX_HUE - MIN_HUE;
    const wanderOmega = (Math.PI * 2) / WANDER_PERIOD;
    const tmpColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const age = now - this.data.birthTime[i];
      const lifespan = this.data.lifespan[i];
      let fadeOpacity = 1.0;
      let sizeMultiplier = 1.0;

      if (age >= lifespan) {
        this.initParticle(
          i,
          now,
          this.data.basePositionX[i],
          this.data.basePositionY[i],
          this.data.basePositionZ[i]
        );
      } else if (age >= lifespan - FADE_DURATION) {
        const fadeProgress = (age - (lifespan - FADE_DURATION)) / FADE_DURATION;
        fadeOpacity = 1.0 - fadeProgress;
        sizeMultiplier = 1.0 - fadeProgress;
      }

      const bx = this.data.basePositionX[i];
      const by = this.data.basePositionY[i];
      const bz = this.data.basePositionZ[i];

      const wx = WANDER_AMPLITUDE * Math.sin(now * wanderOmega + this.data.phaseX[i]);
      const wy = WANDER_AMPLITUDE * Math.sin(now * wanderOmega + this.data.phaseY[i]);
      const wz = WANDER_AMPLITUDE * Math.sin(now * wanderOmega + this.data.phaseZ[i]);

      const px = bx + wx;
      const py = by + wy;
      const pz = bz + wz;

      const rx = px * rotCos - pz * rotSin;
      const rz = px * rotSin + pz * rotCos;

      posArray[i * 3] = rx;
      posArray[i * 3 + 1] = py;
      posArray[i * 3 + 2] = rz;

      glowPosArray[i * 3] = rx;
      glowPosArray[i * 3 + 1] = py;
      glowPosArray[i * 3 + 2] = rz;

      const baseHue = this.data.hue[i];
      const timeSinceBirth = now - this.data.birthTime[i];
      const pulsePhase = (timeSinceBirth / pulseSpeed) * 10;
      const hueShift = ((pulsePhase % 10) + 10) % 10;
      let finalHue = baseHue + hueShift;
      if (finalHue > MAX_HUE) {
        finalHue = MIN_HUE + ((finalHue - MIN_HUE) % hueRange);
      }

      tmpColor.setHSL(finalHue / 360, 0.8, 0.6);

      const r = tmpColor.r * fadeOpacity;
      const g = tmpColor.g * fadeOpacity;
      const b = tmpColor.b * fadeOpacity;

      colorArray[i * 3] = r;
      colorArray[i * 3 + 1] = g;
      colorArray[i * 3 + 2] = b;

      glowColorArray[i * 3] = r;
      glowColorArray[i * 3 + 1] = g;
      glowColorArray[i * 3 + 2] = b;

      const finalSize = this.data.baseSize[i] * sizeMultiplier;
      sizeArray[i] = finalSize;
      glowSizeArray[i] = finalSize * 3;
    }

    this.positionAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.glowPositionAttr.needsUpdate = true;
    this.glowColorAttr.needsUpdate = true;
    this.glowSizeAttr.needsUpdate = true;
  }
}
