import * as THREE from 'three';
import type { SpectrumData } from './audioAnalyzer';
import type { ColorTheme } from './sceneManager';

interface BarData {
  mesh: THREE.Mesh;
  glowParticle: THREE.Points;
  targetHeight: number;
  currentHeight: number;
  velocity: number;
  baseAngle: number;
}

export class SpectrumVisualizer {
  private barCount: number = 128;
  private bars: BarData[] = [];
  private group: THREE.Group;
  private sceneManager: any;
  private readonly minHeight: number = 0.5;
  private readonly maxHeight: number = 8;
  private readonly barRadius: number = 0.3;
  private readonly damping: number = 0.8;

  constructor(group: THREE.Group, sceneManager: any) {
    this.group = group;
    this.sceneManager = sceneManager;
    this.createBars();
  }

  private createBars(): void {
    const radius = this.sceneManager.getSpectrumRadius();
    const theme = this.sceneManager.currentTheme;
    const lowColor = new THREE.Color(theme.lowColor);
    const highColor = new THREE.Color(theme.highColor);

    for (let i = 0; i < this.barCount; i++) {
      const angle = (i / this.barCount) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const geometry = new THREE.CylinderGeometry(this.barRadius, this.barRadius, this.minHeight, 16);
      const barColor = lowColor.clone().lerp(highColor, i / this.barCount);

      const material = new THREE.MeshPhysicalMaterial({
        color: barColor,
        emissive: barColor,
        emissiveIntensity: 0.3,
        metalness: 0.3,
        roughness: 0.4,
        transparent: true,
        opacity: 0.9
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, this.minHeight / 2 - 1, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const glowGeometry = new THREE.BufferGeometry();
      const glowPositions = new Float32Array(3);
      glowPositions[0] = 0;
      glowPositions[1] = 0;
      glowPositions[2] = 0;
      glowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));

      const glowMaterial = new THREE.PointsMaterial({
        color: barColor,
        size: 0.1,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      });

      const glowParticle = new THREE.Points(glowGeometry, glowMaterial);
      glowParticle.position.set(x, this.minHeight - 1, z);

      this.group.add(mesh);
      this.group.add(glowParticle);

      this.bars.push({
        mesh,
        glowParticle,
        targetHeight: this.minHeight,
        currentHeight: this.minHeight,
        velocity: 0,
        baseAngle: angle
      });
    }
  }

  updateColorTheme(theme: ColorTheme): void {
    const lowColor = new THREE.Color(theme.lowColor);
    const highColor = new THREE.Color(theme.highColor);

    this.bars.forEach((bar, i) => {
      const barColor = lowColor.clone().lerp(highColor, i / this.barCount);
      const material = bar.mesh.material as THREE.MeshPhysicalMaterial;
      material.color.copy(barColor);
      material.emissive.copy(barColor);

      const glowMaterial = bar.glowParticle.material as THREE.PointsMaterial;
      glowMaterial.color.copy(barColor);
    });
  }

  updatePositions(): void {
    const radius = this.sceneManager.getSpectrumRadius();

    this.bars.forEach((bar, i) => {
      const angle = bar.baseAngle;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      bar.mesh.position.set(x, bar.currentHeight / 2 - 1, z);
      bar.glowParticle.position.set(x, bar.currentHeight - 1, z);
    });
  }

  update(spectrumData: SpectrumData): void {
    const radius = this.sceneManager.getSpectrumRadius();

    for (let i = 0; i < this.barCount; i++) {
      const bar = this.bars[i];
      const amplitude = spectrumData[i] || 0;
      const frequencyIndex = i;

      bar.targetHeight = this.minHeight + amplitude * (this.maxHeight - this.minHeight);

      const springForce = (bar.targetHeight - bar.currentHeight) * 0.3;
      bar.velocity += springForce;
      bar.velocity *= this.damping;
      bar.currentHeight += bar.velocity;

      bar.currentHeight = Math.max(this.minHeight, Math.min(this.maxHeight, bar.currentHeight));

      if (frequencyIndex < 20) {
        const shake = Math.sin(Date.now() * 0.01 + i) * 0.3 * amplitude;
        bar.currentHeight += shake;
      }

      const scale = bar.currentHeight / this.minHeight;
      bar.mesh.scale.y = scale;

      const angle = bar.baseAngle;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      bar.mesh.position.set(x, bar.currentHeight / 2 - 1, z);
      bar.glowParticle.position.set(x, bar.currentHeight - 1, z);

      const material = bar.mesh.material as THREE.MeshPhysicalMaterial;
      material.emissiveIntensity = 0.3 + amplitude * 0.7;
    }
  }

  dispose(): void {
    this.bars.forEach(bar => {
      bar.mesh.geometry.dispose();
      (bar.mesh.material as THREE.Material).dispose();
      bar.glowParticle.geometry.dispose();
      (bar.glowParticle.material as THREE.Material).dispose();
    });
    this.bars = [];
  }
}
