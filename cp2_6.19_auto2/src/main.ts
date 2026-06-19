import * as THREE from 'three';
import { DataSimulator } from './DataSimulator';
import { ParticleFlow } from './ParticleFlow';
import { InteractionManager } from './InteractionManager';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleFlow: ParticleFlow;
  private dataSimulator: DataSimulator;
  private interactionManager: InteractionManager;
  private clock: THREE.Clock;
  private isPlaying = true;
  private animationId: number | null = null;

  private fpsEl: HTMLElement | null;
  private particleCountEl: HTMLElement | null;
  private peakEl: HTMLElement | null;
  private btnToggle: HTMLElement | null;
  private btnReset: HTMLElement | null;
  private iconPlay: HTMLElement | null;
  private iconPause: HTMLElement | null;

  private frameTimestamps: number[] = [];
  private readonly FPS_WINDOW = 60;
  private readonly MIN_FPS_FRAMES = 10;
  private currentFps = 0;
  private lastMonitorUpdate = 0;

  constructor() {
    const container = document.getElementById('app');

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200,
    );
    this.camera.position.set(0, 8, 20);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    container?.prepend(this.renderer.domElement);

    this.particleFlow = new ParticleFlow();
    this.particleFlow.addToScene(this.scene);

    this.dataSimulator = new DataSimulator();
    this.dataSimulator.subscribe((data) => this.particleFlow.onData(data));

    this.interactionManager = new InteractionManager(
      this.camera,
      this.renderer,
      this.renderer.domElement,
    );

    this.clock = new THREE.Clock();

    this.fpsEl = document.getElementById('fps-value');
    this.particleCountEl = document.getElementById('particle-count');
    this.peakEl = document.getElementById('peak-value');
    this.btnToggle = document.getElementById('btn-toggle');
    this.btnReset = document.getElementById('btn-reset');
    this.iconPlay = document.getElementById('icon-play');
    this.iconPause = document.getElementById('icon-pause');

    this.setupUI();
    this.setupResize();
    this.updateMonitorPanel();
  }

  start(): void {
    this.dataSimulator.start();
    this.animate();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    if (this.isPlaying) {
      this.particleFlow.update(delta);
    }

    this.interactionManager.update();
    this.renderer.render(this.scene, this.camera);

    this.frameTimestamps.push(performance.now());
    if (this.frameTimestamps.length > this.FPS_WINDOW) {
      this.frameTimestamps.shift();
    }
    if (this.frameTimestamps.length >= this.MIN_FPS_FRAMES) {
      const elapsed = this.frameTimestamps[this.frameTimestamps.length - 1] - this.frameTimestamps[0];
      if (elapsed > 1) {
        this.currentFps = Math.round(((this.frameTimestamps.length - 1) / elapsed) * 1000);
      }
    }
    const now = performance.now();
    if (now - this.lastMonitorUpdate > 200) {
      this.lastMonitorUpdate = now;
      this.updateMonitorPanel();
    }
  };

  private setupUI(): void {
    this.btnToggle?.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      this.updateToggleIcon();
    });

    this.btnReset?.addEventListener('click', () => {
      this.isPlaying = true;
      this.particleFlow.reset();
      this.interactionManager.resetCamera();
      this.dataSimulator.resetPeak();
      this.updateToggleIcon();
    });
  }

  private updateToggleIcon(): void {
    if (this.iconPlay && this.iconPause) {
      this.iconPlay.style.display = this.isPlaying ? 'none' : 'block';
      this.iconPause.style.display = this.isPlaying ? 'block' : 'none';
    }
  }

  private updateMonitorPanel(): void {
    if (this.fpsEl) this.fpsEl.textContent = String(this.currentFps);
    if (this.particleCountEl) this.particleCountEl.textContent = String(this.particleFlow.particleCount);
    if (this.peakEl) this.peakEl.textContent = this.dataSimulator.getPeak().toFixed(2);
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.interactionManager.onResize();
    });
  }

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.dataSimulator.stop();
    this.particleFlow.dispose();
    this.interactionManager.dispose();
    this.renderer.dispose();
  }
}

const app = new App();
app.start();
