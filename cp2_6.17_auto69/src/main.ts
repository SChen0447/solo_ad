import * as THREE from 'three';
import { CityDataStore, BuildingType, BuildingData } from './cityData';
import { CityBuilder } from './cityBuilder';
import { Navigation } from './navigation';
import { UI } from './ui';

type EventCallback = (data?: unknown) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  emit(event: string, data?: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock = new THREE.Clock();

  private eventBus = new EventBus();
  private store = new CityDataStore();
  private cityBuilder!: CityBuilder;
  private navigation!: Navigation;
  private ui!: UI;

  private groundPlane!: THREE.Mesh;
  private mouse = new THREE.Vector2();
  private isMouseDown = false;
  private mouseDownPos = new THREE.Vector2();
  private shiftKey = false;

  private fpsFrames = 0;
  private fpsTime = 0;

  constructor() {
    const container = document.getElementById('app')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.position = 'fixed';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.zIndex = '0';
    container.appendChild(this.renderer.domElement);

    this.setupScene();
    this.setupLighting();
    this.setupSkybox();
    this.setupStars();
    this.setupFog();

    this.cityBuilder = new CityBuilder(
      this.scene,
      this.store,
      this.groundPlane,
      (event, data) => this.eventBus.emit(event, data)
    );

    this.navigation = new Navigation(this.camera, this.renderer.domElement);

    this.ui = new UI(
      (event, data) => this.eventBus.emit(event, data),
      (event, cb) => this.eventBus.on(event, cb)
    );

    this.setupEventBus();
    this.setupInputHandlers();

    window.addEventListener('resize', () => this.onResize());

    this.animate();
  }

  private setupScene(): void {
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2c2c2c,
      roughness: 0.9,
      metalness: 0.1,
    });
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.receiveShadow = true;
    this.groundPlane.name = 'ground';
    this.scene.add(this.groundPlane);

    const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x444444);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.5;
    this.scene.add(gridHelper);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(30, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    dirLight.shadow.camera.left = -60;
    dirLight.shadow.camera.right = 60;
    dirLight.shadow.camera.top = 60;
    dirLight.shadow.camera.bottom = -60;
    this.scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0x4a90d9, 0x2c2c2c, 0.3);
    this.scene.add(hemiLight);
  }

  private setupSkybox(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0b0b2b');
    gradient.addColorStop(1, '#4a90d9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    this.scene.background = texture;
  }

  private setupStars(): void {
    const starsGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    for (let i = 0; i < 50; i++) {
      const x = (Math.random() - 0.5) * 200;
      const y = 30 + Math.random() * 70;
      const z = (Math.random() - 0.5) * 200;
      positions.push(x, y, z);
    }
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
    });

    const stars = new THREE.Points(starsGeo, starsMat);
    this.scene.add(stars);
  }

  private setupFog(): void {
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.008);
  }

  private setupEventBus(): void {
    this.eventBus.on('setPlacingType', (data) => {
      this.cityBuilder.setPlacingType(data as BuildingType | null);
    });

    this.eventBus.on('deleteBuilding', () => {
      this.cityBuilder.deleteSelected();
    });

    this.eventBus.on('undoDelete', () => {
      const data = this.store.undoDelete();
      if (data) {
        this.cityBuilder.restoreBuilding(data);
      }
    });

    this.eventBus.on('switchMode', (data) => {
      this.navigation.switchMode(data as 'firstPerson' | 'overhead');
    });

    this.eventBus.on('updateProperty', (data: any) => {
      if (data && data.id) {
        const { id, ...props } = data;
        this.cityBuilder.updateBuildingProperty(id, props);
      }
    });

    this.eventBus.on('buildingDeleted', () => {
      this.ui.hidePropertyPanel();
    });
  }

  private setupInputHandlers(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this.navigation.handleMouseDown(e);
        return;
      }
      if (e.button === 0) {
        this.isMouseDown = true;
        this.shiftKey = e.shiftKey;
        this.mouseDownPos.set(e.clientX, e.clientY);

        if (this.cityBuilder.getSelectedId() && !this.cityBuilder.getPlacingType()) {
          this.cityBuilder.startDrag(this.mouse, this.camera, e.shiftKey);
        }
        this.navigation.handleMouseDown(e);
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.navigation.handleMouseMove(e);

      if (this.isMouseDown && this.cityBuilder.getSelectedId()) {
        this.cityBuilder.updateDrag(this.mouse, this.camera);
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        const dist = Math.hypot(
          e.clientX - this.mouseDownPos.x,
          e.clientY - this.mouseDownPos.y
        );

        if (dist < 5) {
          this.cityBuilder.handleClick(this.mouse, this.camera);
        }

        this.cityBuilder.endDrag();
        this.isMouseDown = false;

        if (!this.shiftKey) {
          this.ui.hideRotationTooltip();
        }
      }
      this.navigation.handleMouseUp(e);
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.cityBuilder.getSelectedId() && this.cityBuilder.getPlacingType() === null) {
        this.cityBuilder.handleScroll(e.deltaY);
      }
      this.navigation.handleWheel(e.deltaY);
    }, { passive: false });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    document.addEventListener('keydown', (e) => {
      this.navigation.handleKeyDown(e.key);
      if (e.key === 'Escape') {
        this.cityBuilder.setPlacingType(null);
        this.ui.clearPlacingType();
        this.cityBuilder.deselectBuilding();
      }
      if (e.key === 'Delete') {
        this.cityBuilder.deleteSelected();
      }
    });

    document.addEventListener('keyup', (e) => {
      this.navigation.handleKeyUp(e.key);
    });

    document.addEventListener('pointerlockchange', () => {
      this.navigation.handlePointerLockChange();
    });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.navigation.update(delta);
    this.cityBuilder.update(time);

    this.renderer.render(this.scene, this.camera);

    this.fpsFrames++;
    this.fpsTime += delta;
    if (this.fpsTime >= 1.0) {
      this.ui.updateFPS(Math.round(this.fpsFrames / this.fpsTime));
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  }
}

new App();
