import * as THREE from 'three';
import { SceneManager } from './sceneManager';
import { ModelLoader, SculptureType } from './modelLoader';
import { ControlPanel } from './controlPanel';
import { Magnifier } from './magnifier';

class App {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private sceneManager: SceneManager;
  private modelLoader: ModelLoader;
  private controlPanel!: ControlPanel;
  private magnifier!: Magnifier;

  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private targetRotation: { x: number; y: number } = { x: 0, y: 0 };
  private currentRotation: { x: number; y: number } = { x: 0, y: 0 };
  private targetZoom: number = 1.0;
  private currentZoom: number = 1.0;
  private dampingFactor: number = 0.2;
  private zoomInterpolation: number = 0.3;
  private clock: THREE.Clock;

  private currentModelIndex: number = 0;
  private models: { type: SculptureType; name: string; color: number }[] = [
    { type: 'geometric', name: '几何抽象', color: 0x4A90D9 },
    { type: 'portrait', name: '人像雕塑', color: 0xE6A817 },
    { type: 'animal', name: '动物雕塑', color: 0x4CAF50 }
  ];

  private navTitle: HTMLElement;
  private prevBtn: HTMLElement;
  private nextBtn: HTMLElement;

  private fpsCounter: HTMLElement | null = null;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 6);
    this.camera.lookAt(0, 0.5, 0);

    this.sceneManager = new SceneManager();
    this.modelLoader = new ModelLoader(this.sceneManager.getScene());
    this.controlPanel = new ControlPanel(this.sceneManager, this.modelLoader);
    this.magnifier = new Magnifier(this.renderer, this.camera, this.sceneManager.getScene());

    this.navTitle = document.getElementById('navTitle')!;
    this.prevBtn = document.getElementById('prevBtn')!;
    this.nextBtn = document.getElementById('nextBtn')!;

    this.setupFpsCounter();
    this.setupEventListeners();
    this.loadInitialModel();
    this.animate();
  }

  private setupFpsCounter(): void {
    this.fpsCounter = document.createElement('div');
    this.fpsCounter.style.position = 'absolute';
    this.fpsCounter.style.top = '16px';
    this.fpsCounter.style.right = '16px';
    this.fpsCounter.style.color = '#9CA3AF';
    this.fpsCounter.style.fontSize = '12px';
    this.fpsCounter.style.fontFamily = 'monospace';
    this.fpsCounter.style.zIndex = '25';
    this.fpsCounter.style.background = 'rgba(26, 26, 46, 0.85)';
    this.fpsCounter.style.padding = '6px 10px';
    this.fpsCounter.style.borderRadius = '6px';
    this.fpsCounter.style.backdropFilter = 'blur(10px)';
    this.fpsCounter.textContent = 'FPS: 60';
    document.getElementById('app')?.appendChild(this.fpsCounter);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });

    this.prevBtn.addEventListener('click', () => this.switchModel(-1));
    this.nextBtn.addEventListener('click', () => this.switchModel(1));

    const toggleBtn = document.getElementById('togglePanelBtn')!;
    const panel = document.getElementById('controlPanel')!;
    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('hidden');
      toggleBtn.textContent = panel.classList.contains('hidden') ? '▶' : '◀';
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'z' || e.key === 'Z') {
        this.magnifier.activate();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'z' || e.key === 'Z') {
        this.magnifier.deactivate();
      }
    });
  }

  private async loadInitialModel(): Promise<void> {
    const model = this.models[this.currentModelIndex];
    await this.modelLoader.loadModel(model.type);
    this.sceneManager.setGlowColor(model.color);
    this.navTitle.textContent = model.name;
  }

  private switchModel(direction: number): void {
    this.currentModelIndex = (this.currentModelIndex + direction + this.models.length) % this.models.length;
    const model = this.models[this.currentModelIndex];
    this.modelLoader.switchModel(model.type, 0.6);
    this.sceneManager.animateGlowColor(model.color, 0.6);
    this.navTitle.textContent = model.name;
    this.targetRotation = { x: 0, y: 0 };
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.previousMouse = { x: event.clientX, y: event.clientY };
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onMouseMove(event: MouseEvent): void {
    this.magnifier.updateMousePosition(event.clientX, event.clientY);

    if (!this.isDragging) return;

    const deltaX = event.clientX - this.previousMouse.x;
    const deltaY = event.clientY - this.previousMouse.y;

    this.targetRotation.y += deltaX * 0.005;
    this.targetRotation.x += deltaY * 0.005;
    this.targetRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetRotation.x));

    this.previousMouse = { x: event.clientX, y: event.clientY };
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomSpeed = 0.001;
    this.targetZoom += event.deltaY * zoomSpeed;
    this.targetZoom = Math.max(0.5, Math.min(3.0, this.targetZoom));
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      event.preventDefault();
      this.isDragging = true;
      this.previousMouse = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1 && this.isDragging) {
      event.preventDefault();
      const touch = event.touches[0];
      this.magnifier.updateMousePosition(touch.clientX, touch.clientY);

      const deltaX = touch.clientX - this.previousMouse.x;
      const deltaY = touch.clientY - this.previousMouse.y;

      this.targetRotation.y += deltaX * 0.005;
      this.targetRotation.x += deltaY * 0.005;
      this.targetRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetRotation.x));

      this.previousMouse = { x: touch.clientX, y: touch.clientY };
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.magnifier.onResize();
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    this.frameCount++;
    this.fpsTime += delta;
    if (this.fpsTime >= 1.0) {
      this.currentFps = Math.round(this.frameCount / this.fpsTime);
      if (this.fpsCounter) {
        this.fpsCounter.textContent = `FPS: ${this.currentFps}`;
      }
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * this.dampingFactor;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * this.dampingFactor;
    this.currentZoom += (this.targetZoom - this.currentZoom) * this.zoomInterpolation;

    const model = this.modelLoader.getCurrentModel();
    if (model) {
      model.rotation.x = this.currentRotation.x;
      model.rotation.y = this.currentRotation.y;
    }

    const baseDistance = 6;
    this.camera.position.z = baseDistance / this.currentZoom;
    this.camera.lookAt(0, 0.5, 0);

    this.modelLoader.update(delta);
    this.sceneManager.update(delta);
    this.magnifier.update(delta);

    if (this.magnifier.isMagnifierActive()) {
      this.magnifier.render();
    } else {
      this.renderer.render(this.sceneManager.getScene(), this.camera);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
