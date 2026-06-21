import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public ground: THREE.Mesh;
  public gridHelper: THREE.GridHelper;
  public container: HTMLElement;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;
  private disposed: boolean = false;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id ${containerId} not found`);
    }
    this.container = container;

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.ground = this.createGround();
    this.gridHelper = this.createGridHelper();

    this.scene.add(this.ground);
    this.scene.add(this.gridHelper);

    this.setupEnvironment();
    this.bindEvents();
    this.onResize();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#2C3E50');
    gradient.addColorStop(1, '#1A252F');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;

    scene.fog = new THREE.Fog(0x1A252F, 80, 200);

    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      50,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      500
    );
    camera.position.set(25, 25, 35);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 120;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.set(0, 0, 0);
    controls.update();
    return controls;
  }

  private createGround(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(200, 200);
    const material = new THREE.MeshStandardMaterial({
      color: 0x1e2a35,
      transparent: true,
      opacity: 0.95,
      roughness: 0.95,
      metalness: 0.0
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    ground.name = 'ground';
    return ground;
  }

  private createGridHelper(): THREE.GridHelper {
    const gridSize = 200;
    const gridDivisions = 100;
    const gridHelper = new THREE.GridHelper(
      gridSize,
      gridDivisions,
      0x85C1E9,
      0x85C1E9
    );
    gridHelper.material.opacity = 0.25;
    gridHelper.material.transparent = true;
    (gridHelper.material as THREE.Material).depthWrite = false;
    gridHelper.position.y = 0.01;
    return gridHelper;
  }

  private setupEnvironment(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x1e2a35, 0.25);
    this.scene.add(hemiLight);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  public onResize(): void {
    if (this.disposed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public update(): void {
    if (this.disposed) return;
    const delta = this.clock.getDelta();
    this.controls.update(delta);
  }

  public render(): void {
    if (this.disposed) return;
    this.renderer.render(this.scene, this.camera);
  }

  public getIntersects(
    event: MouseEvent,
    objects: THREE.Object3D[],
    recursive: boolean = true
  ): THREE.Intersection[] {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.raycaster.intersectObjects(objects, recursive);
  }

  public getGroundIntersection(event: MouseEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.ground, false);
    if (intersects.length > 0) {
      return intersects[0].point;
    }
    return null;
  }

  public getRaycaster(): THREE.Raycaster {
    return this.raycaster;
  }

  public captureThumbnail(width: number = 80, height: number = 80): string {
    this.render();
    const sourceCanvas = this.renderer.domElement;
    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = width;
    targetCanvas.height = height;
    const ctx = targetCanvas.getContext('2d')!;
    ctx.fillStyle = '#1A252F';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(sourceCanvas, 0, 0, width, height);
    return targetCanvas.toDataURL('image/png');
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener('resize', this.onResize.bind(this));
    this.controls.dispose();
    this.renderer.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
