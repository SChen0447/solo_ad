import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class ThreeScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public ground: THREE.Group;
  public container: HTMLElement;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private animationFrameId: number = 0;
  private clock: THREE.Clock;

  public onGroundClick?: (point: THREE.Vector3) => void;
  public onObjectClick?: (intersects: THREE.Intersection[]) => void;
  public onUpdate?: (deltaTime: number) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.setupBackground();
    this.setupCamera();
    this.setupRenderer();
    this.setupControls();
    this.setupLights();
    this.setupGround();
    this.setupEventListeners();
    this.animate();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a1f');
    gradient.addColorStop(0.5, '#1a0a3e');
    gradient.addColorStop(1, '#050510');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
    this.scene.fog = new THREE.FogExp2(0x0a0a1f, 0.015);
  }

  private setupCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      2000
    );
    this.camera.position.set(15, 15, 20);
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
  }

  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;
    this.controls.panSpeed = 0.6;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 100;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.target.set(0, 2, 0);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x4a3a7a, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x8888ff, 0.8);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);

    const purpleLight = new THREE.PointLight(0x8844ff, 1.2, 80);
    purpleLight.position.set(-15, 12, -10);
    this.scene.add(purpleLight);

    const blueLight = new THREE.PointLight(0x4488ff, 1.0, 80);
    blueLight.position.set(15, 10, 15);
    this.scene.add(blueLight);
  }

  private setupGround(): void {
    this.ground = new THREE.Group();

    const gridSize = 60;
    const gridDivisions = 30;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x4466ff, 0x3344aa);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.35;
    this.ground.add(gridHelper);

    const planeGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a4a,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.01;
    plane.receiveShadow = true;
    this.ground.add(plane);

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x4466ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });
    const glowPlane = new THREE.Mesh(planeGeometry, glowMaterial);
    glowPlane.rotation.x = -Math.PI / 2;
    glowPlane.position.y = -0.02;
    this.ground.add(glowPlane);

    this.ground.userData.isGround = true;
    this.scene.add(this.ground);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
  }

  private onResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private onClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const allObjects: THREE.Object3D[] = [];
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        allObjects.push(obj);
      }
    });

    const intersects = this.raycaster.intersectObjects(allObjects, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      let isGround = false;
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData.isGround) {
          isGround = true;
          break;
        }
        obj = obj.parent;
      }

      if (isGround) {
        this.onGroundClick?.(hit.point);
      } else if (this.onObjectClick) {
        this.onObjectClick(intersects);
      }
    }
  }

  public addToScene(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  public removeFromScene(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  public getIntersectsFromEvent(event: MouseEvent, objects: THREE.Object3D[]): THREE.Intersection[] {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.raycaster.intersectObjects(objects, true);
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    const delta = this.clock.getDelta();
    this.controls.update();
    this.onUpdate?.(delta);
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.domElement.removeEventListener('click', this.onClick.bind(this));
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
