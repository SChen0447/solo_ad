import * as THREE from 'three';
import { SceneManager } from './sceneManager';
import { UIManager, MinimapData } from './uiManager';

class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sceneManager: SceneManager;
  private uiManager: UIManager;
  private clock: THREE.Clock;
  private currentFloor: number;
  private transitioning: boolean;

  constructor() {
    this.clock = new THREE.Clock();
    this.currentFloor = 1;
    this.transitioning = false;

    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Game canvas not found');

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x1a1028);

    this.uiManager = new UIManager();

    this.sceneManager = new SceneManager(this.scene, this.camera, canvas, {
      onCollectKey: (index, total) => this.onKeyCollected(index, total),
      onEnterPortal: () => this.onEnterPortal(),
      onMinimapUpdate: (data) => this.onMinimapUpdate(data)
    });

    window.addEventListener('resize', () => this.onResize());

    this.init();
  }

  private async init(): Promise<void> {
    this.uiManager.updateFloor(this.currentFloor);
    this.uiManager.updateFragments(0);
    this.uiManager.resetSlots();
    await this.sceneManager.generateFloor(this.currentFloor);
    this.animate();
  }

  private onKeyCollected(index: number, total: number): void {
    this.uiManager.fillSlot(index);
    this.uiManager.updateFragments(total);
  }

  private async onEnterPortal(): Promise<void> {
    if (this.transitioning) return;
    this.transitioning = true;
    await this.uiManager.showTransition();
    this.currentFloor++;
    this.uiManager.updateFloor(this.currentFloor);
    this.uiManager.updateFragments(0);
    this.uiManager.resetSlots();
    await this.sceneManager.generateFloor(this.currentFloor);
    this.transitioning = false;
  }

  private onMinimapUpdate(data: MinimapData): void {
    const time = performance.now() / 1000;
    this.uiManager.updateMinimap(data, time);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();
    this.sceneManager.update(time, delta);
    this.renderer.render(this.scene, this.camera);
  };
}

new Game();
