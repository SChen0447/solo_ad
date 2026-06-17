import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CurveSurface } from './CurveSurface';
import { LightController } from './LightController';
import { PanelController } from './PanelController';
import { GUI } from 'lil-gui';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private surface!: CurveSurface;
  private lightController!: LightController;
  private panelController!: PanelController;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isDraggingControlPoint: boolean = false;
  private draggedControlPointIndex: number = -1;
  private dragPlane: THREE.Plane;
  private dragOffset: THREE.Vector3;

  private clock: THREE.Clock;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 0;

  private gui: GUI | null = null;
  private panelSelectionMode: boolean = false;
  private minimapUpdateInterval: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane();
    this.dragOffset = new THREE.Vector3();
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xbfe3f5, 0.005);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(12, 8, 12);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.target.set(0, 0, 0);

    this.initGround();
    this.initModules();
    this.initEventListeners();
    this.initDebugGUI();
    this.animate();
  }

  private initGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a3e,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(50, 50, 0x4488ff, 0x333355);
    gridHelper.position.y = -2.99;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    (gridHelper.material as THREE.Material).transparent = true;
    this.scene.add(gridHelper);
  }

  private initModules(): void {
    this.surface = new CurveSurface(this.scene);
    this.lightController = new LightController(this.scene, this.renderer);

    const envTexture = this.lightController.getEnvTexture(this.lightController.getCurrentEnv());
    this.surface.setEnvMap(envTexture);

    this.panelController = new PanelController(
      this.container,
      this.surface,
      this.lightController,
      this.camera,
      (indices) => {
        this.surface.setSelectedPanels(indices);
      }
    );
  }

  private initEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
    canvas.addEventListener('mousemove', (e) => this.onPointerMove(e));
    canvas.addEventListener('mouseup', () => this.onPointerUp());
    canvas.addEventListener('mouseleave', () => this.onPointerUp());

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', () => this.onPointerUp());

    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Shift') {
      this.panelSelectionMode = true;
      this.controls.enabled = false;
      this.renderer.domElement.style.cursor = 'pointer';
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.key === 'Shift') {
      this.panelSelectionMode = false;
      this.controls.enabled = true;
      this.renderer.domElement.style.cursor = '';
    }
  }

  private updateMouse(e: MouseEvent | Touch): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onPointerDown(e: MouseEvent): void {
    if (this.panelSelectionMode) {
      this.handlePanelSelection(e);
      return;
    }

    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const controlPointMeshes = this.surface.getControlPointMeshes();
    const intersects = this.raycaster.intersectObjects(controlPointMeshes);

    if (intersects.length > 0) {
      this.isDraggingControlPoint = true;
      this.controls.enabled = false;
      this.draggedControlPointIndex = intersects[0].object.userData.controlPointIndex;

      const point = intersects[0].point;
      const normal = new THREE.Vector3(0, 1, 0);
      this.dragPlane.setFromNormalAndCoplanarPoint(normal, point);
      this.dragOffset.copy(point).sub(intersects[0].object.position);

      this.renderer.domElement.style.cursor = 'grabbing';
    }
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY } as MouseEvent;
    this.onPointerDown(mouseEvent);
  }

  private onPointerMove(e: MouseEvent): void {
    if (this.isDraggingControlPoint && this.draggedControlPointIndex >= 0) {
      this.updateMouse(e);
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const intersection = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
        const newPos = intersection.clone().sub(this.dragOffset);
        newPos.x = Math.max(-8, Math.min(8, newPos.x));
        newPos.y = Math.max(-4, Math.min(6, newPos.y));
        newPos.z = Math.max(-8, Math.min(8, newPos.z));

        const controlPoint = { x: newPos.x, y: newPos.y, z: newPos.z };
        this.surface.updateSingleControlPoint(this.draggedControlPointIndex, controlPoint);
        this.panelController.updateControlPointInput(this.draggedControlPointIndex, controlPoint);
      }
    } else {
      this.updateMouse(e);
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const controlPointMeshes = this.surface.getControlPointMeshes();
      const intersects = this.raycaster.intersectObjects(controlPointMeshes);

      if (intersects.length > 0) {
        this.renderer.domElement.style.cursor = 'grab';
      } else if (!this.panelSelectionMode) {
        this.renderer.domElement.style.cursor = '';
      }
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY } as MouseEvent;
    this.onPointerMove(mouseEvent);
  }

  private onPointerUp(): void {
    if (this.isDraggingControlPoint) {
      this.isDraggingControlPoint = false;
      this.draggedControlPointIndex = -1;
      this.controls.enabled = true;
      this.renderer.domElement.style.cursor = '';
    }
  }

  private handlePanelSelection(e: MouseEvent): void {
    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const panels = this.surface.getPanels();
    const intersects = this.raycaster.intersectObjects(panels);

    if (intersects.length > 0) {
      const panelIndex = intersects[0].object.userData.panelIndex as number;
      const currentSelection = this.surface.getSelectedPanels();

      let newSelection: number[];
      if (e.ctrlKey || e.metaKey) {
        const pos = currentSelection.indexOf(panelIndex);
        if (pos >= 0) {
          currentSelection.splice(pos, 1);
          newSelection = currentSelection;
        } else {
          newSelection = [...currentSelection, panelIndex];
        }
      } else {
        newSelection = [panelIndex];
      }

      this.surface.setSelectedPanels(newSelection);
      this.panelController.updateSelectedPanelHighlight(newSelection);
    }
  }

  private initDebugGUI(): void {
    if (import.meta.env.DEV) {
      this.gui = new GUI({ title: '调试', width: 250 });
      this.gui.close();

      const perfFolder = this.gui.addFolder('性能');
      perfFolder.add(this, 'currentFps', 0, 120).listen().name('FPS').disable();

      const camFolder = this.gui.addFolder('相机');
      camFolder.add(this.camera.position, 'x', -20, 20).name('X').listen();
      camFolder.add(this.camera.position, 'y', -20, 20).name('Y').listen();
      camFolder.add(this.camera.position, 'z', -20, 20).name('Z').listen();
    }
  }

  private updateFps(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = Math.round(this.frameCount * 1000 / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    this.controls.update();
    this.lightController.updateTransitions();
    this.surface.updateMaterialTransitions();

    this.minimapUpdateInterval += delta;
    if (this.minimapUpdateInterval >= 0.1) {
      this.panelController.updateMinimap();
      this.minimapUpdateInterval = 0;
    }

    this.updateFps();
    this.renderer.render(this.scene, this.camera);
  }

  public showUI(): void {
    this.panelController.showUI();
  }

  public dispose(): void {
    this.surface.dispose();
    this.lightController.dispose();
    this.panelController.dispose();
    this.renderer.dispose();
    if (this.gui) this.gui.destroy();
  }
}

let app: App | null = null;

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvas-container') as HTMLElement;
  const startScreen = document.getElementById('start-screen') as HTMLElement;
  const startBtn = document.getElementById('start-btn') as HTMLElement;

  const startApp = () => {
    startScreen.classList.add('hidden');
    setTimeout(() => {
      startScreen.style.display = 'none';
    }, 600);

    if (!app) {
      app = new App(container);
      app.showUI();
    }
  };

  startBtn.addEventListener('click', startApp);
});
