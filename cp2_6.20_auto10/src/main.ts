import * as THREE from 'three';
import { PlantSystem, type GrowthSnapshot } from './plantSystem';
import { EnvironmentPanel, type EnvironmentParams } from './environmentPanel';
import { VisualEffects } from './visualEffects';
import { CameraManager } from './cameraControls';

const FIXED_TIMESTEP = 1000 / 60;

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private accumulator = 0;
  private lastFrameTime = 0;

  private plantSystem: PlantSystem;
  private envPanel: EnvironmentPanel;
  private visualEffects: VisualEffects;
  private cameraManager: CameraManager;

  private currentParams: EnvironmentParams = { light: 60, moisture: 70, temperature: 25 };
  private lastSnapshot: GrowthSnapshot | null = null;
  private frameCount = 0;
  private fpsTimer = 0;
  private readonly snapshotIntervalMs = 33;
  private snapshotAccumulator = 0;

  constructor() {
    this.container = document.getElementById('app')!;
    if (!this.container) {
      throw new Error('Container #app not found');
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.visualEffects = new VisualEffects(this.scene);

    this.plantSystem = new PlantSystem(this.scene);

    this.cameraManager = new CameraManager(
      this.camera,
      this.renderer.domElement,
      this.container
    );

    this.envPanel = new EnvironmentPanel(this.container);
    this.envPanel.addChangeListener(p => this.handleParamsChange(p));

    this.setupRecordingHandlers();
    this.setupSnapshotListener();

    window.addEventListener('resize', () => this.onResize());

    this.lastFrameTime = performance.now();
    this.animate();
  }

  private setupRecordingHandlers(): void {
    this.cameraManager.setOnPlaybackRequest(snapshot => {
      this.plantSystem.restoreSnapshot(snapshot);
    });
  }

  private setupSnapshotListener(): void {
    this.plantSystem.addSnapshotListener(snap => {
      this.lastSnapshot = snap;
    });
  }

  private handleParamsChange(params: EnvironmentParams): void {
    this.currentParams = { ...params };
    this.plantSystem.setTargetParams(params);
    this.visualEffects.updateEnvironmentColor(params);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const rawDelta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    const deltaMs = Math.min(rawDelta, 100);

    this.fpsTimer += rawDelta;
    this.frameCount++;
    if (this.fpsTimer >= 1000) {
      this.fpsTimer = 0;
      this.frameCount = 0;
    }

    const inPlayback = this.cameraManager.isPlaybackMode();
    if (!inPlayback) {
      this.accumulator += deltaMs;
      while (this.accumulator >= FIXED_TIMESTEP) {
        this.plantSystem.update(FIXED_TIMESTEP);
        this.snapshotAccumulator += FIXED_TIMESTEP;
        if (
          this.cameraManager.isRecording() &&
          this.snapshotAccumulator >= this.snapshotIntervalMs &&
          this.lastSnapshot
        ) {
          this.snapshotAccumulator = 0;
          this.cameraManager.addSnapshotForRecording(
            JSON.parse(JSON.stringify(this.lastSnapshot))
          );
        }
        this.accumulator -= FIXED_TIMESTEP;
      }
    }

    this.cameraManager.update(deltaMs);
    this.visualEffects.update(deltaMs, this.plantSystem.group);
    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.plantSystem.dispose();
    this.visualEffects.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new App();
  } catch (e) {
    console.error('Failed to initialize application:', e);
  }
});
