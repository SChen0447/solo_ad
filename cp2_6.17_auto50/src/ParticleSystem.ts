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
const SPECTRUM_BINS = 64;
const PARTICLES_PER_BIN = Math.floor(PARTICLE_COUNT / SPECTRUM_BINS);

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private positions: Float32Array;
  private colors: Float32Array;
  private basePositions: Float32Array;
  private baseHues: Float32Array;
  private spectrumBinIndices: Uint32Array;
  private spectrumBaseHeights: Float32Array;
  private spectrumBaseX: Float32Array;
  private spectrumBaseZ: Float32Array;
  private mode: VisualizationMode = 'pulse';
  private time: number = 0;
  private smoothedLowFreq: number = 0;
  private smoothedMidFreq: number = 0;
  private smoothedHighFreq: number = 0;
  private smoothedAvgFreq: number = 0;
  private spectrumBandEnergies: Float32Array;
  private color: THREE.Color;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.basePositions = new Float32Array(PARTICLE_COUNT * 3);
    this.baseHues = new Float32Array(PARTICLE_COUNT);
    this.spectrumBinIndices = new Uint32Array(PARTICLE_COUNT);
    this.spectrumBaseHeights = new Float32Array(PARTICLE_COUNT);
    this.spectrumBaseX = new Float32Array(PARTICLE_COUNT);
    this.spectrumBaseZ = new Float32Array(PARTICLE_COUNT);
    this.spectrumBandEnergies = new Float32Array(SPECTRUM_BINS);
    this.color = new THREE.Color();

    this.initializeParticles();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: BASE_PARTICLE_SIZE,
      vertexColors: true,
      sizeAttenuation: false,
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

      const normalizedY = (y / SPHERE_RADIUS + 1) / 2;
      const hue = 240 + normalizedY * 60;
      this.baseHues[i] = hue;

      this.color.setHSL(hue / 360, 1.0, 0.5);
      this.colors[i3] = this.color.r;
      this.colors[i3 + 1] = this.color.g;
      this.colors[i3 + 2] = this.color.b;

      const binIndex = Math.floor(i / PARTICLES_PER_BIN);
      const clampedBinIndex = Math.min(binIndex, SPECTRUM_BINS - 1);
      this.spectrumBinIndices[i] = clampedBinIndex;
      this.spectrumBaseHeights[i] = Math.random();
      const binCenterX = (clampedBinIndex / (SPECTRUM_BINS - 1)) * 10 - 5;
      this.spectrumBaseX[i] = binCenterX + (Math.random() - 0.5) * 0.12;
      this.spectrumBaseZ[i] = (Math.random() - 0.5) * 0.8;
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

    const positions = this.positions;
    const basePositions = this.basePositions;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      positions[i3] = basePositions[i3] * baseScale;
      positions[i3 + 1] = basePositions[i3 + 1] * baseScale;
      positions[i3 + 2] = basePositions[i3 + 2] * baseScale;
    }
  }

  private updateWaveformMode(analysisData: AudioAnalysisData | null): void {
    const waveAmplitude = this.smoothedMidFreq * 1.5;
    const positions = this.positions;
    const basePositions = this.basePositions;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      const baseX = basePositions[i3];
      const baseY = basePositions[i3 + 1];
      const baseZ = basePositions[i3 + 2];

      const normalizedX = (baseX / SPHERE_RADIUS + 1) / 2;

      let waveValue = 0;
      if (analysisData) {
        const timeData = analysisData.timeDomainData;
        const index = Math.floor(normalizedX * (timeData.length - 1));
        waveValue = (timeData[index] / 255 - 0.5) * 2;
      }

      const waveOffset = waveValue * waveAmplitude;

      positions[i3] = baseX;
      positions[i3 + 1] = baseY + waveOffset;
      positions[i3 + 2] = baseZ;
    }
  }

  private updateSpectrumMode(analysisData: AudioAnalysisData | null): void {
    const positions = this.positions;

    if (analysisData) {
      const freqData = analysisData.frequencyData;
      const binSize = Math.floor(freqData.length / SPECTRUM_BINS);

      for (let bin = 0; bin < SPECTRUM_BINS; bin++) {
        const startIdx = bin * binSize;
        const endIdx = startIdx + binSize;
        let sum = 0;
        for (let j = startIdx; j < endIdx && j < freqData.length; j++) {
          sum += freqData[j];
        }
        this.spectrumBandEnergies[bin] = sum / binSize / 255;
      }
    } else {
      this.spectrumBandEnergies.fill(0);
    }

    const binIndices = this.spectrumBinIndices;
    const baseHeights = this.spectrumBaseHeights;
    const baseX = this.spectrumBaseX;
    const baseZ = this.spectrumBaseZ;
    const bandEnergies = this.spectrumBandEnergies;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const bin = binIndices[i];
      const energy = bandEnergies[bin];
      const maxHeight = energy * 6;
      const y = baseHeights[i] * maxHeight;

      positions[i3] = baseX[i];
      positions[i3 + 1] = y;
      positions[i3 + 2] = baseZ[i];
    }
  }

  private updateColors(): void {
    const lightness = MIN_LIGHTNESS + this.smoothedHighFreq * (MAX_LIGHTNESS - MIN_LIGHTNESS);
    const colors = this.colors;
    const baseHues = this.baseHues;
    const colorObj = this.color;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const hue = baseHues[i];

      colorObj.setHSL(hue / 360, 1.0, lightness);
      colors[i3] = colorObj.r;
      colors[i3 + 1] = colorObj.g;
      colors[i3 + 2] = colorObj.b;
    }
  }

  private updateSizes(): void {
    const sizeMultiplier = MIN_PARTICLE_SIZE + this.smoothedLowFreq * (MAX_PARTICLE_SIZE - MIN_PARTICLE_SIZE);
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
