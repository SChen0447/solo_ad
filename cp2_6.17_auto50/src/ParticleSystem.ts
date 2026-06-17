import * as THREE from 'three';
import type { AudioAnalysisData } from './AudioAnalyzer';

export type VisualizationMode = 'waveform' | 'spectrum' | 'pulse';

const PARTICLE_COUNT = 6000;
const SPHERE_RADIUS = 5;
const BASE_PARTICLE_SIZE = 0.08;
const MIN_PARTICLE_SIZE = 0.05;
const MAX_PARTICLE_SIZE = 0.3;
const MIN_LIGHTNESS = 0.3;
const MAX_LIGHTNESS = 0.9;
const PULSE_AMPLITUDE = 0.5;

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private positions: Float32Array;
  private colors: Float32Array;
  private basePositions: Float32Array;
  private sizes: Float32Array;
  private baseSizes: Float32Array;
  private mode: VisualizationMode = 'pulse';
  private time: number = 0;
  private smoothedLowFreq: number = 0;
  private smoothedMidFreq: number = 0;
  private smoothedHighFreq: number = 0;
  private smoothedAvgFreq: number = 0;
  private baseHues: Float32Array;
  private waveformOffsets: Float32Array;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.basePositions = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);
    this.baseSizes = new Float32Array(PARTICLE_COUNT);
    this.baseHues = new Float32Array(PARTICLE_COUNT);
    this.waveformOffsets = new Float32Array(PARTICLE_COUNT);

    this.initializeParticles();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: BASE_PARTICLE_SIZE,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);
  }

  private initializeParticles(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = SPHERE_RADIUS * Math.cbrt(Math.random());

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      this.basePositions[i3] = x;
      this.basePositions[i3 + 1] = y;
      this.basePositions[i3 + 2] = z;

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      const distRatio = r / SPHERE_RADIUS;
      const hue = 240 + distRatio * 60;
      this.baseHues[i] = hue;

      const color = new THREE.Color().setHSL(hue / 360, 0.8, 0.6);
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;

      this.sizes[i] = BASE_PARTICLE_SIZE;
      this.baseSizes[i] = BASE_PARTICLE_SIZE;

      this.waveformOffsets[i] = Math.random() * Math.PI * 2;
    }
  }

  setMode(mode: VisualizationMode): void {
    this.mode = mode;
  }

  update(analysisData: AudioAnalysisData | null, deltaTime: number): void {
    this.time += deltaTime;

    if (analysisData) {
      const smoothing = 0.15;
      this.smoothedLowFreq += (analysisData.lowFrequency - this.smoothedLowFreq) * smoothing;
      this.smoothedMidFreq += (analysisData.midFrequency - this.smoothedMidFreq) * smoothing;
      this.smoothedHighFreq += (analysisData.highFrequency - this.smoothedHighFreq) * smoothing;
      this.smoothedAvgFreq += (analysisData.averageFrequency - this.smoothedAvgFreq) * smoothing;
    }

    switch (this.mode) {
      case 'waveform':
        this.updateWaveformMode(analysisData);
        break;
      case 'spectrum':
        this.updateSpectrumMode(analysisData);
        break;
      case 'pulse':
        this.updatePulseMode(analysisData);
        break;
    }

    this.updateColors();
    this.updateSizes();

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  private updatePulseMode(analysisData: AudioAnalysisData | null): void {
    const pulse = this.smoothedMidFreq * PULSE_AMPLITUDE;
    const baseScale = 1 + pulse;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      this.positions[i3] = this.basePositions[i3] * baseScale;
      this.positions[i3 + 1] = this.basePositions[i3 + 1] * baseScale;
      this.positions[i3 + 2] = this.basePositions[i3 + 2] * baseScale;
    }
  }

  private updateWaveformMode(analysisData: AudioAnalysisData | null): void {
    const waveAmplitude = this.smoothedMidFreq * 1.5;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      const baseX = this.basePositions[i3];
      const baseY = this.basePositions[i3 + 1];
      const baseZ = this.basePositions[i3 + 2];

      const normalizedX = (baseX / SPHERE_RADIUS + 1) / 2;

      let waveValue = 0;
      if (analysisData) {
        const timeData = analysisData.timeDomainData;
        const index = Math.floor(normalizedX * (timeData.length - 1));
        waveValue = (timeData[index] / 255 - 0.5) * 2;
      }

      const waveOffset = waveValue * waveAmplitude;

      this.positions[i3] = baseX;
      this.positions[i3 + 1] = baseY + waveOffset;
      this.positions[i3 + 2] = baseZ;
    }
  }

  private updateSpectrumMode(analysisData: AudioAnalysisData | null): void {
    const freqBands = 32;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      const baseY = this.basePositions[i3 + 1];
      const normalizedY = (baseY / SPHERE_RADIUS + 1) / 2;

      const bandIndex = Math.floor(normalizedY * freqBands);
      const clampedBand = Math.min(Math.max(bandIndex, 0), freqBands - 1);

      let bandEnergy = 0;
      if (analysisData) {
        const freqData = analysisData.frequencyData;
        const startIdx = Math.floor((clampedBand / freqBands) * freqData.length);
        const endIdx = Math.floor(((clampedBand + 1) / freqBands) * freqData.length);

        let sum = 0;
        for (let j = startIdx; j < endIdx && j < freqData.length; j++) {
          sum += freqData[j];
        }
        bandEnergy = sum / Math.max(endIdx - startIdx, 1) / 255;
      }

      const heightOffset = bandEnergy * 2 * (baseY > 0 ? 1 : -1);

      this.positions[i3] = this.basePositions[i3];
      this.positions[i3 + 1] = baseY + heightOffset;
      this.positions[i3 + 2] = this.basePositions[i3 + 2];
    }
  }

  private updateColors(): void {
    const lightness = MIN_LIGHTNESS + this.smoothedHighFreq * (MAX_LIGHTNESS - MIN_LIGHTNESS);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const hue = this.baseHues[i];

      const color = new THREE.Color().setHSL(hue / 360, 0.85, lightness);
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;
    }
  }

  private updateSizes(): void {
    const sizeMultiplier = MIN_PARTICLE_SIZE + this.smoothedLowFreq * (MAX_PARTICLE_SIZE - MIN_PARTICLE_SIZE);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.sizes[i] = this.baseSizes[i] * (sizeMultiplier / BASE_PARTICLE_SIZE);
    }

    this.material.size = sizeMultiplier;
  }

  getParticles(): THREE.Points {
    return this.particles;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.particles);
  }
}
