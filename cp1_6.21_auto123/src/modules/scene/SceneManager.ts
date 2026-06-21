import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface SceneConfig {
  container: HTMLElement;
  onFrame?: (delta: number) => void;
  onPointerMove?: (intersection: THREE.Intersection | null, screenX: number, screenY: number) => void;
}

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public buildingGroup: THREE.Group;
  public edgeGroup: THREE.Group;
  public particleSystem: THREE.Points | null = null;
  public heatmapMesh: THREE.Mesh | null = null;
  public ground: THREE.Mesh;
  public gridHelper: THREE.GridHelper;

  private container: HTMLElement;
  private onFrame?: (delta: number) => void;
  private onPointerMove?: (intersection: THREE.Intersection | null, screenX: number, screenY: number) => void;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private frameId: number | null = null;
  private running: boolean = false;

  constructor(config: SceneConfig) {
    this.container = config.container;
    this.onFrame = config.onFrame;
    this.onPointerMove = config.onPointerMove;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = new THREE.Fog(0x050a14, 150, 350);

    this.camera = new THREE.PerspectiveCamera(
      55,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(110, 95, 110);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 30;
    this.controls.maxDistance = 280;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.08;
    this.controls.target.set(0, 5, 0);

    this.buildingGroup = new THREE.Group();
    this.edgeGroup = new THREE.Group();
    this.scene.add(this.buildingGroup);
    this.scene.add(this.edgeGroup);

    this.setupLighting();
    this.setupGround();

    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x4a5878, 0.65);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x8ab4ff, 0x1a2030, 0.35);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff0d8, 1.1);
    sun.position.set(60, 100, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -120;
    sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x6a8ac8, 0.3);
    fill.position.set(-50, 40, -60);
    this.scene.add(fill);
  }

  private setupGround(): void {
    const groundGeo = new THREE.PlaneGeometry(400, 400);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0a1220,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.9,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.gridHelper = new THREE.GridHelper(320, 64, 0x1e3a5f, 0x0e1a30);
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.35;
    this.scene.add(this.gridHelper);
  }

  public addBuildings(meshes: { mesh: THREE.Mesh; edges: THREE.LineSegments }[]): void {
    meshes.forEach(({ mesh, edges }) => {
      this.buildingGroup.add(mesh);
      this.edgeGroup.add(edges);
    });
  }

  public clearBuildings(): void {
    while (this.buildingGroup.children.length > 0) {
      const child = this.buildingGroup.children[0];
      this.buildingGroup.remove(child);
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
      const mat = (child as THREE.Mesh).material;
      if (mat) {
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    }
    while (this.edgeGroup.children.length > 0) {
      const child = this.edgeGroup.children[0];
      this.edgeGroup.remove(child);
      const ls = child as THREE.LineSegments;
      if (ls.geometry) ls.geometry.dispose();
      if (ls.material) {
        if (Array.isArray(ls.material)) ls.material.forEach((m) => m.dispose());
        else ls.material.dispose();
      }
    }
  }

  public setParticleSystem(system: THREE.Points): void {
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      const mat = this.particleSystem.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
    this.particleSystem = system;
    this.scene.add(system);
  }

  public setHeatmap(mesh: THREE.Mesh): void {
    if (this.heatmapMesh) {
      this.scene.remove(this.heatmapMesh);
      this.heatmapMesh.geometry.dispose();
      const mat = this.heatmapMesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
    this.heatmapMesh = mesh;
    this.scene.add(mesh);
  }

  public raycastBuildings(screenX: number, screenY: number): THREE.Intersection | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((screenX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((screenY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.buildingGroup.children, false);
    return hits.length > 0 ? hits[0] : null;
  }

  public getBuildingMeshes(): THREE.Mesh[] {
    return this.buildingGroup.children as THREE.Mesh[];
  }

  private handleResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.onPointerMove) return;
    const intersection = this.raycastBuildings(e.clientX, e.clientY);
    this.onPointerMove(intersection, e.clientX, e.clientY);
  };

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.animate();
  }

  private animate = (): void => {
    if (!this.running) return;
    this.frameId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.controls.update();
    if (this.onFrame) {
      this.onFrame(delta);
    }
    this.renderer.render(this.scene, this.camera);
  };

  public stop(): void {
    this.running = false;
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.controls.dispose();
    this.clearBuildings();

    if (this.particleSystem) {
      this.particleSystem.geometry.dispose();
    }
    if (this.heatmapMesh) {
      this.heatmapMesh.geometry.dispose();
    }

    this.ground.geometry.dispose();
    (this.ground.material as THREE.Material).dispose();
    this.gridHelper.geometry.dispose();
    (this.gridHelper.material as THREE.Material).dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
