import * as THREE from 'three';
import { AstroBody, randomPlanetColor, type BodyType, type BodyConfig } from './core/AstroBody';
import { PhysicsEngine } from './core/PhysicsEngine';
import { Toolbar } from './ui/Toolbar';
import { InfoPanel } from './ui/InfoPanel';
import { ConfigAPI } from './api/ConfigAPI';

class StarSandbox {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private physicsEngine: PhysicsEngine;
  private toolbar: Toolbar;
  private infoPanel: InfoPanel;
  private clock: THREE.Clock;

  private container: HTMLElement;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isPaused: boolean = false;
  private isDragging: boolean = false;
  private isRightDragging: boolean = false;
  private isCreating: boolean = false;
  private createStartPos: THREE.Vector3 | null = null;
  private createCurrentPos: THREE.Vector3 | null = null;
  private previewLine: THREE.Line | null = null;

  private cameraDistance: number = 120;
  private cameraTheta: number = Math.PI / 4;
  private cameraPhi: number = Math.PI / 4;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private stars!: THREE.Points;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = new THREE.Fog(0x0b0f19, 200, 600);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.physicsEngine = new PhysicsEngine(this.scene, 0.5);
    this.toolbar = new Toolbar();
    this.infoPanel = new InfoPanel();

    this.setupLights();
    this.setupStars();
    this.setupGridHelper();
    this.bindEvents();

    this.start();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0x8899ff, 0x222244, 0.4);
    this.scene.add(hemisphereLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(50, 100, 50);
    this.scene.add(dirLight);
  }

  private setupStars(): void {
    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 300 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      const colorTint = Math.random();
      colors[i * 3] = brightness * (0.8 + colorTint * 0.2);
      colors[i * 3 + 1] = brightness * (0.85 + (1 - colorTint) * 0.15);
      colors[i * 3 + 2] = brightness;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  private setupGridHelper(): void {
    const gridHelper = new THREE.GridHelper(200, 50, 0x222244, 0x111133);
    gridHelper.position.y = -50;
    this.scene.add(gridHelper);
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);

    this.camera.position.set(
      this.cameraTarget.x + x,
      this.cameraTarget.y + y,
      this.cameraTarget.z + z
    );
    this.camera.lookAt(this.cameraTarget);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.toolbar.on('gravity:change', (value: number) => {
      this.physicsEngine.gravityConstant = value;
    });

    this.toolbar.on('simulation:pause', (paused: boolean) => {
      this.isPaused = paused;
    });

    this.toolbar.on('simulation:clear', () => {
      this.physicsEngine.clearAll();
      this.infoPanel.hide();
    });

    this.toolbar.on('view:top', () => {
      this.setTopView();
    });

    this.toolbar.on('view:side', () => {
      this.setSideView();
    });

    this.toolbar.on('config:save', async () => {
      await this.saveConfig();
    });

    this.toolbar.on('config:load', async (id: string) => {
      await this.loadConfig(id);
    });

    this.infoPanel.on('body:delete', (body: AstroBody) => {
      this.physicsEngine.removeBody(body);
    });
  }

  private setTopView(): void {
    this.cameraPhi = 0.01;
    this.cameraTheta = 0;
    this.updateCameraPosition();
  }

  private setSideView(): void {
    this.cameraPhi = Math.PI / 2;
    this.cameraTheta = 0;
    this.updateCameraPosition();
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private getMouseNDC(clientX: number, clientY: number): void {
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  }

  private getWorldPosition(clientX: number, clientY: number): THREE.Vector3 | null {
    this.getMouseNDC(clientX, clientY);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const planeNormal = new THREE.Vector3()
      .subVectors(this.camera.position, this.cameraTarget)
      .normalize();
    const plane = new THREE.Plane(planeNormal, -planeNormal.dot(this.cameraTarget));

    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersection);

    return intersection;
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.getMouseNDC(e.clientX, e.clientY);
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const bodies = this.physicsEngine.getBodies();
      const meshes = bodies.map((b) => b.mesh);
      const intersects = this.raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const bodyData = hit.userData;
        if (bodyData && bodyData.isBody) {
          this.infoPanel.show(bodyData.body as AstroBody);
          this.isDragging = false;
          this.isCreating = false;
          return;
        }
      }

      this.infoPanel.hide();
      this.isCreating = true;
      this.createStartPos = this.getWorldPosition(e.clientX, e.clientY);
      this.createCurrentPos = this.createStartPos?.clone() || null;
    } else if (e.button === 2) {
      this.isRightDragging = true;
    } else if (e.button === 1) {
      this.isDragging = true;
    }

    if (e.button !== 0 || !this.isCreating) {
      this.isDragging = true;
    }

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isCreating) {
      this.createCurrentPos = this.getWorldPosition(e.clientX, e.clientY);
      this.updatePreviewLine();
    } else if (this.isRightDragging) {
      const deltaX = (e.clientX - this.lastMouseX) * 0.3;
      const deltaY = (e.clientY - this.lastMouseY) * 0.3;

      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      this.camera.getWorldDirection(right);
      right.cross(this.camera.up).normalize();
      up.copy(this.camera.up);

      this.cameraTarget.addScaledVector(right, -deltaX);
      this.cameraTarget.addScaledVector(up, deltaY);
      this.updateCameraPosition();

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else if (this.isDragging) {
      const deltaX = (e.clientX - this.lastMouseX) * 0.005;
      const deltaY = (e.clientY - this.lastMouseY) * 0.005;

      this.cameraTheta += deltaX;
      this.cameraPhi = Math.max(0.01, Math.min(Math.PI - 0.01, this.cameraPhi - deltaY));
      this.updateCameraPosition();

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0 && this.isCreating && this.createStartPos && this.createCurrentPos) {
      const dragDistance = this.createStartPos.distanceTo(this.createCurrentPos);

      if (dragDistance < 0.5) {
        this.createBody(this.createStartPos, new THREE.Vector3(0, 0, 0));
      } else {
        const velocity = new THREE.Vector3()
          .subVectors(this.createCurrentPos, this.createStartPos)
          .multiplyScalar(0.3);
        this.createBody(this.createStartPos, velocity);
      }
    }

    this.clearPreviewLine();
    this.isCreating = false;
    this.isDragging = false;
    this.isRightDragging = false;
    this.createStartPos = null;
    this.createCurrentPos = null;
  }

  private updatePreviewLine(): void {
    if (!this.createStartPos || !this.createCurrentPos) return;

    this.clearPreviewLine();

    const points: THREE.Vector3[] = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = new THREE.Vector3().lerpVectors(this.createStartPos, this.createCurrentPos, t);
      points.push(point);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: 0x4ecdc4,
      dashSize: 1,
      gapSize: 0.5,
      transparent: true,
      opacity: 0.8,
    });

    this.previewLine = new THREE.Line(geometry, material);
    this.previewLine.computeLineDistances();
    this.scene.add(this.previewLine);
  }

  private clearPreviewLine(): void {
    if (this.previewLine) {
      this.scene.remove(this.previewLine);
      this.previewLine.geometry.dispose();
      (this.previewLine.material as THREE.Material).dispose();
      this.previewLine = null;
    }
  }

  private createBody(position: THREE.Vector3, velocity: THREE.Vector3): void {
    const type: BodyType = this.toolbar.getCurrentType();
    let config: BodyConfig;

    if (type === 'star') {
      const radius = 3 + Math.random() * 2;
      config = {
        type: 'star',
        mass: 500,
        radius,
        color: '#FFD93D',
        position: { x: position.x, y: position.y, z: position.z },
        velocity: { x: 0, y: 0, z: 0 },
      };
    } else {
      const radius = 0.5 + Math.random() * 1.5;
      const mass = 5 + Math.random() * 5;
      config = {
        type: 'planet',
        mass,
        radius,
        color: randomPlanetColor(),
        position: { x: position.x, y: position.y, z: position.z },
        velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
      };
    }

    const body = new AstroBody(config, this.scene);
    this.physicsEngine.addBody(body);
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomSpeed = 0.001;
    this.cameraDistance = Math.max(
      10,
      Math.min(500, this.cameraDistance + e.deltaY * zoomSpeed * this.cameraDistance)
    );
    this.updateCameraPosition();
  }

  private async saveConfig(): Promise<void> {
    const bodies = this.physicsEngine.getBodies().map((b) => b.toConfig());
    try {
      const id = await ConfigAPI.saveConfig(bodies);
      this.toolbar.showConfigId(id);
    } catch (error) {
      this.toolbar.showMessage('保存失败：请确认后端服务已启动');
    }
  }

  private async loadConfig(id: string): Promise<void> {
    try {
      const config = await ConfigAPI.loadConfig(id);
      this.physicsEngine.clearAll();
      this.infoPanel.hide();

      for (const bodyConfig of config.bodies) {
        const body = new AstroBody(bodyConfig, this.scene);
        this.physicsEngine.addBody(body);
      }

      this.toolbar.showMessage(`已加载配置: ${id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载失败';
      this.toolbar.showMessage(message);
    }
  }

  private start(): void {
    this.animate();
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();

    if (!this.isPaused) {
      this.physicsEngine.update(deltaTime);
    }

    this.stars.rotation.y += deltaTime * 0.005;

    if (this.infoPanel.getSelectedBody()) {
      this.infoPanel.updateContent();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new StarSandbox();
});
