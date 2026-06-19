import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Building, SunPosition, WindParticle, SectionPlane } from '@/types';
import { DataProcessor, getWindColor } from '@/data/dataProcessor';
import { calculateSunPosition } from '@/utils/sunCalc';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private buildings: Map<string, THREE.Mesh> = new Map();
  private buildingOutlines: Map<string, THREE.LineSegments> = new Map();
  private ground: THREE.Mesh | null = null;
  private shadowPlane: THREE.Mesh | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;

  private particles: THREE.Points | null = null;
  private particleData: WindParticle[] = [];
  private particleGeometry: THREE.BufferGeometry | null = null;
  private dataProcessor: DataProcessor;

  private sectionPlaneMesh: THREE.Mesh | null = null;
  private sectionClipPlane: THREE.Plane | null = null;
  private sectionHandle: THREE.Mesh | null = null;

  private animationId: number | null = null;
  private lastTime: number = 0;
  private selectedBuildingId: string | null = null;
  private transitionProgress: number = 1;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private onBuildingClick?: (buildingId: string | null) => void;
  private onBuildingDrag?: (buildingId: string, x: number, z: number) => void;

  private isDraggingBuilding: boolean = false;
  private dragBuildingId: string | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.dataProcessor = new DataProcessor();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2332);
    this.scene.fog = new THREE.Fog(0x1a2332, 100, 300);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(50, 40, 50);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 200;
    this.controls.target.set(0, 5, 0);

    this.initLights();
    this.initGround();
    this.initWindParticles();
    this.initSectionPlane();
    this.addGridHelper();

    this.setupEventListeners();
    this.animate();
  }

  private initLights(): void {
    this.ambientLight = new THREE.AmbientLight(0x404050, 0.5);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.sunLight.position.set(50, 80, 50);
    this.sunLight.castShadow = true;

    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 300;
    this.sunLight.shadow.camera.left = -80;
    this.sunLight.shadow.camera.right = 80;
    this.sunLight.shadow.camera.top = 80;
    this.sunLight.shadow.camera.bottom = -80;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x362d1f, 0.3);
    this.scene.add(hemiLight);
  }

  private initGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(200, 200, 100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a3444,
      roughness: 0.9,
      metalness: 0.1,
    });

    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    const shadowGeometry = new THREE.PlaneGeometry(200, 200);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8c42,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.shadowPlane = new THREE.Mesh(shadowGeometry, shadowMaterial);
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.position.y = 0.01;
    this.scene.add(this.shadowPlane);
  }

  private addGridHelper(): void {
    const gridHelper = new THREE.GridHelper(200, 40, 0x3a4556, 0x2a3444);
    gridHelper.position.y = 0.02;
    this.scene.add(gridHelper);
  }

  private initWindParticles(): void {
    const particleCount = 2000;
    this.particleGeometry = new THREE.BufferGeometry();

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 0.2;
      colors[i * 3 + 1] = 0.5;
      colors[i * 3 + 2] = 1;
      sizes[i] = 2;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(this.particleGeometry, particleMaterial);
    this.particles.visible = true;
    this.scene.add(this.particles);
  }

  private initSectionPlane(): void {
    this.sectionClipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);

    const planeGeometry = new THREE.PlaneGeometry(100, 60);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.sectionPlaneMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    this.sectionPlaneMesh.visible = false;
    this.scene.add(this.sectionPlaneMesh);

    const handleGeometry = new THREE.CylinderGeometry(1, 1, 65, 8);
    const handleMaterial = new THREE.MeshBasicMaterial({
      color: 0x4a90d9,
      transparent: true,
      opacity: 0.8,
    });
    this.sectionHandle = new THREE.Mesh(handleGeometry, handleMaterial);
    this.sectionHandle.rotation.z = Math.PI / 2;
    this.sectionHandle.visible = false;
    this.scene.add(this.sectionHandle);
  }

  public addBuilding(building: Building): void {
    const geometry = new THREE.BoxGeometry(building.width, building.height, building.depth);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(building.color),
      transparent: true,
      opacity: building.opacity,
      roughness: 0.3,
      metalness: 0.1,
      clippingPlanes: this.sectionClipPlane ? [this.sectionClipPlane] : [],
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(building.x, building.height / 2, building.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.buildingId = building.id;

    this.scene.add(mesh);
    this.buildings.set(building.id, mesh);

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
    });
    const outline = new THREE.LineSegments(edges, lineMaterial);
    outline.position.copy(mesh.position);
    outline.userData.buildingId = building.id;
    this.scene.add(outline);
    this.buildingOutlines.set(building.id, outline);
  }

  public removeBuilding(buildingId: string): void {
    const mesh = this.buildings.get(buildingId);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.buildings.delete(buildingId);
    }

    const outline = this.buildingOutlines.get(buildingId);
    if (outline) {
      this.scene.remove(outline);
      outline.geometry.dispose();
      (outline.material as THREE.Material).dispose();
      this.buildingOutlines.delete(buildingId);
    }
  }

  public updateBuilding(buildingId: string, updates: Partial<Building>): void {
    const mesh = this.buildings.get(buildingId);
    const outline = this.buildingOutlines.get(buildingId);

    if (!mesh) return;

    if (updates.x !== undefined || updates.z !== undefined) {
      mesh.position.x = updates.x ?? mesh.position.x;
      mesh.position.z = updates.z ?? mesh.position.z;
      if (outline) {
        outline.position.x = mesh.position.x;
        outline.position.z = mesh.position.z;
      }
    }

    if (updates.y !== undefined) {
      // y is not directly on building, but we could use it
    }

    if (updates.width !== undefined || updates.depth !== undefined || updates.height !== undefined) {
      const width = updates.width ?? (mesh.geometry as THREE.BoxGeometry).parameters.width;
      const depth = updates.depth ?? (mesh.geometry as THREE.BoxGeometry).parameters.depth;
      const height = updates.height ?? (mesh.geometry as THREE.BoxGeometry).parameters.height;

      mesh.geometry.dispose();
      mesh.geometry = new THREE.BoxGeometry(width, height, depth);
      mesh.position.y = height / 2;

      if (outline) {
        outline.geometry.dispose();
        outline.geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, depth));
        outline.position.y = height / 2;
      }
    }

    if (updates.color !== undefined || updates.opacity !== undefined) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (updates.color) {
        material.color = new THREE.Color(updates.color);
      }
      if (updates.opacity !== undefined) {
        material.opacity = updates.opacity;
        material.transparent = updates.opacity < 1;
      }
    }

    if (updates.selected !== undefined) {
      const outlineMat = outline?.material as THREE.LineBasicMaterial;
      if (outlineMat) {
        outlineMat.opacity = updates.selected ? 1 : 0;
        outlineMat.color = new THREE.Color(updates.selected ? 0x00ffff : 0xffffff);
      }
    }
  }

  public clearBuildings(): void {
    for (const id of this.buildings.keys()) {
      this.removeBuilding(id);
    }
  }

  public setBuildings(buildings: Building[]): void {
    this.clearBuildings();
    for (const building of buildings) {
      this.addBuilding(building);
    }
  }

  public updateSunPosition(sunPos: SunPosition): void {
    if (!this.sunLight) return;

    const { azimuth, altitude } = calculateSunPosition(sunPos.season, sunPos.time);

    const distance = 100;
    const x = Math.sin(azimuth) * Math.cos(altitude) * distance;
    const y = Math.sin(altitude) * distance;
    const z = Math.cos(azimuth) * Math.cos(altitude) * distance;

    this.sunLight.position.set(x, y, z);
    this.sunLight.target.position.set(0, 0, 0);

    const dayProgress = (sunPos.time - 6) / 12;
    const warmColor = new THREE.Color(0xffd4a3);
    const coolColor = new THREE.Color(0xd4e5ff);
    const sunColor = new THREE.Color().lerpColors(
      dayProgress < 0.5 ? warmColor : coolColor,
      new THREE.Color(0xffffff),
      Math.abs(dayProgress - 0.5) * 2
    );
    this.sunLight.color = sunColor;

    const intensity = Math.max(0.2, Math.sin(altitude) * 1.2);
    this.sunLight.intensity = intensity;
  }

  public setWindParticles(show: boolean): void {
    if (this.particles) {
      this.particles.visible = show;
    }
  }

  public updateWindData(windRose: { direction: number; speed: number }, buildings: Building[]): void {
    this.dataProcessor.calculateWindField(windRose, buildings);
    this.particleData = this.dataProcessor.createInitialParticles(windRose);
  }

  private updateParticles(dt: number): void {
    if (!this.particles || !this.particleGeometry || !this.particleData.length) return;

    const positions = this.particleGeometry.attributes.position.array as Float32Array;
    const colors = this.particleGeometry.attributes.color.array as Float32Array;

    const maxSpeed = 8;

    for (let i = 0; i < this.particleData.length; i++) {
      const p = this.particleData[i];
      const vel = this.dataProcessor.getWindVelocityAt(p.position.x, p.position.y, p.position.z);

      p.position.x += vel.x * dt * 3;
      p.position.y += vel.y * dt * 3;
      p.position.z += vel.z * dt * 3;
      p.speed = vel.speed;
      p.life += dt;

      if (p.life > p.maxLife || p.position.y < 0.5 || p.position.y > 80 ||
          p.position.x < -60 || p.position.x > 60 ||
          p.position.z < -60 || p.position.z > 60) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 20;
        p.position.x = Math.cos(angle) * dist;
        p.position.y = Math.random() * 30 + 2;
        p.position.z = Math.sin(angle) * dist;
        p.life = 0;
        p.maxLife = 4 + Math.random() * 4;
      }

      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;

      const color = new THREE.Color(getWindColor(p.speed, maxSpeed));
      const alpha = Math.min(1, p.life / p.maxLife > 0.8 ? (1 - p.life / p.maxLife) / 0.2 : p.life / 0.5);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
  }

  public setSectionPlane(section: SectionPlane): void {
    if (!this.sectionPlaneMesh || !this.sectionHandle || !this.sectionClipPlane) return;

    this.sectionPlaneMesh.visible = section.active;
    this.sectionHandle.visible = section.active;

    if (section.active) {
      if (section.axis === 'x') {
        this.sectionClipPlane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(section.position, 0, 0)
        );
        this.sectionPlaneMesh.rotation.y = Math.PI / 2;
        this.sectionPlaneMesh.position.set(section.position, 30, 0);
        this.sectionHandle.rotation.z = Math.PI / 2;
        this.sectionHandle.position.set(section.position, 30, 0);
      } else {
        this.sectionClipPlane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3(0, 0, section.position)
        );
        this.sectionPlaneMesh.rotation.y = 0;
        this.sectionPlaneMesh.position.set(0, 30, section.position);
        this.sectionHandle.rotation.x = Math.PI / 2;
        this.sectionHandle.position.set(0, 30, section.position);
      }
    }

    this.buildings.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.clippingPlanes = section.active ? [this.sectionClipPlane!] : [];
      mat.clipShadows = true;
    });

    if (this.renderer) {
      this.renderer.localClippingEnabled = section.active;
    }
  }

  public setTransitionProgress(progress: number): void {
    this.transitionProgress = progress;

    this.buildings.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = progress * 0.9;
    });

    if (this.particles) {
      (this.particles.material as THREE.PointsMaterial).opacity = progress * 0.8;
    }
  }

  public setSelectedBuilding(buildingId: string | null): void {
    if (this.selectedBuildingId && this.selectedBuildingId !== buildingId) {
      this.updateBuilding(this.selectedBuildingId, { selected: false });
    }

    this.selectedBuildingId = buildingId;

    if (buildingId) {
      this.updateBuilding(buildingId, { selected: true });
    }
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('click', this.onClick.bind(this));
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onClick(event: MouseEvent): void {
    if (this.isDraggingBuilding) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const buildingMeshes = Array.from(this.buildings.values());
    const intersects = this.raycaster.intersectObjects(buildingMeshes);

    if (intersects.length > 0) {
      const buildingId = intersects[0].object.userData.buildingId as string;
      this.setSelectedBuilding(buildingId);
      if (this.onBuildingClick) {
        this.onBuildingClick(buildingId);
      }
    } else {
      this.setSelectedBuilding(null);
      if (this.onBuildingClick) {
        this.onBuildingClick(null);
      }
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    if (this.controls.enableDamping) this.controls.enabled = true;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const buildingMeshes = Array.from(this.buildings.values());
    const intersects = this.raycaster.intersectObjects(buildingMeshes);

    if (intersects.length > 0) {
      const buildingId = intersects[0].object.userData.buildingId as string;
      if (buildingId === this.selectedBuildingId) {
        this.isDraggingBuilding = true;
        this.dragBuildingId = buildingId;
        this.controls.enabled = false;
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDraggingBuilding || !this.dragBuildingId) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(groundPlane, intersection);

    if (intersection && this.onBuildingDrag) {
      this.onBuildingDrag(this.dragBuildingId, intersection.x, intersection.z);
    }
  }

  private onMouseUp(): void {
    if (this.isDraggingBuilding) {
      this.isDraggingBuilding = false;
      this.dragBuildingId = null;
      this.controls.enabled = true;
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const currentTime = performance.now();
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.controls.update();

    if (this.particles && this.particles.visible) {
      this.updateParticles(dt);
    }

    this.buildingOutlines.forEach((outline, id) => {
      const mat = outline.material as THREE.LineBasicMaterial;
      if (this.selectedBuildingId === id) {
        const pulse = 0.7 + Math.sin(currentTime * 0.003) * 0.3;
        mat.opacity = pulse;
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  public setOnBuildingClick(callback: (buildingId: string | null) => void): void {
    this.onBuildingClick = callback;
  }

  public setOnBuildingDrag(callback: (buildingId: string, x: number, z: number) => void): void {
    this.onBuildingDrag = callback;
  }

  public getDataProcessor(): DataProcessor {
    return this.dataProcessor;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.clearBuildings();

    if (this.ground) {
      this.ground.geometry.dispose();
      (this.ground.material as THREE.Material).dispose();
    }

    if (this.shadowPlane) {
      this.shadowPlane.geometry.dispose();
      (this.shadowPlane.material as THREE.Material).dispose();
    }

    if (this.particles) {
      this.particleGeometry?.dispose();
      (this.particles.material as THREE.Material).dispose();
    }

    if (this.sectionPlaneMesh) {
      this.sectionPlaneMesh.geometry.dispose();
      (this.sectionPlaneMesh.material as THREE.Material).dispose();
    }

    if (this.sectionHandle) {
      this.sectionHandle.geometry.dispose();
      (this.sectionHandle.material as THREE.Material).dispose();
    }

    this.controls.dispose();
    this.renderer.dispose();

    window.removeEventListener('resize', this.onResize.bind(this));
  }
}
