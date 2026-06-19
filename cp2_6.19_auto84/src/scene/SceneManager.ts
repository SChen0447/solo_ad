import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ParticleSystem } from '../particle/ParticleSystem';
import { GridHelper, MarkerPoint } from './GridHelper';

export class SceneManager {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private particleSystem: ParticleSystem;
  private gridHelper: GridHelper;

  private points: THREE.Points | null = null;
  private positionAttribute: THREE.BufferAttribute | null = null;
  private colorAttribute: THREE.BufferAttribute | null = null;
  private sizeAttribute: THREE.BufferAttribute | null = null;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isPaused: boolean = false;
  private time: number = 0;

  private initialCameraPosition: THREE.Vector3;
  private initialControlsTarget: THREE.Vector3;

  private onMarkerClick: ((index: number, elevation: number, screenX: number, screenY: number) => void) | null = null;
  private onMarkerClose: (() => void) | null = null;

  private activeMarkerIndex: number = -1;

  private fps: number = 60;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private fpsCallback: ((fps: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, particleSystem: ParticleSystem) {
    this.canvas = canvas;
    this.container = canvas.parentElement || document.body;
    this.particleSystem = particleSystem;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.gridHelper = new GridHelper(this.scene);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initialCameraPosition = new THREE.Vector3(30, 25, 30);
    this.initialControlsTarget = new THREE.Vector3(0, 5, 0);

    this.init();
  }

  private init(): void {
    this.setupRenderer();
    this.setupCamera();
    this.setupControls();
    this.setupLights();
    this.setupBackground();
    this.setupParticleSystem();
    this.gridHelper.createTerrain();
    this.gridHelper.createGrid();
    this.gridHelper.createMarkers();

    const terrainHeights = this.gridHelper.getTerrainHeights();
    if (terrainHeights) {
      this.particleSystem.setTerrainHeights(terrainHeights);
    }

    this.setupEventListeners();
  }

  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }

  private setupCamera(): void {
    this.camera.position.copy(this.initialCameraPosition);
    this.camera.lookAt(this.initialControlsTarget);
  }

  private setupControls(): void {
    this.controls.target.copy(this.initialControlsTarget);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.003;
    this.controls.zoomSpeed = 0.1;
    this.controls.panSpeed = 0.5;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 40, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.3);
    this.scene.add(hemisphereLight);
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#2F2F2F');
    gradient.addColorStop(1, '#0A0A0A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private setupParticleSystem(): void {
    const maxCount = 60000;

    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(maxCount * 3);
    const colors = new Float32Array(maxCount * 3);
    const sizes = new Float32Array(maxCount);

    this.positionAttribute = new THREE.BufferAttribute(positions, 3);
    this.colorAttribute = new THREE.BufferAttribute(colors, 3);
    this.sizeAttribute = new THREE.BufferAttribute(sizes, 1);

    geometry.setAttribute('position', this.positionAttribute);
    geometry.setAttribute('color', this.colorAttribute);
    geometry.setAttribute('size', this.sizeAttribute);

    const material = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize);
    this.canvas.addEventListener('click', this.onCanvasClick);
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private onCanvasClick = (event: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const markerMeshes = this.gridHelper.getMarkerMeshes();
    const intersects = this.raycaster.intersectObjects(markerMeshes);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const index = clickedMesh.userData.markerIndex;

      if (index !== undefined && index >= 0) {
        if (this.activeMarkerIndex >= 0 && this.activeMarkerIndex !== index) {
          this.gridHelper.deactivateMarker(this.activeMarkerIndex);
          if (this.onMarkerClose) {
            this.onMarkerClose();
          }
        }

        this.activeMarkerIndex = index;
        this.gridHelper.activateMarker(index);

        const markers = this.gridHelper.getMarkers();
        const marker = markers[index];

        if (marker && this.onMarkerClick) {
          const screenPos = marker.mesh.position.clone().project(this.camera);
          const screenX = (screenPos.x + 1) / 2 * window.innerWidth;
          const screenY = (-screenPos.y + 1) / 2 * window.innerHeight;

          this.onMarkerClick(index, marker.elevation, screenX, screenY);
        }
      }
    } else {
      if (this.activeMarkerIndex >= 0) {
        this.gridHelper.deactivateMarker(this.activeMarkerIndex);
        this.activeMarkerIndex = -1;
        if (this.onMarkerClose) {
          this.onMarkerClose();
        }
      }
    }
  };

  public setOnMarkerClick(callback: (index: number, elevation: number, screenX: number, screenY: number) => void): void {
    this.onMarkerClick = callback;
  }

  public setOnMarkerClose(callback: () => void): void {
    this.onMarkerClose = callback;
  }

  public setFpsCallback(callback: (fps: number) => void): void {
    this.fpsCallback = callback;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  public resetCamera(): void {
    this.camera.position.copy(this.initialCameraPosition);
    this.controls.target.copy(this.initialControlsTarget);
    this.controls.update();
  }

  public updateParticlePositions(): void {
    if (!this.positionAttribute || !this.colorAttribute || !this.sizeAttribute || !this.points) {
      return;
    }

    const positions = this.particleSystem.getPositions();
    const colors = this.particleSystem.getColors();
    const sizes = this.particleSystem.getSizes();
    const visibilities = this.particleSystem.getVisibilities();
    const activeCount = this.particleSystem.getActiveCount();

    const posArray = this.positionAttribute.array as Float32Array;
    const colorArray = this.colorAttribute.array as Float32Array;
    const sizeArray = this.sizeAttribute.array as Float32Array;

    posArray.set(positions);
    colorArray.set(colors);
    sizeArray.set(sizes);

    for (let i = activeCount; i < 60000; i++) {
      posArray[i * 3] = 0;
      posArray[i * 3 + 1] = -1000;
      posArray[i * 3 + 2] = 0;
    }

    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;

    this.points.geometry.setDrawRange(0, 60000);
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    if (!this.isPaused) {
      this.particleSystem.update(deltaTime);
      this.updateParticlePositions();
    }

    this.gridHelper.update(deltaTime, this.time);
    this.controls.update();
  }

  public render(currentTime: number): void {
    this.frameCount++;
    if (currentTime - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;

      if (this.fpsCallback) {
        this.fpsCallback(this.fps);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  public getMarkers(): MarkerPoint[] {
    return this.gridHelper.getMarkers();
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.canvas.removeEventListener('click', this.onCanvasClick);

    this.gridHelper.dispose();

    if (this.points) {
      this.scene.remove(this.points);
      (this.points.geometry as THREE.BufferGeometry).dispose();
      (this.points.material as THREE.Material).dispose();
    }

    this.controls.dispose();
    this.renderer.dispose();
  }
}
