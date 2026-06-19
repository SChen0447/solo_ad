import * as THREE from 'three';
import { SolarSystem } from './SolarSystem';
import { UIManager } from './UIManager';
import { Planet } from './Planet';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

class CameraController {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private theta: number = Math.PI / 4;
  private phi: number = Math.PI / 3;
  private distance: number = 18;
  private minDistance: number = 5;
  private maxDistance: number = 50;

  private mode: 'orbit' | 'follow' | 'transition' = 'orbit';
  private followPlanet: Planet | null = null;

  private transitionStart: THREE.Vector3 | null = null;
  private transitionTargetPos: THREE.Vector3 | null = null;
  private transitionTargetLook: THREE.Vector3 | null = null;
  private transitionProgress: number = 0;
  private transitionDuration: number = 1;
  private transitionMode: 'global' | 'follow' | null = null;

  private targetDistance: number = 18;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.bindEvents(domElement);
    this.updatePosition();
  }

  private bindEvents(domElement: HTMLElement): void {
    domElement.addEventListener('mousedown', (e) => {
      if (this.mode !== 'orbit') return;
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging || this.mode !== 'orbit') return;
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      this.theta -= deltaX * 0.005;
      this.phi -= deltaY * 0.005;
      this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi));
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    domElement.addEventListener('wheel', (e) => {
      if (this.mode !== 'orbit') return;
      e.preventDefault();
      const zoomSpeed = 0.001;
      this.targetDistance += e.deltaY * zoomSpeed * this.distance;
      this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetDistance));
    }, { passive: false });
  }

  public updatePosition(): void {
    if (this.mode === 'transition') {
      return;
    }

    const smoothFactor = 0.1;
    this.distance += (this.targetDistance - this.distance) * smoothFactor;

    const x = this.distance * Math.sin(this.phi) * Math.sin(this.theta);
    const y = this.distance * Math.cos(this.phi);
    const z = this.distance * Math.sin(this.phi) * Math.cos(this.theta);

    this.camera.position.set(
      this.target.x + x,
      this.target.y + y,
      this.target.z + z
    );
    this.camera.lookAt(this.target);
  }

  public setOrbitTarget(target: THREE.Vector3): void {
    this.target.copy(target);
  }

  public getTarget(): THREE.Vector3 {
    return this.target.clone();
  }

  public animateToGlobalView(): void {
    this.transitionStart = this.camera.position.clone();
    this.transitionTargetPos = new THREE.Vector3(0, 20, 0.001);
    this.transitionTargetLook = new THREE.Vector3(0, 0, 0);
    this.transitionProgress = 0;
    this.transitionDuration = 1;
    this.transitionMode = 'global';
    this.mode = 'transition';
  }

  public animateToFollowPlanet(planet: Planet): void {
    this.followPlanet = planet;
    this.transitionStart = this.camera.position.clone();
    const planetPos = planet.getPosition();
    this.transitionTargetPos = new THREE.Vector3(planetPos.x, planetPos.y + 1, planetPos.z);
    const forwardAngle = planet.angle + Math.PI / 2;
    this.transitionTargetLook = new THREE.Vector3(
      planetPos.x + Math.cos(forwardAngle) * 3,
      planetPos.y,
      planetPos.z + Math.sin(forwardAngle) * 3
    );
    this.transitionProgress = 0;
    this.transitionDuration = 1;
    this.transitionMode = 'follow';
    this.mode = 'transition';
  }

  public setFollowPlanet(planet: Planet | null): void {
    this.followPlanet = planet;
    if (planet) {
      this.mode = 'follow';
    } else {
      this.mode = 'orbit';
    }
  }

  public update(deltaTime: number): void {
    if (this.mode === 'transition') {
      this.transitionProgress += deltaTime / this.transitionDuration;
      const t = Math.min(1, this.transitionProgress);
      const easedT = easeInOutCubic(t);

      if (this.transitionMode === 'follow' && this.followPlanet) {
        const planetPos = this.followPlanet.getPosition();
        this.transitionTargetPos = new THREE.Vector3(planetPos.x, planetPos.y + 1, planetPos.z);
        const forwardAngle = this.followPlanet.angle + Math.PI / 2;
        this.transitionTargetLook = new THREE.Vector3(
          planetPos.x + Math.cos(forwardAngle) * 3,
          planetPos.y,
          planetPos.z + Math.sin(forwardAngle) * 3
        );
      }

      if (this.transitionStart && this.transitionTargetPos && this.transitionTargetLook) {
        const currentPos = new THREE.Vector3().lerpVectors(
          this.transitionStart,
          this.transitionTargetPos,
          easedT
        );
        this.camera.position.copy(currentPos);

        const currentLook = new THREE.Vector3().lerpVectors(
          this.getTarget(),
          this.transitionTargetLook,
          easedT
        );
        this.camera.lookAt(currentLook);
        this.target.copy(currentLook);
      }

      if (t >= 1) {
        if (this.transitionMode === 'global') {
          this.mode = 'orbit';
          this.theta = Math.PI / 2;
          this.phi = 0.15;
          this.distance = 20;
          this.targetDistance = 20;
          this.target.set(0, 0, 0);
        } else if (this.transitionMode === 'follow' && this.followPlanet) {
          this.mode = 'follow';
        }
        this.transitionMode = null;
      }
    } else if (this.mode === 'follow' && this.followPlanet) {
      const planetPos = this.followPlanet.getPosition();
      this.camera.position.set(planetPos.x, planetPos.y + 1, planetPos.z);

      const forwardAngle = this.followPlanet.angle + Math.PI / 2;
      const lookTarget = new THREE.Vector3(
        planetPos.x + Math.cos(forwardAngle) * 3,
        planetPos.y,
        planetPos.z + Math.sin(forwardAngle) * 3
      );
      this.camera.lookAt(lookTarget);
      this.target.copy(lookTarget);
    } else {
      this.updatePosition();
    }
  }

  public isInFollowMode(): boolean {
    return this.mode === 'follow';
  }

  public getFollowPlanet(): Planet | null {
    return this.followPlanet;
  }
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private solarSystem: SolarSystem;
  private uiManager: UIManager;
  private cameraController: CameraController;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;
  private selectedPlanet: Planet | null = null;
  private planetWithPopup: Planet | null = null;

  constructor() {
    const container = document.getElementById('app')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x222233, 0.4);
    this.scene.add(ambientLight);

    this.solarSystem = new SolarSystem(this.scene);

    this.cameraController = new CameraController(this.camera, this.renderer.domElement);

    const planetNames = this.solarSystem.planets.map(p => p.name);
    this.uiManager = new UIManager(
      container,
      planetNames,
      {
        onPlanetSelect: (index) => this.handlePlanetSelect(index),
        onOrbitRadiusChange: (index, multiplier) => this.handleOrbitRadiusChange(index, multiplier),
        onOrbitSpeedChange: (index, multiplier) => this.handleOrbitSpeedChange(index, multiplier),
        onGlobalView: () => this.handleGlobalView(),
        onFollowPlanet: () => this.handleFollowPlanet()
      },
      this.camera,
      this.solarSystem.group
    );

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.bindEvents();

    const defaultIndex = this.uiManager.getSelectedPlanetIndex();
    this.handlePlanetSelect(defaultIndex);

    window.addEventListener('resize', () => this.handleResize());

    this.animate();
  }

  private bindEvents(): void {
    this.renderer.domElement.addEventListener('click', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const planetMeshes = this.solarSystem.getPlanetMeshes();
      const intersects = this.raycaster.intersectObjects(planetMeshes, false);

      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh;
        const planet = mesh.userData.planet as Planet;
        if (planet) {
          this.planetWithPopup = planet;
          this.uiManager.showPlanetPopup(planet);
        }
      }
    });
  }

  private handlePlanetSelect(index: number): void {
    const planet = this.solarSystem.getPlanetByIndex(index);
    if (!planet) return;

    if (this.selectedPlanet) {
      const mat = this.selectedPlanet.mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(0x000000);
    }

    this.selectedPlanet = planet;
    const mat = planet.mesh.material as THREE.MeshStandardMaterial;
    mat.emissive.setHex(0x333333);

    this.cameraController.setOrbitTarget(planet.getPosition());
    this.uiManager.updateSlidersForPlanet(planet);
  }

  private handleOrbitRadiusChange(index: number, multiplier: number): void {
    const planet = this.solarSystem.getPlanetByIndex(index);
    if (planet) {
      planet.setOrbitRadiusMultiplier(multiplier);
    }
  }

  private handleOrbitSpeedChange(index: number, multiplier: number): void {
    const planet = this.solarSystem.getPlanetByIndex(index);
    if (planet) {
      planet.setOrbitSpeedMultiplier(multiplier);
    }
  }

  private handleGlobalView(): void {
    this.cameraController.setFollowPlanet(null);
    this.cameraController.setOrbitTarget(new THREE.Vector3(0, 0, 0));
    this.cameraController.animateToGlobalView();
  }

  private handleFollowPlanet(): void {
    if (this.selectedPlanet) {
      this.cameraController.animateToFollowPlanet(this.selectedPlanet);
    }
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();

    this.solarSystem.update(deltaTime);

    if (this.selectedPlanet && !this.cameraController.isInFollowMode()) {
      this.cameraController.setOrbitTarget(this.selectedPlanet.getPosition());
    }

    this.cameraController.update(deltaTime);

    if (this.planetWithPopup) {
      this.uiManager.updatePopupPosition(this.planetWithPopup);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
