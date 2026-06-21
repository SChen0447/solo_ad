import * as THREE from 'three';
import type { EmotionAnalysisResult, KeywordGroup } from './emotionAnalyzer';

export interface ThemeColors {
  name: string;
  particles: [string, string];
  background: string;
  brightness: number;
}

export const THEMES: Record<string, ThemeColors> = {
  default: {
    name: 'default',
    particles: ['#ff6b35', '#667eea'],
    background: '#0f0c29',
    brightness: 1.0
  },
  sunrise: {
    name: 'sunrise',
    particles: ['#f6e05e', '#ed8936'],
    background: '#2d1f0f',
    brightness: 1.3
  },
  galaxy: {
    name: 'galaxy',
    particles: ['#9b59b6', '#ecf0f1'],
    background: '#1a202c',
    brightness: 1.0
  },
  forest: {
    name: 'forest',
    particles: ['#38a169', '#8b5e2e'],
    background: '#0f1a0f',
    brightness: 0.95
  }
};

interface ParticleData {
  basePosition: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  groupIndex: number;
  keyword: string;
  phase: number;
  motionType: string;
}

export class ParticleEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private points: THREE.Points | null = null;
  private particleData: ParticleData[] = [];
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private speedMultiplier: number = 1;
  private targetSpeedMultiplier: number = 1;
  private currentTheme: ThemeColors = THEMES.default;
  private targetTheme: ThemeColors = THEMES.default;
  private colorTransitionProgress: number = 1;
  private baseWarmColor: THREE.Color = new THREE.Color('#ff6b35');
  private baseCoolColor: THREE.Color = new THREE.Color('#667eea');
  private targetWarmColor: THREE.Color = new THREE.Color('#ff6b35');
  private targetCoolColor: THREE.Color = new THREE.Color('#667eea');
  private currentWarmColor: THREE.Color = new THREE.Color('#ff6b35');
  private currentCoolColor: THREE.Color = new THREE.Color('#667eea');
  private fadeProgress: number = 0;
  private analysisResult: EmotionAnalysisResult | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  generateParticles(text: string, analysis: EmotionAnalysisResult): void {
    this.clearParticles();
    this.analysisResult = analysis;

    const count = 400 + Math.floor(Math.random() * 201);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const groupIndices = new Float32Array(count);

    const warmColor = analysis.baseColor === 'warm'
      ? new THREE.Color(analysis.warmHex)
      : new THREE.Color(analysis.coolHex);

    const coolColor = analysis.baseColor === 'warm'
      : new THREE.Color(analysis.coolHex)
      : new THREE.Color(analysis.warmHex);

    const hueShift = analysis.baseColor === 'warm' ? 0.05 : -0.05;

    this.baseWarmColor.copy(warmColor);
    this.baseCoolColor.copy(coolColor);
    this.currentWarmColor.copy(warmColor);
    this.currentCoolColor.copy(coolColor);
    this.targetWarmColor.copy(warmColor);
    this.targetCoolColor.copy(coolColor);

    this.particleData = [];
    let particleIdx = 0;

    for (let gi = 0; gi < analysis.keywordGroups.length; gi++) {
      const group: KeywordGroup = analysis.keywordGroups[gi];
      const groupCount = Math.round(count * group.particleRatio);
      const actualCount = gi === analysis.keywordGroups.length - 1
        ? count - particleIdx
        : groupCount;

      for (let i = 0; i < actualCount && particleIdx < count; i++) {
        const idx = particleIdx;
        const posIdx = idx * 3;
        const colIdx = idx * 3;

        const x = (Math.random() - 0.5) * 16;
        const y = (Math.random() - 0.5) * 10;
        const z = (Math.random() - 0.5) * 12;

        positions[posIdx] = x;
        positions[posIdx + 1] = y;
        positions[posIdx + 2] = z;

        const colorMix = Math.random();
        const particleColor = new THREE.Color().copy(warmColor).lerp(coolColor, colorMix);
        particleColor.offsetHSL(hueShift * (Math.random() - 0.5), 0, (Math.random() - 0.5) * 0.1);

        colors[colIdx] = particleColor.r;
        colors[colIdx + 1] = particleColor.g;
        colors[colIdx + 2] = particleColor.b;

        const size = 1.5 + Math.random() * 2.5;
        sizes[idx] = size;
        groupIndices[idx] = gi;

        this.particleData.push({
          basePosition: new THREE.Vector3(x, y, z),
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3
          ),
          size,
          groupIndex: gi,
          keyword: group.keyword,
          phase: Math.random() * Math.PI * 2,
          motionType: group.motionType
        });

        particleIdx++;
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uFadeProgress: { value: 0 },
        uBrightness: { value: 1.0 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float uPixelRatio;
        uniform float uFadeProgress;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z) * uFadeProgress;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float uBrightness;
        uniform float uFadeProgress;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0) * uFadeProgress;
          gl_FragColor = vec4(vColor * uBrightness, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
    this.fadeProgress = 0;
    this.colorTransitionProgress = 1;
  }

  update(delta: number): void {
    if (!this.points || !this.geometry) return;

    if (this.fadeProgress < 1) {
      this.fadeProgress = Math.min(1, this.fadeProgress + delta / 0.6);
      if (this.material) {
        this.material.uniforms.uFadeProgress.value = this.fadeProgress;
      }
    }

    if (this.speedMultiplier !== this.targetSpeedMultiplier) {
      const diff = this.targetSpeedMultiplier - this.speedMultiplier;
      this.speedMultiplier += diff * Math.min(1, delta * 8);
      if (Math.abs(this.speedMultiplier - this.targetSpeedMultiplier) < 0.001) {
        this.speedMultiplier = this.targetSpeedMultiplier;
      }
    }

    if (this.colorTransitionProgress < 1) {
      this.colorTransitionProgress = Math.min(1, this.colorTransitionProgress + delta / 0.8);
      const t = 1 - Math.pow(1 - this.colorTransitionProgress, 3);

      this.currentWarmColor.copy(this.baseWarmColor).lerp(this.targetWarmColor, t);
      this.currentCoolColor.copy(this.baseCoolColor).lerp(this.targetCoolColor, t);

      this.updateParticleColors();
    }

    const positions = this.geometry.attributes.position.array as Float32Array;
    const time = performance.now() * 0.001;
    const effSpeed = this.speedMultiplier;

    for (let i = 0; i < this.particleData.length; i++) {
      const p = this.particleData[i];
      const posIdx = i * 3;
      const baseX = p.basePosition.x;
      const baseY = p.basePosition.y;
      const baseZ = p.basePosition.z;
      const phase = p.phase;
      const d = delta * effSpeed;

      let x = baseX;
      let y = baseY;
      let z = baseZ;

      switch (p.motionType) {
        case 'upward_slow':
          x += Math.sin(time * 0.3 + phase) * 0.8;
          y += (time * 0.15 + phase) % 8 - 4;
          y = baseY + ((y - baseY + 5) % 10) - 5;
          z += Math.cos(time * 0.2 + phase) * 0.5;
          break;

        case 'wave_horizontal':
          x += Math.sin(time * 0.5 + phase * 2) * 2;
          y += Math.sin(time * 0.8 + phase) * 0.6;
          z += Math.cos(time * 0.4 + phase) * 0.8;
          break;

        case 'spiral':
          const angle = time * 0.4 + phase;
          const radius = 1.5 + Math.sin(time * 0.2 + phase) * 0.5;
          x += Math.cos(angle) * radius;
          z += Math.sin(angle) * radius;
          y += Math.sin(time * 0.3 + phase) * 0.8;
          break;

        case 'float_hover':
          x += Math.sin(time * 0.25 + phase) * 1.0;
          y += Math.sin(time * 0.35 + phase * 1.3) * 1.2;
          z += Math.cos(time * 0.2 + phase * 0.7) * 0.9;
          break;

        case 'drift_forward':
          x += Math.sin(time * 0.2 + phase) * 1.2;
          y += Math.sin(time * 0.15 + phase) * 0.5;
          z += ((time * 0.8 + phase * 3) % 12) - 6;
          break;

        case 'ripple':
          const dist = Math.sqrt(baseX * baseX + baseZ * baseZ);
          const wave = Math.sin(dist * 0.5 - time * 1.2 + phase) * 0.8;
          x += Math.cos(phase) * wave;
          y += wave;
          z += Math.sin(phase) * wave;
          break;

        default:
          x += Math.sin(time * 0.3 + phase) * 0.8;
          y += Math.cos(time * 0.25 + phase * 1.5) * 0.8;
          z += Math.sin(time * 0.2 + phase * 0.8) * 0.6;
      }

      positions[posIdx] = x;
      positions[posIdx + 1] = y;
      positions[posIdx + 2] = z;
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  private updateParticleColors(): void {
    if (!this.geometry || !this.analysisResult) return;

    const colors = this.geometry.attributes.color.array as Float32Array;
    const warm = this.currentWarmColor;
    const cool = this.currentCoolColor;
    const brightness = this.currentTheme.brightness;
    const hueShift = this.analysisResult.baseColor === 'warm' ? 0.05 : -0.05;

    for (let i = 0; i < this.particleData.length; i++) {
      const colIdx = i * 3;
      const seed = (i * 0.6180339887) % 1;
      const mix = seed;

      const tempColor = new THREE.Color().copy(warm).lerp(cool, mix);
      tempColor.offsetHSL(hueShift * (seed - 0.5) * 2, 0, (seed - 0.5) * 0.1);

      colors[colIdx] = Math.min(1, tempColor.r * brightness);
      colors[colIdx + 1] = Math.min(1, tempColor.g * brightness);
      colors[colIdx + 2] = Math.min(1, tempColor.b * brightness);
    }

    this.geometry.attributes.color.needsUpdate = true;
  }

  setSpeed(multiplier: number): void {
    this.targetSpeedMultiplier = Math.max(0.1, Math.min(5, multiplier));
  }

  transitionToTheme(themeName: string): ThemeColors {
    const theme = THEMES[themeName] ?? THEMES.default;
    this.targetTheme = theme;

    this.baseWarmColor.copy(this.currentWarmColor);
    this.baseCoolColor.copy(this.currentCoolColor);

    this.targetWarmColor.set(theme.particles[0]);
    this.targetCoolColor.set(theme.particles[1]);

    if (theme.brightness !== this.currentTheme.brightness) {
      this.targetWarmColor.multiplyScalar(theme.brightness);
      this.targetCoolColor.multiplyScalar(theme.brightness);
      this.targetWarmColor.clampScalar(0, 1);
      this.targetCoolColor.clampScalar(0, 1);
    }

    this.currentTheme = theme;
    this.colorTransitionProgress = 0;

    return theme;
  }

  pickParticle(mouseX: number, mouseY: number): { keyword: string; screenX: number; screenY: number } | null {
    if (!this.points || !this.geometry) return null;

    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((mouseX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((mouseY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.points);
    if (intersects.length === 0) return null;

    const index = intersects[0].index;
    if (index === undefined || index >= this.particleData.length) return null;

    const data = this.particleData[index];
    const positions = this.geometry.attributes.position.array as Float32Array;
    const posIdx = index * 3;

    const worldPos = new THREE.Vector3(
      positions[posIdx],
      positions[posIdx + 1],
      positions[posIdx + 2]
    );
    worldPos.project(this.camera);

    const screenX = (worldPos.x * 0.5 + 0.5) * rect.width + rect.left;
    const screenY = (-worldPos.y * 0.5 + 0.5) * rect.height + rect.top;

    return { keyword: data.keyword, screenX, screenY };
  }

  clearParticles(): void {
    if (this.points) {
      this.scene.remove(this.points);
      if (this.geometry) this.geometry.dispose();
      if (this.material) this.material.dispose();
      this.points = null;
      this.geometry = null;
      this.material = null;
    }
    this.particleData = [];
  }

  handleResize(pixelRatio: number): void {
    if (this.material) {
      this.material.uniforms.uPixelRatio.value = Math.min(pixelRatio, 2);
    }
  }
}
