import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DrillManager } from './drill';
import { StratumGenerator } from './stratum';
import { UIManager } from './ui';
import { DisplayMode, StratumData } from './types';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private drillManager: DrillManager;
  private stratumGenerator: StratumGenerator;
  private uiManager: UIManager;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private groundMesh: THREE.Mesh | null = null;
  private gridHelper: THREE.GridHelper | null = null;

  private isMouseDown: boolean = false;
  private mouseDownX: number = 0;
  private mouseDownY: number = 0;
  private mouseDownTime: number = 0;

  private displayMode: DisplayMode = 'drill';
  private transitionProgress: number = 1;
  private transitionSpeed: number = 2;
  private isTransitioning: boolean = false;
  private targetMode: DisplayMode = 'drill';

  private clock: THREE.Clock;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.setupBackground();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(15, 20, 15);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 0, 0);
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: null
    };

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLights();
    this.createTerrain();

    this.drillManager = new DrillManager(this.scene);
    this.stratumGenerator = new StratumGenerator(this.scene);
    this.uiManager = new UIManager();

    this.setupEventListeners();
    this.updateDisplayMode('drill');

    this.animate();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.5, '#B0C4DE');
    gradient.addColorStop(1, '#D8BFD8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B7355, 0.3);
    this.scene.add(hemisphereLight);
  }

  private createTerrain(): void {
    const size = 20;
    const segments = 20;

    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const height = Math.sin(x * 0.3) * 0.2 + Math.cos(z * 0.3) * 0.2;
      positions.setY(i, height);
    }
    geometry.computeVertexNormals();

    const colors = new Float32Array(positions.count * 3);
    const lowColor = new THREE.Color(0xD4A574);
    const highColor = new THREE.Color(0x8B5A2B);

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = (y + 0.5) / 1;
      const color = lowColor.clone().lerp(highColor, Math.min(1, Math.max(0, t)));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      flatShading: false,
      roughness: 0.8,
      metalness: 0.1
    });

    this.groundMesh = new THREE.Mesh(geometry, material);
    this.groundMesh.receiveShadow = true;
    this.groundMesh.name = 'ground';
    this.scene.add(this.groundMesh);

    this.gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xaaaaaa);
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.3;
    this.scene.add(this.gridHelper);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));

    this.uiManager.onModeChange = (mode: DisplayMode) => {
      this.updateDisplayMode(mode);
    };

    this.uiManager.onStratumEdit = (drillId: string, strata: StratumData[]) => {
      this.drillManager.updateDrillStrata(drillId, strata);
      this.updateStratum();
    };

    this.uiManager.onDrillDelete = (drillId: string) => {
      this.drillManager.removeDrill(drillId);
      this.updateStratum();
    };

    this.uiManager.onPresetLoad = (presetData: any[]) => {
      this.drillManager.clearAllDrills();
      presetData.forEach((drill: any) => {
        this.drillManager.addDrill(drill.x, drill.z, drill.strata, drill.name);
      });
      this.updateStratum();
    };

    this.drillManager.onDrillClick = (drillId: string) => {
      const drill = this.drillManager.getDrill(drillId);
      if (drill) {
        this.uiManager.showEditPanel(drill);
      }
    };

    this.drillManager.onDrillChanged = () => {
      this.updateStratum();
    };
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.isMouseDown = true;
    this.mouseDownX = event.clientX;
    this.mouseDownY = event.clientY;
    this.mouseDownTime = Date.now();
  }

  private onMouseMove(_event: MouseEvent): void {
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button !== 0) return;
    if (!this.isMouseDown) return;
    this.isMouseDown = false;

    const dx = event.clientX - this.mouseDownX;
    const dy = event.clientY - this.mouseDownY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const timeDiff = Date.now() - this.mouseDownTime;

    if (distance < 5 && timeDiff < 300) {
      this.handleClick(event);
    }
  }

  private handleClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const drillIntersects = this.raycaster.intersectObjects(
      this.drillManager.getDrillMeshes(),
      true
    );

    if (drillIntersects.length > 0) {
      let drillId = '';
      let obj: THREE.Object3D | null = drillIntersects[0].object;
      while (obj) {
        if (obj.userData.drillId) {
          drillId = obj.userData.drillId;
          break;
        }
        obj = obj.parent;
      }
      if (drillId) {
        this.drillManager.handleDrillClick(drillId);
        return;
      }
    }

    if (this.groundMesh) {
      const groundIntersects = this.raycaster.intersectObject(this.groundMesh);
      if (groundIntersects.length > 0) {
        const point = groundIntersects[0].point;
        if (Math.abs(point.x) <= 10 && Math.abs(point.z) <= 10) {
          this.drillManager.addDrill(point.x, point.z);
          this.updateStratum();
        }
      }
    }
  }

  private updateDisplayMode(mode: DisplayMode): void {
    if (this.displayMode === mode) return;
    this.targetMode = mode;
    this.isTransitioning = true;
    this.transitionProgress = 0;
  }

  private applyTransition(): void {
    const drillVisible = this.targetMode === 'drill' || this.targetMode === 'both';
    const stratumVisible = this.targetMode === 'stratum' || this.targetMode === 'both';

    const drillTargetOpacity = drillVisible ? 1 : 0;
    const stratumTargetOpacity = stratumVisible ? 1 : 0;

    this.drillManager.setOpacity(this.lerp(
      this.displayMode === 'drill' || this.displayMode === 'both' ? 1 : 0,
      drillTargetOpacity,
      this.transitionProgress
    ));

    this.stratumGenerator.setOpacity(this.lerp(
      this.displayMode === 'stratum' || this.displayMode === 'both' ? 1 : 0,
      stratumTargetOpacity,
      this.transitionProgress
    ));
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private updateStratum(): void {
    const drills = this.drillManager.getAllDrills();
    if (drills.length >= 2) {
      this.stratumGenerator.generateStrata(drills);
    } else {
      this.stratumGenerator.clear();
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    if (this.isTransitioning) {
      this.transitionProgress += delta * this.transitionSpeed;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.isTransitioning = false;
        this.displayMode = this.targetMode;
      }
      this.applyTransition();
    }

    this.controls.update();
    this.drillManager.update(delta);
    this.renderer.render(this.scene, this.camera);
  }
}

new App();
