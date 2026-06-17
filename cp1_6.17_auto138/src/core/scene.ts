import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public ambientLight: THREE.AmbientLight;
  public container: HTMLElement;
  
  private animationFrameId: number = 0;
  private isComparing: boolean = false;
  private comparePosition: number = 0.5;
  private compareSceneLeft?: THREE.Scene;
  private compareSceneRight?: THREE.Scene;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(6, 4, 6);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.target.set(0, 0.5, 0);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);

    this.addFloor();
    this.bindEvents();
    this.animate();
  }

  private addFloor(): void {
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d2d44,
      roughness: 0.8,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    
    if (this.isComparing && this.compareSceneLeft && this.compareSceneRight) {
      this.renderCompareView();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private renderCompareView(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const splitX = Math.floor(width * this.comparePosition);

    this.renderer.setScissorTest(true);

    this.renderer.setScissor(0, 0, splitX, height);
    this.renderer.setViewport(0, 0, splitX, height);
    this.renderer.render(this.compareSceneLeft!, this.camera);

    this.renderer.setScissor(splitX, 0, width - splitX, height);
    this.renderer.setViewport(splitX, 0, width - splitX, height);
    this.renderer.render(this.compareSceneRight!, this.camera);

    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, width, height);
  }

  public setCameraPosition(x: number, y: number, z: number, target?: THREE.Vector3): void {
    this.camera.position.set(x, y, z);
    if (target) {
      this.controls.target.copy(target);
    }
    this.controls.update();
  }

  public getAmbientIntensity(): number {
    return this.ambientLight.intensity;
  }

  public setAmbientIntensity(intensity: number): void {
    this.ambientLight.intensity = intensity;
  }

  public setCompareMode(
    enabled: boolean,
    leftScene?: THREE.Scene,
    rightScene?: THREE.Scene
  ): void {
    this.isComparing = enabled;
    if (enabled) {
      this.compareSceneLeft = leftScene;
      this.compareSceneRight = rightScene;
    } else {
      this.compareSceneLeft = undefined;
      this.compareSceneRight = undefined;
    }
  }

  public setComparePosition(position: number): void {
    this.comparePosition = Math.max(0, Math.min(1, position));
  }

  public getComparePosition(): number {
    return this.comparePosition;
  }

  public getScreenshot(): string {
    return this.renderer.domElement.toDataURL('image/png');
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
  }
}

let sceneManagerInstance: SceneManager | null = null;

export function initScene(containerId: string): SceneManager {
  if (!sceneManagerInstance) {
    sceneManagerInstance = new SceneManager(containerId);
  }
  return sceneManagerInstance;
}

export function getSceneManager(): SceneManager {
  if (!sceneManagerInstance) {
    throw new Error('Scene not initialized. Call initScene first.');
  }
  return sceneManagerInstance;
}

export { SceneManager };
