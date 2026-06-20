import * as THREE from 'three';
import { EarthquakeData } from '../data/DataLoader';
import { EarthRenderer, MarkerData } from '../earth/EarthRenderer';

interface VisualizerOptions {
  particlesPerEarthquake?: number;
  minParticleRadius?: number;
  maxParticleRadius?: number;
  jitterAmount?: number;
  jitterFrequency?: number;
  animationDuration?: number;
  fadeDuration?: number;
}

interface EarthquakeVisual {
  data: EarthquakeData;
  group: THREE.Group;
  particles: THREE.Points;
  basePositions: Float32Array;
  baseColors: Float32Array;
  baseSize: number;
  currentScale: number;
  targetScale: number;
  targetOpacity: number;
  currentOpacity: number;
  isHighlighted: boolean;
  isVisible: boolean;
  scaleAnimationProgress: number;
}

export class EarthquakeVisualizer {
  private renderer: EarthRenderer;
  private options: Required<VisualizerOptions>;
  private visuals: Map<string, EarthquakeVisual>;
  private clock: THREE.Clock;
  private lastJitterTime: number;
  private onTooltip?: (data: EarthquakeData | null, position: { x: number; y: number } | null) => void;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredVisual: EarthquakeVisual | null;

  constructor(renderer: EarthRenderer, options: VisualizerOptions = {}) {
    this.renderer = renderer;
    this.options = {
      particlesPerEarthquake: 20,
      minParticleRadius: 0.05,
      maxParticleRadius: 0.15,
      jitterAmount: 0.02,
      jitterFrequency: 500,
      animationDuration: 1000,
      fadeDuration: 500,
      ...options
    };
    
    this.visuals = new Map();
    this.clock = new THREE.Clock();
    this.lastJitterTime = 0;
    this.hoveredVisual = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.renderer.setOnAnimationFrame(() => this.update());
    this.setupMouseTracking();
  }

  private getMagnitudeColor(magnitude: number): THREE.Color {
    const t = (magnitude - 3) / (7 - 3);
    const startColor = new THREE.Color(0x00ccff);
    const endColor = new THREE.Color(0xff3300);
    return startColor.clone().lerp(endColor, t);
  }

  private getParticleCount(magnitude: number): number {
    const minParticles = 10;
    const maxParticles = 40;
    const t = (magnitude - 3) / (7 - 3);
    return Math.floor(minParticles + (maxParticles - minParticles) * t);
  }

  private getParticleRadius(magnitude: number): number {
    const t = (magnitude - 3) / (7 - 3);
    return this.options.minParticleRadius + (this.options.maxParticleRadius - this.options.minParticleRadius) * t;
  }

  public createEarthquakeVisual(data: EarthquakeData): void {
    if (this.visuals.has(data.id)) {
      return;
    }

    const particleCount = Math.min(this.getParticleCount(data.magnitude), 40);
    const color = this.getMagnitudeColor(data.magnitude);
    const particleRadius = this.getParticleRadius(data.magnitude);

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const basePositions = new Float32Array(particleCount * 3);
    const baseColors = new Float32Array(particleCount * 3);

    const depth = data.depth;

    for (let i = 0; i < particleCount; i++) {
      const t = i / (particleCount - 1);
      const radius = 2 - (t * depth * 0.5);

      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = -radius + 2;

      basePositions[i * 3] = 0;
      basePositions[i * 3 + 1] = 0;
      basePositions[i * 3 + 2] = -radius + 2;

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      baseColors[i * 3] = color.r;
      baseColors[i * 3 + 1] = color.g;
      baseColors[i * 3 + 2] = color.b;

      sizes[i] = particleRadius;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: particleRadius,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    const group = new THREE.Group();
    group.add(particles);

    const markerData: MarkerData = {
      id: data.id,
      latitude: data.latitude,
      longitude: data.longitude,
      depth: data.depth,
      magnitude: data.magnitude,
      timestamp: data.timestamp
    };

    this.renderer.addMarker(markerData, group);

    const visual: EarthquakeVisual = {
      data,
      group,
      particles,
      basePositions,
      baseColors,
      baseSize: particleRadius,
      currentScale: 0,
      targetScale: 1,
      targetOpacity: 1,
      currentOpacity: 0,
      isHighlighted: false,
      isVisible: true,
      scaleAnimationProgress: 0
    };

    this.visuals.set(data.id, visual);
  }

  public createAllVisuals(data: EarthquakeData[]): void {
    let totalParticles = 0;
    const maxTotalParticles = 2000;

    for (const earthquake of data) {
      const particleCount = this.getParticleCount(earthquake.magnitude);
      if (totalParticles + particleCount > maxTotalParticles) {
        console.warn(`粒子总数超过限制(${maxTotalParticles})，跳过部分数据`);
        break;
      }
      this.createEarthquakeVisual(earthquake);
      totalParticles += particleCount;
    }

    console.log(`创建了 ${this.visuals.size} 个地震可视化，共 ${totalParticles} 个粒子`);
  }

  public updateTimeFilter(currentTime: number): void {
    this.visuals.forEach((visual) => {
      if (visual.data.timestamp <= currentTime) {
        visual.targetOpacity = 1;
      } else {
        visual.targetOpacity = 0;
      }
    });
  }

  public updateMagnitudeFilter(activeRanges: Array<{ min: number; max: number }>): void {
    this.visuals.forEach((visual) => {
      const mag = visual.data.magnitude;
      const inRange = activeRanges.some(range => mag >= range.min && mag < range.max);
      
      if (inRange && visual.targetOpacity > 0) {
        visual.isVisible = true;
        visual.targetOpacity = 1;
      } else if (!inRange) {
        visual.isVisible = false;
        visual.targetOpacity = 0;
      }
    });
  }

  private updateJitter(): void {
    const now = performance.now();
    if (now - this.lastJitterTime < this.options.jitterFrequency) {
      return;
    }
    this.lastJitterTime = now;

    this.visuals.forEach((visual) => {
      if (visual.currentOpacity <= 0) return;

      const positions = visual.particles.geometry.attributes.position.array as Float32Array;
      const particleCount = positions.length / 3;

      for (let i = 0; i < particleCount; i++) {
        const jitterX = (Math.random() - 0.5) * this.options.jitterAmount * 2;
        const jitterY = (Math.random() - 0.5) * this.options.jitterAmount * 2;
        const jitterZ = (Math.random() - 0.5) * this.options.jitterAmount * 2;

        positions[i * 3] = visual.basePositions[i * 3] + jitterX;
        positions[i * 3 + 1] = visual.basePositions[i * 3 + 1] + jitterY;
        positions[i * 3 + 2] = visual.basePositions[i * 3 + 2] + jitterZ;
      }

      visual.particles.geometry.attributes.position.needsUpdate = true;
    });
  }

  private update(): void {
    const delta = this.clock.getDelta() * 1000;

    this.visuals.forEach((visual) => {
      if (visual.scaleAnimationProgress < 1) {
        visual.scaleAnimationProgress += delta / this.options.animationDuration;
        visual.scaleAnimationProgress = Math.min(visual.scaleAnimationProgress, 1);
        
        const t = visual.scaleAnimationProgress;
        const easeOutElastic = 1 - Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (Math.PI * 2) / 3);
        visual.currentScale = easeOutElastic * visual.targetScale;
      } else {
        visual.currentScale = visual.targetScale;
      }

      if (Math.abs(visual.currentOpacity - visual.targetOpacity) > 0.01) {
        const fadeSpeed = delta / this.options.fadeDuration;
        if (visual.currentOpacity < visual.targetOpacity) {
          visual.currentOpacity = Math.min(visual.currentOpacity + fadeSpeed, visual.targetOpacity);
        } else {
          visual.currentOpacity = Math.max(visual.currentOpacity - fadeSpeed, visual.targetOpacity);
        }
      } else {
        visual.currentOpacity = visual.targetOpacity;
      }

      visual.group.scale.setScalar(visual.currentScale);
      
      const material = visual.particles.material as THREE.PointsMaterial;
      material.opacity = visual.currentOpacity;
      
      const colors = visual.particles.geometry.attributes.color.array as Float32Array;
      if (visual.isHighlighted) {
        for (let i = 0; i < colors.length; i += 3) {
          colors[i] = 1.0;
          colors[i + 1] = 1.0;
          colors[i + 2] = 1.0;
        }
        material.size = visual.baseSize * 2.0;
      } else {
        for (let i = 0; i < colors.length; i += 3) {
          colors[i] = visual.baseColors[i];
          colors[i + 1] = visual.baseColors[i + 1];
          colors[i + 2] = visual.baseColors[i + 2];
        }
        material.size = visual.baseSize;
      }
      visual.particles.geometry.attributes.color.needsUpdate = true;
    });

    this.updateJitter();
  }

  private setupMouseTracking(): void {
    const canvas = this.renderer.getCanvas();

    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.checkHover();
      
      if (this.onTooltip && this.hoveredVisual) {
        this.onTooltip(this.hoveredVisual.data, { x: event.clientX, y: event.clientY });
      } else if (this.onTooltip) {
        this.onTooltip(null, null);
      }
    });

    canvas.addEventListener('mouseleave', () => {
      if (this.hoveredVisual) {
        this.hoveredVisual.isHighlighted = false;
        this.hoveredVisual = null;
      }
      if (this.onTooltip) {
        this.onTooltip(null, null);
      }
    });
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.renderer.getCamera());

    const allParticles: THREE.Points[] = [];
    const visualMap = new Map<THREE.Points, EarthquakeVisual>();

    this.visuals.forEach((visual) => {
      if (visual.currentOpacity > 0.1) {
        allParticles.push(visual.particles);
        visualMap.set(visual.particles, visual);
      }
    });

    const intersects = this.raycaster.intersectObjects(allParticles, false);

    if (this.hoveredVisual && (!intersects.length || visualMap.get(intersects[0].object as THREE.Points) !== this.hoveredVisual)) {
      this.hoveredVisual.isHighlighted = false;
      this.hoveredVisual = null;
    }

    if (intersects.length > 0) {
      const visual = visualMap.get(intersects[0].object as THREE.Points);
      if (visual && visual !== this.hoveredVisual) {
        this.hoveredVisual = visual;
        visual.isHighlighted = true;
      }
    }
  }

  public setTooltipCallback(callback: (data: EarthquakeData | null, position: { x: number; y: number } | null) => void): void {
    this.onTooltip = callback;
  }

  public getVisibleCount(): number {
    let count = 0;
    this.visuals.forEach((visual) => {
      if (visual.currentOpacity > 0.5) {
        count++;
      }
    });
    return count;
  }

  public getMaxMagnitude(): number {
    let maxMag = 0;
    this.visuals.forEach((visual) => {
      if (visual.currentOpacity > 0.5 && visual.data.magnitude > maxMag) {
        maxMag = visual.data.magnitude;
      }
    });
    return maxMag;
  }

  public getAverageDepth(): number {
    let totalDepth = 0;
    let count = 0;
    this.visuals.forEach((visual) => {
      if (visual.currentOpacity > 0.5) {
        totalDepth += visual.data.depth * 70;
        count++;
      }
    });
    return count > 0 ? totalDepth / count : 0;
  }

  public getVisuals(): Map<string, EarthquakeVisual> {
    return this.visuals;
  }

  public dispose(): void {
    this.visuals.forEach((visual) => {
      this.renderer.removeMarker(visual.data.id);
      visual.particles.geometry.dispose();
      (visual.particles.material as THREE.Material).dispose();
    });
    this.visuals.clear();
  }
}
