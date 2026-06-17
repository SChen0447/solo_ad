import * as THREE from 'three';
import { AudioData } from './audio-engine';

export type ViewType = 'waveform' | 'spectrum' | 'waterfall';

export interface ViewConfig {
  scale: number;
  refreshRate: number;
  colorMap: string;
}

export interface VisualizationConfigs {
  waveform: ViewConfig;
  spectrum: ViewConfig;
  waterfall: ViewConfig;
}

const defaultConfigs: VisualizationConfigs = {
  waveform: { scale: 1, refreshRate: 60, colorMap: 'cyan-blue' },
  spectrum: { scale: 1, refreshRate: 60, colorMap: 'purple-red' },
  waterfall: { scale: 1, refreshRate: 60, colorMap: 'purple-red' }
};

interface ViewState {
  lastFrameTime: number;
  frameInterval: number;
}

export class VisualizationManager {
  private waveformCanvas: HTMLCanvasElement | null = null;
  private spectrumCanvas: HTMLCanvasElement | null = null;
  private waterfallContainer: HTMLElement | null = null;

  private waveformCtx: CanvasRenderingContext2D | null = null;
  private spectrumCtx: CanvasRenderingContext2D | null = null;

  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private waterfallMesh: THREE.Mesh | null = null;
  private waterfallData: number[][] = [];
  private maxWaterfallFrames: number = 60;
  private barCount: number = 256;

  private configs: VisualizationConfigs = { ...defaultConfigs };
  private viewStates: Record<ViewType, ViewState> = {
    waveform: { lastFrameTime: 0, frameInterval: 1000 / 60 },
    spectrum: { lastFrameTime: 0, frameInterval: 1000 / 60 },
    waterfall: { lastFrameTime: 0, frameInterval: 1000 / 60 }
  };

  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private spectrumPeakData: number[] = [];
  private spectrumPeakDecay: number[] = [];
  private currentAudioData: AudioData | null = null;

  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private cameraRotation: { x: number; y: number } = { x: 0.5, y: 0 };
  private spectrumLastRenderTime: number = 0;
  private threeJSLastRenderTime: number = 0;
  private threeJSFrameInterval: number = 1000 / 60;

  constructor() {
    this.spectrumPeakData = new Array(this.barCount).fill(0);
    this.spectrumPeakDecay = new Array(this.barCount).fill(0);
  }

  setWaveformCanvas(canvas: HTMLCanvasElement): void {
    this.waveformCanvas = canvas;
    this.waveformCtx = canvas.getContext('2d');
    this.resizeCanvas(canvas);
  }

  setSpectrumCanvas(canvas: HTMLCanvasElement): void {
    this.spectrumCanvas = canvas;
    this.spectrumCtx = canvas.getContext('2d');
    this.resizeCanvas(canvas);
  }

  setWaterfallContainer(container: HTMLElement): void {
    this.waterfallContainer = container;
    this.initThreeJS();
  }

  private resizeCanvas(canvas: HTMLCanvasElement): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }

  private initThreeJS(): void {
    if (!this.waterfallContainer) return;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x121220);

    const rect = this.waterfallContainer.getBoundingClientRect();
    this.camera = new THREE.PerspectiveCamera(60, rect.width / rect.height, 0.1, 1000);
    this.camera.position.set(0, 8, 12);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(rect.width, rect.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.waterfallContainer.appendChild(this.renderer.domElement);

    this.initWaterfallMesh();
    this.setupOrbitControls();

    window.addEventListener('resize', () => this.onResize());
  }

  private initWaterfallMesh(): void {
    if (!this.scene) return;

    this.waterfallData = [];
    for (let i = 0; i < this.maxWaterfallFrames; i++) {
      this.waterfallData.push(new Array(this.barCount).fill(0));
    }

    const geometry = new THREE.PlaneGeometry(20, 15, this.barCount - 1, this.maxWaterfallFrames - 1);
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide
    });

    this.waterfallMesh = new THREE.Mesh(geometry, material);
    this.waterfallMesh.rotation.x = -Math.PI / 3;
    this.scene.add(this.waterfallMesh);

    const gridHelper = new THREE.GridHelper(20, 20, 0x2a2a3d, 0x1e1e30);
    gridHelper.position.y = -0.1;
    this.scene.add(gridHelper);

    this.updateWaterfallGeometry();
  }

  private setupOrbitControls(): void {
    if (!this.waterfallContainer || !this.camera) return;

    const container = this.waterfallContainer;

    const onMouseDown = (e: MouseEvent) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging || !this.camera) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.cameraRotation.y += deltaX * 0.01;
      this.cameraRotation.x += deltaY * 0.01;
      this.cameraRotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.cameraRotation.x));

      const radius = 15;
      this.camera.position.x = radius * Math.sin(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
      this.camera.position.y = radius * Math.sin(this.cameraRotation.x);
      this.camera.position.z = radius * Math.cos(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
      this.camera.lookAt(0, 0, 0);

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      this.isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (!this.camera) return;
      e.preventDefault();
      const delta = e.deltaY * 0.01;
      this.camera.position.multiplyScalar(1 + delta * 0.1);
      this.camera.position.clampLength(5, 30);
    };

    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mouseleave', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });
  }

  private onResize(): void {
    if (this.waveformCanvas) this.resizeCanvas(this.waveformCanvas);
    if (this.spectrumCanvas) this.resizeCanvas(this.spectrumCanvas);

    if (this.waterfallContainer && this.camera && this.renderer) {
      const rect = this.waterfallContainer.getBoundingClientRect();
      this.camera.aspect = rect.width / rect.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(rect.width, rect.height);
    }
  }

  setConfig(viewType: ViewType, config: Partial<ViewConfig>): void {
    this.configs[viewType] = { ...this.configs[viewType], ...config };
    if (config.refreshRate) {
      this.viewStates[viewType].frameInterval = 1000 / config.refreshRate;
    }
  }

  getConfig(viewType: ViewType): ViewConfig {
    return { ...this.configs[viewType] };
  }

  updateData(audioData: AudioData): void {
    this.currentAudioData = audioData;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();

    if (this.currentAudioData) {
      if (now - this.viewStates.waveform.lastFrameTime >= this.viewStates.waveform.frameInterval) {
        this.renderWaveform();
        this.viewStates.waveform.lastFrameTime = now;
      }

      if (now - this.viewStates.spectrum.lastFrameTime >= this.viewStates.spectrum.frameInterval) {
        this.renderSpectrum();
        this.viewStates.spectrum.lastFrameTime = now;
      }

      if (now - this.viewStates.waterfall.lastFrameTime >= this.viewStates.waterfall.frameInterval) {
        this.renderWaterfall();
        this.viewStates.waterfall.lastFrameTime = now;
      }
    }

    if (now - this.threeJSLastRenderTime >= this.threeJSFrameInterval) {
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
      this.threeJSLastRenderTime = now - (now % this.threeJSFrameInterval);
    }

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private renderWaveform(): void {
    if (!this.waveformCtx || !this.waveformCanvas || !this.currentAudioData) return;

    const ctx = this.waveformCtx;
    const rect = this.waveformCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const config = this.configs.waveform;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(42, 42, 61, 0.5)';
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#00ffff');
    gradient.addColorStop(1, '#0088ff');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const data = this.currentAudioData.timeDomain;
    const sliceWidth = width / data.length;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
      const v = data[i] * config.scale;
      const y = (v + 1) / 2 * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();
  }

  private renderSpectrum(): void {
    if (!this.spectrumCtx || !this.spectrumCanvas || !this.currentAudioData) return;

    const ctx = this.spectrumCtx;
    const rect = this.spectrumCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const config = this.configs.spectrum;

    const now = performance.now();
    const deltaTime = this.spectrumLastRenderTime === 0 ? 0.016 : (now - this.spectrumLastRenderTime) / 1000;
    this.spectrumLastRenderTime = now;

    const fallTime = 0.1;
    const fallRate = height / fallTime;

    ctx.clearRect(0, 0, width, height);

    const freqData = this.currentAudioData.frequency;
    const bars = this.barCount;
    const barWidth = (width - bars - 1) / bars;
    const step = Math.floor(freqData.length / bars);

    for (let i = 0; i < bars; i++) {
      const dataIndex = i * step;
      let value = 0;
      for (let j = 0; j < step; j++) {
        value += freqData[dataIndex + j] || 0;
      }
      value = (value / step / 255) * config.scale;
      const barHeight = value * height * 0.9;

      const hue = 280 - (i / bars) * 280;
      const saturation = 100;
      const lightness = 50 + value * 20;
      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

      const x = i * (barWidth + 1);
      const y = height - barHeight;

      ctx.fillRect(x, y, barWidth, barHeight);

      if (barHeight > this.spectrumPeakData[i]) {
        this.spectrumPeakData[i] = barHeight;
      } else {
        this.spectrumPeakData[i] = Math.max(0, this.spectrumPeakData[i] - fallRate * deltaTime);
      }

      if (this.spectrumPeakData[i] > 0) {
        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness + 20}%, 0.8)`;
        const peakY = Math.max(0, height - this.spectrumPeakData[i] - 3);
        ctx.fillRect(x, peakY, barWidth, 3);
      }
    }
  }

  private renderWaterfall(): void {
    if (!this.currentAudioData || !this.waterfallMesh) return;

    const freqData = this.currentAudioData.frequency;
    const bars = this.barCount;
    const step = Math.floor(freqData.length / bars);

    const newFrame: number[] = [];
    for (let i = 0; i < bars; i++) {
      const dataIndex = i * step;
      let value = 0;
      for (let j = 0; j < step; j++) {
        value += freqData[dataIndex + j] || 0;
      }
      newFrame.push((value / step / 255) * this.configs.waterfall.scale);
    }

    this.waterfallData.unshift(newFrame);
    if (this.waterfallData.length > this.maxWaterfallFrames) {
      this.waterfallData.pop();
    }

    this.updateWaterfallGeometry();
  }

  private updateWaterfallGeometry(): void {
    if (!this.waterfallMesh) return;

    const geometry = this.waterfallMesh.geometry as THREE.PlaneGeometry;
    const positions = geometry.attributes.position;
    const colors = geometry.attributes.color || new THREE.BufferAttribute(new Float32Array(positions.count * 3), 3);

    for (let frame = 0; frame < this.maxWaterfallFrames; frame++) {
      for (let bar = 0; bar < this.barCount; bar++) {
        const index = frame * this.barCount + bar;
        const z = (frame / this.maxWaterfallFrames - 0.5) * 15;
        const height = this.waterfallData[frame]?.[bar] || 0;

        positions.setY(index, height * 5);
        positions.setZ(index, z);

        const hue = 280 - (bar / this.barCount) * 280;
        const color = new THREE.Color().setHSL(hue / 360, 1, 0.3 + height * 0.4);
        colors.setXYZ(index, color.r, color.g, color.b);
      }
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    geometry.setAttribute('color', colors);
    geometry.computeVertexNormals();
  }

  destroy(): void {
    this.stop();

    if (this.renderer) {
      this.renderer.dispose();
      if (this.waterfallContainer && this.renderer.domElement.parentNode === this.waterfallContainer) {
        this.waterfallContainer.removeChild(this.renderer.domElement);
      }
    }

    if (this.waterfallMesh) {
      (this.waterfallMesh.geometry as THREE.BufferGeometry).dispose();
      (this.waterfallMesh.material as THREE.Material).dispose();
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.waterfallMesh = null;
    this.waveformCanvas = null;
    this.spectrumCanvas = null;
    this.waterfallContainer = null;
    this.waveformCtx = null;
    this.spectrumCtx = null;
  }
}
