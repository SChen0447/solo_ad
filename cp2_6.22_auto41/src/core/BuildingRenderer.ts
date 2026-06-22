import * as THREE from 'three';
import { Building, ColorTheme } from './CityGenerator';

type ViewMode = 'overhead' | 'street';

export interface AnimationState {
  progress: number;
  duration: number;
  startTime: number;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export class BuildingRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private buildingsMesh: THREE.InstancedMesh | null = null;
  private groundMesh: THREE.Mesh | null = null;
  private neonGrid: THREE.LineSegments | null = null;

  private dummy: THREE.Object3D;
  private buildingData: Building[] = [];

  private animationState: AnimationState | null = null;
  private lightAnimationTime: number = 0;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private rotationSpeed: number = 0.4;

  private cameraAngleH: number = 0;
  private cameraAngleV: number = Math.PI / 4;
  private cameraDistance: number = 200;
  private targetDistance: number = 200;
  private targetAngleH: number = 0;
  private targetAngleV: number = Math.PI / 4;

  private minDistance: number = 10;
  private maxDistance: number = 300;
  private zoomLerpStart: number = 0;
  private zoomLerpDuration: number = 300;
  private isZoomLerping: boolean = false;
  private prevDistance: number = 200;

  private viewMode: ViewMode = 'overhead';
  private streetAngleH: number = 0;

  private currentTheme: ColorTheme = 'sunset';
  private themeTransitionProgress: number = 1;
  private targetThemeColors: { ambient: THREE.Color; ground: THREE.Color; neon: THREE.Color } | null = null;
  private startThemeColors: { ambient: THREE.Color; ground: THREE.Color; neon: THREE.Color } | null = null;
  private themeTransitionStart: number = 0;
  private themeTransitionDuration: number = 800;
  private isThemeTransitioning: boolean = false;

  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;

  private pointLights: THREE.PointLight[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.dummy = new THREE.Object3D();

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(100, 150, 100);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 1;
    this.directionalLight.shadow.camera.far = 500;
    this.directionalLight.shadow.camera.left = -300;
    this.directionalLight.shadow.camera.right = 300;
    this.directionalLight.shadow.camera.top = 300;
    this.directionalLight.shadow.camera.bottom = -300;
    this.scene.add(this.directionalLight);

    this.setupGround();
    this.setupEventListeners();
    this.updateCameraPosition();
  }

  private setupGround(): void {
    const groundGeo = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2a,
      roughness: 0.9,
      metalness: 0.1
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    this.setupNeonGrid();
  }

  private setupNeonGrid(): void {
    if (this.neonGrid) {
      this.scene.remove(this.neonGrid);
      this.neonGrid.geometry.dispose();
    }

    const points: THREE.Vector3[] = [];
    const gridSize = 400;
    const gridStep = 20;

    for (let i = -gridSize / 2; i <= gridSize / 2; i += gridStep) {
      points.push(new THREE.Vector3(i, 0.05, -gridSize / 2));
      points.push(new THREE.Vector3(i, 0.05, gridSize / 2));
      points.push(new THREE.Vector3(-gridSize / 2, 0.05, i));
      points.push(new THREE.Vector3(gridSize / 2, 0.05, i));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x00FFFF,
      transparent: true,
      opacity: 0
    });
    this.neonGrid = new THREE.LineSegments(geometry, material);
    this.scene.add(this.neonGrid);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    if (this.viewMode === 'street') {
      this.streetAngleH -= deltaX * 0.005;
    } else {
      this.cameraAngleH -= deltaX * this.rotationSpeed * 0.01;
      this.cameraAngleV = Math.max(
        0.1,
        Math.min(Math.PI / 2 - 0.05, this.cameraAngleV + deltaY * this.rotationSpeed * 0.01)
      );
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    this.prevDistance = this.cameraDistance;
    this.targetDistance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.targetDistance * factor)
    );
    this.zoomLerpStart = performance.now();
    this.isZoomLerping = true;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === '1') {
      this.setViewMode('overhead');
    } else if (e.key === '2') {
      this.setViewMode('street');
    }
  }

  public setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    if (mode === 'overhead') {
      this.targetAngleV = Math.PI / 3;
      this.targetAngleH = this.cameraAngleH;
      this.targetDistance = 250;
      this.prevDistance = this.cameraDistance;
      this.zoomLerpStart = performance.now();
      this.isZoomLerping = true;
    } else {
      this.streetAngleH = this.cameraAngleH;
    }
  }

  public setTheme(theme: ColorTheme): void {
    const themeConfigs = {
      sunset: {
        ambient: new THREE.Color(0x664422),
        ground: new THREE.Color(0x1a1a2a),
        neon: new THREE.Color(0x000000)
      },
      cyberpunk: {
        ambient: new THREE.Color(0x220044),
        ground: new THREE.Color(0x0a0a1a),
        neon: new THREE.Color(0x8800ff)
      },
      ice: {
        ambient: new THREE.Color(0x446688),
        ground: new THREE.Color(0x2a3a4a),
        neon: new THREE.Color(0x000000)
      }
    };

    this.startThemeColors = {
      ambient: this.ambientLight.color.clone(),
      ground: (this.groundMesh?.material as THREE.MeshStandardMaterial).color.clone(),
      neon: this.neonGrid ? (this.neonGrid.material as THREE.LineBasicMaterial).color.clone() : new THREE.Color()
    };
    this.targetThemeColors = themeConfigs[theme];
    this.themeTransitionStart = performance.now();
    this.isThemeTransitioning = true;
    this.currentTheme = theme;

    if (theme === 'cyberpunk') {
      this.createPointLights();
    } else {
      this.removePointLights();
    }
  }

  private createPointLights(): void {
    this.removePointLights();
    const lightCount = Math.min(30, this.buildingData.filter(b => b.hasLight).length);
    const lightBuildings = this.buildingData
      .filter(b => b.hasLight)
      .sort(() => Math.random() - 0.5)
      .slice(0, lightCount);

    for (const b of lightBuildings) {
      const color = b.emissiveColor;
      const light = new THREE.PointLight(color, 0.8, 60);
      light.position.set(b.x, b.height + 2, b.z);
      (light as any).frequency = b.lightFrequency;
      (light as any).phase = b.lightPhase;
      (light as any).baseIntensity = 0.8;
      this.pointLights.push(light);
      this.scene.add(light);
    }
  }

  private removePointLights(): void {
    for (const light of this.pointLights) {
      this.scene.remove(light);
    }
    this.pointLights = [];
  }

  public updateBuildings(buildings: Building[]): void {
    this.buildingData = buildings;

    if (this.buildingsMesh) {
      this.scene.remove(this.buildingsMesh);
      this.buildingsMesh.geometry.dispose();
      (this.buildingsMesh.material as THREE.Material).dispose();
      this.buildingsMesh = null;
    }

    if (buildings.length === 0) return;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.7,
      metalness: 0.2
    });

    this.buildingsMesh = new THREE.InstancedMesh(geometry, material, buildings.length);
    this.buildingsMesh.castShadow = true;
    this.buildingsMesh.receiveShadow = true;

    const colors = new Float32Array(buildings.length * 3);

    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const color = new THREE.Color(b.color);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      this.dummy.position.set(b.x, b.height / 2, b.z);
      this.dummy.scale.set(b.width, b.height, b.depth);
      this.dummy.updateMatrix();
      this.buildingsMesh.setMatrixAt(i, this.dummy.matrix);
    }

    geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colors, 3));
    this.buildingsMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.buildingsMesh);

    this.animationState = {
      progress: 0,
      duration: 500,
      startTime: performance.now()
    };

    if (this.currentTheme === 'cyberpunk') {
      this.createPointLights();
    }
  }

  private updateCameraPosition(): void {
    if (this.viewMode === 'street') {
      const camHeight = 10;
      const radius = 150;
      this.camera.position.set(
        Math.sin(this.streetAngleH) * radius,
        camHeight,
        Math.cos(this.streetAngleH) * radius
      );
      this.camera.lookAt(0, camHeight, 0);
    } else {
      const x = Math.sin(this.cameraAngleH) * Math.cos(this.cameraAngleV) * this.cameraDistance;
      const y = Math.sin(this.cameraAngleV) * this.cameraDistance;
      const z = Math.cos(this.cameraAngleH) * Math.cos(this.cameraAngleV) * this.cameraDistance;
      this.camera.position.set(x, y, z);
      this.camera.lookAt(0, 30, 0);
    }
  }

  public render(time: number): void {
    if (this.isZoomLerping) {
      const t = Math.min(1, (time - this.zoomLerpStart) / this.zoomLerpDuration);
      const eased = easeInOut(t);
      this.cameraDistance = this.prevDistance + (this.targetDistance - this.prevDistance) * eased;
      if (t >= 1) {
        this.isZoomLerping = false;
        this.cameraDistance = this.targetDistance;
      }
    }

    if (this.isThemeTransitioning && this.startThemeColors && this.targetThemeColors) {
      const t = Math.min(1, (time - this.themeTransitionStart) / this.themeTransitionDuration);
      const eased = easeInOut(t);

      this.ambientLight.color.lerpColors(this.startThemeColors.ambient, this.targetThemeColors.ambient, eased);
      if (this.groundMesh) {
        (this.groundMesh.material as THREE.MeshStandardMaterial).color.lerpColors(
          this.startThemeColors.ground,
          this.targetThemeColors.ground,
          eased
        );
      }
      if (this.neonGrid) {
        const mat = this.neonGrid.material as THREE.LineBasicMaterial;
        mat.color.lerpColors(this.startThemeColors.neon, this.targetThemeColors.neon, eased);
        mat.opacity = this.currentTheme === 'cyberpunk' ? eased * 0.8 : (1 - eased) * 0.8;
        if (this.currentTheme !== 'cyberpunk' && t >= 1) {
          mat.opacity = 0;
        }
      }

      if (t >= 1) {
        this.isThemeTransitioning = false;
      }
    }

    if (this.animationState && this.buildingsMesh) {
      const t = Math.min(1, (time - this.animationState.startTime) / this.animationState.duration);
      const eased = easeOut(t);

      for (let i = 0; i < this.buildingData.length; i++) {
        const b = this.buildingData[i];
        const h = b.height * eased;
        this.dummy.position.set(b.x, h / 2, b.z);
        this.dummy.scale.set(b.width, h, b.depth);
        this.dummy.updateMatrix();
        this.buildingsMesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.buildingsMesh.instanceMatrix.needsUpdate = true;

      if (t >= 1) {
        this.animationState = null;
      }
    }

    this.lightAnimationTime = time * 0.001;
    for (const light of this.pointLights) {
      const freq = (light as any).frequency;
      const phase = (light as any).phase;
      const base = (light as any).baseIntensity;
      light.intensity = base * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(this.lightAnimationTime * freq + phase)));
    }

    this.updateCameraPosition();
    this.renderer.render(this.scene, this.camera);
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getViewMode(): ViewMode {
    return this.viewMode;
  }
}
