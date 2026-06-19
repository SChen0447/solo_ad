import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BuildingData, BuildingType, BUILDING_PRESETS, MAX_BUILDINGS } from '../types';
import { Environment } from './Environment';

export class SceneManager {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private environment: Environment;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  private buildings: Map<string, { mesh: THREE.Group; data: BuildingData; highlight: THREE.LineSegments }> = new Map();
  private selectedBuildingId: string | null = null;
  private pendingBuildingType: BuildingType | null = null;
  private isDragging: boolean = false;
  private pointerDownPos: { x: number; y: number } | null = null;
  private previewBuilding: { mesh: THREE.Group; type: BuildingType; highlight: THREE.LineSegments } | null = null;
  private isPlacingMode: boolean = false;
  
  private onBuildingChange?: () => void;
  private onSelectionChange?: (buildingId: string | null) => void;
  private onPlacingModeChange?: (isPlacing: boolean) => void;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.scene = new THREE.Scene();
    this.renderer = this.createRenderer();
    this.camera = this.createCamera();
    this.controls = this.createControls();
    this.environment = new Environment(this.scene);
    
    this.setupEventListeners();
    this.animate();
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    return renderer;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(150, 100, 150);
    return camera;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 20;
    controls.maxDistance = 400;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.set(0, 20, 0);
    return controls;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
    this.canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = false;
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
      if (this.isPlacingMode && e.button === 2) {
        e.preventDefault();
        this.cancelPlacing();
      }
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (this.pointerDownPos) {
        const dx = e.clientX - this.pointerDownPos.x;
        const dy = e.clientY - this.pointerDownPos.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          this.isDragging = true;
        }
      }
      this.onCanvasMouseMove(e);
    });
    this.canvas.addEventListener('pointerup', (e) => {
      if (e.button === 0 && !this.isDragging) {
        this.onCanvasClick(e);
      }
      this.isDragging = false;
      this.pointerDownPos = null;
    });
    this.canvas.addEventListener('contextmenu', (e) => {
      if (this.isPlacingMode) {
        e.preventDefault();
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isPlacingMode) {
        this.cancelPlacing();
        this.pendingBuildingType = null;
        this.updateBuildingButtons();
      }
    });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onCanvasClick(event: MouseEvent | PointerEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    if (this.isPlacingMode && this.previewBuilding) {
      const groundIntersect = this.raycaster.intersectObject(this.environment.getGround());
      if (groundIntersect.length > 0 && this.buildings.size < MAX_BUILDINGS) {
        const point = groundIntersect[0].point;
        this.confirmPlacing(point.x, point.z);
      }
      return;
    }
    
    const buildingMeshes = Array.from(this.buildings.values()).map(b => b.mesh);
    const buildingIntersect = this.raycaster.intersectObjects(buildingMeshes, true);
    
    if (buildingIntersect.length > 0) {
      let object: THREE.Object3D | null = buildingIntersect[0].object;
      while (object && object.parent && !this.buildings.has(object.name)) {
        object = object.parent;
      }
      if (object && this.buildings.has(object.name)) {
        this.selectBuilding(object.name);
        return;
      }
    }
    
    this.deselectBuilding();
  }

  private onCanvasMouseMove(event: MouseEvent | PointerEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    if (this.isPlacingMode && this.previewBuilding) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const groundIntersect = this.raycaster.intersectObject(this.environment.getGround());
      
      if (groundIntersect.length > 0) {
        const point = groundIntersect[0].point;
        this.previewBuilding.mesh.position.set(point.x, 0, point.z);
        this.previewBuilding.highlight.visible = true;
        this.canvas.style.cursor = 'crosshair';
      } else {
        this.previewBuilding.highlight.visible = false;
        this.canvas.style.cursor = 'not-allowed';
      }
      return;
    }
    
    this.canvas.style.cursor = 'default';
  }

  private createBuildingMesh(type: BuildingType, height: number): THREE.Group {
    const group = new THREE.Group();
    const preset = BUILDING_PRESETS[type];
    const material = new THREE.MeshStandardMaterial({
      color: type === 'office' ? 0x4a90d9 : type === 'residential' ? 0x6bbf59 : 0xd9774a,
      roughness: 0.6,
      metalness: 0.3
    });
    
    let mainMesh: THREE.Mesh;
    
    switch (type) {
      case 'office':
        mainMesh = new THREE.Mesh(
          new THREE.BoxGeometry(preset.width, height, preset.depth),
          material
        );
        mainMesh.position.y = height / 2;
        group.add(mainMesh);
        
        const windowMaterial = new THREE.MeshStandardMaterial({
          color: 0x88ccff,
          emissive: 0x224466,
          roughness: 0.1,
          metalness: 0.8
        });
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < Math.floor(height / 10); j++) {
            const window1 = new THREE.Mesh(
              new THREE.BoxGeometry(8, 6, 0.1),
              windowMaterial
            );
            window1.position.set(-12 + i * 12, 5 + j * 10, preset.depth / 2 + 0.1);
            group.add(window1);
            
            const window2 = window1.clone();
            window2.position.z = -preset.depth / 2 - 0.1;
            group.add(window2);
          }
        }
        break;
        
      case 'residential':
        const wing1 = new THREE.Mesh(
          new THREE.BoxGeometry(preset.width, height, preset.depth * 0.4),
          material
        );
        wing1.position.set(0, height / 2, -preset.depth * 0.3);
        group.add(wing1);
        
        const wing2 = new THREE.Mesh(
          new THREE.BoxGeometry(preset.width * 0.4, height, preset.depth * 0.6),
          material
        );
        wing2.position.set(-preset.width * 0.3, height / 2, preset.depth * 0.2);
        group.add(wing2);
        break;
        
      case 'tower':
        const towerGeometry = new THREE.ConeGeometry(preset.width / 2, height, 8);
        mainMesh = new THREE.Mesh(towerGeometry, material);
        mainMesh.position.y = height / 2;
        group.add(mainMesh);
        
        const antenna = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 15, 8),
          new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.9 })
        );
        antenna.position.y = height + 7.5;
        group.add(antenna);
        break;
    }
    
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    return group;
  }

  private createHighlight(width: number, depth: number, height: number): THREE.LineSegments {
    const points: THREE.Vector3[] = [];
    const hw = width / 2 + 1;
    const hd = depth / 2 + 1;
    
    const corners = [
      [-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd],
      [-hw, height + 2, -hd], [hw, height + 2, -hd], [hw, height + 2, hd], [-hw, height + 2, hd]
    ];
    
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];
    
    edges.forEach(([i, j]) => {
      points.push(new THREE.Vector3(...corners[i]));
      points.push(new THREE.Vector3(...corners[j]));
    });
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: 0x00D4FF, 
      linewidth: 2,
      transparent: true,
      opacity: 0.9
    });
    
    return new THREE.LineSegments(geometry, material);
  }

  public addBuilding(type: BuildingType, x: number, z: number): string | null {
    if (this.buildings.size >= MAX_BUILDINGS) return null;
    
    const preset = BUILDING_PRESETS[type];
    const id = `building_${Date.now()}`;
    
    const data: BuildingData = {
      id,
      type,
      position: { x, z },
      height: preset.defaultHeight,
      rotation: 0,
      width: preset.width,
      depth: preset.depth
    };
    
    const mesh = this.createBuildingMesh(type, data.height);
    mesh.name = id;
    mesh.position.set(x, 0, z);
    
    const highlight = this.createHighlight(data.width, data.depth, data.height);
    highlight.visible = false;
    mesh.add(highlight);
    
    this.scene.add(mesh);
    this.buildings.set(id, { mesh, data, highlight });
    
    this.fadeInBuilding(mesh);
    this.selectBuilding(id);
    this.notifyChange();
    
    return id;
  }

  private fadeInBuilding(mesh: THREE.Group): void {
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material.transparent = true;
        child.material.opacity = 0;
      }
    });
    
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / 300, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material.opacity = eased;
        }
      });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  public removeBuilding(id: string): void {
    const building = this.buildings.get(id);
    if (!building) return;
    
    if (this.selectedBuildingId === id) {
      this.deselectBuilding();
    }
    
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / 300, 1);
      const eased = Math.pow(1 - progress, 3);
      
      building.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material.opacity = eased;
        }
      });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(building.mesh);
        building.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
        this.buildings.delete(id);
        this.notifyChange();
      }
    };
    animate();
  }

  public updateBuildingHeight(id: string, height: number): void {
    const building = this.buildings.get(id);
    if (!building) return;
    
    height = Math.max(10, Math.min(200, height));
    building.data.height = height;
    
    this.scene.remove(building.mesh);
    
    const newMesh = this.createBuildingMesh(building.data.type, height);
    newMesh.name = id;
    newMesh.position.set(building.data.position.x, 0, building.data.position.z);
    newMesh.rotation.y = building.data.rotation * Math.PI / 180;
    
    const highlight = this.createHighlight(building.data.width, building.data.depth, height);
    highlight.visible = this.selectedBuildingId === id;
    newMesh.add(highlight);
    
    this.scene.add(newMesh);
    this.buildings.set(id, { mesh: newMesh, data: building.data, highlight });
    
    this.notifyChange();
  }

  public updateBuildingRotation(id: string, rotation: number): void {
    const building = this.buildings.get(id);
    if (!building) return;
    
    building.data.rotation = rotation;
    building.mesh.rotation.y = rotation * Math.PI / 180;
    
    this.notifyChange();
  }

  public updateBuildingPosition(id: string, x: number, z: number): void {
    const building = this.buildings.get(id);
    if (!building) return;
    
    building.data.position = { x, z };
    building.mesh.position.set(x, 0, z);
    
    this.notifyChange();
  }

  public selectBuilding(id: string | null): void {
    if (this.selectedBuildingId && this.selectedBuildingId !== id) {
      const prevBuilding = this.buildings.get(this.selectedBuildingId);
      if (prevBuilding) {
        prevBuilding.highlight.visible = false;
      }
    }
    
    this.selectedBuildingId = id;
    
    if (id) {
      const building = this.buildings.get(id);
      if (building) {
        building.highlight.visible = true;
        this.startBreathingAnimation(building.highlight);
      }
    }
    
    if (this.onSelectionChange) {
      this.onSelectionChange(id);
    }
  }

  private startBreathingAnimation(highlight: THREE.LineSegments): void {
    const startTime = Date.now();
    const animate = () => {
      if (!highlight.visible) return;
      
      const elapsed = Date.now() - startTime;
      const pulse = 0.7 + 0.3 * Math.sin(elapsed * 0.003);
      (highlight.material as THREE.LineBasicMaterial).opacity = pulse;
      
      requestAnimationFrame(animate);
    };
    animate();
  }

  public deselectBuilding(): void {
    this.selectBuilding(null);
  }

  public getSelectedBuildingId(): string | null {
    return this.selectedBuildingId;
  }

  public getBuildingData(id: string): BuildingData | null {
    return this.buildings.get(id)?.data || null;
  }

  public getAllBuildings(): BuildingData[] {
    return Array.from(this.buildings.values()).map(b => ({ ...b.data }));
  }

  public getBuildingMeshes(): THREE.Group[] {
    return Array.from(this.buildings.values()).map(b => b.mesh);
  }

  public setPendingBuildingType(type: BuildingType | null): void {
    if (type === null) {
      this.cancelPlacing();
      this.pendingBuildingType = null;
      this.canvas.style.cursor = 'default';
    } else {
      this.pendingBuildingType = type;
      this.startPlacingMode(type);
    }
    this.updateBuildingButtons();
  }

  private startPlacingMode(type: BuildingType): void {
    if (this.buildings.size >= MAX_BUILDINGS) {
      return;
    }
    
    this.cancelPlacing();
    
    const preset = BUILDING_PRESETS[type];
    const mesh = this.createBuildingMesh(type, preset.defaultHeight);
    
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material.transparent = true;
        child.material.opacity = 0.6;
      }
    });
    
    const highlight = this.createHighlight(preset.width, preset.depth, preset.defaultHeight);
    highlight.visible = false;
    mesh.add(highlight);
    
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    const defaultPos = this.camera.position.clone().add(direction.multiplyScalar(100));
    
    mesh.position.set(defaultPos.x, 0, defaultPos.z);
    
    this.scene.add(mesh);
    this.previewBuilding = { mesh, type, highlight };
    this.isPlacingMode = true;
    this.canvas.style.cursor = 'crosshair';
    this.controls.enabled = false;
    
    if (this.onPlacingModeChange) {
      this.onPlacingModeChange(true);
    }
  }

  private confirmPlacing(x: number, z: number): void {
    if (!this.previewBuilding || !this.pendingBuildingType) return;
    
    const type = this.previewBuilding.type;
    this.scene.remove(this.previewBuilding.mesh);
    this.previewBuilding.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.previewBuilding = null;
    
    this.addBuilding(type, x, z);
    
    this.isPlacingMode = false;
    this.pendingBuildingType = null;
    this.canvas.style.cursor = 'default';
    this.controls.enabled = true;
    
    if (this.onPlacingModeChange) {
      this.onPlacingModeChange(false);
    }
    this.updateBuildingButtons();
  }

  public cancelPlacing(): void {
    if (this.previewBuilding) {
      this.scene.remove(this.previewBuilding.mesh);
      this.previewBuilding.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.previewBuilding = null;
    }
    
    this.isPlacingMode = false;
    this.canvas.style.cursor = 'default';
    this.controls.enabled = true;
    
    if (this.onPlacingModeChange) {
      this.onPlacingModeChange(false);
    }
  }

  public setOnPlacingModeChange(callback: (isPlacing: boolean) => void): void {
    this.onPlacingModeChange = callback;
  }

  public getIsPlacingMode(): boolean {
    return this.isPlacingMode;
  }

  private updateBuildingButtons(): void {
    document.querySelectorAll('.building-btn').forEach(btn => {
      const type = btn.getAttribute('data-type') as BuildingType;
      btn.classList.toggle('active', type === this.pendingBuildingType);
    });
  }

  public setOnBuildingChange(callback: () => void): void {
    this.onBuildingChange = callback;
  }

  public setOnSelectionChange(callback: (buildingId: string | null) => void): void {
    this.onSelectionChange = callback;
  }

  private notifyChange(): void {
    if (this.onBuildingChange) {
      this.onBuildingChange();
    }
  }

  public getEnvironment(): Environment {
    return this.environment;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public getBuildingCount(): number {
    return this.buildings.size;
  }

  public getBuildingMesh(id: string): THREE.Group | null {
    return this.buildings.get(id)?.mesh || null;
  }
}
