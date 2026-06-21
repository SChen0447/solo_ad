import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { eventBus } from '@/utils/eventBus';

export class RenderEngine {
  private container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;

  private animationId: number | null = null;
  private isRunning: boolean = false;

  private orbitSpeedTarget: number = 1;
  private orbitSpeedCurrent: number = 1;
  private rotationSpeedTarget: number = 1;
  private rotationSpeedCurrent: number = 1;
  private speedTransitionDuration: number = 0.2;
  private speedTransitionProgress: number = 1;

  private isCameraFlying: boolean = false;
  private cameraFlightStart: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;
  private cameraFlightEnd: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;
  private cameraFlightProgress: number = 0;
  private cameraFlightDuration: number = 1.2;

  private isCompareMode: boolean = false;
  private originalBackground: THREE.Color | null = null;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredPlanet: THREE.Object3D | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container "${containerId}" not found`);
    }
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0B0C10);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 15, 40);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 100;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLights();
    this.setupEventListeners();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xFFFFFF, 2, 200);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    this.scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x6666FF, 0.3);
    fillLight.position.set(10, 10, 10);
    this.scene.add(fillLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

    eventBus.on('orbitSpeedChange', (speed: number) => {
      this.orbitSpeedTarget = speed;
      this.speedTransitionProgress = 0;
    });

    eventBus.on('rotationSpeedChange', (speed: number) => {
      this.rotationSpeedTarget = speed;
      this.speedTransitionProgress = 0;
    });

    eventBus.on('enterCompareMode', () => {
      this.enterCompareMode();
    });

    eventBus.on('exitCompareMode', () => {
      this.exitCompareMode();
    });

    eventBus.on('flyToPlanet', (planet: THREE.Object3D, distance: number) => {
      this.flyToPlanet(planet, distance);
    });
  }

  private onWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onClick(event: MouseEvent): void {
    if (this.isCameraFlying || this.isCompareMode) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const planets = this.scene.getObjectsByProperty('isPlanet', true);
    const intersects = this.raycaster.intersectObjects(planets, true);

    if (intersects.length > 0) {
      let planetObj = intersects[0].object;
      while (planetObj.parent && !planetObj.userData.isPlanet) {
        planetObj = planetObj.parent;
      }
      if (planetObj.userData.isPlanet) {
        eventBus.emit('planetClicked', planetObj.userData.planetData);
      }
    }
  }

  public checkHover(planetMeshes: THREE.Mesh[]): THREE.Object3D | null {
    if (this.isCameraFlying) return this.hoveredPlanet;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(planetMeshes, true);

    if (intersects.length > 0) {
      let planetObj: THREE.Object3D = intersects[0].object;
      while (planetObj.parent && !planetObj.userData.isPlanet) {
        planetObj = planetObj.parent;
      }
      if (planetObj.userData.isPlanet) {
        if (this.hoveredPlanet !== planetObj) {
          this.hoveredPlanet = planetObj;
          document.body.style.cursor = 'pointer';
          eventBus.emit('planetHover', planetObj.userData.planetData);
        }
        return planetObj;
      }
    }

    if (this.hoveredPlanet) {
      document.body.style.cursor = 'default';
      eventBus.emit('planetHoverOut', this.hoveredPlanet.userData.planetData);
      this.hoveredPlanet = null;
    }
    return null;
  }

  private cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
  }

  private flyToPlanet(planet: THREE.Object3D, distance: number): void {
    if (this.isCameraFlying) return;

    const planetPos = new THREE.Vector3();
    planet.getWorldPosition(planetPos);

    const cameraDir = new THREE.Vector3()
      .subVectors(this.camera.position, planetPos)
      .normalize();

    const endPosition = planetPos.clone().add(cameraDir.multiplyScalar(distance));
    const endTarget = planetPos.clone();

    const midPoint = new THREE.Vector3()
      .addVectors(this.camera.position, endPosition)
      .multiplyScalar(0.5)
      .add(new THREE.Vector3(0, distance * 0.3, 0));

    const midTarget = new THREE.Vector3()
      .addVectors(this.controls.target, endTarget)
      .multiplyScalar(0.5);

    this.cameraFlightStart = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
    };
    this.cameraFlightEnd = {
      position: endPosition,
      target: endTarget,
    };
    this.cameraFlightProgress = 0;
    this.isCameraFlying = true;
    this.controls.enabled = false;
  }

  private updateCameraFlight(deltaTime: number): void {
    if (!this.isCameraFlying || !this.cameraFlightStart || !this.cameraFlightEnd) return;

    this.cameraFlightProgress += deltaTime / this.cameraFlightDuration;
    const t = Math.min(this.cameraFlightProgress, 1);
    const easedT = t * t * (3 - 2 * t);

    this.camera.position.lerpVectors(
      this.cameraFlightStart.position,
      this.cameraFlightEnd.position,
      easedT
    );

    this.controls.target.lerpVectors(
      this.cameraFlightStart.target,
      this.cameraFlightEnd.target,
      easedT
    );

    if (t >= 1) {
      this.isCameraFlying = false;
      this.controls.enabled = true;
      eventBus.emit('cameraFlightComplete');
    }
  }

  public getOrbitSpeed(): number {
    return this.orbitSpeedCurrent;
  }

  public getRotationSpeed(): number {
    return this.rotationSpeedCurrent;
  }

  private updateSpeedTransition(deltaTime: number): void {
    if (this.speedTransitionProgress >= 1) return;

    this.speedTransitionProgress += deltaTime / this.speedTransitionDuration;
    const t = Math.min(this.speedTransitionProgress, 1);

    this.orbitSpeedCurrent = this.lerp(
      this.orbitSpeedCurrent,
      this.orbitSpeedTarget,
      t
    );
    this.rotationSpeedCurrent = this.lerp(
      this.rotationSpeedCurrent,
      this.rotationSpeedTarget,
      t
    );
  }

  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  private enterCompareMode(): void {
    this.isCompareMode = true;
    this.originalBackground = this.scene.background as THREE.Color;

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1A1A2E');
    gradient.addColorStop(1, '#16213E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this.scene.background = texture;

    this.controls.enabled = false;
  }

  private exitCompareMode(): void {
    this.isCompareMode = false;
    if (this.originalBackground) {
      this.scene.background = this.originalBackground;
    }
    this.controls.enabled = true;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private lastTime: number = 0;

  private animate = (): void => {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.updateSpeedTransition(deltaTime);
    this.updateCameraFlight(deltaTime);

    eventBus.emit('beforeRender', deltaTime);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.dispose();
    this.controls.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

export default RenderEngine;
