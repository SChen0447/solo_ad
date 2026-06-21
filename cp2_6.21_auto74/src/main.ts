import * as THREE from 'three';
import { createTerrain } from './terrain';
import { FishSchool, Turtle } from './creatures';
import { ControlPanel, ControlParams } from './controls';
import { InfoBar } from './ui';

const WATER_COLOR_SHALLOW = new THREE.Color(0x0077BE);
const WATER_COLOR_DEEP = new THREE.Color(0x003F5C);
const ROTATION_SPEED = 0.3;
const ZOOM_MIN = 10;
const ZOOM_MAX = 50;
const TRANSITION_DURATION = 0.5;

class CameraController {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Vector3;
  private spherical: THREE.Spherical;
  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private transitioning: boolean = false;
  private transitionFrom: THREE.Spherical = new THREE.Spherical();
  private transitionTo: THREE.Spherical = new THREE.Spherical();
  private transitionProgress: number = 0;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.target = new THREE.Vector3(0, 2, 0);
    this.spherical = new THREE.Spherical(25, Math.PI / 3, Math.PI / 4);
    this.updateCameraFromSpherical();

    domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDragging = true;
      this.previousMouse = { x: e.clientX, y: e.clientY };
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const dx = e.clientX - this.previousMouse.x;
    const dy = e.clientY - this.previousMouse.y;
    this.spherical.theta -= dx * ROTATION_SPEED * 0.01;
    this.spherical.phi = THREE.MathUtils.clamp(
      this.spherical.phi + dy * ROTATION_SPEED * 0.01,
      0.1,
      Math.PI / 2 - 0.05,
    );
    this.previousMouse = { x: e.clientX, y: e.clientY };
    this.updateCameraFromSpherical();
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius + e.deltaY * 0.02,
      ZOOM_MIN,
      ZOOM_MAX,
    );
    this.updateCameraFromSpherical();
  }

  private updateCameraFromSpherical(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  resetView(): void {
    this.transitionFrom.copy(this.spherical);
    this.transitionTo.set(25, Math.PI / 3, Math.PI / 4);
    this.transitionProgress = 0;
    this.transitioning = true;
  }

  update(delta: number): void {
    if (!this.transitioning) return;
    this.transitionProgress += delta / TRANSITION_DURATION;
    if (this.transitionProgress >= 1) {
      this.transitionProgress = 1;
      this.transitioning = false;
    }
    const t = this.transitionProgress * this.transitionProgress * (3 - 2 * this.transitionProgress);
    this.spherical.radius = THREE.MathUtils.lerp(this.transitionFrom.radius, this.transitionTo.radius, t);
    this.spherical.phi = THREE.MathUtils.lerp(this.transitionFrom.phi, this.transitionTo.phi, t);
    this.spherical.theta = THREE.MathUtils.lerp(this.transitionFrom.theta, this.transitionTo.theta, t);
    this.updateCameraFromSpherical();
  }
}

class OceanScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cameraController: CameraController;
  private terrain: ReturnType<typeof createTerrain>;
  private fishSchool: FishSchool;
  private turtle: Turtle;
  private controlPanel: ControlPanel;
  private infoBar: InfoBar;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private groundPlane: THREE.Plane;
  private params: ControlParams;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;
    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = WATER_COLOR_SHALLOW.clone();
    this.scene.fog = new THREE.FogExp2(WATER_COLOR_DEEP, 0.03);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(15, 15, 15);
    this.camera.lookAt(0, 2, 0);

    this.terrain = createTerrain();
    this.scene.add(this.terrain.mesh);

    this.fishSchool = new FishSchool(this.terrain.getHeightAt);
    this.scene.add(this.fishSchool.getGroup());

    this.turtle = new Turtle(this.terrain.getHeightAt);
    this.scene.add(this.turtle.getGroup());

    this.addLighting();

    this.params = { waterClarity: 0.5, causticsIntensity: 0.7, fishActivity: 0.5 };

    this.cameraController = new CameraController(this.camera, this.renderer.domElement);

    this.controlPanel = new ControlPanel(
      () => this.cameraController.resetView(),
      () => this.randomizeCreatures(),
      (params) => this.onParamsChange(params),
    );
    this.params = this.controlPanel.getParams();

    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.infoBar = new InfoBar({
      getCreatureCount: () => this.fishSchool.getCreatureCount() + this.turtle.getCreatureCount(),
      getWorldPosition: (cx, cy) => this.getWorldPosition(cx, cy),
    });

    this.clock = new THREE.Clock();

    this.addSeaParticles();

    window.addEventListener('resize', this.onResize.bind(this));

    this.applyParams();
    this.animate();
  }

  private addLighting(): void {
    const ambient = new THREE.AmbientLight(0x4488AA, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xFFEECC, 1.0);
    sun.position.set(10, 20, 5);
    sun.castShadow = false;
    this.scene.add(sun);

    const pointLight = new THREE.PointLight(0x88CCFF, 0.5, 30);
    pointLight.position.set(0, 8, 0);
    this.scene.add(pointLight);
  }

  private addSeaParticles(): void {
    const count = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xAADDFF,
      size: 0.05,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
  }

  private getWorldPosition(clientX: number, clientY: number): { x: number; z: number } | null {
    const mouse = new THREE.Vector2(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1,
    );
    this.raycaster.setFromCamera(mouse, this.camera);
    const intersection = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, intersection);
    if (hit) {
      return { x: intersection.x, z: intersection.z };
    }
    return null;
  }

  private onParamsChange(params: ControlParams): void {
    this.params = params;
    this.applyParams();
  }

  private applyParams(): void {
    const fogDensity = THREE.MathUtils.lerp(0.08, 0.01, this.params.waterClarity);
    (this.scene.fog as THREE.FogExp2).density = fogDensity;
    this.fishSchool.setActivity(this.params.fishActivity);
  }

  private randomizeCreatures(): void {
    this.fishSchool.reset(this.terrain.getHeightAt);
    this.turtle.reset(this.terrain.getHeightAt);
    this.fishSchool.getGroup().traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshPhongMaterial;
        mat.transparent = true;
        mat.opacity = 0;
      }
    });
    this.turtle.getGroup().traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshPhongMaterial;
        mat.transparent = true;
        mat.opacity = 0;
      }
    });
    this.fadeInCreatures();
  }

  private fadeInCreatures(): void {
    let elapsed = 0;
    const duration = 0.3;
    const fade = () => {
      elapsed += 0.016;
      const t = Math.min(elapsed / duration, 1);
      this.fishSchool.getGroup().traverse((child) => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshPhongMaterial).opacity = t;
        }
      });
      this.turtle.getGroup().traverse((child) => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshPhongMaterial).opacity = t;
        }
      });
      if (t < 1) requestAnimationFrame(fade);
    };
    requestAnimationFrame(fade);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;

    this.cameraController.update(delta);
    this.terrain.updateCaustics(time, this.params.causticsIntensity);
    this.fishSchool.update(delta, time, this.terrain.getHeightAt);
    this.turtle.update(delta, time, this.terrain.getHeightAt);
    this.infoBar.update(delta);

    const bgLerp = THREE.MathUtils.clamp(
      (this.camera.position.y - 5) / 15,
      0,
      1,
    );
    this.scene.background = WATER_COLOR_SHALLOW.clone().lerp(WATER_COLOR_DEEP, bgLerp);

    this.renderer.render(this.scene, this.camera);
  }
}

new OceanScene();
