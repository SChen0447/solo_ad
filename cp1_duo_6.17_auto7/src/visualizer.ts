import * as THREE from 'three';

export interface VisualizerParams {
  spreadRadius: number;
  sizeScale: number;
  rotationSpeed: number;
  gradientMode: GradientMode;
  renderMode: RenderMode;
}

export type GradientMode = 'aurora' | 'lava' | 'ocean' | 'neon';
export type RenderMode = 'roam' | 'wave';

interface GradientStop {
  r: number;
  g: number;
  b: number;
}

interface GradientPreset {
  stops: [GradientStop, GradientStop, GradientStop];
}

const GRADIENT_PRESETS: Record<GradientMode, GradientPreset> = {
  aurora: {
    stops: [
      { r: 0.04, g: 0.04, b: 0.18 },
      { r: 0.48, g: 0.18, b: 1.0 },
      { r: 1.0, g: 0.42, b: 0.21 },
    ],
  },
  lava: {
    stops: [
      { r: 0.1, g: 0.0, b: 0.0 },
      { r: 1.0, g: 0.27, b: 0.0 },
      { r: 1.0, g: 0.84, b: 0.0 },
    ],
  },
  ocean: {
    stops: [
      { r: 0.0, g: 0.0, b: 0.13 },
      { r: 0.0, g: 0.41, b: 0.58 },
      { r: 0.0, g: 1.0, b: 0.8 },
    ],
  },
  neon: {
    stops: [
      { r: 0.05, g: 0.01, b: 0.13 },
      { r: 1.0, g: 0.0, b: 1.0 },
      { r: 0.0, g: 1.0, b: 1.0 },
    ],
  },
};

const PARTICLE_COUNT = 6000;
const COLOR_LERP_DURATION = 0.8;
const MODE_TRANSITION_DURATION = 1.2;

export class AudioVisualizer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private particleSystem: THREE.Points;

  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private targetColors: Float32Array;
  private baseAngles: Float32Array;
  private baseRadii: Float32Array;
  private baseY: Float32Array;
  private basePhases: Float32Array;
  private roamPositions: Float32Array;
  private wavePositions: Float32Array;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> = new Uint8Array(0);

  private params: VisualizerParams = {
    spreadRadius: 15,
    sizeScale: 1.0,
    rotationSpeed: 30,
    gradientMode: 'aurora',
    renderMode: 'roam',
  };

  private currentColors: GradientPreset = GRADIENT_PRESETS.aurora;
  private previousColors: GradientPreset = GRADIENT_PRESETS.aurora;
  private colorLerpProgress = 1.0;
  private colorLerpStartTime = 0;

  private modeTransitionProgress = 1.0;
  private modeTransitionStartTime = 0;
  private currentRenderMode: RenderMode = 'roam';

  private isPlaying = false;
  private startTime = 0;
  private pauseOffset = 0;
  private animationId = 0;
  private lastFrameTime = 0;

  private waveformData: Float32Array = new Float32Array(0);
  private onTimeUpdate: ((currentTime: number, duration: number) => void) | null = null;

  private groundRing: THREE.Mesh | null = null;
  private ringScale = 0;

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

    const count = PARTICLE_COUNT;

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

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * this.params.spreadRadius + 1;
      const y = (Math.random() - 0.5) * this.params.spreadRadius * 0.8;

      this.baseAngles[i] = angle;
      this.baseRadii[i] = radius;
      this.baseY[i] = y;
      this.basePhases[i] = Math.random() * Math.PI * 2;

      this.roamPositions[i * 3] = Math.cos(angle) * radius;
      this.roamPositions[i * 3 + 1] = y;
      this.roamPositions[i * 3 + 2] = Math.sin(angle) * radius;

      const u = (i % Math.ceil(Math.sqrt(count))) / Math.ceil(Math.sqrt(count));
      const v = Math.floor(i / Math.ceil(Math.sqrt(count))) / Math.ceil(Math.sqrt(count));
      this.wavePositions[i * 3] = (u - 0.5) * this.params.spreadRadius * 2;
      this.wavePositions[i * 3 + 1] = 0;
      this.wavePositions[i * 3 + 2] = (v - 0.5) * this.params.spreadRadius * 2;

      this.positions[i * 3] = this.roamPositions[i * 3] as number;
      this.positions[i * 3 + 1] = this.roamPositions[i * 3 + 1] as number;
      this.positions[i * 3 + 2] = this.roamPositions[i * 3 + 2] as number;

      const t = i / count;
      const color = this.sampleGradient(this.currentColors.stops, t);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
      this.targetColors[i * 3] = color.r;
      this.targetColors[i * 3 + 1] = color.g;
      this.targetColors[i * 3 + 2] = color.b;

      this.sizes[i] = 0.5;
    }

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

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
    const particleTexture = new THREE.CanvasTexture(canvas);

    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.5,
      map: particleTexture,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particleSystem);

    this.createGroundRing();
    this.createLights();

    window.addEventListener('resize', this.onResize);
    this.lastFrameTime = performance.now();
    this.animate();
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

  private sampleGradient(stops: [GradientStop, GradientStop, GradientStop], t: number): GradientStop {
    const clampedT = Math.max(0, Math.min(1, t));
    if (clampedT < 0.5) {
      const lt = clampedT * 2;
      return {
        r: stops[0].r + (stops[1].r - stops[0].r) * lt,
        g: stops[0].g + (stops[1].g - stops[0].g) * lt,
        b: stops[0].b + (stops[1].b - stops[0].b) * lt,
      };
    } else {
      const lt = (clampedT - 0.5) * 2;
      return {
        r: stops[1].r + (stops[2].r - stops[1].r) * lt,
        g: stops[1].g + (stops[2].g - stops[1].g) * lt,
        b: stops[1].b + (stops[2].b - stops[1].b) * lt,
      };
    }
  }

  private lerpGradient(
    from: [GradientStop, GradientStop, GradientStop],
    to: [GradientStop, GradientStop, GradientStop],
    t: number
  ): [GradientStop, GradientStop, GradientStop] {
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return [
      {
        r: from[0].r + (to[0].r - from[0].r) * ease,
        g: from[0].g + (to[0].g - from[0].g) * ease,
        b: from[0].b + (to[0].b - from[0].b) * ease,
      },
      {
        r: from[1].r + (to[1].r - from[1].r) * ease,
        g: from[1].g + (to[1].g - from[1].g) * ease,
        b: from[1].b + (to[1].b - from[1].b) * ease,
      },
      {
        r: from[2].r + (to[2].r - from[2].r) * ease,
        g: from[2].g + (to[2].g - from[2].g) * ease,
        b: from[2].b + (to[2].b - from[2].b) * ease,
      },
    ];
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

    Object.assign(this.params, params);

    if (gradientChanged && params.gradientMode) {
      this.previousColors = { ...this.currentColors, stops: this.currentColors.stops.map(s => ({ ...s })) as [GradientStop, GradientStop, GradientStop] };
      this.colorLerpStartTime = performance.now() / 1000;
      this.colorLerpProgress = 0;
    }

    if (modeChanged && params.renderMode) {
      this.recalculateTargetPositions();
      this.modeTransitionStartTime = performance.now() / 1000;
      this.modeTransitionProgress = 0;
      this.currentRenderMode = params.renderMode;
    }
  }

  private recalculateTargetPositions(): void {
    const count = PARTICLE_COUNT;
    const radius = this.params.spreadRadius;

    for (let i = 0; i < count; i++) {
      const angle = this.baseAngles[i]!;
      const r = this.baseRadii[i]! * (radius / 15);
      const y = this.baseY[i]! * (radius / 15);

      this.roamPositions[i * 3] = Math.cos(angle) * r;
      this.roamPositions[i * 3 + 1] = y;
      this.roamPositions[i * 3 + 2] = Math.sin(angle) * r;

      const gridSize = Math.ceil(Math.sqrt(count));
      const u = (i % gridSize) / gridSize;
      const v = Math.floor(i / gridSize) / gridSize;
      this.wavePositions[i * 3] = (u - 0.5) * radius * 2;
      this.wavePositions[i * 3 + 1] = 0;
      this.wavePositions[i * 3 + 2] = (v - 0.5) * radius * 2;
    }
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private getFrequencyBands(): { low: number; mid: number; high: number } {
    if (!this.analyser || !this.isPlaying) {
      return { low: 0, mid: 0, high: 0 };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);

    const nyquist = this.audioContext!.sampleRate / 2;
    const binCount = this.frequencyData.length;
    const lowEnd = Math.floor((300 / nyquist) * binCount);
    const midEnd = Math.floor((2000 / nyquist) * binCount);

    let lowSum = 0;
    for (let i = 0; i < lowEnd; i++) lowSum += this.frequencyData[i]!;
    const low = lowSum / lowEnd / 255;

    let midSum = 0;
    for (let i = lowEnd; i < midEnd; i++) midSum += this.frequencyData[i]!;
    const mid = midEnd > lowEnd ? midSum / (midEnd - lowEnd) / 255 : 0;

    let highSum = 0;
    for (let i = midEnd; i < binCount; i++) highSum += this.frequencyData[i]!;
    const high = binCount > midEnd ? highSum / (binCount - midEnd) / 255 : 0;

    return { low, mid, high };
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const time = now / 1000;
    const delta = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    if (this.colorLerpProgress < 1) {
      const elapsed = time - this.colorLerpStartTime;
      this.colorLerpProgress = Math.min(1, elapsed / COLOR_LERP_DURATION);
      const targetPreset = GRADIENT_PRESETS[this.params.gradientMode];
      this.currentColors = {
        stops: this.lerpGradient(this.previousColors.stops, targetPreset.stops, this.colorLerpProgress),
      };
    }

    const bands = this.getFrequencyBands();
    const count = PARTICLE_COUNT;
    const radius = this.params.spreadRadius;
    const sizeScale = this.params.sizeScale;
    const rotSpeed = this.params.rotationSpeed * (Math.PI / 180);
    const rotationAngle = time * rotSpeed;

    if (this.modeTransitionProgress < 1) {
      const elapsed = time - this.modeTransitionStartTime;
      this.modeTransitionProgress = Math.min(1, elapsed / MODE_TRANSITION_DURATION);
    }

    this.recalculateTargetPositions();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = this.basePhases[i]!;

      let rx: number, ry: number, rz: number;
      let wx: number, wy: number, wz: number;

      const angle = this.baseAngles[i]! + rotationAngle;
      const r = this.baseRadii[i]! * (radius / 15);
      const baseY = this.baseY[i]! * (radius / 15);

      const pulseOffset = bands.low * 2;
      rx = Math.cos(angle) * (r + pulseOffset * Math.sin(phase + time * 2));
      ry = baseY + Math.sin(phase + time * 0.5) * (1 + bands.mid * 3);
      rz = Math.sin(angle) * (r + pulseOffset * Math.sin(phase + time * 2));

      const spread = 1 + bands.high * 2;
      rx *= spread;
      rz *= spread;

      this.roamPositions[i3] = rx;
      this.roamPositions[i3 + 1] = ry;
      this.roamPositions[i3 + 2] = rz;

      const gridSize = Math.ceil(Math.sqrt(count));
      const u = (i % gridSize) / gridSize;
      const v = Math.floor(i / gridSize) / gridSize;
      wx = (u - 0.5) * radius * 2;
      wz = (v - 0.5) * radius * 2;
      const dist = Math.sqrt(wx * wx + wz * wz);
      const amplitude = bands.mid * 5 + bands.low * 3;
      wy = Math.sin(dist * 0.5 - time * 3 + phase) * amplitude;
      wy += Math.cos(wx * 0.3 + time * 2) * bands.high * 2;

      this.wavePositions[i3] = wx;
      this.wavePositions[i3 + 1] = wy;
      this.wavePositions[i3 + 2] = wz;

      let factor: number;
      if (this.currentRenderMode === 'roam') {
        factor = 1 - this.easeInOutCubic(this.modeTransitionProgress);
      } else {
        factor = this.easeInOutCubic(this.modeTransitionProgress);
      }

      const tx = this.roamPositions[i3]! * (1 - factor) + this.wavePositions[i3]! * factor;
      const ty = this.roamPositions[i3 + 1]! * (1 - factor) + this.wavePositions[i3 + 1]! * factor;
      const tz = this.roamPositions[i3 + 2]! * (1 - factor) + this.wavePositions[i3 + 2]! * factor;

      this.positions[i3] = this.positions[i3]! + (tx - this.positions[i3]!) * Math.min(1, delta * 5);
      this.positions[i3 + 1] = this.positions[i3 + 1]! + (ty - this.positions[i3 + 1]!) * Math.min(1, delta * 5);
      this.positions[i3 + 2] = this.positions[i3 + 2]! + (tz - this.positions[i3 + 2]!) * Math.min(1, delta * 5);

      const freqT = this.getFrequencyT(i, bands);
      const color = this.sampleGradient(this.currentColors.stops, freqT);
      this.targetColors[i3] = color.r;
      this.targetColors[i3 + 1] = color.g;
      this.targetColors[i3 + 2] = color.b;

      const colorLerpSpeed = delta * 4;
      this.colors[i3] = this.colors[i3]! + (this.targetColors[i3]! - this.colors[i3]!) * colorLerpSpeed;
      this.colors[i3 + 1] = this.colors[i3 + 1]! + (this.targetColors[i3 + 1]! - this.colors[i3 + 1]!) * colorLerpSpeed;
      this.colors[i3 + 2] = this.colors[i3 + 2]! + (this.targetColors[i3 + 2]! - this.colors[i3 + 2]!) * colorLerpSpeed;

      let baseSize = 0.3 + freqT * 0.7;
      if (bands.low > 0.5) baseSize += bands.low * 0.4;
      if (bands.mid > 0.3) baseSize += bands.mid * 0.3;
      if (bands.high > 0.3) baseSize += bands.high * 0.2;
      baseSize = Math.max(0.1, Math.min(1.5, baseSize));
      const targetSize = baseSize * sizeScale;
      this.sizes[i] = this.sizes[i]! + (targetSize - this.sizes[i]!) * Math.min(1, delta * 6);
    }

    const posAttr = this.particleGeometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = this.particleGeometry.attributes.color as THREE.BufferAttribute;
    const sizeAttr = this.particleGeometry.attributes.size as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    this.particleMaterial.size = 0.5 * sizeScale;

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
  }

  private getFrequencyT(index: number, bands: { low: number; mid: number; high: number }): number {
    const t = index / PARTICLE_COUNT;

    if (this.isPlaying) {
      const normalizedIndex = index / PARTICLE_COUNT;
      if (normalizedIndex < 0.33) {
        return Math.min(1, t * 3 * (0.3 + bands.low * 0.7));
      } else if (normalizedIndex < 0.66) {
        return 0.3 + 0.4 * bands.mid + (t - 0.33) * 0.5;
      } else {
        return 0.7 + 0.3 * bands.high + (t - 0.66) * 0.2;
      }
    }

    return t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  destroy(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
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
