import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { Terrain } from './terrain';
import { Vehicle } from './vehicle';
import { UI } from './ui';

class Game {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private terrain!: Terrain;
  private vehicle!: Vehicle;
  private ui!: UI;
  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;
  private keys!: Set<string>;
  private isMouseDown!: boolean;
  private sunLight!: THREE.DirectionalLight;
  private sunPivot!: THREE.Group;
  private clock!: THREE.Clock;
  private frameCount!: number;
  private fpsTime!: number;
  private currentFPS!: number;
  private animationId: number | null = null;
  private canvasContainer!: HTMLElement;

  constructor() {
    this.scene = new THREE.Scene();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.keys = new Set();
    this.isMouseDown = false;
    this.clock = new THREE.Clock();
    this.frameCount = 0;
    this.fpsTime = 0;
    this.currentFPS = 60;
    this.animationId = null;
    this.sunPivot = new THREE.Group();
    this.canvasContainer = document.getElementById('canvas-container')!;

    this.ui = new UI();
    this.ui.updateLoadingProgress(0.1, '正在初始化渲染器...');

    this.initRenderer();
    this.initCamera();
    this.initControls();
    this.initLighting();
    this.initFog();

    this.ui.updateLoadingProgress(0.4, '正在创建地形...');
    this.terrain = new Terrain();
    this.scene.add(this.terrain.mesh);

    this.ui.updateLoadingProgress(0.7, '正在创建车辆...');
    this.vehicle = new Vehicle();
    this.vehicle.setInitialPosition(0, 0.55, 0);
    this.scene.add(this.vehicle.group);

    this.ui.updateLoadingProgress(0.9, '正在完成初始化...');
    this.setupEventListeners();
    this.createGridHelper();

    setTimeout(() => {
      this.ui.updateLoadingProgress(1, '初始化完成');
      this.ui.hideLoadingScreen();
      setTimeout(() => {
        this.ui.showLoadingComplete();
      }, 300);
      this.start();
    }, 500);
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0a1628);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.canvasContainer.appendChild(this.renderer.domElement);
  }

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(12, 10, 12);
    this.camera.lookAt(0, 0, 0);
  }

  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 40;
    this.controls.target.set(0, 0, 0);
  }

  private initLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x1a3d1a, 0.4);
    this.scene.add(hemisphereLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.sunLight.position.set(10, 15, 10);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 50;
    this.sunLight.shadow.camera.left = -20;
    this.sunLight.shadow.camera.right = 20;
    this.sunLight.shadow.camera.top = 20;
    this.sunLight.shadow.camera.bottom = -20;
    this.sunLight.shadow.bias = -0.0001;

    this.sunPivot.add(this.sunLight);
    this.scene.add(this.sunPivot);

    const sunGeometry = new THREE.SphereGeometry(0.8, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffddaa,
      transparent: true,
      opacity: 0.9
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.copy(this.sunLight.position);
    this.sunLight.add(sun);
  }

  private initFog(): void {
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.02);
  }

  private createGridHelper(): void {
    const gridHelper = new THREE.GridHelper(16, 16, 0x1e3a5f, 0x0a1628);
    gridHelper.position.y = -0.01;
    this.scene.add(gridHelper);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.isMouseDown = true;
    this.handleTerrainDeform(event);
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isMouseDown) {
      this.handleTerrainDeform(event);
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.isMouseDown = false;
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.keys.add(event.key.toLowerCase());
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys.delete(event.key.toLowerCase());
  }

  private handleTerrainDeform(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.terrain.mesh);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const direction = event.shiftKey ? 1 : -1;
      this.terrain.deform(point.x, point.z, direction);
    }
  }

  private updateSun(deltaTime: number): void {
    this.sunPivot.rotation.y += deltaTime * 0.05;

    const sunAngle = this.sunPivot.rotation.y;
    const height = Math.sin(sunAngle * 0.5) * 15;
    this.sunLight.position.y = Math.max(5, height);

    const intensity = 0.5 + Math.max(0, Math.sin(sunAngle * 0.5)) * 1;
    this.sunLight.intensity = intensity;

    const fogColor = new THREE.Color();
    if (height > 8) {
      fogColor.setHex(0x87ceeb);
    } else if (height > 3) {
      const t = (height - 3) / 5;
      fogColor.setRGB(0.53 * t + 0.4 * (1 - t), 0.81 * t + 0.2 * (1 - t), 0.92 * t + 0.3 * (1 - t));
    } else {
      fogColor.setRGB(0.4, 0.2, 0.3);
    }
    (this.scene.fog as THREE.FogExp2).color = fogColor;
  }

  private updateCameraTarget(): void {
    const targetPos = new THREE.Vector3();
    this.vehicle.group.getWorldPosition(targetPos);
    this.controls.target.lerp(targetPos, 0.05);
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    this.fpsTime += deltaTime;

    if (this.fpsTime >= 0.5) {
      this.currentFPS = this.frameCount / this.fpsTime;
      this.frameCount = 0;
      this.fpsTime = 0;
      this.ui.updateFPS(this.currentFPS);
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.updateSun(deltaTime);
    this.vehicle.update(this.terrain, this.keys, deltaTime);
    this.updateCameraTarget();
    this.controls.update();
    this.ui.updateGauges(this.vehicle.speed, this.vehicle.tiltAngle, deltaTime);
    this.updateFPS(deltaTime);

    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    this.clock.start();
    this.animate();
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public dispose(): void {
    this.stop();
    this.terrain.dispose();
    this.vehicle.dispose();
    this.renderer.dispose();
    this.controls.dispose();

    window.removeEventListener('resize', this.onWindowResize.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
  }
}

let game: Game | null = null;

window.addEventListener('DOMContentLoaded', () => {
  game = new Game();
});

window.addEventListener('beforeunload', () => {
  if (game) {
    game.dispose();
  }
});
