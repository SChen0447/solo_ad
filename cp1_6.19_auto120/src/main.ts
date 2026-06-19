import * as THREE from 'three';
import { ParticleSystem, SelectedParticleInfo } from './particleSystem';
import { UIController } from './uiController';

class NebulaApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;

  private particleSystem: ParticleSystem;
  private uiController: UIController;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private cameraDistance: number = 1;
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 2;
  private minDistance: number = 0.5;
  private maxDistance: number = 50;

  private selectedInfo: SelectedParticleInfo | null = null;

  private clock: THREE.Clock;

  constructor() {
    this.canvas = document.getElementById('canvas-container') as HTMLCanvasElement;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.particleSystem = new ParticleSystem(5000);
    this.uiController = new UIController({
      onParamsChange: (params) => this.particleSystem.updateParams(params)
    });

    this.init();
  }

  private init(): void {
    this.setupRenderer();
    this.setupCamera();
    this.setupScene();
    this.setupLights();
    this.addObjects();
    this.bindEvents();
    this.animate();
  }

  private setupRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.sortObjects = true;
  }

  private setupCamera(): void {
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private setupScene(): void {
    this.scene.fog = new THREE.FogExp2(0x0a0a2e, 0.02);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x6666ff, 1, 50);
    pointLight1.position.set(10, 10, 10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff66ff, 0.8, 50);
    pointLight2.position.set(-10, -10, -10);
    this.scene.add(pointLight2);
  }

  private addObjects(): void {
    this.scene.add(this.particleSystem.points);
    this.scene.add(this.particleSystem.boundingBox);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize());
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('click', (e) => this.onClick(e));

    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', () => this.onTouchEnd());
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.cameraTheta -= deltaX * 0.005;
      this.cameraPhi -= deltaY * 0.005;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi));

      this.updateCameraPosition();
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    }

    if (this.selectedInfo !== null) {
      this.updateSelectedLabelPosition();
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    this.cameraDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.cameraDistance * scale));
    this.updateCameraPosition();

    if (this.selectedInfo !== null) {
      this.updateSelectedLabelPosition();
    }
  }

  private onClick(e: MouseEvent): void {
    if (this.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.particleSystem.points);

    if (intersects.length > 0 && intersects[0].index !== undefined) {
      const index = intersects[0].index;
      const info = this.particleSystem.selectParticle(index);
      if (info) {
        this.selectedInfo = info;
        this.updateSelectedLabelPosition();
      } else {
        this.selectedInfo = null;
        this.uiController.hideParticleLabel();
      }
    } else {
      this.particleSystem.clearSelection();
      this.selectedInfo = null;
      this.uiController.hideParticleLabel();
    }
  }

  private updateSelectedLabelPosition(): void {
    if (this.selectedInfo === null) return;

    const index = this.particleSystem.getSelectedIndex();
    if (index < 0) return;

    const positionAttr = this.particleSystem.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;

    const vec = new THREE.Vector3(
      positions[index * 3],
      positions[index * 3 + 1],
      positions[index * 3 + 2]
    );

    vec.project(this.camera);

    const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vec.y * 0.5 + 0.5) * window.innerHeight;

    this.selectedInfo.position = {
      x: parseFloat(positions[index * 3].toFixed(3)),
      y: parseFloat(positions[index * 3 + 1].toFixed(3)),
      z: parseFloat(positions[index * 3 + 2].toFixed(3))
    };

    const colorAttr = this.particleSystem.points.geometry.getAttribute('customColor') as THREE.BufferAttribute;
    const colors = colorAttr.array as Float32Array;
    const r = colors[index * 3];
    const g = colors[index * 3 + 1];
    const b = colors[index * 3 + 2];
    const toHex = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 255).toString(16).padStart(2, '0');
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();

    this.uiController.showParticleLabel(
      this.selectedInfo.id,
      hex,
      this.selectedInfo.position,
      x,
      y
    );
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.isDragging = true;
      this.previousMousePosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (this.isDragging && e.touches.length === 1) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
      const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

      this.cameraTheta -= deltaX * 0.005;
      this.cameraPhi -= deltaY * 0.005;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi));

      this.updateCameraPosition();
      this.previousMousePosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    this.particleSystem.update(deltaTime, elapsedTime);
    this.particleSystem.boundingBox.rotation.copy(this.particleSystem.points.rotation);

    if (this.selectedInfo !== null) {
      this.updateSelectedLabelPosition();
    }

    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new NebulaApp();
});
