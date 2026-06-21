import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import type { Exhibit, Zone, PathPoint, Vector3 } from './types';
import { dataManager } from './dataManager';
import { pathEngine } from './pathEngine';

interface ExhibitMesh {
  id: string;
  cube: THREE.Mesh;
  marker: THREE.Mesh;
  glow: THREE.PointLight;
}

export class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  
  private exhibitMeshes: Map<string, ExhibitMesh> = new Map();
  private zoneMeshes: THREE.Mesh[] = [];
  private pathLine: THREE.Line | null = null;
  private lightParticles: THREE.Mesh[] = [];
  private particleData: { distance: number; speed: number; totalLength: number; path: PathPoint[] }[] = [];
  
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  private fps: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  
  private onExhibitClickCallback: ((exhibit: Exhibit) => void) | null = null;
  private onFloorClickCallback: ((position: Vector3, zoneId: string) => void) | null = null;
  
  private isPreviewMode: boolean = false;
  private currentPreviewIndex: number = -1;
  private previewExhibits: Exhibit[] = [];
  
  private animationId: number = 0;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container not found: ${containerId}`);
    }
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 30, 80);

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 35, 35);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
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
    this.controls.minDistance = 10;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.target.set(0, 0, 0);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.clock = new THREE.Clock();

    this.setupLighting();
    this.createZones();
    this.createExhibits();
    this.setupEventListeners();
    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(20, 40, 20);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -30;
    mainLight.shadow.camera.right = 30;
    mainLight.shadow.camera.top = 30;
    mainLight.shadow.camera.bottom = -30;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x4a6fa5, 0.4);
    fillLight.position.set(-20, 20, -20);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffd700, 0.3);
    rimLight.position.set(0, 30, -30);
    this.scene.add(rimLight);
  }

  private createZones(): void {
    const zones = dataManager.getZones();

    zones.forEach(zone => {
      const width = zone.bounds.maxX - zone.bounds.minX;
      const depth = zone.bounds.maxZ - zone.bounds.minZ;
      const centerX = (zone.bounds.minX + zone.bounds.maxX) / 2;
      const centerZ = (zone.bounds.minZ + zone.bounds.maxZ) / 2;

      const floorGeometry = new THREE.PlaneGeometry(width, depth);
      const floorMaterial = new THREE.MeshStandardMaterial({
        color: zone.floorColor,
        roughness: 0.8,
        metalness: 0.1
      });

      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(centerX, 0, centerZ);
      floor.receiveShadow = true;
      floor.userData = { type: 'floor', zoneId: zone.id };
      this.scene.add(floor);
      this.zoneMeshes.push(floor);

      const borderGeometry = new THREE.BoxGeometry(width + 0.4, 0.3, 0.2);
      const borderMaterial = new THREE.MeshStandardMaterial({
        color: zone.accentColor,
        roughness: 0.5,
        metalness: 0.3
      });

      const borderTop = new THREE.Mesh(borderGeometry, borderMaterial);
      borderTop.position.set(centerX, 0.15, zone.bounds.maxZ + 0.1);
      borderTop.castShadow = true;
      this.scene.add(borderTop);

      const borderBottom = new THREE.Mesh(borderGeometry, borderMaterial);
      borderBottom.position.set(centerX, 0.15, zone.bounds.minZ - 0.1);
      borderBottom.castShadow = true;
      this.scene.add(borderBottom);

      const sideBorderGeometry = new THREE.BoxGeometry(0.2, 0.3, depth + 0.4);
      const borderLeft = new THREE.Mesh(sideBorderGeometry, borderMaterial);
      borderLeft.position.set(zone.bounds.minX - 0.1, 0.15, centerZ);
      borderLeft.castShadow = true;
      this.scene.add(borderLeft);

      const borderRight = new THREE.Mesh(sideBorderGeometry, borderMaterial);
      borderRight.position.set(zone.bounds.maxX + 0.1, 0.15, centerZ);
      borderRight.castShadow = true;
      this.scene.add(borderRight);
    });

    const corridorGeometry = new THREE.PlaneGeometry(14, 4);
    const corridorMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a4a,
      roughness: 0.9
    });
    const corridor = new THREE.Mesh(corridorGeometry, corridorMaterial);
    corridor.rotation.x = -Math.PI / 2;
    corridor.position.set(0, 0.001, 0);
    corridor.receiveShadow = true;
    corridor.userData = { type: 'floor', zoneId: null };
    this.scene.add(corridor);
  }

  private createExhibits(): void {
    const exhibits = dataManager.getExhibits();
    exhibits.forEach(exhibit => {
      this.createExhibitMesh(exhibit);
    });
  }

  private createExhibitMesh(exhibit: Exhibit): void {
    const cubeSize = exhibit.size;
    const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const cubeMaterial = new THREE.MeshStandardMaterial({
      color: exhibit.color,
      roughness: 0.4,
      metalness: 0.6
    });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(exhibit.position.x, cubeSize / 2 + 0.5, exhibit.position.z);
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.userData = { type: 'exhibit', exhibitId: exhibit.id };
    this.scene.add(cube);

    const markerGeometry = new THREE.SphereGeometry(0.4, 32, 32);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: exhibit.color,
      transparent: true,
      opacity: 0.8
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(exhibit.position.x, cubeSize + 1.5, exhibit.position.z);
    marker.userData = { type: 'exhibitMarker', exhibitId: exhibit.id };
    this.scene.add(marker);

    const glowLight = new THREE.PointLight(exhibit.color, 0.5, 5);
    glowLight.position.set(exhibit.position.x, cubeSize + 1.5, exhibit.position.z);
    this.scene.add(glowLight);

    this.exhibitMeshes.set(exhibit.id, {
      id: exhibit.id,
      cube,
      marker,
      glow: glowLight
    });
  }

  public addExhibit(exhibit: Exhibit): void {
    if (this.exhibitMeshes.has(exhibit.id)) return;
    this.createExhibitMesh(exhibit);
  }

  public updateExhibit(exhibit: Exhibit): void {
    const mesh = this.exhibitMeshes.get(exhibit.id);
    if (!mesh) return;

    mesh.cube.position.set(exhibit.position.x, exhibit.size / 2 + 0.5, exhibit.position.z);
    mesh.marker.position.set(exhibit.position.x, exhibit.size + 1.5, exhibit.position.z);
    mesh.glow.position.set(exhibit.position.x, exhibit.size + 1.5, exhibit.position.z);

    const cubeMaterial = mesh.cube.material as THREE.MeshStandardMaterial;
    cubeMaterial.color.set(exhibit.color);
    const markerMaterial = mesh.marker.material as THREE.MeshBasicMaterial;
    markerMaterial.color.set(exhibit.color);
    mesh.glow.color.set(exhibit.color);

    mesh.cube.scale.setScalar(1);
    mesh.cube.scale.setScalar(exhibit.size / (exhibit.size));
  }

  public removeExhibit(exhibitId: string): void {
    const mesh = this.exhibitMeshes.get(exhibitId);
    if (!mesh) return;

    this.scene.remove(mesh.cube);
    this.scene.remove(mesh.marker);
    this.scene.remove(mesh.glow);
    this.exhibitMeshes.delete(exhibitId);
  }

  public highlightExhibit(exhibitId: string, highlight: boolean): void {
    const mesh = this.exhibitMeshes.get(exhibitId);
    if (!mesh) return;

    const targetScale = highlight ? 1.2 : 1;
    const targetOpacity = highlight ? 1 : 0.8;

    gsap.to(mesh.marker.scale, { x: targetScale, y: targetScale, z: targetScale, duration: 0.3, ease: 'power2.out' });
    gsap.to((mesh.marker.material as THREE.MeshBasicMaterial), { opacity: targetOpacity, duration: 0.3 });

    mesh.glow.intensity = highlight ? 1.5 : 0.5;
  }

  public setPath(points: PathPoint[]): void {
    this.clearPath();

    if (points.length < 2) return;

    const positions: number[] = [];
    const colors: number[] = [];
    const colorObj = new THREE.Color();

    for (let i = 0; i < points.length; i++) {
      positions.push(points[i].x, 0.05, points[i].z);
      
      const progress = i / (points.length - 1);
      const r = 0.13 + (0.94 - 0.13) * progress;
      const g = 0.77 + (0.27 - 0.77) * progress;
      const b = 0.37 + (0.27 - 0.37) * progress;
      colorObj.setRGB(r, g, b);
      colors.push(colorObj.r, colorObj.g, colorObj.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      linewidth: 3
    });

    this.pathLine = new THREE.Line(geometry, material);
    this.scene.add(this.pathLine);

    this.createLightParticles(points);
  }

  private createLightParticles(path: PathPoint[]): void {
    const particleCount = 5;
    const totalLength = pathEngine.getPathLength(path);

    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(0.15, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.9
      });
      const particle = new THREE.Mesh(geometry, material);
      this.scene.add(particle);
      this.lightParticles.push(particle);

      const startDistance = (i / particleCount) * totalLength;
      this.particleData.push({
        distance: startDistance,
        speed: 2 + Math.random() * 2,
        totalLength,
        path
      });
    }
  }

  public clearPath(): void {
    if (this.pathLine) {
      this.scene.remove(this.pathLine);
      this.pathLine.geometry.dispose();
      (this.pathLine.material as THREE.Material).dispose();
      this.pathLine = null;
    }

    this.lightParticles.forEach(particle => {
      this.scene.remove(particle);
      particle.geometry.dispose();
      (particle.material as THREE.Material).dispose();
    });
    this.lightParticles = [];
    this.particleData = [];
  }

  private setupEventListeners(): void {
    this.renderer.domElement.addEventListener('click', (event) => {
      if (this.isPreviewMode) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      const allExhibitMeshes: THREE.Mesh[] = [];
      this.exhibitMeshes.forEach(mesh => {
        allExhibitMeshes.push(mesh.marker, mesh.cube);
      });

      const exhibitIntersects = this.raycaster.intersectObjects(allExhibitMeshes);
      if (exhibitIntersects.length > 0) {
        const mesh = exhibitIntersects[0].object;
        const exhibitId = mesh.userData.exhibitId;
        const exhibit = dataManager.getExhibitById(exhibitId);
        if (exhibit && this.onExhibitClickCallback) {
          this.onExhibitClickCallback(exhibit);
        }
        return;
      }

      const floorIntersects = this.raycaster.intersectObjects(this.zoneMeshes);
      if (floorIntersects.length > 0) {
        const point = floorIntersects[0].point;
        const zoneId = floorIntersects[0].object.userData.zoneId;
        if (this.onFloorClickCallback && zoneId) {
          this.onFloorClickCallback(
            { x: point.x, y: 0, z: point.z },
            zoneId
          );
        }
      }
    });

    window.addEventListener('resize', () => this.onResize());
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    const targetAspect = 16 / 9;
    const currentAspect = width / height;

    let renderWidth = width;
    let renderHeight = height;

    if (currentAspect > targetAspect) {
      renderHeight = height;
      renderWidth = height * targetAspect;
    } else {
      renderWidth = width;
      renderHeight = width / targetAspect;
    }

    this.camera.aspect = renderWidth / renderHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(renderWidth, renderHeight);
  }

  public setOnExhibitClick(callback: (exhibit: Exhibit) => void): void {
    this.onExhibitClickCallback = callback;
  }

  public setOnFloorClick(callback: (position: Vector3, zoneId: string) => void): void {
    this.onFloorClickCallback = callback;
  }

  public startPreview(exhibitIds: string[]): void {
    this.isPreviewMode = true;
    this.controls.enabled = false;
    
    this.previewExhibits = exhibitIds
      .map(id => dataManager.getExhibitById(id))
      .filter((e): e is Exhibit => e !== undefined);
    
    this.currentPreviewIndex = -1;
    this.nextPreviewExhibit();
  }

  private nextPreviewExhibit(): void {
    this.currentPreviewIndex++;
    
    if (this.currentPreviewIndex >= this.previewExhibits.length) {
      this.stopPreview();
      return;
    }

    const exhibit = this.previewExhibits[this.currentPreviewIndex];
    
    this.highlightExhibit(exhibit.id, true);
    
    const targetPosition = new THREE.Vector3(
      exhibit.position.x + 5,
      8,
      exhibit.position.z + 5
    );
    const targetLookAt = new THREE.Vector3(
      exhibit.position.x,
      exhibit.size / 2,
      exhibit.position.z
    );

    gsap.to(this.camera.position, {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.controls.target.lerp(targetLookAt, 0.1);
      }
    });

    gsap.delayedCall(3, () => {
      this.highlightExhibit(exhibit.id, false);
      this.nextPreviewExhibit();
    });
  }

  public stopPreview(): void {
    this.isPreviewMode = false;
    this.controls.enabled = true;
    this.previewExhibits.forEach(e => this.highlightExhibit(e.id, false));
    
    gsap.to(this.camera.position, {
      x: 0,
      y: 35,
      z: 35,
      duration: 1,
      ease: 'power2.out'
    });
    
    gsap.to(this.controls.target, {
      x: 0,
      y: 0,
      z: 0,
      duration: 1,
      ease: 'power2.out'
    });
  }

  public getPreviewIndex(): number {
    return this.currentPreviewIndex;
  }

  public getIsPreviewMode(): boolean {
    return this.isPreviewMode;
  }

  public getFps(): number {
    return this.fps;
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.frameCount++;
    if (elapsedTime - this.lastFpsUpdate >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = elapsedTime;
    }

    this.exhibitMeshes.forEach(mesh => {
      mesh.marker.position.y += Math.sin(elapsedTime * 2) * 0.002;
      mesh.glow.intensity = 0.5 + Math.sin(elapsedTime * 3) * 0.1;
    });

    this.updateLightParticles(delta);

    if (!this.isPreviewMode) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }

  private updateLightParticles(delta: number): void {
    for (let i = 0; i < this.lightParticles.length; i++) {
      const data = this.particleData[i];
      if (!data) continue;

      data.distance += data.speed * delta;
      if (data.distance > data.totalLength) {
        data.distance = 0;
      }

      const position = pathEngine.getPositionOnPath(data.path, data.distance);
      this.lightParticles[i].position.set(position.x, position.y + 0.2, position.z);

      const progress = data.distance / data.totalLength;
      const material = this.lightParticles[i].material as THREE.MeshBasicMaterial;
      const color = new THREE.Color();
      const r = 0.13 + (0.94 - 0.13) * progress;
      const g = 0.77 + (0.27 - 0.77) * progress;
      const b = 0.37 + (0.27 - 0.37) * progress;
      color.setRGB(r, g, b);
      material.color = color;
    }
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }
}

export let sceneManager: SceneManager | null = null;

export function initSceneManager(containerId: string): SceneManager {
  sceneManager = new SceneManager(containerId);
  return sceneManager;
}
