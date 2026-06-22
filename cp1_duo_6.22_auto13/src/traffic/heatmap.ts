import * as THREE from 'three';
import { RoadNetwork } from './roadNetwork';
import type { DensityData, HeatmapConfig } from '../types';

export class HeatmapRenderer {
  private scene: THREE.Scene;
  private roadNetwork: RoadNetwork;
  private heatmapGroup: THREE.Group = new THREE.Group();
  private heatmapMeshes: Map<string, THREE.Mesh> = new Map();

  private config: HeatmapConfig = {
    minDensityThreshold: 0.2,
    maxDensityThreshold: 0.8,
    updateInterval: 0.1,
    maxUpdateTime: 100,
  };

  private densityData: DensityData[] = [];
  private lastUpdateTime: number = 0;
  private updateTimer: number = 0;
  private isVisible: boolean = true;

  private updateTimes: number[] = [];
  private lastUpdateDuration: number = 0;
  private updateOverrunCount: number = 0;
  private skipNextUpdates: number = 0;
  private degradationLevel: number = 0;
  private consecutiveOverruns: number = 0;

  private shaderMaterial: THREE.ShaderMaterial | null = null;

  constructor(scene: THREE.Scene, roadNetwork: RoadNetwork) {
    this.scene = scene;
    this.roadNetwork = roadNetwork;
    this.initShaderMaterial();
    this.createHeatmapMeshes();
    this.heatmapGroup.position.y = 0.03;
    this.scene.add(this.heatmapGroup);
  }

  private initShaderMaterial(): void {
    const vertexShader = `
      varying vec2 vUv;
      varying float vDensity;
      attribute float density;
      uniform float uMinThreshold;
      uniform float uMaxThreshold;
      
      void main() {
        vUv = uv;
        vDensity = density;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      varying vec2 vUv;
      varying float vDensity;
      uniform float uMinThreshold;
      uniform float uMaxThreshold;
      uniform float uOpacity;
      
      vec3 getHeatColor(float density) {
        float normalizedDensity = clamp((density - uMinThreshold) / (uMaxThreshold - uMinThreshold), 0.0, 1.0);
        
        vec3 green = vec3(0.0, 0.8, 0.2);
        vec3 yellow = vec3(1.0, 0.9, 0.0);
        vec3 orange = vec3(1.0, 0.5, 0.0);
        vec3 red = vec3(0.9, 0.1, 0.1);
        
        if (normalizedDensity < 0.33) {
          float t = normalizedDensity / 0.33;
          return mix(green, yellow, t);
        } else if (normalizedDensity < 0.66) {
          float t = (normalizedDensity - 0.33) / 0.33;
          return mix(yellow, orange, t);
        } else {
          float t = (normalizedDensity - 0.66) / 0.34;
          return mix(orange, red, t);
        }
      }
      
      void main() {
        vec3 color = getHeatColor(vDensity);
        
        float edgeFactor = 1.0;
        float edgeWidth = 0.1;
        if (vUv.x < edgeWidth || vUv.x > 1.0 - edgeWidth || vUv.y < edgeWidth || vUv.y > 1.0 - edgeWidth) {
          edgeFactor = 0.7;
        }
        
        float alpha = uOpacity * edgeFactor;
        
        gl_FragColor = vec4(color, alpha);
      }
    `;

    this.shaderMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uMinThreshold: { value: this.config.minDensityThreshold },
        uMaxThreshold: { value: this.config.maxDensityThreshold },
        uOpacity: { value: 0.6 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }

  private createHeatmapMeshes(): void {
    const segments = this.roadNetwork.getSegments();
    const roadWidth = 8;

    segments.forEach((segment) => {
      const dx = segment.end.x - segment.start.x;
      const dz = segment.end.z - segment.start.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);

      const segmentsCount = Math.max(2, Math.floor(length / 5));
      const geometry = new THREE.PlaneGeometry(length, roadWidth, segmentsCount, 1);

      const densities = new Float32Array(geometry.attributes.position.count);
      for (let i = 0; i < densities.length; i++) {
        densities[i] = 0;
      }
      geometry.setAttribute('density', new THREE.BufferAttribute(densities, 1));

      const mesh = new THREE.Mesh(geometry, this.shaderMaterial!);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(
        (segment.start.x + segment.end.x) / 2,
        0,
        (segment.start.z + segment.end.z) / 2
      );
      mesh.rotation.y = -angle;
      mesh.renderOrder = 1;

      this.heatmapMeshes.set(segment.id, mesh);
      this.heatmapGroup.add(mesh);
    });
  }

  update(deltaTime: number, densityData: DensityData[]): void {
    this.updateTimer += deltaTime;
    this.densityData = densityData;

    if (this.updateTimer >= this.config.updateInterval) {
      this.updateTimer = 0;
      this.updateHeatmapData();
    }
  }

  private updateHeatmapData(): void {
    if (this.skipNextUpdates > 0) {
      this.skipNextUpdates--;
      return;
    }

    const startTime = performance.now();
    const budgetMs = this.config.maxUpdateTime;

    try {
      let updatedCount = 0;
      const step = this.degradationLevel === 0 ? 1 : this.degradationLevel === 1 ? 2 : 3;

      for (let idx = 0; idx < this.densityData.length; idx += step) {
        const data = this.densityData[idx];
        const mesh = this.heatmapMeshes.get(data.segmentId);
        if (!mesh) continue;

        const densityAttribute = mesh.geometry.getAttribute('density') as THREE.BufferAttribute;
        const densities = densityAttribute.array as Float32Array;

        for (let i = 0; i < densities.length; i++) {
          const smoothedDensity = this.smoothDensity(data.segmentId, data.density, i, densities.length);
          densities[i] = smoothedDensity;
        }

        densityAttribute.needsUpdate = true;
        updatedCount++;

        const elapsed = performance.now() - startTime;
        if (elapsed > budgetMs * 0.8) {
          const remaining = this.densityData.length - idx - step;
          if (remaining > 0) {
            this.skipNextUpdates = Math.max(1, Math.ceil(remaining / step / 4));
          }
          break;
        }
      }

      const endTime = performance.now();
      this.lastUpdateDuration = endTime - startTime;
      this.updateTimes.push(this.lastUpdateDuration);

      if (this.updateTimes.length > 60) {
        this.updateTimes.shift();
      }

      if (this.lastUpdateDuration > budgetMs) {
        this.updateOverrunCount++;
        this.consecutiveOverruns++;
        this.applyDegradation();
      } else {
        this.consecutiveOverruns = 0;
        this.recoverFromDegradation();
      }
    } catch (error) {
      console.error('Heatmap update error:', error);
      this.skipNextUpdates = 3;
    }
  }

  private smoothDensity(
    segmentId: string,
    baseDensity: number,
    vertexIndex: number,
    totalVertices: number
  ): number {
    const progress = vertexIndex / (totalVertices - 1);
    const noise = Math.sin(progress * 10 + segmentId.length) * 0.05;
    return Math.max(0, Math.min(1, baseDensity + noise));
  }

  private applyDegradation(): void {
    if (this.consecutiveOverruns >= 3 && this.degradationLevel < 2) {
      this.degradationLevel++;
      this.consecutiveOverruns = 0;

      if (this.degradationLevel === 1) {
        this.config.updateInterval = 0.2;
      } else if (this.degradationLevel === 2) {
        this.config.updateInterval = 0.5;
      }
    }
  }

  private recoverFromDegradation(): void {
    if (this.degradationLevel > 0) {
      const avgTime = this.updateTimes.length > 0
        ? this.updateTimes.reduce((a, b) => a + b, 0) / this.updateTimes.length
        : 0;

      if (avgTime < this.config.maxUpdateTime * 0.3) {
        this.degradationLevel--;
        this.consecutiveOverruns = 0;

        if (this.degradationLevel === 0) {
          this.config.updateInterval = 0.1;
        } else if (this.degradationLevel === 1) {
          this.config.updateInterval = 0.2;
        }
      }
    }
  }

  setDensityThresholds(min: number, max: number): void {
    this.config.minDensityThreshold = Math.max(0, Math.min(1, min));
    this.config.maxDensityThreshold = Math.max(0, Math.min(1, max));

    if (this.config.minDensityThreshold >= this.config.maxDensityThreshold) {
      this.config.minDensityThreshold = this.config.maxDensityThreshold - 0.1;
    }

    if (this.shaderMaterial) {
      this.shaderMaterial.uniforms.uMinThreshold.value = this.config.minDensityThreshold;
      this.shaderMaterial.uniforms.uMaxThreshold.value = this.config.maxDensityThreshold;
    }
  }

  getMinDensityThreshold(): number {
    return this.config.minDensityThreshold;
  }

  getMaxDensityThreshold(): number {
    return this.config.maxDensityThreshold;
  }

  setOpacity(opacity: number): void {
    if (this.shaderMaterial) {
      this.shaderMaterial.uniforms.uOpacity.value = Math.max(0, Math.min(1, opacity));
    }
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.heatmapGroup.visible = visible;
  }

  isHeatmapVisible(): boolean {
    return this.isVisible;
  }

  getUpdateInterval(): number {
    return this.config.updateInterval;
  }

  getLastUpdateDuration(): number {
    return this.lastUpdateDuration;
  }

  getAverageUpdateTime(): number {
    if (this.updateTimes.length === 0) return 0;
    return this.updateTimes.reduce((a, b) => a + b, 0) / this.updateTimes.length;
  }

  getMaxUpdateTime(): number {
    return this.config.maxUpdateTime;
  }

  setMaxUpdateTime(ms: number): void {
    this.config.maxUpdateTime = Math.max(10, ms);
  }

  setConfig(config: Partial<HeatmapConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.shaderMaterial) {
      if (config.minDensityThreshold !== undefined) {
        this.shaderMaterial.uniforms.uMinThreshold.value = this.config.minDensityThreshold;
      }
      if (config.maxDensityThreshold !== undefined) {
        this.shaderMaterial.uniforms.uMaxThreshold.value = this.config.maxDensityThreshold;
      }
    }
  }

  getConfig(): HeatmapConfig {
    return { ...this.config };
  }

  getHeatmapGroup(): THREE.Group {
    return this.heatmapGroup;
  }

  refresh(): void {
    this.updateHeatmapData();
  }

  dispose(): void {
    this.heatmapMeshes.forEach((mesh) => {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    this.heatmapMeshes.clear();
    this.scene.remove(this.heatmapGroup);
  }
}
