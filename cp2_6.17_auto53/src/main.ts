import * as THREE from 'three';
import { CityBuilder, on, emit } from './cityBuilder';
import { Navigation, type NavigationMode } from './navigation';
import { UI } from './ui';
import { getBuilding, type BuildingType } from './cityData';

class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cityBuilder: CityBuilder;
  private navigation: Navigation;
  private ui: UI;
  private groundPlane: THREE.Mesh;
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private lastTime = performance.now();
  private frameCount = 0;
  private fpsTimer = 0;
  private isPointerDown = false;
  private isOverUI = false;

  constructor() {
    const appEl = document.getElementById('app')!;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.008);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 30, 40);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    appEl.appendChild(this.renderer.domElement);

    this.groundPlane = this.createGround();
    this.scene.add(this.groundPlane);

    this.createSkybox();
    this.createStars();
    this.createLights();

    this.cityBuilder = new CityBuilder(this.scene, this.camera, this.groundPlane);
    this.navigation = new Navigation(this.camera);
    this.ui = new UI();

    this.setupEventBus();
    this.bindDOMEvents();

    this.animate();
  }

  private createGround(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(100, 100);
    const mat = new THREE.MeshPhongMaterial({
      color: 0x2c2c2c,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    mesh.name = 'ground';

    const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x444444);
    gridHelper.position.y = 0.01;
    gridHelper.name = 'grid';

    const group = new THREE.Group();
    group.add(mesh);
    group.add(gridHelper);

    const wrapper = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    wrapper.rotation.x = -Math.PI / 2;
    wrapper.name = 'groundHitTarget';

    const container = new THREE.Group();
    container.add(group);
    container.add(wrapper);

    return wrapper;
  }

  private createSkybox() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#4a90d9');
    gradient.addColorStop(1, '#0b0b2b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.background = texture;
  }

  private createStars() {
    const positions: number[] = [];
    for (let i = 0; i < 50; i++) {
      const x = (Math.random() - 0.5) * 200;
      const y = 30 + Math.random() * 70;
      const z = (Math.random() - 0.5) * 200;
      positions.push(x, y, z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(geo, mat);
    this.scene.add(stars);
  }

  private createLights() {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

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

    const hemiLight = new THREE.HemisphereLight(0x4a90d9, 0x2c2c2c, 0.4);
    this.scene.add(hemiLight);
  }

  private setupEventBus() {
    on('setPlacementMode', (type: unknown) => {
      this.cityBuilder.setPlacementMode(type as BuildingType | null);
    });

    on('deleteSelected', () => {
      this.cityBuilder.deleteSelected();
    });

    on('undoDelete', () => {
      this.cityBuilder.performUndo();
    });

    on('navigationModeChanged', (mode: unknown) => {
      this.navigation.setMode(mode as NavigationMode);
    });

    on('updateBuildingName', (name: unknown) => {
      this.cityBuilder.updateSelectedName(name as string);
    });

    on('updateBuildingPosition', (pos: unknown) => {
      this.cityBuilder.updateSelectedPosition(pos as { x: number; y: number; z: number });
    });

    on('updateBuildingScale', (scale: unknown) => {
      this.cityBuilder.updateSelectedScale(scale as number);
    });

    on('placementModeChanged', (type: unknown) => {
      if (type) {
        this.navigation.setEnabled(false);
      } else {
        this.navigation.setEnabled(true);
      }
    });

    on('buildingSelected', () => {
      this.navigation.setEnabled(false);
    });

    on('buildingDeselected', () => {
      if (!this.cityBuilder.getPlacementMode()) {
        this.navigation.setEnabled(true);
      }
    });
  }

  private bindDOMEvents() {
    const canvas = this.renderer.domElement;

    const sidebar = document.querySelector('div[style*="position: fixed"]') as HTMLElement;
    if (sidebar) {
      sidebar.addEventListener('pointerenter', () => { this.isOverUI = true; });
      sidebar.addEventListener('pointerleave', () => { this.isOverUI = false; });
    }

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    canvas.addEventListener('pointerdown', (e) => {
      if (this.isOverUI) return;
      this.updateMouse(e);
      this.isPointerDown = true;

      if (this.cityBuilder.getPlacementMode()) {
        this.cityBuilder.onGroundClick(this.mouse);
        emit('setPlacementMode', null);
        return;
      }

      if (e.button === 0) {
        this.cityBuilder.onMouseDown(e, this.mouse);
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      this.updateMouse(e);
      if (this.isPointerDown && this.cityBuilder.getSelectedId()) {
        this.cityBuilder.onMouseMove(e, this.mouse, e.shiftKey);
      }
    });

    canvas.addEventListener('pointerup', (e) => {
      if (e.button === 0) {
        this.cityBuilder.onMouseUp();
        this.isPointerDown = false;
      }
    });

    canvas.addEventListener('wheel', (e) => {
      if (this.cityBuilder.getSelectedId()) {
        e.preventDefault();
        this.cityBuilder.onWheel(e);
      }
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.cityBuilder.getSelectedId()) {
          this.cityBuilder.deleteSelected();
        }
      }
      if (e.key === 'Escape') {
        this.cityBuilder.setPlacementMode(null);
        this.cityBuilder.deselect();
      }
    });
  }

  private updateMouse(e: PointerEvent | MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    this.navigation.update(delta);
    this.cityBuilder.updateAnimations(delta);

    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 1000) {
      this.ui.updateFPS(this.frameCount);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }
  }
}

new App();
