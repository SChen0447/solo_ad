import * as THREE from 'three';

export interface VisualizerParams {
  spreadRadius: number;
  sizeScale: number;
  rotationSpeed: number;
  gradientMode: GradientMode;
  renderMode: RenderMode;
  particleCount: number;
}

export type GradientMode = 'aurora' | 'lava' | 'ocean' | 'neon';
export type RenderMode = 'roam' | 'wave';

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface BandGradient {
  lowStart: RGB;
  lowEnd: RGB;
  midStart: RGB;
  midEnd: RGB;
  highStart: RGB;
  highEnd: RGB;
}

const GRADIENT_PRESETS: Record<GradientMode, BandGradient> = {
  aurora: {
    lowStart: { r: 0.039, g: 0.039, b: 0.18 },
    lowEnd: { r: 0.3, g: 0.1, b: 0.8 },
    midStart: { r: 0.3, g: 0.1, b: 0.8 },
    midEnd: { r: 0.6, g: 0.3, b: 1.0 },
    highStart: { r: 0.6, g: 0.3, b: 1.0 },
    highEnd: { r: 1.0, g: 0.42, b: 0.21 },
  },
  lava: {
    lowStart: { r: 0.1, g: 0.0, b: 0.0 },
    lowEnd: { r: 0.6, g: 0.1, b: 0.0 },
    midStart: { r: 0.6, g: 0.1, b: 0.0 },
    midEnd: { r: 1.0, g: 0.4, b: 0.0 },
    highStart: { r: 1.0, g: 0.4, b: 0.0 },
    highEnd: { r: 1.0, g: 0.84, b: 0.0 },
  },
  ocean: {
    lowStart: { r: 0.0, g: 0.0, b: 0.13 },
    lowEnd: { r: 0.0, g: 0.2, b: 0.4 },
    midStart: { r: 0.0, g: 0.2, b: 0.4 },
    midEnd: { r: 0.0, g: 0.6, b: 0.8 },
    highStart: { r: 0.0, g: 0.6, b: 0.8 },
    highEnd: { r: 0.0, g: 1.0, b: 0.8 },
  },
  neon: {
    lowStart: { r: 0.05, g: 0.01, b: 0.13 },
    lowEnd: { r: 0.5, g: 0.0, b: 0.5 },
    midStart: { r: 0.5, g: 0.0, b: 0.5 },
    midEnd: { r: 1.0, g: 0.0, b: 1.0 },
    highStart: { r: 1.0, g: 0.0, b: 1.0 },
    highEnd: { r: 0.0, g: 1.0, b: 1.0 },
  },
};

const DEFAULT_PARTICLE_COUNT = 6000;
const MIN_PARTICLE_COUNT = 1000;
const MAX_PARTICLE_COUNT = 10000;
const COLOR_LERP_DURATION = 0.8;
const MODE_TRANSITION_DURATION = 1.2;
const LOW_FREQ_END = 250;
const MID_FREQ_END = 2000;
const HIGH_FREQ_END = 20000;

class ParticleSystem {
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  points: THREE.Points;
  positions: Float32Array;
  colors: Float32Array;
  targetColors: Float32Array;
  sizes: Float32Array;
  baseAngles: Float32Array;
  baseRadii: Float32Array;
  baseY: Float32Array;
  basePhases: Float32Array;
  roamPositions: Float32Array;
  wavePositions: Float32Array;
  count: number;

  constructor(count: number, particleTexture: THREE.Texture) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.targetColors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.baseAngles = new Float32Array(count);
    this.baseRadii = new Float32Array(count);
    this.baseY = new Float32Array(count);
    this.basePhases = new Float32Array(count);
    this.roamPositions = new Float32Array(count * 3);
    this.wavePositions = new Float32Array(count * 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.5,
      map: particleTexture,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      opacity: 1,
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  markAttributesDirty(): void {
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = this.geometry.attributes.color as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

export class AudioVisualizer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private particleSystem: ParticleSystem | null = null;
  private transitionSystem: ParticleSystem | null = null;
  private particleTexture: THREE.Texture | null = null;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private sampleRate = 44100;

  private params: VisualizerParams = {
    spreadRadius: 15,
    sizeScale: 1.0,
    rotationSpeed: 30,
    gradientMode: 'aurora',
    renderMode: 'roam',
    particleCount: DEFAULT_PARTICLE_COUNT,
  };

  private currentColors: BandGradient = GRADIENT_PRESETS.aurora;
  private previousColors: BandGradient = GRADIENT_PRESETS.aurora;
  private colorLerpProgress = 1.0;
  private colorLerpStartTime = 0;

  private targetRenderMode: RenderMode = 'roam';
  private modeTransitionProgress = 1.0;
  private modeTransitionStartTime = 0;
  private isTransitioningMode = false;

  private isPlaying = false;
  private startTime = 0;
  private pauseOffset = 0;
  private animationId = 0;
  private lastFrameTime = 0;

  private waveformData: Float32Array = new Float32Array(0);
  private onTimeUpdate: ((currentTime: number, duration: number) => void) | null = null;

  private groundRing: THREE.Mesh | null = null;
  private ringScale = 0;

  private fpsHistory: number[] = [];
  private fpsCheckTimer = 0;
  private autoPerformanceMode = false;
  private frameCount = 0;
  private fpsTimer = 0;
  private currentFps = 60;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 20, 35);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.createParticleTexture();
    this.createGroundRing();
    this.createLights();
    this.rebuildParticleSystem(this.params.particleCount, false);

    window.addEventListener('resize', this.onResize);
    this.lastFrameTime = performance.now();
    this.animate();
  }

  private createParticleTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.2)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    this.particleTexture = new THREE.CanvasTexture(canvas);
  }

  private createGroundRing(): void {
    const ringGeom = new THREE.RingGeometry(0.5, 1, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x7B2FFF,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.groundRing = new THREE.Mesh(ringGeom, ringMat);
    this.groundRing.rotation.x = -Math.PI / 2;
    this.groundRing.position.y = -this.params.spreadRadius * 0.4;
    this.scene.add(this.groundRing);
  }

  private createLights(): void {
    const ambient = new THREE.AmbientLight(0x111122, 0.5);
    this.scene.add(ambient);
  }

  private rebuildParticleSystem(count: number, transition = false): void {
    if (!this.particleTexture) return;

    const oldSystem = this.particleSystem;
    const newSystem = new ParticleSystem(count, this.particleTexture);
    this.initParticleData(newSystem);

    if (transition && oldSystem) {
      if (this.transitionSystem) {
        this.scene.remove(this.transitionSystem.points);
        this.transitionSystem.dispose();
      }
      this.transitionSystem = oldSystem;
      this.transitionSystem.material.opacity = 1;
      newSystem.material.opacity = 0;
    }

    this.particleSystem = newSystem;
    this.scene.add(newSystem.points);

    if (oldSystem && !transition) {
      this.scene.remove(oldSystem.points);
      oldSystem.dispose();
    }
  }

  private initParticleData(system: ParticleSystem): void {
    const count = system.count;
    const radius = this.params.spreadRadius;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius + 1;
      const y = (Math.random() - 0.5) * radius * 0.8;

      system.baseAngles[i] = angle;
      system.baseRadii[i] = r;
      system.baseY[i] = y;
      system.basePhases[i] = Math.random() * Math.PI * 2;

      system.roamPositions[i * 3] = Math.cos(angle) * r;
      system.roamPositions[i * 3 + 1] = y;
      system.roamPositions[i * 3 + 2] = Math.sin(angle) * r;

      const gridSize = Math.ceil(Math.sqrt(count));
      const u = (i % gridSize) / gridSize;
      const v = Math.floor(i / gridSize) / gridSize;
      system.wavePositions[i * 3] = (u - 0.5) * radius * 2;
      system.wavePositions[i * 3 + 1] = 0;
      system.wavePositions[i * 3 + 2] = (v - 0.5) * radius * 2;

      system.positions[i * 3] = system.roamPositions[i * 3] as number;
      system.positions[i * 3 + 1] = system.roamPositions[i * 3 + 1] as number;
      system.positions[i * 3 + 2] = system.roamPositions[i * 3 + 2] as number;

      const color = this.colorFromIndex(i, count, this.currentColors);
      system.colors[i * 3] = color.r;
      system.colors[i * 3 + 1] = color.g;
      system.colors[i * 3 + 2] = color.b;
      system.targetColors[i * 3] = color.r;
      system.targetColors[i * 3 + 1] = color.g;
      system.targetColors[i * 3 + 2] = color.b;

      system.sizes[i] = 0.5;
    }
  }

  private colorFromIndex(index: number, total: number, gradient: BandGradient): RGB {
    const t = index / total;

    if (t < 0.33) {
      const lt = t / 0.33;
      return this.lerpRGB(gradient.lowStart, gradient.lowEnd, lt);
    } else if (t < 0.66) {
      const lt = (t - 0.33) / 0.33;
      return this.lerpRGB(gradient.midStart, gradient.midEnd, lt);
    } else {
      const lt = (t - 0.66) / 0.34;
      return this.lerpRGB(gradient.highStart, gradient.highEnd, lt);
    }
  }

  private colorFromFrequency(freqBinIndex: number, binCount: number, gradient: BandGradient): RGB {
    if (binCount === 0) return gradient.midStart;

    const nyquist = this.sampleRate / 2;
    const freq = (freqBinIndex / binCount) * nyquist;

    const lowEnd = LOW_FREQ_END;
    const midEnd = MID_FREQ_END;
    const highEnd = HIGH_FREQ_END;

    const lowBand = Math.min(1, Math.max(0, (freq - 20) / (lowEnd - 20)));
    const midBand = Math.min(1, Math.max(0, (freq - lowEnd) / (midEnd - lowEnd)));
    const highBand = Math.min(1, Math.max(0, (freq - midEnd) / (highEnd - midEnd)));

    const lowColor = this.lerpRGB(gradient.lowStart, gradient.lowEnd, lowBand);
    const midColor = this.lerpRGB(gradient.midStart, gradient.midEnd, midBand);
    const highColor = this.lerpRGB(gradient.highStart, gradient.highEnd, highBand);

    if (freq < lowEnd) {
      return lowColor;
    } else if (freq < lowEnd * 1.5) {
      const t = (freq - lowEnd) / (lowEnd * 0.5);
      return this.lerpRGB(lowColor, midColor, t * 0.5 + 0.5);
    } else if (freq < midEnd * 0.8) {
      return midColor;
    } else if (freq < midEnd) {
      const t = (freq - midEnd * 0.8) / (midEnd * 0.2);
      return this.lerpRGB(midColor, highColor, t * 0.5);
    } else {
      return highColor;
    }
  }

  private lerpRGB(a: RGB, b: RGB, t: number): RGB {
    const clamped = Math.max(0, Math.min(1, t));
    return {
      r: a.r + (b.r - a.r) * clamped,
      g: a.g + (b.g - a.g) * clamped,
      b: a.b + (b.b - a.b) * clamped,
    };
  }

  private lerpBandGradient(from: BandGradient, to: BandGradient, t: number): BandGradient {
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return {
      lowStart: this.lerpRGB(from.lowStart, to.lowStart, ease),
      lowEnd: this.lerpRGB(from.lowEnd, to.lowEnd, ease),
      midStart: this.lerpRGB(from.midStart, to.midStart, ease),
      midEnd: this.lerpRGB(from.midEnd, to.midEnd, ease),
      highStart: this.lerpRGB(from.highStart, to.highStart, ease),
      highEnd: this.lerpRGB(from.highEnd, to.highEnd, ease),
    };
  }

  async loadAudio(file: File): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this.sampleRate = this.audioBuffer.sampleRate;

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.waveformData = new Float32Array(this.audioBuffer.length);

    const channelData = this.audioBuffer.getChannelData(0);
    const step = Math.floor(channelData.length / this.waveformData.length) || 1;
    for (let i = 0; i < this.waveformData.length; i++) {
      this.waveformData[i] = channelData[i * step]!;
    }

    this.pauseOffset = 0;
  }

  getWaveformData(): Float32Array {
    return this.waveformData;
  }

  getAudioDuration(): number {
    return this.audioBuffer?.duration ?? 0;
  }

  setOnTimeUpdate(callback: (currentTime: number, duration: number) => void): void {
    this.onTimeUpdate = callback;
  }

  play(): void {
    if (!this.audioBuffer || !this.audioContext || !this.analyser) return;

    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
    }

    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.startTime = this.audioContext.currentTime - this.pauseOffset;
    this.sourceNode.start(0, this.pauseOffset);
    this.isPlaying = true;

    this.sourceNode.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pauseOffset = 0;
      }
    };
  }

  pause(): void {
    if (!this.audioContext || !this.isPlaying) return;

    this.pauseOffset = this.audioContext.currentTime - this.startTime;
    this.isPlaying = false;

    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
  }

  togglePlay(): boolean {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  seekTo(fraction: number): void {
    if (!this.audioBuffer) return;
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.pause();
    }
    this.pauseOffset = fraction * this.audioBuffer.duration;
    if (wasPlaying) {
      this.play();
    }
  }

  getCurrentTime(): number {
    if (!this.audioContext || !this.audioBuffer) return 0;
    if (this.isPlaying) {
      return Math.min(
        this.audioContext.currentTime - this.startTime,
        this.audioBuffer.duration
      );
    }
    return this.pauseOffset;
  }

  updateParams(params: Partial<VisualizerParams>): void {
    const gradientChanged = params.gradientMode && params.gradientMode !== this.params.gradientMode;
    const modeChanged = params.renderMode && params.renderMode !== this.params.renderMode;
    const particleCountChanged = params.particleCount && params.particleCount !== this.params.particleCount;

    Object.assign(this.params, params);

    if (gradientChanged && params.gradientMode) {
      this.previousColors = { ...this.currentColors };
      this.colorLerpStartTime = performance.now() / 1000;
      this.colorLerpProgress = 0;
    }

    if (modeChanged && params.renderMode) {
      this.targetRenderMode = params.renderMode;
      this.modeTransitionStartTime = performance.now() / 1000;
      this.modeTransitionProgress = 0;
      this.isTransitioningMode = true;
    }

    if (particleCountChanged && params.particleCount && this.particleSystem) {
      const clamped = Math.max(MIN_PARTICLE_COUNT, Math.min(MAX_PARTICLE_COUNT, params.particleCount));
      if (clamped !== this.particleSystem.count) {
        this.rebuildParticleSystem(clamped, true);
      }
    }
  }

  getFps(): number {
    return this.currentFps;
  }

  getParticleCount(): number {
    return this.particleSystem?.count ?? 0;
  }

  private updatePerformance(delta: number): void {
    this.frameCount++;
    this.fpsTimer += delta;

    if (this.fpsTimer >= 0.5) {
      this.currentFps = this.frameCount / this.fpsTimer;
      this.frameCount = 0;
      this.fpsTimer = 0;

      this.fpsHistory.push(this.currentFps);
      if (this.fpsHistory.length > 10) {
        this.fpsHistory.shift();
      }
    }

    this.fpsCheckTimer += delta;
    if (this.fpsCheckTimer >= 2 && this.autoPerformanceMode && this.particleSystem) {
      this.fpsCheckTimer = 0;
      const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

      if (avgFps < 55 && this.particleSystem.count > MIN_PARTICLE_COUNT) {
        const newCount = Math.max(MIN_PARTICLE_COUNT, this.particleSystem.count - 500);
        this.params.particleCount = newCount;
        this.rebuildParticleSystem(newCount, true);
      }
    }
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private getFrequencyBands(): { low: number; mid: number; high: number; rawBins: number } {
    if (!this.analyser || !this.isPlaying) {
      return { low: 0, mid: 0, high: 0, rawBins: 0 };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);

    const nyquist = this.sampleRate / 2;
    const binCount = this.frequencyData.length;
    const lowEnd = Math.floor((LOW_FREQ_END / nyquist) * binCount);
    const midEnd = Math.floor((MID_FREQ_END / nyquist) * binCount);

    let lowSum = 0;
    for (let i = 0; i < lowEnd; i++) lowSum += this.frequencyData[i]!;
    const low = lowSum / lowEnd / 255;

    let midSum = 0;
    for (let i = lowEnd; i < midEnd; i++) midSum += this.frequencyData[i]!;
    const mid = midEnd > lowEnd ? midSum / (midEnd - lowEnd) / 255 : 0;

    let highSum = 0;
    for (let i = midEnd; i < binCount; i++) highSum += this.frequencyData[i]!;
    const high = binCount > midEnd ? highSum / (binCount - midEnd) / 255 : 0;

    return { low, mid, high, rawBins: binCount };
  }

  private updateParticleSystem(
    system: ParticleSystem,
    targetMode: RenderMode,
    time: number,
    delta: number,
    bands: { low: number; mid: number; high: number; rawBins: number },
    colors: BandGradient,
    opacity: number
  ): void {
    const count = system.count;
    const radius = this.params.spreadRadius;
    const sizeScale = this.params.sizeScale;
    const rotSpeed = this.params.rotationSpeed * (Math.PI / 180);
    const rotationAngle = time * rotSpeed;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = system.basePhases[i]!;
      const angle = system.baseAngles[i]! + rotationAngle;
      const r = system.baseRadii[i]! * (radius / 15);
      const baseY = system.baseY[i]! * (radius / 15);

      const pulseOffset = bands.low * 2;
      const rx = Math.cos(angle) * (r + pulseOffset * Math.sin(phase + time * 2));
      const ry = baseY + Math.sin(phase + time * 0.5) * (1 + bands.mid * 3);
      const rz = Math.sin(angle) * (r + pulseOffset * Math.sin(phase + time * 2));

      const spread = 1 + bands.high * 2;

      system.roamPositions[i3] = rx * spread;
      system.roamPositions[i3 + 1] = ry;
      system.roamPositions[i3 + 2] = rz * spread;

      const gridSize = Math.ceil(Math.sqrt(count));
      const u = (i % gridSize) / gridSize;
      const v = Math.floor(i / gridSize) / gridSize;
      const wx = (u - 0.5) * radius * 2;
      const wz = (v - 0.5) * radius * 2;
      const dist = Math.sqrt(wx * wx + wz * wz);
      const amplitude = bands.mid * 5 + bands.low * 3;
      const wy = Math.sin(dist * 0.5 - time * 3 + phase) * amplitude
        + Math.cos(wx * 0.3 + time * 2) * bands.high * 2;

      system.wavePositions[i3] = wx;
      system.wavePositions[i3 + 1] = wy;
      system.wavePositions[i3 + 2] = wz;

      let tx: number, ty: number, tz: number;
      if (targetMode === 'roam') {
        tx = system.roamPositions[i3] as number;
        ty = system.roamPositions[i3 + 1] as number;
        tz = system.roamPositions[i3 + 2] as number;
      } else {
        tx = system.wavePositions[i3] as number;
        ty = system.wavePositions[i3 + 1] as number;
        tz = system.wavePositions[i3 + 2] as number;
      }

      system.positions[i3] = system.positions[i3]! + (tx - system.positions[i3]!) * Math.min(1, delta * 5);
      system.positions[i3 + 1] = system.positions[i3 + 1]! + (ty - system.positions[i3 + 1]!) * Math.min(1, delta * 5);
      system.positions[i3 + 2] = system.positions[i3 + 2]! + (tz - system.positions[i3 + 2]!) * Math.min(1, delta * 5);

      const freqT = i / count;
      const binIndex = Math.floor(freqT * bands.rawBins);
      const color = this.colorFromFrequency(binIndex, bands.rawBins, colors);
      system.targetColors[i3] = color.r;
      system.targetColors[i3 + 1] = color.g;
      system.targetColors[i3 + 2] = color.b;

      const colorLerpSpeed = delta * 4;
      system.colors[i3] = system.colors[i3]! + (system.targetColors[i3]! - system.colors[i3]!) * colorLerpSpeed;
      system.colors[i3 + 1] = system.colors[i3 + 1]! + (system.targetColors[i3 + 1]! - system.colors[i3 + 1]!) * colorLerpSpeed;
      system.colors[i3 + 2] = system.colors[i3 + 2]! + (system.targetColors[i3 + 2]! - system.colors[i3 + 2]!) * colorLerpSpeed;

      let baseSize = 0.3 + freqT * 0.7;
      if (bands.low > 0.5) baseSize += bands.low * 0.4;
      if (bands.mid > 0.3) baseSize += bands.mid * 0.3;
      if (bands.high > 0.3) baseSize += bands.high * 0.2;
      baseSize = Math.max(0.1, Math.min(1.5, baseSize));
      const targetSize = baseSize * sizeScale;
      system.sizes[i] = system.sizes[i]! + (targetSize - system.sizes[i]!) * Math.min(1, delta * 6);
    }

    system.markAttributesDirty();
    system.material.size = 0.5 * sizeScale;
    system.material.opacity = opacity;
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const time = now / 1000;
    const delta = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    this.updatePerformance(delta);

    if (this.colorLerpProgress < 1) {
      const elapsed = time - this.colorLerpStartTime;
      this.colorLerpProgress = Math.min(1, elapsed / COLOR_LERP_DURATION);
      const targetPreset = GRADIENT_PRESETS[this.params.gradientMode];
      this.currentColors = this.lerpBandGradient(this.previousColors, targetPreset, this.colorLerpProgress);
    }

    if (this.isTransitioningMode && this.particleSystem) {
      const elapsed = time - this.modeTransitionStartTime;
      this.modeTransitionProgress = Math.min(1, elapsed / MODE_TRANSITION_DURATION);

      if (this.modeTransitionProgress >= 1) {
        this.isTransitioningMode = false;
        if (this.transitionSystem) {
          this.scene.remove(this.transitionSystem.points);
          this.transitionSystem.dispose();
          this.transitionSystem = null;
        }
        this.particleSystem.material.opacity = 1;
      }
    }

    const bands = this.getFrequencyBands();

    if (this.particleSystem) {
      let opacity = 1;
      if (this.isTransitioningMode) {
        opacity = this.easeInOutCubic(this.modeTransitionProgress);
      }
      this.updateParticleSystem(
        this.particleSystem,
        this.targetRenderMode,
        time,
        delta,
        bands,
        this.currentColors,
        opacity
      );
    }

    if (this.transitionSystem && this.isTransitioningMode) {
      const fadeOutOpacity = 1 - this.easeInOutCubic(this.modeTransitionProgress);
      const currentMode = this.params.renderMode === this.targetRenderMode
        ? (this.targetRenderMode === 'roam' ? 'wave' : 'roam')
        : this.params.renderMode;
      this.updateParticleSystem(
        this.transitionSystem,
        currentMode,
        time,
        delta,
        bands,
        this.currentColors,
        fadeOutOpacity
      );
    }

    if (this.groundRing) {
      if (bands.low > 0.3) {
        this.ringScale += (bands.low * 3 - this.ringScale) * 0.15;
        (this.groundRing.material as THREE.MeshBasicMaterial).opacity = bands.low * 0.6;
        this.groundRing.scale.set(this.ringScale, this.ringScale, 1);
      } else {
        this.ringScale *= 0.95;
        this.groundRing.scale.set(Math.max(0.1, this.ringScale), Math.max(0.1, this.ringScale), 1);
        (this.groundRing.material as THREE.MeshBasicMaterial).opacity *= 0.92;
      }
      this.groundRing.position.y = -this.params.spreadRadius * 0.4;
    }

    const cameraRadius = 35 + Math.sin(time * 0.1) * 3;
    const cameraAngle = time * 0.05;
    this.camera.position.x = Math.sin(cameraAngle) * cameraRadius;
    this.camera.position.z = Math.cos(cameraAngle) * cameraRadius;
    this.camera.position.y = 20 + bands.low * 5;
    this.camera.lookAt(0, 0, 0);

    if (this.onTimeUpdate && this.audioBuffer) {
      this.onTimeUpdate(this.getCurrentTime(), this.audioBuffer.duration);
    }

    this.renderer.render(this.scene, this.camera);
  };

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  destroy(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);

    if (this.particleSystem) {
      this.particleSystem.dispose();
    }
    if (this.transitionSystem) {
      this.transitionSystem.dispose();
    }
    if (this.particleTexture) {
      this.particleTexture.dispose();
    }
    this.renderer.dispose();

    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
