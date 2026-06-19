import * as THREE from 'three';
import { ThemeManager, ThemeColors } from './ThemeManager';
import { SpectrumAnalyzer } from '../audio/SpectrumAnalyzer';

export class Visualizer {
  private scene: THREE.Scene;
  private themeManager: ThemeManager;
  private spectrumAnalyzer: SpectrumAnalyzer | null = null;
  
  private particleSystem: THREE.Points | null = null;
  private particlePositions: Float32Array | null = null;
  private particleBasePositions: Float32Array | null = null;
  private particleSizes: Float32Array | null = null;
  private particleBaseSizes: Float32Array | null = null;
  private particleColors: Float32Array | null = null;
  private particleFreqIndices: number[] = [];
  
  private waveformLine: THREE.Line | null = null;
  private waveformGeometry: THREE.BufferGeometry | null = null;
  private waveformPositions: Float32Array | null = null;
  
  private bars: THREE.Mesh[] = [];
  private barSpheres: THREE.Mesh[] = [];
  private barBaseHeights: number[] = [];
  
  private readonly particleCount: number = 5000;
  private readonly sphereRadius: number = 12;
  private readonly waveRadius: number = 5;
  private readonly wavePoints: number = 256;
  private readonly barCount: number = 64;
  private readonly maxBarHeight: number = 8;
  
  private barMaterial: THREE.MeshPhongMaterial | null = null;
  private sphereMaterial: THREE.MeshPhongMaterial | null = null;
  
  private time: number = 0;

  constructor(scene: THREE.Scene, themeManager: ThemeManager) {
    this.scene = scene;
    this.themeManager = themeManager;
    
    this.initParticleSystem();
    this.initWaveformRing();
    this.initSpectrumBars();
    this.applyThemeColors();
  }

  setSpectrumAnalyzer(analyzer: SpectrumAnalyzer | null): void {
    this.spectrumAnalyzer = analyzer;
  }

  private initParticleSystem(): void {
    const geometry = new THREE.BufferGeometry();
    
    this.particlePositions = new Float32Array(this.particleCount * 3);
    this.particleBasePositions = new Float32Array(this.particleCount * 3);
    this.particleSizes = new Float32Array(this.particleCount);
    this.particleBaseSizes = new Float32Array(this.particleCount);
    this.particleColors = new Float32Array(this.particleCount * 3);
    
    for (let i = 0; i < this.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.cbrt(Math.random()) * this.sphereRadius;
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      this.particlePositions[i * 3] = x;
      this.particlePositions[i * 3 + 1] = y;
      this.particlePositions[i * 3 + 2] = z;
      
      this.particleBasePositions[i * 3] = x;
      this.particleBasePositions[i * 3 + 1] = y;
      this.particleBasePositions[i * 3 + 2] = z;
      
      const size = 0.05 + Math.random() * 0.15;
      this.particleSizes[i] = size;
      this.particleBaseSizes[i] = size;
      
      this.particleFreqIndices[i] = Math.floor(Math.random() * 32) + 16;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.particleSizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    
    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  private initWaveformRing(): void {
    this.waveformGeometry = new THREE.BufferGeometry();
    this.waveformPositions = new Float32Array(this.wavePoints * 3);
    
    for (let i = 0; i < this.wavePoints; i++) {
      const angle = (i / this.wavePoints) * Math.PI * 2;
      const x = Math.cos(angle) * this.waveRadius;
      const y = 0;
      const z = Math.sin(angle) * this.waveRadius;
      
      this.waveformPositions[i * 3] = x;
      this.waveformPositions[i * 3 + 1] = y;
      this.waveformPositions[i * 3 + 2] = z;
    }
    
    this.waveformGeometry.setAttribute('position', new THREE.BufferAttribute(this.waveformPositions, 3));
    
    const material = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.9,
      linewidth: 2
    });
    
    this.waveformLine = new THREE.Line(this.waveformGeometry, material);
    this.waveformLine.rotation.x = Math.PI / 2;
    this.scene.add(this.waveformLine);
  }

  private initSpectrumBars(): void {
    this.barMaterial = new THREE.MeshPhongMaterial({
      color: 0x3344ff,
      transparent: true,
      opacity: 0.9,
      shininess: 100
    });
    
    this.sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0xff3344,
      transparent: true,
      opacity: 0.9,
      shininess: 100
    });
    
    const barRadius = this.waveRadius + 3;
    
    for (let i = 0; i < this.barCount; i++) {
      const angle = (i / this.barCount) * Math.PI * 2;
      const x = Math.cos(angle) * barRadius;
      const z = Math.sin(angle) * barRadius;
      
      const barGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.3);
      const bar = new THREE.Mesh(barGeometry, this.barMaterial.clone());
      bar.position.set(x, 0.05, z);
      bar.rotation.y = -angle;
      this.scene.add(bar);
      this.bars.push(bar);
      this.barBaseHeights.push(0.1);
      
      const sphereGeometry = new THREE.SphereGeometry(0.2, 16, 16);
      const sphere = new THREE.Mesh(sphereGeometry, this.sphereMaterial.clone());
      sphere.position.set(x, 0.1 + 0.2, z);
      this.scene.add(sphere);
      this.barSpheres.push(sphere);
    }
  }

  private applyThemeColors(): void {
    const colors = this.themeManager.getCurrentColors();
    this.updateParticleColors(colors);
    
    if (this.waveformLine) {
      (this.waveformLine.material as THREE.LineBasicMaterial).color.setHex(colors.waveformColor);
    }
  }

  private updateParticleColors(colors: ThemeColors): void {
    if (!this.particleColors || !this.particleSystem) return;
    
    const particleColors = colors.particleColors;
    
    for (let i = 0; i < this.particleCount; i++) {
      const colorIndex = i % particleColors.length;
      const color = particleColors[colorIndex];
      
      this.particleColors[i * 3] = ((color >> 16) & 255) / 255;
      this.particleColors[i * 3 + 1] = ((color >> 8) & 255) / 255;
      this.particleColors[i * 3 + 2] = (color & 255) / 255;
    }
    
    const colorAttribute = this.particleSystem.geometry.getAttribute('color') as THREE.BufferAttribute;
    colorAttribute.needsUpdate = true;
  }

  private lerpColor(start: number, end: number, t: number): number {
    const r = ((start >> 16) & 255) + (((end >> 16) & 255) - ((start >> 16) & 255)) * t;
    const g = ((start >> 8) & 255) + (((end >> 8) & 255) - ((start >> 8) & 255)) * t;
    const b = (start & 255) + ((end & 255) - (start & 255)) * t;
    return Math.round(r) << 16 | Math.round(g) << 8 | Math.round(b);
  }

  update(spectrum: number[], deltaTime: number): void {
    this.time += deltaTime;
    
    const colors = this.themeManager.getCurrentColors();
    this.updateParticleColors(colors);
    
    if (this.waveformLine) {
      (this.waveformLine.material as THREE.LineBasicMaterial).color.setHex(colors.waveformColor);
    }
    
    let lowFreqEnergy = 0;
    let midHighFreqEnergy = 0;
    
    if (this.spectrumAnalyzer) {
      lowFreqEnergy = this.spectrumAnalyzer.getLowFrequencyEnergy();
      midHighFreqEnergy = this.spectrumAnalyzer.getMidHighFrequencyEnergy();
    }
    
    this.updateParticles(spectrum, lowFreqEnergy, midHighFreqEnergy);
    this.updateWaveform(spectrum, lowFreqEnergy);
    this.updateBars(spectrum, colors);
  }

  private updateParticles(
    spectrum: number[],
    lowFreqEnergy: number,
    midHighFreqEnergy: number
  ): void {
    if (!this.particleSystem || !this.particlePositions || !this.particleBasePositions ||
        !this.particleSizes || !this.particleBaseSizes) return;
    
    const maxOffset = 2;
    const sizeMultiplier = 1 + lowFreqEnergy * 1.5;
    const opacityMultiplier = 0.5 + lowFreqEnergy * 0.5;
    
    for (let i = 0; i < this.particleCount; i++) {
      const freqIndex = this.particleFreqIndices[i];
      const freqEnergy = spectrum[freqIndex] || 0;
      
      const bx = this.particleBasePositions[i * 3];
      const by = this.particleBasePositions[i * 3 + 1];
      const bz = this.particleBasePositions[i * 3 + 2];
      
      const length = Math.sqrt(bx * bx + by * by + bz * bz);
      if (length > 0) {
        const nx = bx / length;
        const ny = by / length;
        const nz = bz / length;
        
        const offset = freqEnergy * midHighFreqEnergy * maxOffset;
        
        this.particlePositions[i * 3] = bx + nx * offset;
        this.particlePositions[i * 3 + 1] = by + ny * offset;
        this.particlePositions[i * 3 + 2] = bz + nz * offset;
      }
      
      this.particleSizes[i] = this.particleBaseSizes[i] * sizeMultiplier;
    }
    
    const positionAttribute = this.particleSystem.geometry.getAttribute('position') as THREE.BufferAttribute;
    positionAttribute.needsUpdate = true;
    
    const sizeAttribute = this.particleSystem.geometry.getAttribute('size') as THREE.BufferAttribute;
    sizeAttribute.needsUpdate = true;
    
    const material = this.particleSystem.material as THREE.PointsMaterial;
    material.opacity = opacityMultiplier;
  }

  private updateWaveform(_spectrum: number[], lowFreqEnergy: number): void {
    if (!this.waveformLine || !this.waveformPositions || !this.waveformGeometry) return;
    
    let waveformData: number[] = [];
    if (this.spectrumAnalyzer) {
      waveformData = this.spectrumAnalyzer.getWaveform();
    }
    
    for (let i = 0; i < this.wavePoints; i++) {
      const waveIndex = Math.floor((i / this.wavePoints) * waveformData.length);
      const waveValue = waveformData[waveIndex] || 0;
      
      const amplitude = 1.5 * lowFreqEnergy;
      const y = waveValue * amplitude;
      
      this.waveformPositions[i * 3 + 1] = y;
    }
    
    const positionAttribute = this.waveformGeometry.getAttribute('position') as THREE.BufferAttribute;
    positionAttribute.needsUpdate = true;
  }

  private updateBars(spectrum: number[], colors: ThemeColors): void {
    for (let i = 0; i < this.barCount; i++) {
      const bar = this.bars[i];
      const sphere = this.barSpheres[i];
      const energy = spectrum[i] || 0;
      
      const height = 0.1 + energy * this.maxBarHeight;
      bar.scale.y = height / 0.1;
      bar.position.y = height / 2;
      
      const colorRatio = energy;
      const barColor = this.lerpColor(colors.barGradientStart, colors.barGradientEnd, colorRatio);
      (bar.material as THREE.MeshPhongMaterial).color.setHex(barColor);
      
      sphere.position.y = height + 0.2;
      const sphereColor = this.lerpColor(colors.barGradientStart, colors.barGradientEnd, Math.min(colorRatio + 0.2, 1));
      (sphere.material as THREE.MeshPhongMaterial).color.setHex(sphereColor);
    }
  }

  dispose(): void {
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as THREE.Material).dispose();
    }
    
    if (this.waveformLine) {
      this.scene.remove(this.waveformLine);
      this.waveformLine.geometry.dispose();
      (this.waveformLine.material as THREE.Material).dispose();
    }
    
    this.bars.forEach(bar => {
      this.scene.remove(bar);
      bar.geometry.dispose();
      (bar.material as THREE.Material).dispose();
    });
    
    this.barSpheres.forEach(sphere => {
      this.scene.remove(sphere);
      sphere.geometry.dispose();
      (sphere.material as THREE.Material).dispose();
    });
    
    if (this.barMaterial) this.barMaterial.dispose();
    if (this.sphereMaterial) this.sphereMaterial.dispose();
  }
}
