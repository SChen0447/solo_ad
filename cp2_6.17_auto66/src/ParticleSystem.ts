import * as THREE from 'three';
import type { AudioAnalysisData } from './AudioAnalyzer';

export type VisualizationMode = 'waveform' | 'spectrum' | 'pulse';

interface ParticleSystemOptions {
  particleCount?: number;
  sphereRadius?: number;
}

const DEFAULT_PARTICLE_COUNT = 6000;
const DEFAULT_SPHERE_RADIUS = 5;
const STAR_COUNT = 150;

export class ParticleSystem {
  private scene: THREE.Scene;
  private particleCount: number;
  private sphereRadius: number;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private basePositions: Float32Array;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private baseHues: Float32Array;
  private mode: VisualizationMode = 'waveform';
  private time: number = 0;
  private starGeometry: THREE.BufferGeometry;
  private starMaterial: THREE.PointsMaterial;
  private stars: THREE.Points;

  constructor(scene: THREE.Scene, options: ParticleSystemOptions = {}) {
    this.scene = scene;
    this.particleCount = options.particleCount ?? DEFAULT_PARTICLE_COUNT;
    this.sphereRadius = options.sphereRadius ?? DEFAULT_SPHERE_RADIUS;

    this.basePositions = new Float32Array(this.particleCount * 3);
    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);
    this.baseHues = new Float32Array(this.particleCount);

    this.initializeParticles();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    this.starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 50 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    this.starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.02,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });
    this.stars = new THREE.Points(this.starGeometry, this.starMaterial);
    this.scene.add(this.stars);
  }

  private initializeParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const r = this.sphereRadius * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = z;

      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;

      const t = r / this.sphereRadius;
      const hue = 0.6 + t * 0.15;
      this.baseHues[i] = hue;
      this.colors[i * 3] = 0.2;
      this.colors[i * 3 + 1] = 0.3;
      this.colors[i * 3 + 2] = 0.8;
      this.sizes[i] = 0.08;
    }
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r, g, b];
  }

  setMode(mode: VisualizationMode): void {
    this.mode = mode;
  }

  update(data: AudioAnalysisData, deltaTime: number): void {
    this.time += deltaTime;
    this.stars.rotation.y += deltaTime * 0.02;

    const { lowFrequency, midFrequency, highFrequency, averageSpectrum, frequencyData, timeDomainData } = data;
    const sizeScale = 0.05 + lowFrequency * 0.25;
    const brightness = 0.3 + highFrequency * 0.6;
    const pulseOffset = 0.5 * averageSpectrum;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      let x = this.basePositions[idx];
      let y = this.basePositions[idx + 1];
      let z = this.basePositions[idx + 2];

      const length = Math.sqrt(x * x + y * y + z * z);
      const nx = length > 0 ? x / length : 0;
      const ny = length > 0 ? y / length : 0;
      const nz = length > 0 ? z / length : 0;

      x += nx * pulseOffset;
      y += ny * pulseOffset;
      z += nz * pulseOffset;

      switch (this.mode) {
        case 'waveform': {
          const waveIdx = Math.floor((i / this.particleCount) * timeDomainData.length);
          const waveVal = (timeDomainData[waveIdx] - 128) / 128;
          y += waveVal * 1.5;
          const waveIdx2 = Math.floor(((i + 100) / this.particleCount) * timeDomainData.length);
          const waveVal2 = (timeDomainData[waveIdx2] - 128) / 128;
          x += waveVal2 * 0.5;
          break;
        }
        case 'spectrum': {
          const normY = (this.basePositions[idx + 1] + this.sphereRadius) / (2 * this.sphereRadius);
          const freqIdx = Math.floor(normY * (frequencyData.length * 0.5));
          const freqVal = frequencyData[Math.min(freqIdx, frequencyData.length - 1)] / 255;
          y += freqVal * 3;
          const radialBoost = 1 + freqVal * 0.5;
          x *= radialBoost;
          z *= radialBoost;
          break;
        }
        case 'pulse': {
          const pulseScale = 1 + midFrequency * 0.8 * Math.sin(this.time * 2 + length * 0.5);
          x *= pulseScale;
          y *= pulseScale;
          z *= pulseScale;
          break;
        }
      }

      this.positions[idx] = x;
      this.positions[idx + 1] = y;
      this.positions[idx + 2] = z;

      this.sizes[i] = 0.08 * sizeScale;

      const hue = this.baseHues[i];
      const [r, g, b] = this.hslToRgb(hue, 0.8, brightness);
      this.colors[idx] = r;
      this.colors[idx + 1] = g;
      this.colors[idx + 2] = b;
    }

    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    this.material.size = 0.08 * sizeScale;
  }

  idleUpdate(deltaTime: number): void {
    this.time += deltaTime;
    this.stars.rotation.y += deltaTime * 0.02;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      const x = this.basePositions[idx];
      const y = this.basePositions[idx + 1];
      const z = this.basePositions[idx + 2];

      const offset = Math.sin(this.time + i * 0.01) * 0.05;
      const length = Math.sqrt(x * x + y * y + z * z);
      const nx = length > 0 ? x / length : 0;
      const ny = length > 0 ? y / length : 0;
      const nz = length > 0 ? z / length : 0;

      this.positions[idx] = x + nx * offset;
      this.positions[idx + 1] = y + ny * offset;
      this.positions[idx + 2] = z + nz * offset;

      const brightness = 0.35 + Math.sin(this.time * 0.5 + i * 0.001) * 0.1;
      const [r, g, b] = this.hslToRgb(this.baseHues[i], 0.8, brightness);
      this.colors[idx] = r;
      this.colors[idx + 1] = g;
      this.colors[idx + 2] = b;
    }

    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.scene.remove(this.points);
    this.scene.remove(this.stars);
    this.geometry.dispose();
    this.material.dispose();
    this.starGeometry.dispose();
    this.starMaterial.dispose();
  }
}
