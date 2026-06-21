import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { emit, on, type CompareData } from '@/utils/eventBus';
import { PlanetManager, type PlanetObject } from '@/modules/planetManager';

interface BezierFlight {
  active: boolean;
  startTime: number;
  duration: number;
  p0: THREE.Vector3;
  p1: THREE.Vector3;
  p2: THREE.Vector3;
  p3: THREE.Vector3;
  lookAtStart: THREE.Vector3;
  lookAtEnd: THREE.Vector3;
}

export class RenderEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private labelRenderer: CSS2DRenderer;
  private controls: OrbitControls;
  private planetManager: PlanetManager | null = null;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredPlanet: string | null = null;
  private flight: BezierFlight;
  private focusMode: boolean = false;
  private compareBackground: boolean = false;
  private backgroundTransition: number = 0;
  private originalBgColor = new THREE.Color('#0B0C10');
  private compareBgColorA = new THREE.Color('#1A1A2E');
  private compareBgColorB = new THREE.Color('#16213E');
  private canvasContainer: HTMLElement;
  private onCanvasClick: ((name: string | null) => void) | null = null;
  private orbitLines: THREE.Line[] = [];
  private animationId: number = 0;

  constructor(container: HTMLElement) {
    this.canvasContainer = container;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);
    this.flight = {
      active: false, startTime: 0, duration: 1.2,
      p0: new THREE.Vector3(), p1: new THREE.Vector3(),
      p2: new THREE.Vector3(), p3: new THREE.Vector3(),
      lookAtStart: new THREE.Vector3(), lookAtEnd: new THREE.Vector3(),
    };

    this.scene = new THREE.Scene();
    this.scene.background = this.originalBgColor.clone();

    this.camera = new THREE.PerspectiveCamera(
      60, container.clientWidth / container.clientHeight, 0.1, 200
    );
    this.camera.position.set(0, 20, 40);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(container.clientWidth, container.clientHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.labelRenderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 100;

    this.setupLights();
    this.setupEventListeners();
    this.bindBusEvents();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(0, 5, 0);
    this.scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x4466aa, 0.3);
    fillLight.position.set(-10, -5, -10);
    this.scene.add(fillLight);

    const sunGeo = new THREE.SphereGeometry(1.5, 16, 12);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(sun);

    const glowGeo = new THREE.SphereGeometry(2.0, 16, 12);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00, transparent: true, opacity: 0.15,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    this.scene.add(glow);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    canvas.addEventListener('click', (e) => {
      if (this.flight.active) return;
      const rect = canvas.getBoundingClientRect();
      const clickMouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      this.raycaster.setFromCamera(clickMouse, this.camera);
      if (this.planetManager) {
        const meshes = this.planetManager.getPlanetMeshes();
        const intersects = this.raycaster.intersectObjects(meshes, false);
        if (intersects.length > 0) {
          const name = intersects[0].object.userData.planetName;
          if (name) {
            this.flyToPlanet(name);
            emit('planet:click', { name });
          }
        }
      }
    });

    window.addEventListener('resize', () => this.onResize());
  }

  private bindBusEvents(): void {
    on('camera:focus', (payload) => {
      this.flyToPlanet(payload.name);
    });
    on('camera:reset', () => {
      this.resetCamera();
    });
    on('planets:compared', (data: CompareData) => {
      this.compareBackground = true;
    });
    on('planets:compareExit', () => {
      this.compareBackground = false;
    });
    on('mode:reset', () => {
      this.focusMode = false;
      this.compareBackground = false;
    });
  }

  initPlanetManager(pm: PlanetManager): void {
    this.planetManager = pm;
    pm.init(this.scene);
    this.createOrbitLines();
    this.createLabels();
  }

  private createOrbitLines(): void {
    if (!this.planetManager) return;
    const planetList = this.planetManager.getPlanetList();
    planetList.forEach((pData) => {
      const segments = 128;
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(angle) * pData.orbitRadius,
          0,
          Math.sin(angle) * pData.orbitRadius
        ));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x334466, transparent: true, opacity: 0.3,
      });
      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
      this.orbitLines.push(line);
    });
  }

  private createLabels(): void {
    if (!this.planetManager) return;
    this.planetManager.getPlanetList().forEach((pData) => {
      const planet = this.planetManager!.getPlanetByName(pData.name);
      if (!planet) return;
      const div = document.createElement('div');
      div.textContent = pData.name;
      div.style.cssText = `
        font-size: 14px;
        color: #FFFFFF;
        font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
        text-shadow: -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000,
                     0 -2px 0 #000, 0 2px 0 #000, -2px 0 0 #000, 2px 0 0 #000;
        pointer-events: none;
        user-select: none;
        white-space: nowrap;
      `;
      const label = new CSS2DObject(div);
      label.position.set(0, pData.diameter / 2 + 0.4, 0);
      planet.mesh.add(label);
    });
  }

  private flyToPlanet(name: string): void {
    if (!this.planetManager) return;
    const planet = this.planetManager.getPlanetByName(name);
    if (!planet) return;

    this.focusMode = true;
    const worldPos = new THREE.Vector3();
    planet.mesh.getWorldPosition(worldPos);

    const distance = (planet.data.diameter / 2) / Math.tan(
      THREE.MathUtils.degToRad(this.camera.fov / 2)
    ) * (1 / 0.4);

    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const camToPlanet = worldPos.clone().sub(this.camera.position).normalize();

    this.flight.p0.copy(this.camera.position);
    this.flight.p1.copy(this.camera.position).add(
      new THREE.Vector3(0, 8, 0)
    );
    this.flight.p3.copy(worldPos).add(
      camToPlanet.clone().multiplyScalar(distance)
    );
    this.flight.p2.copy(this.flight.p3).add(
      new THREE.Vector3(0, 5, 0)
    );
    this.flight.lookAtStart.copy(this.controls.target);
    this.flight.lookAtEnd.copy(worldPos);
    this.flight.startTime = performance.now() / 1000;
    this.flight.active = true;

    this.controls.enabled = false;
  }

  private resetCamera(): void {
    this.focusMode = false;
    this.flight.active = false;
    this.controls.enabled = true;
    this.controls.target.set(0, 0, 0);
  }

  private cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
  }

  private updateFlight(): void {
    if (!this.flight.active) return;
    const now = performance.now() / 1000;
    const elapsed = now - this.flight.startTime;
    let t = Math.min(1, elapsed / this.flight.duration);
    t = t * t * (3 - 2 * t);

    const pos = new THREE.Vector3(
      this.cubicBezier(t, this.flight.p0.x, this.flight.p1.x, this.flight.p2.x, this.flight.p3.x),
      this.cubicBezier(t, this.flight.p0.y, this.flight.p1.y, this.flight.p2.y, this.flight.p3.y),
      this.cubicBezier(t, this.flight.p0.z, this.flight.p1.z, this.flight.p2.z, this.flight.p3.z),
    );
    this.camera.position.copy(pos);

    const lookAt = new THREE.Vector3().lerpVectors(
      this.flight.lookAtStart, this.flight.lookAtEnd, t
    );
    this.camera.lookAt(lookAt);
    this.controls.target.copy(lookAt);

    if (t >= 1) {
      this.flight.active = false;
      this.controls.enabled = true;
    }
  }

  private checkHover(): void {
    if (!this.planetManager || this.flight.active) return;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.planetManager.getPlanetMeshes();
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const name = intersects[0].object.userData.planetName;
      if (name && name !== this.hoveredPlanet) {
        if (this.hoveredPlanet) {
          emit('planet:unhover');
        }
        this.hoveredPlanet = name;
        emit('planet:hover', { name });
      }
      this.renderer.domElement.style.cursor = 'pointer';
    } else {
      if (this.hoveredPlanet) {
        emit('planet:unhover');
        this.hoveredPlanet = null;
      }
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  private updateBackground(delta: number): void {
    const speed = 2.0;
    if (this.compareBackground && this.backgroundTransition < 1) {
      this.backgroundTransition = Math.min(1, this.backgroundTransition + delta * speed);
    } else if (!this.compareBackground && this.backgroundTransition > 0) {
      this.backgroundTransition = Math.max(0, this.backgroundTransition - delta * speed);
    }

    if (this.backgroundTransition > 0) {
      const t = this.backgroundTransition;
      const blended = this.originalBgColor.clone().lerp(this.compareBgColorA, t);
      this.scene.background = blended;
    } else {
      this.scene.background = this.originalBgColor.clone();
    }

    const lineOpacity = 0.3 * (1 - this.backgroundTransition);
    this.orbitLines.forEach((line) => {
      (line.material as THREE.LineBasicMaterial).opacity = lineOpacity;
    });
  }

  private onResize(): void {
    const w = this.canvasContainer.clientWidth;
    const h = this.canvasContainer.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
  }

  start(): void {
    this.clock.start();
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const delta = Math.min(this.clock.getDelta(), 0.1);

      this.updateFlight();
      this.checkHover();
      this.updateBackground(delta);

      if (this.planetManager) {
        this.planetManager.update(delta, this.camera);
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.labelRenderer.render(this.scene, this.camera);
    };
    animate();
  }

  stop(): void {
    cancelAnimationFrame(this.animationId);
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
}
