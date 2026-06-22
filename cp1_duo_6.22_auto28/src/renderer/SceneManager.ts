import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlateRenderer } from './PlateRenderer.js';
import type { PlateData } from '../data/platesData.js';

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  plateRenderer: PlateRenderer;
  stars!: THREE.Points;
  private clock: THREE.Clock;
  private animationId: number = 0;
  private onPeriodChange: ((period: { nameCN: string; timeAgo: string }) => void) | null = null;

  constructor(container: HTMLElement) {
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0f1e, 1);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 15;
    this.controls.enablePan = true;

    this.setupLights();
    this.setupStars();
    this.setupGradientBackground();

    this.plateRenderer = new PlateRenderer(this.scene);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x4466aa, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.9);
    directional.position.set(5, 5, 5);
    this.scene.add(directional);

    const backLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    backLight.position.set(-3, -2, -5);
    this.scene.add(backLight);
  }

  private setupStars(): void {
    const count = 1500;
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 40 + Math.random() * 20;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  private setupGradientBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 360);
    gradient.addColorStop(0, '#0f1a3d');
    gradient.addColorStop(0.5, '#0d1430');
    gradient.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  setPeriodChangeCallback(cb: (period: { nameCN: string; timeAgo: string }) => void): void {
    this.onPeriodChange = cb;
  }

  initPlates(platesData: PlateData[]): void {
    this.plateRenderer.createPlates(platesData);
  }

  updatePlates(platesData: PlateData[], time: number): void {
    this.plateRenderer.updatePlates(platesData, time);
  }

  setPresetView(view: 'front' | 'side' | 'top'): void {
    const duration = 1500;
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    let endPos: THREE.Vector3;
    let endTarget = new THREE.Vector3(0, 0, 0);

    switch (view) {
      case 'front':
        endPos = new THREE.Vector3(0, 0, 6);
        break;
      case 'side':
        endPos = new THREE.Vector3(6, 0, 0);
        break;
      case 'top':
        endPos = new THREE.Vector3(0, 6, 0);
        break;
    }

    const startTime = performance.now();
    const animateCamera = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.camera.position.lerpVectors(startPos, endPos, ease);
      this.controls.target.lerpVectors(startTarget, endTarget, ease);
      this.controls.update();

      if (t < 1) {
        requestAnimationFrame(animateCamera);
      }
    };
    requestAnimationFrame(animateCamera);
  }

  private updateStars(time: number): void {
    const positions = this.stars.geometry.attributes.position;
    const phases = this.stars.geometry.attributes.aPhase;
    if (!phases) return;

    const count = positions.count;
    const material = this.stars.material as THREE.PointsMaterial;
    const baseOpacity = 0.5 + 0.3 * Math.sin(time * 0.5);
    material.opacity = Math.max(0.2, Math.min(1.0, baseOpacity));
  }

  getRaycaster(): THREE.Raycaster {
    return new THREE.Raycaster();
  }

  getMouseNDC(event: MouseEvent): THREE.Vector2 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  startRenderLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const elapsed = this.clock.getElapsedTime();

      this.controls.update();
      this.updateStars(elapsed);
      this.plateRenderer.updateArrowAnimations(elapsed);
      this.plateRenderer.updateBoundaryGlow(elapsed);
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  stopRenderLoop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private onResize(): void {
    const container = this.renderer.domElement.parentElement;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose(): void {
    this.stopRenderLoop();
    this.renderer.dispose();
    this.controls.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}
