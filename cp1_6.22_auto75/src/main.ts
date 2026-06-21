import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CAFFEINE_MOLECULE } from './molecule/MoleculeData';
import { MoleculeRenderer, type DisplayMode, type AtomInfo } from './molecule/MoleculeRenderer';
import { UIPanel } from './ui/UIPanel';

const INITIAL_CAMERA_POSITION = new THREE.Vector3(6, 5, 7);
const INITIAL_TARGET = new THREE.Vector3(0, 0, 0);
const AUTO_ROTATE_SPEED = (2 * Math.PI) / 10;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;

class MoleculeViewerApp {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private moleculeRenderer: MoleculeRenderer;
  private uiPanel: UIPanel;
  private autoRotateEnabled: boolean = true;
  private animationId: number = 0;
  private clock: THREE.Clock;
  private isResetting: boolean = false;
  private resetStartTime: number = 0;
  private resetDuration: number = 600;
  private resetFromPosition: THREE.Vector3 = new THREE.Vector3();
  private resetFromTarget: THREE.Vector3 = new THREE.Vector3();
  private introStartTime: number = 0;
  private introDuration: number = 800;
  private isIntroAnimating: boolean = true;
  private frameCount: number = 0;
  private fps: number = 0;

  constructor() {
    this.container = document.getElementById('scene-container') as HTMLElement;
    if (!this.container) {
      throw new Error('Cannot find #scene-container element');
    }
    this.clock = new THREE.Clock();
    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();
    this.setupLights();
    this.setupBackground();
    this.moleculeRenderer = new MoleculeRenderer(
      this.scene,
      this.camera,
      this.container,
      CAFFEINE_MOLECULE
    );
    this.moleculeRenderer.getGroup().scale.setScalar(0.5);
    this.uiPanel = new UIPanel(this.container, {
      onModeChange: (mode: DisplayMode) => this.handleModeChange(mode),
      onResetView: () => this.resetCameraView()
    });
    this.moleculeRenderer.setHighlightCallback((info: AtomInfo | null) => {
      if (info) {
        this.uiPanel.showAtomInfo(info);
      } else {
        this.uiPanel.hideAtomInfo();
      }
    });
    this.moleculeRenderer.setHoverCallback((name: string | null, event?: MouseEvent) => {
      if (name && event) {
        this.uiPanel.showTooltip(name, event);
      } else {
        this.uiPanel.hideTooltip();
      }
    });
    this.introStartTime = performance.now();
    this.bindEvents();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    camera.position.copy(INITIAL_CAMERA_POSITION);
    camera.lookAt(INITIAL_TARGET);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.setClearColor(0x000000, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = INITIAL_CAMERA_POSITION.length() * MIN_ZOOM;
    controls.maxDistance = INITIAL_CAMERA_POSITION.length() * MAX_ZOOM;
    controls.enablePan = false;
    controls.target.copy(INITIAL_TARGET);
    controls.update();
    controls.addEventListener('start', () => {
      if (!this.isResetting) {
        this.autoRotateEnabled = false;
      }
    });
    return controls;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight1.position.set(5, 8, 6);
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x8899ff, 0.35);
    directionalLight2.position.set(-6, 3, -5);
    this.scene.add(directionalLight2);

    const pointLight = new THREE.PointLight(0xffaa66, 0.25, 30);
    pointLight.position.set(0, -5, 3);
    this.scene.add(pointLight);
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0f0c29');
    gradient.addColorStop(0.5, '#302b63');
    gradient.addColorStop(1, '#24243e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this.scene.background = texture;
  }

  private handleModeChange(mode: DisplayMode): void {
    this.moleculeRenderer.setDisplayMode(mode);
    this.uiPanel.setCurrentMode(mode);
  }

  private resetCameraView(): void {
    this.isResetting = true;
    this.resetStartTime = performance.now();
    this.resetFromPosition.copy(this.camera.position);
    this.resetFromTarget.copy(this.controls.target);
  }

  private easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private lerpVector(from: THREE.Vector3, to: THREE.Vector3, t: number): THREE.Vector3 {
    return new THREE.Vector3().lerpVectors(from, to, t);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private onWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.controls.minDistance = INITIAL_CAMERA_POSITION.length() * MIN_ZOOM;
    this.controls.maxDistance = INITIAL_CAMERA_POSITION.length() * MAX_ZOOM;
  }

  private updateIntroAnimation(now: number): void {
    const elapsed = now - this.introStartTime;
    if (elapsed >= this.introDuration) {
      this.moleculeRenderer.getGroup().scale.setScalar(1);
      this.isIntroAnimating = false;
      return;
    }
    const t = elapsed / this.introDuration;
    const eased = this.easeOutElastic(t);
    const scale = 0.5 + eased * 0.5;
    this.moleculeRenderer.getGroup().scale.setScalar(scale);
  }

  private updateResetAnimation(now: number): void {
    const elapsed = now - this.resetStartTime;
    if (elapsed >= this.resetDuration) {
      this.camera.position.copy(INITIAL_CAMERA_POSITION);
      this.controls.target.copy(INITIAL_TARGET);
      this.isResetting = false;
      this.autoRotateEnabled = true;
      this.controls.update();
      return;
    }
    const t = elapsed / this.resetDuration;
    const eased = this.easeOutCubic(t);
    this.camera.position.copy(
      this.lerpVector(this.resetFromPosition, INITIAL_CAMERA_POSITION, eased)
    );
    this.controls.target.copy(
      this.lerpVector(this.resetFromTarget, INITIAL_TARGET, eased)
    );
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    if (deltaTime > 0) {
      const currentFPS = 1 / deltaTime;
      this.fps = this.fps * 0.9 + currentFPS * 0.1;
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const deltaTime = this.clock.getDelta();
    this.updateFPS(deltaTime);

    if (this.isIntroAnimating) {
      this.updateIntroAnimation(now);
    }

    if (this.isResetting) {
      this.updateResetAnimation(now);
    } else if (this.autoRotateEnabled) {
      this.moleculeRenderer.getGroup().rotation.y += AUTO_ROTATE_SPEED * deltaTime;
    }

    if (!this.isResetting) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.moleculeRenderer.dispose();
    this.uiPanel.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', () => this.onWindowResize());
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }

  getFPS(): number {
    return this.fps;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    (window as unknown as { app?: MoleculeViewerApp }).app = new MoleculeViewerApp();
  } catch (error) {
    console.error('Failed to initialize Molecule Viewer:', error);
  }
});
